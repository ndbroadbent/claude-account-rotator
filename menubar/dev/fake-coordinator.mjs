#!/usr/bin/env node
// A stand-in for the coordinator (docs/coordinator-api.md), for developing and testing the menu bar app. It serves a
// fixture's State over HTTP on the Unix socket, with the long poll, and takes the calls the app makes:
// GET /hello, GET /state, POST /check, POST /signin, POST /signin/cancel and PATCH /settings.
//
//   CLAUDE_ACCOUNT_ROTATOR_DIR=~/.claude/ar-dev node dev/fake-coordinator.mjs [--fixture <file.json>] [--tick <seconds>]
//
// The fixture's times are shifted so its `now` is the moment the fake starts: resets stay in the future. --tick adds
// a point to every signed-in login's 5-hour usage every few seconds, to watch the app follow the long poll.
// CLAUDE_ACCOUNT_ROTATOR_DIR is required, so the fake never takes the real coordinator's socket.

import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const usage =
  'Usage: CLAUDE_ACCOUNT_ROTATOR_DIR=<dir> node dev/fake-coordinator.mjs [--fixture <file.json>] [--tick <seconds>]'

function fail(message) {
  console.error(`fake-coordinator: ${message}\n${usage}`)
  process.exit(1)
}

// --- Arguments ---

let fixturePath = path.join(here, 'fixtures', 'three-accounts.json')
let tickSeconds = 0
const args = process.argv.slice(2)
for (let i = 0; i < args.length; i++) {
  const flag = args[i]
  const value = () => {
    const v = args[++i]
    if (v === undefined || v.startsWith('--')) fail(`${flag} needs a value`)
    return v
  }
  if (flag === '--fixture') fixturePath = path.resolve(value())
  else if (flag === '--tick') {
    tickSeconds = Number(value())
    if (!(tickSeconds > 0)) fail('--tick takes a number of seconds above 0')
  } else if (flag === '--help' || flag === '-h') {
    console.log(usage)
    process.exit(0)
  } else fail(`unknown argument "${flag}"`)
}

const dirEnv = process.env.CLAUDE_ACCOUNT_ROTATOR_DIR
if (!dirEnv) fail('set CLAUDE_ACCOUNT_ROTATOR_DIR to a short directory, such as ~/.claude/ar-dev')
const dir = path.resolve(dirEnv.replace(/^~(?=$|\/)/, process.env.HOME ?? '~'))
const socketPath = path.join(dir, 'coordinator.sock')
// sockaddr_un holds 104 bytes on macOS, the terminating NUL included.
if (Buffer.byteLength(socketPath) > 100) fail(`the socket path is too long for a Unix socket: ${socketPath}`)

// --- State ---

let fixture
try {
  fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'))
} catch (error) {
  fail(`can't read the fixture ${fixturePath}: ${error.message}`)
}
if (typeof fixture.version !== 'number') fail(`${fixturePath} has no numeric "version": is it a State?`)

const EPOCH_KEYS = new Set(['now', 'startedAt', 'refreshExpiresAt', 'since', 'at', 'expiresAt', 'lastSeen'])
const ISO_KEYS = new Set(['resetsAt', 'nextResetAt'])

/** Moves every time in the fixture by `offset` ms. */
function shiftTimes(value, offset) {
  if (Array.isArray(value)) return value.map((item) => shiftTimes(item, offset))
  if (value === null || typeof value !== 'object') return value
  const out = {}
  for (const [key, v] of Object.entries(value)) {
    if (EPOCH_KEYS.has(key) && typeof v === 'number') out[key] = v + offset
    else if (ISO_KEYS.has(key) && typeof v === 'string' && !Number.isNaN(Date.parse(v)))
      out[key] = new Date(Date.parse(v) + offset).toISOString()
    else out[key] = shiftTimes(v, offset)
  }
  return out
}

const startedAt = Date.now()
const state = shiftTimes(fixture, typeof fixture.now === 'number' ? startedAt - fixture.now : 0)
/** Why each login needed a sign-in, to put back when a sign-in is cancelled. */
const savedWhy = new Map()
const waiters = new Set()

function changed() {
  state.version += 1
  for (const wake of [...waiters]) wake()
}

function snapshot() {
  return { ...state, now: Date.now() }
}

/** `combined` as the coordinator works it out: a mean of the signed-in logins' readings, weighted by plan size. */
function recomputeCombined() {
  for (const key of ['fiveHour', 'sevenDay']) {
    const counted = state.accounts.filter((a) => a.health?.kind !== 'login-needed' && a.reading?.[key])
    const total = counted.reduce((sum, a) => sum + (a.weight ?? 1), 0)
    if (total === 0) {
      delete state.combined[key]
      continue
    }
    const pct = counted.reduce((sum, a) => sum + (a.weight ?? 1) * a.reading[key].pct, 0) / total
    const resets = counted.map((a) => a.reading[key].resetsAt).filter(Boolean).sort()
    state.combined[key] = { pct, accounts: counted.length, ...(resets.length ? { nextResetAt: resets[0] } : {}) }
  }
}

