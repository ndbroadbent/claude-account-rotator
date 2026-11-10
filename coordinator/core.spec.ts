import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import type { Persisted, SignInRun, Stored, UsageAnswer } from './core.ts'
import { BACKOFF_MS, Coordinator, FRESH_MS, MAX_WAIT_MS, POLL_MS, STALE_SESSION_MS, TICK_MS } from './core.ts'
import { retryAfter } from './server.ts'
import type { Identity } from '../hooks/model.ts'

const NOW = Date.parse('2026-11-09T10:00:00Z')
const HOUR = 3600_000
const SLOT2 = '/Users/tester/.claude/accounts/2'
const SLOT3 = '/Users/tester/.claude/accounts/3'

const blob = (token: string, expiresAt = NOW + 6 * HOUR) => ({
  state: 'present' as const,
  credential: { accessToken: token, refreshToken: `refresh-${token}`, expiresAt, refreshTokenExpiresAt: NOW + 20 * 24 * HOUR, plan: 'max' },
})

type Timer = { at: number; fn: () => void; every?: number; id: number }

/** Everything beneath the coordinator, in memory, on a clock the test moves. */
class World {
  now = NOW
  timers: Timer[] = []
  nextTimer = 1
  /** slot -> what its stored sign-in reads as */
  stored: Record<string, Stored> = {}
  /** access token -> [5-hour %, week %] */
  /** token -> [5-hour %, or null as since November 2026; week %] */
  usage: Record<string, [number | null, number]> = {}
  /** access token -> email */
  owners: Record<string, string> = {}
  tiers: Record<string, string> = {}
  /** slot -> who `claude auth status` says */
  status: Record<string, Identity> = {}
  usageCalls: string[] = []
  /** Tokens whose usage calls fail, as a 429 or an outage does. */
  failing: Record<string, { status: number; retryAfterMs?: number }> = {}
  profileCalls: string[] = []
  signIns: { slot: string; email?: string; finish: (code: number | null, errors?: string) => void; cancelled: boolean }[] = []
  signOuts: string[] = []
  alive = new Set<number>()
  saved: Persisted | undefined
  logs: string[] = []

  deps() {
    return {
      now: () => this.now,
      after: (ms: number, fn: () => void) => this.timer(ms, fn),
      every: (ms: number, fn: () => void) => this.timer(ms, fn, ms),
      readStored: async (slot: string): Promise<Stored> => this.stored[slot] ?? { state: 'absent' },
      fetchUsage: async (token: string): Promise<UsageAnswer> => {
        this.usageCalls.push(token)
        const failure = this.failing[token]
        if (failure !== undefined) return { kind: 'failed', ...failure }
        const u = this.usage[token]
        if (u === undefined) return { kind: 'rejected' }
        return {
          kind: 'ok',
          body: {
            five_hour: u[0] === null ? null : { utilization: u[0], resets_at: '2026-11-09T12:00:00Z' },
            seven_day: { utilization: u[1], resets_at: '2026-11-14T03:00:00Z' },
          },
        }
      },
      fetchProfile: async (token: string) => {
        this.profileCalls.push(token)
        const email = this.owners[token]
        return email === undefined
          ? undefined
          : { account: { email }, organization: { uuid: `org-${email}`, name: 'Org', rate_limit_tier: this.tiers[token] ?? 'default_claude_max_20x' } }
      },
      authStatus: async (slot: string) => this.status[slot],
      signIn: (slot: string, email: string | undefined): SignInRun => {
        let finish: (code: number | null, errors?: string) => void = () => undefined
        const done = new Promise<{ code: number | null; errors: string }>(resolve => {
          finish = (code, errors = '') => resolve({ code, errors })
        })
        const run = { slot, ...(email === undefined ? {} : { email }), finish, cancelled: false }
        this.signIns.push(run)
        return {
          done,
          cancel: () => {
            run.cancelled = true
            finish(null, 'cancelled')
          },
        }
      },
      signOut: async (slot: string) => {
        this.signOuts.push(slot)
      },
      makeSlot: async (id: string) => `/Users/tester/.claude/accounts/${id}`,
      isAlive: (pid: number) => this.alive.has(pid),
      save: (p: Persisted) => {
        this.saved = structuredClone(p)
      },
      log: (text: string) => {
        this.logs.push(text)
      },
    }
  }

