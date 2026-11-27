// The coordinator's command line: `node coordinator/cli.ts <command>`.
//
//   serve [--idle-exit-ms N]   run it in the foreground
//   start                      make sure one runs, in the background
//   upgrade                    replace a running coordinator with this version
//   uninstall                  remove the LaunchAgent or systemd user service a version before 0.8.0 installed
//   status                                 what the running one knows
//   stop                                   ask the running one to exit

import { execFileSync, spawn } from 'node:child_process'
import fs from 'node:fs'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import type { SharedState } from '../types/index.d.ts'
import { cleanEnv, logPath, serve, socketPath, stateDir } from './server.ts'
import { VERSION, compareVersions, isNodeName } from './version.ts'

const LABEL = 'com.github.ndbroadbent.claude-account-rotator'
const HERE = path.dirname(fileURLToPath(import.meta.url))
const plistPath = () => path.join(os.homedir(), 'Library', 'LaunchAgents', `${LABEL}.plist`)
const UNIT = 'claude-account-rotator.service'
const unitPath = () => path.join(process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config'), 'systemd', 'user', UNIT)
const isMac = process.platform === 'darwin'
const isLinux = process.platform === 'linux'
const appDir = () => path.join(stateDir(), 'app')
const domain = () => `gui/${process.getuid?.() ?? 0}`

function fail(message: string): never {
  process.stderr.write(`account-rotator: ${message}\n`)
  process.exit(1)
}

function checkNode(): void {
  const [major = 0, minor = 0] = process.versions.node.split('.').map(Number)
  if (major < 22 || (major === 22 && minor < 18)) fail(`the coordinator needs Node.js 22.18 or later (this is ${process.versions.node})`)
}

type Answer = { status: number; body: unknown }

function call(method: string, urlPath: string, body?: unknown, timeoutMs = 5_000): Promise<Answer> {
  return new Promise((resolve, reject) => {
    const text = body === undefined ? undefined : JSON.stringify(body)
    const req = http.request(
      {
        socketPath: socketPath(),
        path: urlPath,
        method,
        headers: { connection: 'close', ...(text === undefined ? {} : { 'content-type': 'application/json', 'content-length': Buffer.byteLength(text) }) },
        timeout: timeoutMs,
      },
      res => {
        let raw = ''
        res.setEncoding('utf8')
        res.on('data', chunk => {
          raw += chunk
        })
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode ?? 0, body: raw === '' ? undefined : JSON.parse(raw) })
          } catch (error) {
            reject(new Error(`unreadable answer to ${method} ${urlPath}: ${String(error)}`))
          }
        })
      },
    )
    req.on('timeout', () => req.destroy(new Error(`${method} ${urlPath} timed out`)))
    req.on('error', reject)
    req.end(text)
  })
}

type Hello = { name?: string; version: string; pid: number; isManaged: boolean }

/** A node serves the API here (Quietdeck's, or Fleetlayer's plugin): it runs as long as the node does, and nothing here starts or stops it. */
const isNode = (running: Hello | undefined): boolean => isNodeName(running?.name)
const nodeServes = (running: Hello | undefined): string => `A node serves the coordinator API here (${running?.name ?? 'unnamed'})`

async function hello(): Promise<Hello | undefined> {
  try {
    const { status, body } = await call('GET', '/hello', undefined, 3_000)
    return status === 200 ? (body as Hello) : undefined
  } catch {
    // Not listening (no socket, or a socket left by one that died).
    return undefined
  }
}

async function waitFor(check: () => Promise<boolean>, ms: number, what: string): Promise<void> {
  const until = Date.now() + ms
  while (Date.now() < until) {
    if (await check()) return
    await new Promise(resolve => setTimeout(resolve, 200))
  }
  fail(`${what} (see ${logPath()})`)
}

/**
 * Runs `work` while holding the command line's lock, so many sessions starting
 * at once (each runs `start` or `upgrade`) take turns: the first does the work,
 * and the rest find it done. A lock whose holder died is taken over.
 */
