// The coordinator under Node: the real keychain or credentials files, Anthropic's
// usage and profile endpoints, `claude auth`, the state file, and the HTTP server
// on a Unix socket that sessions and the menu bar app talk to.

import { execFile, spawn } from 'node:child_process'
import fs from 'node:fs'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'

import { credentialFrom, credentialsFile, identityFromStatus, keychainItem, keychainUser, slotEnv } from '../hooks/model.ts'
import { Coordinator } from './core.ts'
import type { Deps, Persisted, SignInRun, Stored, UsageAnswer } from './core.ts'
import { VERSION } from './version.ts'

/** A Retry-After header as milliseconds from now: seconds, or an HTTP date. */
export function retryAfter(header: string | null, now: number): number | undefined {
  if (header === null) return undefined
  const seconds = Number(header)
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000)
  const at = Date.parse(header)
  return Number.isFinite(at) ? Math.max(0, at - now) : undefined
}

const USAGE_URL = 'https://api.anthropic.com/api/oauth/usage'
const PROFILE_URL = 'https://api.anthropic.com/api/oauth/profile'
const LOG_LIMIT = 1024 * 1024

/** Where the coordinator keeps its socket, state, log and lock: `~/.claude/account-rotator`. */
export function stateDir(): string {
  return process.env.CLAUDE_ACCOUNT_ROTATOR_DIR ?? path.join(os.homedir(), '.claude', 'account-rotator')
}

export const socketPath = (dir = stateDir()) => path.join(dir, 'coordinator.sock')
export const statePath = (dir = stateDir()) => path.join(dir, 'state.json')
export const logPath = (dir = stateDir()) => path.join(dir, 'coordinator.log')
const lockPath = (dir = stateDir()) => path.join(dir, 'coordinator.lock')

/**
 * The environment `claude` children get: the coordinator's own, without what a
 * Claude Code session sets for itself (which login it reads, its API endpoint),
 * so a coordinator a session started behaves as one launchd started.
 */
export function cleanEnv(env: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
  return Object.fromEntries(
    Object.entries(env).filter(([name]) => name === 'CLAUDE_ACCOUNT_ROTATOR_DIR' || !/^(CLAUDE|ANTHROPIC)_|^CLAUDECODE$/.test(name)),
  )
}

export function makeLogger(file = logPath()): (text: string) => void {
  return text => {
    try {
      if (fs.existsSync(file) && fs.statSync(file).size > LOG_LIMIT) fs.renameSync(file, `${file}.1`)
      fs.appendFileSync(file, `${new Date().toISOString()} ${text}\n`, { mode: 0o600 })
    } catch {
      // A log that can't be written mustn't stop the coordinator; stderr still has it.
      process.stderr.write(`${text}\n`)
    }
  }
}

function run(cmd: string, args: string[], env: NodeJS.ProcessEnv, timeoutMs: number): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise(resolve => {
    execFile(cmd, args, { env, timeout: timeoutMs, maxBuffer: 4 * 1024 * 1024 }, (error, stdout, stderr) => {
      const code = error === null ? 0 : typeof error.code === 'number' ? error.code : -1
      resolve({ code, stdout: String(stdout), stderr: String(stderr) })
    })
  })
}

const oauthHeaders = (accessToken: string) => ({
  Authorization: `Bearer ${accessToken}`,
  'anthropic-beta': 'oauth-2025-04-20',
  'Content-Type': 'application/json',
})