function findAccount(id) {
  const account = state.accounts.find((a) => a.id === id)
  if (!account) throw new HttpError(404, `No login ${id}.`)
  return account
}

class HttpError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

// --- HTTP ---

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = ''
    req.setEncoding('utf8')
    req.on('data', (chunk) => (data += chunk))
    req.on('end', () => {
      if (!data) return resolve({})
      try {
        resolve(JSON.parse(data))
      } catch {
        reject(new HttpError(400, 'The body is not JSON.'))
      }
    })
    req.on('error', reject)
  })
}

/** Waits until the state changes, `ms` pass or the client goes away. */
function waitForChange(res, ms) {
  return new Promise((resolve) => {
    const done = () => {
      clearTimeout(timer)
      waiters.delete(done)
      res.off('close', done)
      resolve()
    }
    const timer = setTimeout(done, ms)
    waiters.add(done)
    res.on('close', done)
  })
}

const routes = {
  'GET /hello': () => ({ name: 'claude-account-rotator coordinator (fake)', version: state.coordinator?.version ?? '0.0.0', pid: process.pid, startedAt }),

  'GET /state': async (_body, url, res) => {
    const since = url.searchParams.get('since')
    const wait = Math.min(Math.max(Number(url.searchParams.get('wait')) || 0, 0), 55_000)
    if (since !== null && Number(since) === state.version && wait > 0) await waitForChange(res, wait)
    return snapshot()
  },

  'POST /check': () => {
    const now = Date.now()
    for (const account of state.accounts) if (account.reading) account.reading.at = now
    changed()
    return { state: snapshot() }
  },

  'POST /signin': (body) => {
    const targets = body.accountId ? [findAccount(String(body.accountId))] : state.accounts.filter((a) => a.health?.kind === 'login-needed')
    if (targets.length === 0) throw new HttpError(409, 'No login needs signing in.')
    const since = Date.now()
    for (const account of targets) {
      if (account.health?.kind === 'login-needed') savedWhy.set(account.id, account.health.why)
      account.health = { kind: 'logging-in', since }
    }
    state.signIn = { accountId: targets[0].id, since }
    changed()
    return { state: snapshot() }
  },

  'POST /signin/cancel': () => {
    for (const account of state.accounts) {
      if (account.health?.kind !== 'logging-in') continue
      account.health = { kind: 'login-needed', why: savedWhy.get(account.id) ?? 'The sign-in was cancelled.' }
    }
    delete state.signIn
    changed()
    return { state: snapshot() }
  },

  'PATCH /settings': (body) => {
    if (body.rotateTo !== undefined && !['reset', 'room', 'order', 'off'].includes(body.rotateTo))
      throw new HttpError(400, 'rotateTo is one of reset, room, order or off.')
    state.settings = {
      ...state.settings,
      ...(body.rotateTo !== undefined ? { rotateTo: body.rotateTo } : {}),
      ...(body.footer !== undefined ? { footer: { ...state.settings.footer, ...body.footer } } : {}),
    }
    changed()
    return { state: snapshot() }
  },
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://coordinator')
  const send = (status, body) => {
    const data = JSON.stringify(body)
    res.writeHead(status, { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) })
    res.end(data)
  }
  const route = routes[`${req.method} ${url.pathname}`]
  try {
    if (!route) throw new HttpError(404, `No ${req.method} ${url.pathname} here.`)
    const body = await readBody(req)
    const answer = await route(body, url, res)
    if (!res.destroyed) send(200, answer)
    console.error(`${req.method} ${url.pathname}${url.search} -> 200 (version ${state.version})`)
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500
    if (!res.destroyed) send(status, { error: error.message })
    console.error(`${req.method} ${url.pathname}${url.search} -> ${status}: ${error.message}`)
  }
})

if (tickSeconds > 0) {
  setInterval(() => {
    const now = Date.now()
    for (const account of state.accounts) {
      if (account.health?.kind !== 'ok' || !account.reading?.fiveHour) continue
      account.reading.fiveHour.pct = Math.min(100, account.reading.fiveHour.pct + 1)
      account.reading.at = now
    }
    recomputeCombined()
    changed()
  }, tickSeconds * 1000)
}

fs.mkdirSync(dir, { recursive: true, mode: 0o700 })
if (fs.existsSync(socketPath)) fs.unlinkSync(socketPath)

function shutdown() {
  server.close()
  try {
    fs.unlinkSync(socketPath)
  } catch {
    // Already gone.
  }
  process.exit(0)
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

server.on('error', (error) => fail(`can't listen on ${socketPath}: ${error.message}`))
server.listen(socketPath, () => {
  console.log(`listening on ${socketPath} (fixture ${path.basename(fixturePath)}, version ${state.version})`)
})