  timer(ms: number, fn: () => void, every?: number) {
    const t: Timer = { at: this.now + ms, fn, id: this.nextTimer++, ...(every === undefined ? {} : { every }) }
    this.timers.push(t)
    return () => {
      this.timers = this.timers.filter(x => x !== t)
    }
  }

  /** Moves the clock on, running each timer as it comes due and letting its work settle. */
  async advance(ms: number) {
    const until = this.now + ms
    for (;;) {
      const due = this.timers.filter(t => t.at <= until).sort((a, b) => a.at - b.at || a.id - b.id)[0]
      if (due === undefined) break
      this.now = due.at
      if (due.every === undefined) this.timers = this.timers.filter(t => t !== due)
      else due.at += due.every
      due.fn()
      await settle()
    }
    this.now = until
    await settle()
  }
}

async function settle() {
  for (let i = 0; i < 20; i += 1) await new Promise(resolve => setImmediate(resolve))
}

/** Three Max 20x logins, signed in, at 20%, 40% and 60% of their 5-hour windows. */
function threeLogins(w: World): Persisted {
  w.stored[''] = blob('t1')
  w.stored[SLOT2] = blob('t2')
  w.stored[SLOT3] = blob('t3')
  w.usage = { t1: [20, 30], t2: [40, 50], t3: [60, 70] }
  w.owners = { t1: 'one@example.com', t2: 'two@example.com', t3: 'three@example.com' }
  const org = (email: string) => ({ email, orgId: `org-${email}`, orgName: 'Org' })
  return {
    accounts: [
      { id: '1', slot: '', ...org('one@example.com') },
      { id: '2', slot: SLOT2, ...org('two@example.com') },
      { id: '3', slot: SLOT3, ...org('three@example.com') },
    ],
    readings: {},
    health: {},
    holders: {},
    settings: { rotateTo: 'reset', footer: { session: 'braille', week: 'bars', sessionPercent: true, weekPercent: true, active: 'lines', fill: 'left' } },
    chrome: { accountIds: [] },
  }
}

async function started(w: World, persisted?: Persisted) {
  const c = new Coordinator(w.deps(), { version: '0.4.0', pid: 1, startedAt: NOW, isManaged: false }, persisted)
  await c.start()
  await settle()
  return c
}

const account = (c: Coordinator, id: string) => {
  const a = c.state().accounts.find(x => x.id === id)
  assert.ok(a, `account ${id}`)
  return a
}