async function withLock(work: () => Promise<void>): Promise<void> {
  fs.mkdirSync(stateDir(), { recursive: true, mode: 0o700 })
  const file = path.join(stateDir(), 'cli.lock')
  const until = Date.now() + 120_000
  for (;;) {
    try {
      fs.writeFileSync(file, String(process.pid), { flag: 'wx', mode: 0o600 })
      break
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error
    }
    const holder = Number(fs.readFileSync(file, 'utf8').trim())
    if (!isAlive(holder)) {
      // Its holder died: whoever removes it first goes next.
      fs.rmSync(file, { force: true })
      continue
    }
    if (Date.now() > until) fail(`another account-rotator command (pid ${holder}) has held ${file} for 2 minutes`)
    await new Promise(resolve => setTimeout(resolve, 250))
  }
  try {
    await work()
  } finally {
    fs.rmSync(file, { force: true })
  }
}

function isAlive(pid: number): boolean {
  if (!Number.isInteger(pid) || pid <= 0) return false
  try {
    process.kill(pid, 0)
    return true
  } catch (error) {
    // EPERM: it runs, as another user.
    return (error as NodeJS.ErrnoException).code === 'EPERM'
  }
}

const isInstalled = () => (isMac && fs.existsSync(plistPath())) || (isLinux && fs.existsSync(unitPath()))
const manager = () => (isMac ? 'launchd' : 'systemd')

function launchctl(...args: string[]): { ok: boolean; output: string } {
  try {
    return { ok: true, output: execFileSync('/bin/launchctl', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }) }
  } catch (error) {
    const e = error as { stdout?: string; stderr?: string }
    return { ok: false, output: `${e.stdout ?? ''}${e.stderr ?? ''}` }
  }
}

/**
 * systemctl for this user's own services. A Claude Code session started outside
 * a login shell may lack XDG_RUNTIME_DIR, which systemctl --user needs to find
 * the user's manager: it is /run/user/<uid> wherever systemd-logind runs.
 */
function systemctl(...args: string[]): { ok: boolean; output: string } {
  const env = { ...cleanEnv(), XDG_RUNTIME_DIR: process.env.XDG_RUNTIME_DIR || `/run/user/${process.getuid?.() ?? 0}` }
  try {
    return { ok: true, output: execFileSync('systemctl', ['--user', ...args], { encoding: 'utf8', env, stdio: ['ignore', 'pipe', 'pipe'] }) }
  } catch (error) {
    const e = error as { stdout?: string; stderr?: string; message?: string }
    return { ok: false, output: `${e.stdout ?? ''}${e.stderr ?? ''}` || (e.message ?? '') }
  }
}

/** Starts one in the background, detached from whatever ran this, without its Claude Code session's settings. */
function spawnDetached(): void {
  fs.mkdirSync(stateDir(), { recursive: true, mode: 0o700 })
  const out = fs.openSync(logPath(), 'a', 0o600)
  const child = spawn(process.execPath, [path.join(HERE, 'cli.ts'), 'serve', '--idle-exit-ms', String(30 * 60_000)], {
    cwd: stateDir(),
    env: cleanEnv(),
    detached: true,
    stdio: ['ignore', out, out],
  })
  child.unref()
}

async function start(): Promise<void> {
  const running = await hello()
  if (running !== undefined) {
    process.stdout.write(`running: ${isNode(running) ? `${running.name}, API ` : ''}${running.version} (pid ${running.pid})\n`)
    return
  }
  removeService()
  spawnDetached()
  await waitFor(async () => (await hello()) !== undefined, 30_000, 'the coordinator did not start')
  const started = await hello()
  process.stdout.write(`started: ${started?.version} (pid ${started?.pid})\n`)
}

async function stopRunning(): Promise<void> {
  const running = await hello()
  if (running === undefined) return
  if (isNode(running)) fail(`${nodeServes(running)}: it stops with the node`)
  await call('POST', '/shutdown').catch(() => undefined)
  await waitFor(async () => (await hello()) === undefined, 10_000, 'the coordinator did not stop')
}

/**
 * Removes the LaunchAgent or systemd user service that `install` set up before
 * 0.8.0, with its copy of the coordinator: a node (Fleetlayer's or Quietdeck's)
 * serves the API on these machines now, and elsewhere sessions start the
 * coordinator themselves. A coordinator it ran goes on until it's stopped.
 */
