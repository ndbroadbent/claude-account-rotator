// The coordinator's command line: `node coordinator/cli.ts <command>`.
//
//   serve [--managed] [--idle-exit-ms N]   run it in the foreground (launchd runs this)
//   start                                  make sure one runs: kickstart launchd's, or start one in the background
//   upgrade                                replace a running coordinator with this version
//   install                                copy this version to ~/.claude/account-rotator/app and run it at login (macOS)
//   uninstall                              stop running it at login
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
import { VERSION, compareVersions } from './version.ts'

const LABEL = 'com.github.ndbroadbent.claude-account-rotator'
const HERE = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.dirname(HERE)
const plistPath = () => path.join(os.homedir(), 'Library', 'LaunchAgents', `${LABEL}.plist`)
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

type Hello = { version: string; pid: number; isManaged: boolean }

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

const isInstalled = () => process.platform === 'darwin' && fs.existsSync(plistPath())

function launchctl(...args: string[]): { ok: boolean; output: string } {
  try {
    return { ok: true, output: execFileSync('/bin/launchctl', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }) }
  } catch (error) {
    const e = error as { stdout?: string; stderr?: string }
    return { ok: false, output: `${e.stdout ?? ''}${e.stderr ?? ''}` }
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
    process.stdout.write(`running: ${running.version} (pid ${running.pid})\n`)
    return
  }
  if (isInstalled()) {
    const kick = launchctl('kickstart', `${domain()}/${LABEL}`)
    if (!kick.ok) launchctl('bootstrap', domain(), plistPath())
  } else spawnDetached()
  await waitFor(async () => (await hello()) !== undefined, 15_000, 'the coordinator did not start')
  const started = await hello()
  process.stdout.write(`started: ${started?.version} (pid ${started?.pid})\n`)
}

async function stopRunning(): Promise<void> {
  const running = await hello()
  if (running === undefined) return
  await call('POST', '/shutdown').catch(() => undefined)
  await waitFor(async () => (await hello()) === undefined, 10_000, 'the coordinator did not stop')
}

const xml = (s: string) => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')

function plist(): string {
  const env = cleanEnv()
  const vars: Record<string, string> = {
    PATH: env.PATH ?? '/usr/bin:/bin:/usr/sbin:/sbin',
    HOME: os.homedir(),
    USER: env.USER ?? os.userInfo().username,
    ...(env.LANG === undefined ? {} : { LANG: env.LANG }),
    ...(env.CLAUDE_ACCOUNT_ROTATOR_DIR === undefined ? {} : { CLAUDE_ACCOUNT_ROTATOR_DIR: env.CLAUDE_ACCOUNT_ROTATOR_DIR }),
  }
  const args = [process.execPath, path.join(appDir(), 'coordinator', 'cli.ts'), 'serve', '--managed']
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>${LABEL}</string>
  <key>ProgramArguments</key>
  <array>
${args.map(a => `    <string>${xml(a)}</string>`).join('\n')}
  </array>
  <key>EnvironmentVariables</key>
  <dict>
${Object.entries(vars)
  .map(([k, v]) => `    <key>${xml(k)}</key><string>${xml(v)}</string>`)
  .join('\n')}
  </dict>
  <key>WorkingDirectory</key><string>${xml(stateDir())}</string>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key>
  <dict>
    <key>SuccessfulExit</key><false/>
  </dict>
  <key>ThrottleInterval</key><integer>10</integer>
  <key>StandardOutPath</key><string>${xml(path.join(stateDir(), 'launchd.log'))}</string>
  <key>StandardErrorPath</key><string>${xml(path.join(stateDir(), 'launchd.log'))}</string>
</dict>
</plist>
`
}

/** Copies the files the coordinator runs from to a fixed place, so a plugin update's new folder doesn't move it. */
function copyApp(): void {
  const target = appDir()
  const fresh = `${target}.new`
  fs.rmSync(fresh, { recursive: true, force: true })
  const files = [
    ...fs
      .readdirSync(path.join(ROOT, 'coordinator'))
      .filter(f => f.endsWith('.ts') && !f.endsWith('.spec.ts'))
      .map(f => path.join('coordinator', f)),
    path.join('hooks', 'model.ts'),
    path.join('types', 'index.d.ts'),
    'package.json',
  ]
  for (const file of files) {
    const from = path.join(ROOT, file)
    if (!fs.existsSync(from)) fail(`${from} is missing: run this from the plugin's folder`)
    fs.mkdirSync(path.dirname(path.join(fresh, file)), { recursive: true })
    fs.copyFileSync(from, path.join(fresh, file))
  }
  fs.rmSync(target, { recursive: true, force: true })
  fs.renameSync(fresh, target)
}