describe('polling', () => {
  test('reads each login once at start and polls its usage once per login, however many sessions run', async () => {
    const w = new World()
    const c = await started(w, threeLogins(w))
    assert.deepEqual(w.usageCalls.sort(), ['t1', 't2', 't3'])
    for (let i = 0; i < 30; i += 1) c.register({ id: `s${i}`, slot: i % 2 === 0 ? '' : SLOT2, isInteractive: true })
    w.usageCalls = []
    await w.advance(POLL_MS + TICK_MS)
    assert.deepEqual(w.usageCalls.sort(), ['t1', 't2', 't3'], 'one poll per login in a poll period')
    assert.equal(account(c, '1').sessionCount, 15)
    assert.equal(account(c, '2').sessionCount, 15)
  })

  test("a session's readings keep its login fresh, so the coordinator doesn't poll it", async () => {
    const w = new World()
    const c = await started(w, threeLogins(w))
    w.usageCalls = []
    for (let minute = 1; minute <= 12; minute += 1) {
      await w.advance(60_000)
      c.report('1', { fiveHour: { pct: 20 + minute, resetsAt: '2026-11-09T12:00:00Z' }, at: w.now })
    }
    assert.ok(!w.usageCalls.includes('t1'), 'login 1 was never polled')
    assert.ok(w.usageCalls.includes('t2'), 'idle logins still are')
    assert.equal(account(c, '1').reading?.fiveHour?.pct, 32)
  })

  test('a reading that shows the same as the last moves its time on without waking long polls', async () => {
    const w = new World()
    const c = await started(w, threeLogins(w))
    const before = c.state().version
    c.report('1', { fiveHour: { pct: 20.2, resetsAt: '2026-11-09T12:00:00Z' }, sevenDay: { pct: 30, resetsAt: '2026-11-14T03:00:00Z' }, at: w.now + 1 })
    assert.equal(c.state().version, before)
    c.report('1', { fiveHour: { pct: 25, resetsAt: '2026-11-09T12:00:00Z' }, sevenDay: { pct: 30, resetsAt: '2026-11-14T03:00:00Z' }, at: w.now + 2 })
    assert.equal(c.state().version, before + 1)
  })

  test('an older reading never replaces a newer one', async () => {
    const w = new World()
    const c = await started(w, threeLogins(w))
    c.report('1', { fiveHour: { pct: 50 }, at: w.now - 10_000 })
    assert.equal(account(c, '1').reading?.fiveHour?.pct, 20)
  })

  test('a keychain that cannot be read is said once, and leaves the health as it was', async () => {
    const w = new World()
    const c = await started(w, threeLogins(w))
    w.stored[SLOT2] = { state: 'unreadable', code: 51 }
    await w.advance(TICK_MS)
    await w.advance(TICK_MS)
    assert.equal(c.state().notices.filter(n => n.text.includes('keychain')).length, 1)
    assert.equal(account(c, '2').health.kind, 'ok')
  })
})

describe('rotation', () => {
  test('sessions on a spent login go to the login whose week resets soonest; none when all are spent', async () => {
    const w = new World()
    const c = await started(w, threeLogins(w))
    assert.equal(account(c, '1').moveTo, undefined)
    c.report('1', { fiveHour: { pct: 95, resetsAt: '2026-11-09T12:00:00Z' }, at: w.now + 1 })
    assert.equal(account(c, '1').isSpent, true)
    assert.equal(account(c, '1').moveTo, '2', 'same resets: the most room breaks the tie')
    c.report('2', { fiveHour: { pct: 92 }, at: w.now + 1 })
    c.report('3', { fiveHour: { pct: 99 }, at: w.now + 1 })
    assert.equal(account(c, '1').moveTo, undefined)
  })

  test('with soonest reset, sessions on a login with room go to one whose week resets over an hour sooner', async () => {
    const w = new World()
    const c = await started(w, threeLogins(w))
    // Every week resets together.
    assert.equal(account(c, '1').moveTo, undefined)
    c.report('2', { sevenDay: { pct: 0, resetsAt: '2026-11-12T03:00:00Z' }, at: w.now + 1 })
    assert.equal(account(c, '1').moveTo, '2')
    assert.equal(account(c, '3').moveTo, '2')
    assert.equal(account(c, '2').moveTo, undefined)
    // Half an hour sooner than login 2's is not enough to move for.
    c.report('3', { sevenDay: { pct: 10, resetsAt: '2026-11-12T03:30:00Z' }, at: w.now + 1 })
    assert.equal(account(c, '3').moveTo, undefined)
    c.patchSettings({ rotateTo: 'room' })
    assert.equal(account(c, '1').moveTo, undefined)
  })

  test('a turn that hits the limit before the usage shows it counts the 5-hour window full, with one usage call for many sessions', async () => {
    const w = new World()
    const c = await started(w, threeLogins(w))
    w.usageCalls = []
    await w.advance(FRESH_MS)
    await Promise.all([c.spent('1'), c.spent('1'), c.spent('1')])
    assert.deepEqual(w.usageCalls, ['t1'])
    assert.equal(account(c, '1').reading?.fiveHour?.pct, 100)
    assert.equal(account(c, '1').moveTo, '2')
  })

  test('with only a weekly limit, a turn that hits it counts the week full', async () => {
    const w = new World()
    const persisted = threeLogins(w)
    for (const token of Object.keys(w.usage)) w.usage[token] = [null, w.usage[token]?.[1] ?? 0]
    const c = await started(w, persisted)
    assert.equal(account(c, '1').reading?.fiveHour, undefined)
    await w.advance(FRESH_MS)
    await c.spent('1')
    assert.equal(account(c, '1').reading?.sevenDay?.pct, 100)
    assert.equal(account(c, '1').isSpent, true)
    assert.equal(c.state().combined.fiveHour, undefined)
  })

  test('a rejected sign-in needs a sign-in, announced once, and the first session to claim the notice notifies', async () => {
    const w = new World()
    const c = await started(w, threeLogins(w))
    c.rejected('2')
    c.rejected('2')
    const notices = c.state().notices.filter(n => n.notify)
    assert.equal(notices.length, 1)
    const id = notices[0]?.id ?? -1
    assert.equal(c.claim(id, 'a'), true)
    assert.equal(c.claim(id, 'b'), false)
    assert.equal(account(c, '2').health.kind, 'login-needed')
  })
})