/** The real world beneath the coordinator. */
export function nodeDeps(dir: string, log: (text: string) => void): Deps {
  const env = cleanEnv()
  const home = os.homedir()
  const isMac = process.platform === 'darwin'
  let saveTimer: NodeJS.Timeout | undefined
  let pending: Persisted | undefined
  const flush = () => {
    saveTimer = undefined
    if (pending === undefined) return
    const tmp = `${statePath(dir)}.tmp`
    fs.writeFileSync(tmp, `${JSON.stringify(pending, null, 2)}\n`, { mode: 0o600 })
    fs.renameSync(tmp, statePath(dir))
    pending = undefined
  }
  process.on('exit', () => {
    if (saveTimer !== undefined) clearTimeout(saveTimer)
    flush()
  })
  return {
    now: () => Date.now(),
    after: (ms, fn) => {
      const t = setTimeout(fn, ms)
      return () => clearTimeout(t)
    },
    every: (ms, fn) => {
      const t = setInterval(fn, ms)
      return () => clearInterval(t)
    },
    async readStored(slot): Promise<Stored> {
      if (isMac) {
        const item = await keychainItem(slot)
        const { code, stdout } = await run('/usr/bin/security', ['find-generic-password', '-a', keychainUser(env.USER), '-w', '-s', item], env, 10_000)
        if (code === 44) return { state: 'absent' }
        if (code !== 0) return { state: 'unreadable', code }
        return { state: 'present', credential: credentialFrom(stdout.trim()) }
      }
      // A file that cannot be read holds no login, as Claude Code counts it.
      const file = credentialsFile(slot, home)
      const text = file === undefined ? undefined : await fs.promises.readFile(file, 'utf8').catch(() => undefined)
      return text === undefined ? { state: 'absent' } : { state: 'present', credential: credentialFrom(text) }
    },
    async fetchUsage(accessToken): Promise<UsageAnswer> {
      try {
        const res = await fetch(USAGE_URL, { headers: oauthHeaders(accessToken), signal: AbortSignal.timeout(20_000) })
        if (res.status === 401 || res.status === 403) return { kind: 'rejected' }
        if (!res.ok) {
          const retryAfterMs = retryAfter(res.headers.get('retry-after'), Date.now())
          return { kind: 'failed', status: res.status, ...(retryAfterMs === undefined ? {} : { retryAfterMs }) }
        }
        return { kind: 'ok', body: await res.json() }
      } catch (error) {
        log(`usage call failed: ${String(error)}`)
        return { kind: 'failed', status: 0 }
      }
    },
    async fetchProfile(accessToken) {
      try {
        const res = await fetch(PROFILE_URL, { headers: oauthHeaders(accessToken), signal: AbortSignal.timeout(20_000) })
        return res.ok ? await res.json() : undefined
      } catch (error) {
        log(`profile call failed: ${String(error)}`)
        return undefined
      }
    },
    async authStatus(slot) {
      const { code, stdout } = await run('claude', ['auth', 'status', '--json'], { ...env, ...slotEnv(slot) }, 20_000)
      return code === 0 ? identityFromStatus(stdout) : undefined
    },
    signIn(slot, email): SignInRun {
      const child = spawn('claude', ['auth', 'login', '--claudeai', ...(email ? ['--email', email] : [])], {
        env: { ...env, ...slotEnv(slot) },
        stdio: ['ignore', 'ignore', 'pipe'],
      })
      let errors = ''
      child.stderr.on('data', chunk => {
        errors += String(chunk)
      })
      const done = new Promise<{ code: number | null; errors: string }>(resolve => {
        child.on('error', error => resolve({ code: null, errors: `${errors}${String(error)}` }))
        child.on('close', code => resolve({ code, errors }))
      })
      return { done, cancel: () => void child.kill('SIGTERM') }
    },
    async signOut(slot) {
      await run('claude', ['auth', 'logout'], { ...env, ...slotEnv(slot) }, 20_000)
    },
    async makeSlot(id) {
      const slot = path.join(home, '.claude', 'accounts', id)
      await fs.promises.mkdir(slot, { recursive: true, mode: 0o700 })
      await fs.promises.writeFile(path.join(slot, 'README'), `Claude account ${id}, kept by the account-rotator mod.\n`)
      return slot
    },
    isAlive(pid) {
      try {
        process.kill(pid, 0)
        return true
      } catch (error) {
        return (error as NodeJS.ErrnoException).code === 'EPERM'
      }
    },
    save(persisted) {
      pending = persisted
      saveTimer ??= setTimeout(flush, 500)
    },
    log,
  }
}

function readPersisted(file: string, log: (text: string) => void): Persisted | undefined {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8')) as Persisted
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') log(`state file unreadable, starting fresh: ${String(error)}`)
    return undefined
  }
}

function isRunning(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === 'EPERM'
  }
}