async function install(): Promise<void> {
  if (process.platform !== 'darwin') fail('install sets up a macOS LaunchAgent; elsewhere, sessions start the coordinator themselves')
  fs.mkdirSync(stateDir(), { recursive: true, mode: 0o700 })
  const running = await hello()
  if (running !== undefined && !running.isManaged) await stopRunning()
  copyApp()
  fs.mkdirSync(path.dirname(plistPath()), { recursive: true })
  fs.writeFileSync(plistPath(), plist())
  launchctl('bootout', `${domain()}/${LABEL}`)
  await waitFor(async () => (await hello()) === undefined, 10_000, 'the old coordinator did not stop')
  // launchd goes on removing the old job after its process exits, and refuses a bootstrap meanwhile ("5: Input/output error").
  await waitFor(async () => !launchctl('print', `${domain()}/${LABEL}`).ok, 15_000, 'launchd did not remove the old coordinator job')
  let boot = launchctl('bootstrap', domain(), plistPath())
  for (let tries = 1; !boot.ok && tries < 5; tries += 1) {
    await new Promise(resolve => setTimeout(resolve, 1_000))
    boot = launchctl('bootstrap', domain(), plistPath())
  }
  if (!boot.ok) fail(`launchctl bootstrap failed: ${boot.output.trim()}`)
  await waitFor(async () => (await hello())?.version === VERSION, 15_000, `coordinator ${VERSION} did not start`)
  process.stdout.write(`installed: coordinator ${VERSION} runs at login (${plistPath()})\n`)
}

async function uninstall(): Promise<void> {
  if (fs.existsSync(plistPath())) {
    launchctl('bootout', `${domain()}/${LABEL}`)
    fs.rmSync(plistPath(), { force: true })
  }
  fs.rmSync(appDir(), { recursive: true, force: true })
  process.stdout.write('uninstalled: the coordinator no longer runs at login (its state stays in ~/.claude/account-rotator)\n')
}

/** Replaces a running coordinator older than this one; a newer one stays. */
async function upgrade(): Promise<void> {
  const running = await hello()
  if (running !== undefined && compareVersions(running.version, VERSION) >= 0) {
    process.stdout.write(`running: ${running.version}, not older than ${VERSION}\n`)
    return
  }
  if (isInstalled()) return install()
  await stopRunning()
  await start()
}

async function status(): Promise<void> {
  const running = await hello()
  if (running === undefined) fail(`not running${isInstalled() ? ' (installed: launchctl should restart it)' : ''}`)
  const { body } = await call('GET', '/state')
  const state = body as SharedState
  const pct = (n: number | undefined) => (n === undefined ? '  ?' : `${Math.round(n)}%`.padStart(4))
  process.stdout.write(`coordinator ${running.version} (pid ${running.pid}${running.isManaged ? ', launchd' : ''}), ${state.sessions.length} sessions\n`)
  // As of November 2026 no plan reports a 5-hour window: shown only where one does.
  const hasFive = state.accounts.some(a => a.reading?.fiveHour !== undefined)
  process.stdout.write(`combined: ${hasFive ? `5-hour ${pct(state.combined.fiveHour?.pct)}, ` : ''}week ${pct(state.combined.sevenDay?.pct)}\n`)
  // A model with a week of its own (Fable) gets a column, and where its sessions move to.
  const models = [...new Set(state.accounts.flatMap(a => Object.keys(a.reading?.models ?? {})))].sort()
  for (const a of state.accounts) {
    const r = a.reading
    const own = models.map(m => `${m} ${pct(r?.models?.[m]?.pct)}  `).join('')
    const moves = [
      ...(a.moveTo ? [`moves to ${a.moveTo}`] : []),
      ...Object.entries(a.moveToFor ?? {}).map(([m, to]) => `${m} moves to ${to}`),
    ]
    process.stdout.write(
      `  ${a.id} ${(a.email ?? '(unknown)').padEnd(32)} ${hasFive ? `5h ${pct(r?.fiveHour?.pct)}  ` : ''}wk ${pct(r?.sevenDay?.pct)}  ${own}${a.health.kind}` +
        `${a.health.kind === 'login-needed' ? ` (${a.health.why})` : ''}, ${a.sessionCount} sessions${moves.map(m => `, ${m}`).join('')}\n`,
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
      return withLock(install)
    case 'uninstall':
      return withLock(uninstall)
    case 'status':
      return status()
    case 'stop':
      return stopRunning()
    default:
      fail('usage: node coordinator/cli.ts serve|start|upgrade|install|uninstall|status|stop')
  }
}

void main().catch(error => fail(error instanceof Error ? error.message : String(error)))