describe('usage calls', () => {
  test('after a failed call (a 429) the next waits a minute, then twice as long each time, and a Retry-After longer than that', async () => {
    const w = new World()
    const c = await started(w, threeLogins(w))
    w.usageCalls = []
    w.failing.t1 = { status: 429 }
    await w.advance(FRESH_MS)
    await c.check('1', 'fresh')
    assert.deepEqual(w.usageCalls, ['t1'])
    // Sessions asking for fresh usage every 30 s don't get a call each: the first waits a minute.
    await w.advance(FRESH_MS)
    await c.check('1', 'fresh')
    assert.deepEqual(w.usageCalls, ['t1'])
    await w.advance(BACKOFF_MS - FRESH_MS)
    await c.check('1', 'fresh')
    assert.deepEqual(w.usageCalls, ['t1', 't1'])
    // The second failure waits two minutes.
    await w.advance(BACKOFF_MS)
    await c.check('1', 'fresh')
    assert.deepEqual(w.usageCalls, ['t1', 't1'])
    await w.advance(BACKOFF_MS)
    delete w.failing.t1
    await c.check('1', 'fresh')
    assert.deepEqual(w.usageCalls, ['t1', 't1', 't1'])
    // A call that answers clears the wait.
    await w.advance(FRESH_MS)
    await c.check('1', 'fresh')
    assert.equal(w.usageCalls.length, 4)
    // A Retry-After of ten minutes is kept, past the minute.
    w.usageCalls = []
    w.failing.t2 = { status: 429, retryAfterMs: 10 * 60_000 }
    await c.check('2', 'fresh')
    // The other logins' polls go on meanwhile; login 2 waits, polls included.
    const twos = () => w.usageCalls.filter(t => t === 't2')
    await w.advance(9 * 60_000)
    await c.check('2', 'fresh')
    assert.deepEqual(twos(), ['t2'])
    await w.advance(60_000)
    await c.check('2', 'fresh')
    assert.deepEqual(twos(), ['t2', 't2'])
  })

  test('a Retry-After header reads as seconds or as a date', () => {
    const now = Date.parse('2026-11-10T00:00:00Z')
    assert.equal(retryAfter('120', now), 120_000)
    assert.equal(retryAfter('Tue, 10 Nov 2026 00:05:00 GMT', now), 300_000)
    assert.equal(retryAfter(null, now), undefined)
    assert.equal(retryAfter('soon', now), undefined)
  })
})