function removeService(): boolean {
  let removed = false
  if (isLinux && fs.existsSync(unitPath())) {
    systemctl('disable', UNIT)
    fs.rmSync(unitPath(), { force: true })
    systemctl('daemon-reload')
    removed = true
  }
  if (isMac && fs.existsSync(plistPath())) {
    // bootout stops the coordinator launchd runs; it exits with its long polls cut, and sessions start another.
    launchctl('bootout', `${domain()}/${LABEL}`)
    fs.rmSync(plistPath(), { force: true })
    removed = true
  }
  fs.rmSync(appDir(), { recursive: true, force: true })
  if (removed) process.stdout.write('removed the coordinator service an earlier version installed: it no longer runs at login\n')
  return removed
}

async function uninstall(): Promise<void> {
  if (!removeService()) process.stdout.write('nothing to remove: no coordinator service is installed\n')
}

/** Replaces a running coordinator older than this one; a newer one stays. */
async function upgrade(): Promise<void> {
  const running = await hello()
  if (running !== undefined && isNode(running)) {
    process.stdout.write(`running: ${nodeServes(running)} (pid ${running.pid}); nothing to upgrade\n`)
    return
  }
  if (running !== undefined && compareVersions(running.version, VERSION) >= 0) {
    process.stdout.write(`running: ${running.version}, not older than ${VERSION}\n`)
    return
  }
  await stopRunning()
  await start()
}

async function status(): Promise<void> {
  const running = await hello()
  if (running === undefined) fail(`not running${isInstalled() ? ` (installed: ${manager()} should restart it)` : ''}`)
  const { body } = await call('GET', '/state')
  const state = body as SharedState
  const pct = (n: number | undefined) => (n === undefined ? '  ?' : `${Math.round(n)}%`.padStart(4))
  const who = isNode(running) ? `${running.name}, coordinator API ${running.version} (pid ${running.pid})` : `coordinator ${running.version} (pid ${running.pid}${running.isManaged ? `, ${manager()}` : ''})`
  process.stdout.write(`${who}, ${state.sessions.length} sessions\n`)
  // As of November 2026 no plan reports a 5-hour window: shown only where one does.
  const hasFive = state.accounts.some(a => a.reading?.fiveHour !== undefined)
  process.stdout.write(`combined: ${hasFive ? `5-hour ${pct(state.combined.fiveHour?.pct)}, ` : ''}week ${pct(state.combined.sevenDay?.pct)}\n`)
  // A model with a week of its own (Fable) gets a column.
  const models = [...new Set(state.accounts.flatMap(a => Object.keys(a.reading?.models ?? {})))].sort()
  for (const a of state.accounts) {
    const r = a.reading
    const own = models.map(m => `${m} ${pct(r?.models?.[m]?.pct)}  `).join('')
    process.stdout.write(
      `  ${a.id} ${(a.email ?? '(unknown)').padEnd(32)} ${hasFive ? `5h ${pct(r?.fiveHour?.pct)}  ` : ''}wk ${pct(r?.sevenDay?.pct)}  ${own}${a.health.kind}` +
        `${a.health.kind === 'login-needed' ? ` (${a.health.why})` : ''}, ${a.sessionCount} sessions${a.isRetiring ? ', being removed' : ''}\n`,
    )
  }
}

async function main(): Promise<void> {
  // Piped into `head`, which closes early: stop quietly.
  process.stdout.on('error', error => {
    if ((error as NodeJS.ErrnoException).code === 'EPIPE') process.exit(0)
    throw error
  })
  checkNode()
  const [command, ...args] = process.argv.slice(2)
  switch (command) {
    case 'serve': {
      const at = args.indexOf('--idle-exit-ms')
      const idle = at < 0 ? undefined : Number(args[at + 1])
      await serve({ isManaged: args.includes('--managed'), ...(idle !== undefined && Number.isFinite(idle) ? { idleExitMs: idle } : {}) })
      return
    }
    case 'start':
      return withLock(start)
    case 'upgrade':
      return withLock(upgrade)
    case 'install':
      return fail('install was retired in 0.8.0: the first session that needs the coordinator starts it, and a Fleetlayer or Quietdeck node serves it where one runs')
    case 'uninstall':
      return withLock(uninstall)
    case 'status':
      return status()
    case 'stop':
      return stopRunning()
    default:
      fail('usage: node coordinator/cli.ts serve|start|upgrade|uninstall|status|stop')
  }
}

void main().catch(error => fail(error instanceof Error ? error.message : String(error)))