/** Takes the lock file, or answers the pid that holds it. */
function takeLock(file: string): number | undefined {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const fd = fs.openSync(file, 'wx', 0o600)
      fs.writeSync(fd, String(process.pid))
      fs.closeSync(fd)
      return undefined
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error
      const holder = Number(fs.readFileSync(file, 'utf8').trim())
      if (Number.isInteger(holder) && holder > 0 && holder !== process.pid && isRunning(holder)) return holder
      // A lock left by a coordinator that died.
      fs.rmSync(file, { force: true })
    }
  }
  throw new Error(`could not take ${file}`)
}

export type ServeOptions = { isManaged: boolean; idleExitMs?: number }

/** Runs the coordinator until it is told to stop. Resolves once it has. */
export async function serve(options: ServeOptions): Promise<void> {
  const dir = stateDir()
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 })
  fs.chmodSync(dir, 0o700)
  const log = makeLogger(logPath(dir))
  const holder = takeLock(lockPath(dir))
  if (holder !== undefined) {
    log(`another coordinator runs (pid ${holder}); exiting`)
    return
  }
  const sock = socketPath(dir)
  fs.rmSync(sock, { force: true })
  const deps = nodeDeps(dir, log)
  const coordinator = new Coordinator(deps, { version: VERSION, pid: process.pid, startedAt: Date.now(), isManaged: options.isManaged }, readPersisted(statePath(dir), log))

  let lastActivity = Date.now()
  let stopping: Promise<void> | undefined
  const server = http.createServer((req, res) => {
    lastActivity = Date.now()
    const url = new URL(req.url ?? '/', 'http://coordinator')
    const query = Object.fromEntries(url.searchParams)
    let raw = ''
    req.setEncoding('utf8')
    req.on('data', chunk => {
      raw += chunk
      if (raw.length > 1024 * 1024) req.destroy()
    })
    req.on('end', () => {
      let body: unknown
      try {
        body = raw === '' ? undefined : JSON.parse(raw)
      } catch {
        res.writeHead(400, { 'content-type': 'application/json' })
        res.end(JSON.stringify({ error: 'The body is not JSON.' }))
        return
      }
      const isPoll = req.method === 'GET' && url.pathname === '/state' && query.since !== undefined
      const session = query.session
      if (isPoll && session !== undefined) {
        coordinator.pollOpened(session)
        res.on('close', () => coordinator.pollClosed(session))
      }
      void coordinator.handle({ method: req.method ?? 'GET', path: url.pathname, query, body }).then(answer => {
        lastActivity = Date.now()
        if (!res.destroyed) {
          const text = JSON.stringify(answer.body)
          res.writeHead(answer.status, { 'content-type': 'application/json', 'content-length': Buffer.byteLength(text) })
          res.end(text)
        }
        if (answer.shutdown) void stop('asked to shut down')
      })
    })
  })
  server.keepAliveTimeout = 5_000
  server.requestTimeout = 0
  server.headersTimeout = 10_000

  const stop = (why: string): Promise<void> => {
    stopping ??= new Promise<void>(resolve => {
      log(`stopping: ${why}`)
      coordinator.stop()
      server.close(() => resolve())
      server.closeAllConnections()
      setTimeout(resolve, 2_000).unref()
    }).then(() => {
      fs.rmSync(sock, { force: true })
      fs.rmSync(lockPath(dir), { force: true })
    })
    return stopping
  }
  process.on('SIGTERM', () => void stop('SIGTERM').then(() => process.exit(0)))
  process.on('SIGINT', () => void stop('SIGINT').then(() => process.exit(0)))

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(sock, () => resolve())
  })
  fs.chmodSync(sock, 0o600)
  log(`coordinator ${VERSION} listening on ${sock} (pid ${process.pid}${options.isManaged ? ', launchd' : ''})`)
  void coordinator.start().catch(error => log(`start failed: ${String(error)}`))

  if (options.idleExitMs !== undefined) {
    const idle = options.idleExitMs
    const timer = setInterval(() => {
      if (coordinator.state().sessions.length === 0 && Date.now() - lastActivity > idle) void stop('idle')
    }, 60_000)
    timer.unref()
  }
  await new Promise<void>(resolve => {
    const wait = setInterval(() => {
      if (stopping !== undefined) {
        clearInterval(wait)
        void stopping.then(resolve)
      }
    }, 250)
  })
}