describe('combined usage', () => {
  test('weighs each login by its plan and leaves out logins that need a sign-in', async () => {
    const w = new World()
    const persisted = threeLogins(w)
    w.tiers = { t3: 'default_claude_max_5x' }
    const c = await started(w, persisted)
    // Ultra (formerly Max 20x) gives 10x Pro's week, Max 5x gives 5x: an Ultra login counts twice a Max one.
    assert.equal(account(c, '1').weight, 10)
    assert.equal(account(c, '3').weight, 5)
    // (10*20 + 10*40 + 5*60) / 25
    assert.equal(c.state().combined.fiveHour?.pct, Math.round(((10 * 20 + 10 * 40 + 5 * 60) / 25) * 10) / 10)
    c.rejected('2')
    assert.equal(c.state().combined.fiveHour?.pct, Math.round(((10 * 20 + 5 * 60) / 15) * 10) / 10)
    assert.equal(c.state().combined.fiveHour?.accounts, 2)
    assert.equal(c.state().combined.fiveHour?.nextResetAt, '2026-11-09T12:00:00.000Z')
  })

  test('a window past its reset counts as empty', async () => {
    const w = new World()
    const c = await started(w, threeLogins(w))
    await w.advance(2 * HOUR + 60_000)
    assert.equal(c.state().combined.fiveHour?.pct, 0)
  })
})

describe('long polls', () => {
  test('answer at once when the state moved, on the next change, or after the wait', async () => {
    const w = new World()
    const c = await started(w, threeLogins(w))
    const v = c.state().version
    let isDone = false
    void c.waitForChange(v - 1, 50_000).then(() => (isDone = true))
    await settle()
    assert.equal(isDone, true, 'already moved')

    isDone = false
    void c.waitForChange(v, 50_000).then(() => (isDone = true))
    await settle()
    assert.equal(isDone, false)
    c.patchSettings({ rotateTo: 'room' })
    await settle()
    assert.equal(isDone, true, 'woken by a change')

    isDone = false
    void c.waitForChange(c.state().version, 120_000).then(() => (isDone = true))
    await w.advance(MAX_WAIT_MS - 1)
    assert.equal(isDone, false)
    await w.advance(1)
    assert.equal(isDone, true, 'capped at the longest wait')
  })

  test('GET /state through the API waits the same way', async () => {
    const w = new World()
    const c = await started(w, threeLogins(w))
    const v = c.state().version
    let answer: { status: number; body: unknown } | undefined
    void c.handle({ method: 'GET', path: '/state', query: { since: String(v), wait: '5000' }, body: undefined }).then(a => (answer = a))
    await w.advance(4_000)
    assert.equal(answer, undefined)
    await w.advance(1_000)
    // Set by the handler meanwhile: the assertion above narrowed it to undefined.
    assert.equal((answer as { status: number } | undefined)?.status, 200)
  })
})

describe('identity', () => {
  test('a new sign-in in a slot is asked about once, and names the login', async () => {
    const w = new World()
    const persisted = threeLogins(w)
    persisted.accounts = persisted.accounts.map(a => (a.id === '2' ? { id: '2', slot: SLOT2 } : a))
    const c = await started(w, persisted)
    assert.equal(account(c, '2').email, 'two@example.com')
    assert.equal(account(c, '2').tier, 'default_claude_max_20x')
    w.profileCalls = []
    await w.advance(TICK_MS)
    assert.deepEqual(w.profileCalls, [], 'the same token is not asked about again')
  })

  test("a slot that holds another login's sign-in needs its own again", async () => {
    const w = new World()
    const c = await started(w, threeLogins(w))
    w.stored[SLOT3] = blob('t2b')
    w.owners.t2b = 'two@example.com'
    w.usage.t2b = [40, 50]
    await w.advance(TICK_MS)
    assert.deepEqual(account(c, '3').health, { kind: 'login-needed', why: 'signed in as account 2 now' })
  })

  test("a /login that signs Claude Code's login in to another account renames it, and says so", async () => {
    const w = new World()
    const c = await started(w, threeLogins(w))
    w.stored[''] = blob('t9')
    w.owners.t9 = 'nine@example.com'
    w.usage.t9 = [5, 5]
    await c.check('1', 'fresh')
    assert.equal(account(c, '1').email, 'nine@example.com')
    assert.ok(c.state().notices.some(n => n.text.startsWith("Claude Code's login, account 1, is nine@example.com")))
  })
})

describe('sign-in', () => {
  test('signs in every login that needs it, one at a time, and adopts who signed in', async () => {
    const w = new World()
    const persisted = threeLogins(w)
    delete w.stored[SLOT2]
    delete w.stored[SLOT3]
    const c = await started(w, persisted)
    assert.equal(account(c, '2').health.kind, 'login-needed')
    c.signIn()
    assert.equal(w.signIns.length, 1)
    assert.equal(account(c, '2').health.kind, 'logging-in')
    assert.equal(c.state().signIn?.accountId, '2')
    w.stored[SLOT2] = blob('t2')
    w.status[SLOT2] = { email: 'two@example.com', orgId: 'org-two@example.com', orgName: 'Org', plan: 'max' }
    w.signIns[0]?.finish(0)
    await settle()
    assert.equal(account(c, '2').health.kind, 'ok')
    assert.equal(w.signIns.length, 2, 'then the next')
    assert.equal(w.signIns[1]?.slot, SLOT3)
  })

  test('a sign-in as a login already on the list asks for another account', async () => {
    const w = new World()
    const persisted = threeLogins(w)
    delete w.stored[SLOT3]
    const c = await started(w, persisted)
    c.signIn('3')
    w.status[SLOT3] = { email: 'one@example.com', orgId: 'org-one@example.com' }
    w.signIns[0]?.finish(0)
    await settle()
    assert.deepEqual(account(c, '3').health, { kind: 'login-needed', why: 'that was account 1 (one@example.com · Org) again' })
    assert.ok(c.state().notices.some(n => n.text.includes('Sign out of claude.ai in your browser')))
  })

  test('a sign-in that fails says why; cancel ends the queue', async () => {
    const w = new World()
    const persisted = threeLogins(w)
    delete w.stored[SLOT2]
    delete w.stored[SLOT3]
    const c = await started(w, persisted)
    c.signIn()
    w.signIns[0]?.finish(1, 'browser closed')
    await settle()
    assert.ok(c.state().notices.some(n => n.text === 'Sign-in for Claude account 2 did not finish: browser closed'))
    c.cancelSignIn()
    await settle()
    assert.equal(w.signIns[1]?.cancelled, true)
    assert.equal(c.state().signIn, undefined)
  })

  test('a coordinator that died mid sign-in counts it unfinished', async () => {
    const w = new World()
    const persisted = threeLogins(w)
    persisted.health = { '2': { kind: 'logging-in', since: NOW - 1000 } }
    delete w.stored[SLOT2]
    const c = await started(w, persisted)
    assert.equal(account(c, '2').health.kind, 'login-needed')
  })
})

describe('sessions', () => {
  test('a session on a slot nobody registered adopts it as a new login', async () => {
    const w = new World()
    const c = await started(w, threeLogins(w))
    const slot = '/Users/tester/elsewhere'
    w.stored[slot] = blob('t4')
    w.owners.t4 = 'four@example.com'
    w.usage.t4 = [1, 1]
    const id = c.register({ id: 's', slot, isInteractive: true })
    await settle()
    assert.equal(id, '4')
    assert.equal(account(c, '4').email, 'four@example.com')
  })

  test('a session id arrives percent-encoded in a path, as sessions send it, and is found', async () => {
    const w = new World()
    const c = await started(w, threeLogins(w))
    c.register({ id: 'session-1:4242', slot: '', isInteractive: true })
    const path = `/sessions/${encodeURIComponent('session-1:4242')}`
    assert.equal((await c.handle({ method: 'PATCH', path, query: {}, body: { accountId: '2' } })).status, 200)
    assert.equal(c.state().sessions[0]?.accountId, '2')
    assert.equal((await c.handle({ method: 'PATCH', path: '/sessions/%E0%A4%A', query: {}, body: {} })).status, 400)
  })

  test('a session whose process ended, or that went quiet, is dropped', async () => {
    const w = new World()
    const c = await started(w, threeLogins(w))
    w.alive.add(100)
    c.register({ id: 'live', pid: 100, slot: '', isInteractive: true })
    c.register({ id: 'dead', pid: 101, slot: '', isInteractive: true })
    c.register({ id: 'quiet', slot: '', isInteractive: true })
    c.register({ id: 'polling', slot: '', isInteractive: true })
    c.pollOpened('polling')
    await w.advance(TICK_MS)
    assert.deepEqual(c.state().sessions.map(s => s.id).sort(), ['live', 'polling', 'quiet'])
    await w.advance(STALE_SESSION_MS)
    assert.deepEqual(c.state().sessions.map(s => s.id).sort(), ['live', 'polling'])
  })
})

describe('removing a login', () => {
  test("Claude Code's own login can't be removed", async () => {
    const w = new World()
    const c = await started(w, threeLogins(w))
    const answer = await c.handle({ method: 'POST', path: '/accounts/1/remove', query: {}, body: {} })
    assert.equal(answer.status, 400)
  })

  test('sessions on it move off first; then it is signed out and dropped', async () => {
    const w = new World()
    const c = await started(w, threeLogins(w))
    c.register({ id: 's', slot: SLOT2, isInteractive: true })
    await c.remove('2')
    assert.equal(account(c, '2').isRetiring, true)
    assert.equal(account(c, '2').moveTo, '1')
    assert.deepEqual(w.signOuts, [])
    c.patchSession('s', { accountId: '1' })
    await settle()
    assert.deepEqual(w.signOuts, [SLOT2])
    assert.equal(c.state().accounts.some(a => a.id === '2'), false)
  })

  test('is refused while sessions use it and nothing can take over', async () => {
    const w = new World()
    const c = await started(w, threeLogins(w))
    c.register({ id: 's', slot: SLOT2, isInteractive: true })
    c.rejected('1')
    c.rejected('3')
    const answer = await c.handle({ method: 'POST', path: '/accounts/2/remove', query: {}, body: {} })
    assert.equal(answer.status, 409)
  })
})

describe('the API', () => {
  test('refuses what it does not know and readings that are not readings', async () => {
    const w = new World()
    const c = await started(w, threeLogins(w))
    assert.equal((await c.handle({ method: 'GET', path: '/nope', query: {}, body: undefined })).status, 404)
    assert.equal((await c.handle({ method: 'POST', path: '/readings', query: {}, body: { accountId: '1', reading: { pct: 3 } } })).status, 400)
    assert.equal((await c.handle({ method: 'PATCH', path: '/settings', query: {}, body: { rotateTo: 'sideways' } })).status, 400)
    assert.equal((await c.handle({ method: 'PATCH', path: '/sessions/ghost', query: {}, body: { accountId: '1' } })).status, 404)
  })

  test('keeps what it learned across a restart', async () => {
    const w = new World()
    const c = await started(w, threeLogins(w))
    c.patchSettings({ rotateTo: 'order' })
    c.patchChrome({ accountId: '2', seen: { accountId: '2', isSeen: true } })
    c.stop()
    const saved = w.saved
    assert.ok(saved)
    const again = await started(new World(), saved)
    assert.equal(again.state().settings.rotateTo, 'order')
    assert.equal(again.state().chrome.accountId, '2')
    assert.deepEqual(again.state().chrome.accountIds, ['2'])
  })
})
