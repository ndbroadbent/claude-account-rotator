// The coordinator: the one process that holds what every session shares. It
// reads each login's sign-in, polls usage once per login (not once per session),
// runs browser sign-ins one at a time, keeps the settings, counts the sessions
// on each login and says where sessions on a spent login go. Sessions and the
// menu bar app reach it over HTTP on a Unix socket (server.ts); this file is
// plain TypeScript with everything outside it passed in, so tests drive it
// in memory.

import type {
  Account,
  AccountState,
  CoordinatorInfo,
  FooterStyle,
  Health,
  Holder,
  Notice,
  Reading,
  RotateTo,
  SessionInfo,
  SharedState,
  View,
} from '../types/index.d.ts'
import {
  DEFAULT_FOOTER,
  DEFAULT_ROTATE_TO,
  EMPTY_VIEW,
  ROTATE_TOS,
  combinedUsage,
  fingerprint,
  footerStyleFrom,
  freeId,
  healthOf,
  identityFromProfile,
  isLoginOf,
  isSpent,
  label,
  pickTarget,
  readingFromUsage,
  rotateToFrom,
  sameLogin,
  shouldLeave,
  spentReading,
  weightOf,
} from '../hooks/model.ts'
import type { Credential, Identity } from '../hooks/model.ts'

/** How often the coordinator re-reads every sign-in and prunes dead sessions. */
export const TICK_MS = 60_000
/** A login's usage is polled once its last reading is this old: sessions' responses keep busy logins fresher. */
export const POLL_MS = 5 * 60_000
/** A check asked for fresh usage reuses a reading at most this old, so 30 sessions settling at once make one call. */
export const FRESH_MS = 30_000
/** A session with no open long poll and no request for this long is gone, even where its process can't be checked. */
export const STALE_SESSION_MS = 10 * 60_000
/** The longest a long poll waits. */
export const MAX_WAIT_MS = 55_000
const NOTICE_KEEP = 20

export type Stored = { state: 'present'; credential: Credential | undefined } | { state: 'absent' } | { state: 'unreadable'; code: number }
export type UsageAnswer = { kind: 'ok'; body: unknown } | { kind: 'rejected' } | { kind: 'failed'; status: number }
export type SignInRun = { done: Promise<{ code: number | null; errors: string }>; cancel: () => void }
export type Cancel = () => void

/** What the coordinator keeps on disk: what it can't read again from the logins themselves. */
export type Persisted = {
  accounts: Account[]
  readings: Record<string, Reading>
  health: Record<string, Health>
  holders: Record<string, Holder>
  settings: { rotateTo: RotateTo; footer: FooterStyle }
  chrome: { accountId?: string; accountIds: string[]; miss?: string }
}

/** Everything outside the coordinator: the clock, the logins' stored sign-ins, Anthropic's endpoints, `claude auth`, disk. */
export type Deps = {
  now: () => number
  after: (ms: number, fn: () => void) => Cancel
  every: (ms: number, fn: () => void) => Cancel
  readStored: (slot: string) => Promise<Stored>
  fetchUsage: (accessToken: string) => Promise<UsageAnswer>
  /** The profile endpoint's body for a token, or undefined when the call failed. */
  fetchProfile: (accessToken: string) => Promise<unknown>
  /** Who a slot is signed in as, from `claude auth status --json`. */
  authStatus: (slot: string) => Promise<Identity | undefined>
  signIn: (slot: string, email: string | undefined) => SignInRun
  signOut: (slot: string) => Promise<void>
  /** Makes a new login's directory and answers its path. */
  makeSlot: (id: string) => Promise<string>
  /** Whether a process still runs. */
  isAlive: (pid: number) => boolean
  save: (persisted: Persisted) => void
  log: (text: string) => void
}

export type Request = { method: string; path: string; query: Record<string, string>; body: unknown }
export type Response = { status: number; body: unknown; shutdown?: boolean }

class HttpError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

function windowOf(value: unknown): { pct: number; resetsAt?: string } | undefined {
  if (!isObject(value) || typeof value.pct !== 'number' || !Number.isFinite(value.pct)) return undefined
  return { pct: value.pct, ...(typeof value.resetsAt === 'string' ? { resetsAt: value.resetsAt } : {}) }
}

/** A reading a client sent, checked: undefined when it isn't one. */
export function readingFrom(value: unknown): Reading | undefined {
  if (!isObject(value) || typeof value.at !== 'number') return undefined
  const fiveHour = windowOf(value.fiveHour)
  const sevenDay = windowOf(value.sevenDay)
  if (fiveHour === undefined && sevenDay === undefined) return undefined
  return { ...(fiveHour ? { fiveHour } : {}), ...(sevenDay ? { sevenDay } : {}), at: value.at }
}

/** Two readings that show the same: within half a point on each window, with the same resets. */
function sameReading(a: Reading | undefined, b: Reading): boolean {
  if (a === undefined) return false
  const same = (x: Reading['fiveHour'], y: Reading['fiveHour']) =>
    (x === undefined && y === undefined) || (x !== undefined && y !== undefined && Math.abs(x.pct - y.pct) < 0.5 && x.resetsAt === y.resetsAt)
  return same(a.fiveHour, b.fiveHour) && same(a.sevenDay, b.sevenDay)
}

export class Coordinator {
  private readonly deps: Deps
  private readonly info: CoordinatorInfo
  private accounts: Account[] = []
  private readings: Record<string, Reading> = {}
  private health: Record<string, Health> = {}
  private holders: Record<string, Holder> = {}
  private expiresAt: Record<string, number> = {}
  private readonly retiring = new Set<string>()
  private settings: Persisted['settings'] = { rotateTo: DEFAULT_ROTATE_TO, footer: DEFAULT_FOOTER }
  private chrome: Persisted['chrome'] = { accountIds: [] }
  private readonly sessions = new Map<string, SessionInfo>()
  private readonly openPolls = new Map<string, number>()
  private notices: Notice[] = []
  private nextNoticeId = 1
  private readonly claims = new Map<number, string>()
  private signing: { accountId: string; since: number; run: SignInRun } | undefined
  private signQueue: string[] = []
  private version = 1
  private readonly waiters = new Set<() => void>()
  private readonly inflight = new Map<string, Promise<void>>()
  private readonly usageAt: Record<string, number> = {}
  private readonly unreadable = new Set<string>()
  private readonly stops: Cancel[] = []
  private isTicking = false

  constructor(deps: Deps, info: CoordinatorInfo, persisted?: Persisted) {
    this.deps = deps
    this.info = info
    if (persisted !== undefined) this.load(persisted)
    if (!this.accounts.some(a => a.slot === '')) this.accounts = [{ id: '1', slot: '' }, ...this.accounts.filter(a => a.id !== '1')]
    for (const [id, h] of Object.entries(this.health)) {
      // A sign-in a coordinator before this one ran never finished.
      if (h.kind === 'logging-in') this.health[id] = { kind: 'login-needed', why: 'sign-in not finished' }
    }
  }

  private load(p: Persisted): void {
    this.accounts = Array.isArray(p.accounts) ? p.accounts.filter(a => isObject(a) && typeof a.id === 'string' && typeof a.slot === 'string') : []
    const ids = new Set(this.accounts.map(a => a.id))
    const keep = <T>(record: Record<string, T> | undefined): Record<string, T> =>
      Object.fromEntries(Object.entries(isObject(record) ? record : {}).filter(([id]) => ids.has(id))) as Record<string, T>
    this.readings = keep(p.readings)
    this.health = keep(p.health)
    this.holders = keep(p.holders)
    this.settings = { rotateTo: rotateToFrom(p.settings?.rotateTo), footer: footerStyleFrom(p.settings?.footer) }
    const chromeId = p.chrome?.accountId
    this.chrome = {
      ...(typeof chromeId === 'string' && ids.has(chromeId) ? { accountId: chromeId } : {}),
      accountIds: (Array.isArray(p.chrome?.accountIds) ? p.chrome.accountIds : []).filter(id => typeof id === 'string' && ids.has(id)),
      ...(typeof p.chrome?.miss === 'string' ? { miss: p.chrome.miss } : {}),
    }
  }

  /** Starts the periodic checks and reads every login once. */
  start(): Promise<void> {
    this.stops.push(this.deps.every(TICK_MS, () => void this.tick()))
    this.changed()
    return this.boot()
  }

  stop(): void {
    for (const stop of this.stops.splice(0)) stop()
    this.signing?.run.cancel()
    for (const wake of [...this.waiters]) wake()
  }

  private async boot(): Promise<void> {
    await this.checkAll('poll')
    // Logins whose token has run out are named from what `claude auth login` left in their folder.
    for (const account of this.accounts.filter(a => a.email === undefined || a.orgId === undefined)) {
      const who = await this.deps.authStatus(account.slot).catch(() => undefined)
      if (who === undefined) continue
      this.updateAccount(account.id, who)
    }
  }

  // ------------------------------------------------------------ state

  private changed(): void {
    this.version += 1
    this.persist()
    for (const wake of [...this.waiters]) wake()
  }

  private persist(): void {
    const health = Object.fromEntries(Object.entries(this.health).filter(([, h]) => h.kind !== 'logging-in'))
    this.deps.save({ accounts: this.accounts, readings: this.readings, health, holders: this.holders, settings: this.settings, chrome: this.chrome })
  }

  /** The view the model's functions read, from the coordinator's side: every login, no session's own. */
  private view(activeId: string): View {
    return {
      ...EMPTY_VIEW,
      accounts: this.accounts,
      readings: this.readings,
      health: this.health,
      holders: this.holders,
      rotateTo: this.settings.rotateTo,
      footer: this.settings.footer,
      retiring: [...this.retiring],
      activeId,
    }
  }

  private liveSessions(): SessionInfo[] {
    return [...this.sessions.values()]
  }

  private sessionCount(accountId: string): number {
    return this.liveSessions().filter(s => s.accountId === accountId).length
  }

  /** Where sessions on a login go once they must leave it. */
  moveTo(accountId: string, now = this.deps.now()): string | undefined {
    const view = this.view(accountId)
    return shouldLeave(view, now) ? pickTarget(view, now)?.id : undefined
  }

  state(): SharedState {
    const now = this.deps.now()
    const accounts: AccountState[] = this.accounts.map(a => {
      const reading = this.readings[a.id]
      const holder = this.holders[a.id]
      const moveTo = this.moveTo(a.id, now)
      return {
        ...a,
        health: this.health[a.id] ?? { kind: 'login-needed', why: 'not read yet' },
        ...(reading === undefined ? {} : { reading }),
        ...(holder === undefined ? {} : { holder }),
        ...(this.expiresAt[a.id] === undefined ? {} : { expiresAt: this.expiresAt[a.id] }),
        weight: weightOf(a),
        isSpent: isSpent(reading, now),
        ...(this.retiring.has(a.id) ? { isRetiring: true } : {}),
        ...(moveTo === undefined ? {} : { moveTo }),
        sessionCount: this.sessionCount(a.id),
      }
    })
    return {
      version: this.version,
      coordinator: this.info,
      now,
      accounts,
      combined: combinedUsage(this.accounts, this.readings, this.health, now),
      settings: this.settings,
      chrome: this.chrome,
      sessions: this.liveSessions(),
      notices: this.notices,
      ...(this.signing === undefined ? {} : { signIn: { accountId: this.signing.accountId, since: this.signing.since } }),
    }
  }

  /** Resolves once the state moves past `since`, or after `ms`. */
  waitForChange(since: number, ms: number): Promise<void> {
    if (since !== this.version) return Promise.resolve()
    return new Promise(resolve => {
      const wake = () => {
        this.waiters.delete(wake)
        cancel()
        resolve()
      }
      const cancel = this.deps.after(Math.min(Math.max(ms, 0), MAX_WAIT_MS), wake)
      this.waiters.add(wake)
    })
  }

  private find(id: string): Account | undefined {
    return this.accounts.find(a => a.id === id)
  }

  private need(id: string): Account {
    const account = this.find(id)
    if (account === undefined) throw new HttpError(404, `No Claude account ${id}.`)
    return account
  }

  private updateAccount(id: string, change: Partial<Account>): void {
    const before = this.find(id)
    if (before === undefined) return
    const after = { ...before, ...change }
    if (JSON.stringify(after) === JSON.stringify(before)) return
    this.accounts = this.accounts.map(a => (a.id === id ? after : a))
    this.changed()
  }

  /** Stores a login's health; a login that could serve and can't now is announced. */
  private setHealth(id: string, health: Health): void {
    const before = this.health[id]
    if (JSON.stringify(before) === JSON.stringify(health)) return
    this.health = { ...this.health, [id]: health }
    if (health.kind === 'login-needed' && before?.kind === 'ok') {
      const account = this.find(id)
      this.addNotice(`Claude account ${label(account)} needs a sign-in (${health.why}). Click ⚠${id} under the prompt.`, true, id)
    }
    this.changed()
  }

  /** A newer reading of a login; one that shows the same as the last moves its time on without waking anyone. */
  private putReading(id: string, reading: Reading): void {
    const before = this.readings[id]
    if (before !== undefined && before.at > reading.at) return
    this.readings = { ...this.readings, [id]: reading }
    if (sameReading(before, reading)) this.persist()
    else this.changed()
  }

  private addNotice(text: string, notify: boolean, accountId?: string): void {
    const notice: Notice = { id: this.nextNoticeId++, at: this.deps.now(), text, notify, ...(accountId === undefined ? {} : { accountId }) }
    this.notices = [...this.notices, notice].slice(-NOTICE_KEEP)
    const kept = new Set(this.notices.map(n => n.id))
    for (const id of this.claims.keys()) if (!kept.has(id)) this.claims.delete(id)
    this.deps.log(`notice: ${text}`)
    this.changed()
  }

  // ------------------------------------------------------------ checks

  private async tick(): Promise<void> {
    if (this.isTicking) return
    this.isTicking = true
    try {
      this.prune()
      await this.finishRetirements()
      await this.checkAll('poll')
    } catch (error) {
      this.deps.log(`tick failed: ${String(error)}`)
    } finally {
      this.isTicking = false
    }
  }

  async checkAll(usage: 'poll' | 'fresh'): Promise<void> {
    for (const account of [...this.accounts]) {
      try {
        await this.check(account.id, usage)
      } catch (error) {
        this.deps.log(`checking account ${account.id} failed: ${String(error)}`)
      }
    }
  }

  /** Re-reads one login, one check at a time per login: a fresh check waiting on a running one goes again after it. */
  async check(id: string, usage: 'poll' | 'fresh'): Promise<void> {
    const running = this.inflight.get(id)
    if (running !== undefined) {
      await running
      if (usage === 'poll' || !this.wantsUsage(id, 'fresh', this.deps.now())) return
    }
    const run = this.runCheck(id, usage).finally(() => this.inflight.delete(id))
    this.inflight.set(id, run)
    await run
  }

  private wantsUsage(id: string, usage: 'poll' | 'fresh', now: number): boolean {
    const most = usage === 'fresh' ? FRESH_MS : POLL_MS
    const readAt = this.readings[id]?.at ?? 0
    const askedAt = this.usageAt[id] ?? 0
    return now - readAt >= most && now - askedAt >= most
  }

  /**
   * Re-reads one login's stored sign-in: who it belongs to and, while its token
   * is live, its usage when the last reading is old enough. One that is another
   * login's on the list leaves this login needing its own.
   */
  private async runCheck(id: string, usage: 'poll' | 'fresh'): Promise<void> {
    const account = this.find(id)
    if (account === undefined || this.health[id]?.kind === 'logging-in') return
    const now = this.deps.now()
    const stored = await this.deps.readStored(account.slot)
    if (this.find(id) === undefined) return
    if (stored.state === 'unreadable') {
      if (!this.unreadable.has(id)) {
        this.unreadable.add(id)
        this.addNotice(`Could not read Claude account ${id}'s sign-in from the keychain (exit ${stored.code}); is it locked?`, false, id)
      }
      return
    }
    this.unreadable.delete(id)
    const credential = stored.state === 'present' ? stored.credential : undefined
    this.setExpiry(id, credential?.expiresAt)
    let health = healthOf(credential, now)
    if (health.kind === 'ok' && credential !== undefined) {
      const isLive = credential.expiresAt > now + 60_000
      const holder = await this.holderOf(account, credential, isLive)
      const twin = holder === undefined ? undefined : this.followSignIn(id, holder.who)
      if (twin !== undefined) health = { kind: 'login-needed', why: `signed in as account ${twin.id} now` }
      else if (isLive && this.wantsUsage(id, usage, now)) {
        this.usageAt[id] = now
        const answer = await this.deps.fetchUsage(credential.accessToken)
        if (answer.kind === 'rejected') health = { kind: 'login-needed', why: 'sign-in rejected' }
        if (answer.kind === 'failed') this.deps.log(`usage for account ${id}: HTTP ${answer.status}`)
        if (answer.kind === 'ok') {
          const reading = readingFromUsage(answer.body, this.deps.now())
          if (reading !== undefined && this.find(id) !== undefined) this.putReading(id, reading)
        }
      }
    }
    if (this.find(id) === undefined || this.healthKind(id) === 'logging-in') return
    this.setHealth(id, health)
  }

  /** Read fresh: a check's awaits let a sign-in start meanwhile. */
  private healthKind(id: string): Health['kind'] | undefined {
    return this.health[id]?.kind
  }

  private setExpiry(id: string, expiresAt: number | undefined): void {
    if (this.expiresAt[id] === expiresAt) return
    const next = { ...this.expiresAt }
    if (expiresAt === undefined) delete next[id]
    else next[id] = expiresAt
    this.expiresAt = next
    this.changed()
  }

  /**
   * Who a login's sign-in belongs to: as answered for its token before, else
   * asked while the token is live. A /login in a session on a login signs in
   * there, and a new sign-in brings a new token, so it is asked about again.
   */
  private async holderOf(account: Account, credential: Credential, isLive: boolean): Promise<Holder | undefined> {
    const token = await fingerprint(credential.refreshToken ?? credential.accessToken)
    const known = this.holders[account.id]
    if (known?.token === token) return known
    if (!isLive) return undefined
    const who = identityFromProfile(await this.deps.fetchProfile(credential.accessToken))
    if (who?.email === undefined || this.find(account.id) === undefined) return undefined
    const holder: Holder = { token, who: { ...who, email: who.email, ...(credential.plan === undefined ? {} : { plan: credential.plan }) } }
    this.holders = { ...this.holders, [account.id]: holder }
    this.changed()
    return holder
  }

  /**
   * A login's sign-in belongs to `who`. Another login on the list: this one
   * holds that one's sign-in, answered so it asks for its own again. Else the
   * login is who signed in, its name and plan kept current, and told when that
   * is another account than before: a /login in a session on it did that.
   */
  private followSignIn(id: string, who: Identity): Account | undefined {
    const own = this.find(id)
    if (own === undefined) return undefined
    const isSame = own.email === undefined || isLoginOf(own, who)
    const twin = isSame ? undefined : this.accounts.find(a => a.id !== own.id && isLoginOf(a, who))
    if (twin !== undefined) return twin
    const followed = { ...own, ...who }
    this.updateAccount(id, who)
    if (!isSame) {
      const name = `${followed.email}${followed.orgName ? ` · ${followed.orgName}` : ''}`
      this.addNotice(
        own.slot === ''
          ? `Claude Code's login, account ${own.id}, is ${name} now: new sessions start on it.`
          : `Claude account ${own.id} is ${name} now: a /login in a session on account ${own.id} signs in there, not Claude Code's login.`,
        false,
        id,
      )
    }
    return undefined
  }

  /** A turn hit the usage limit on a login: read it now, and where the usage doesn't show it yet, count its 5-hour window full. */
  async spent(id: string): Promise<void> {
    this.need(id)
    await this.check(id, 'fresh')
    const now = this.deps.now()
    const r = this.readings[id]
    if (this.health[id]?.kind === 'login-needed' || isSpent(r, now)) return
    this.putReading(id, spentReading(r, now))
  }

  /** A turn's sign-in was rejected on a login. */
  rejected(id: string): void {
    this.need(id)
    this.setHealth(id, { kind: 'login-needed', why: 'sign-in rejected' })
  }

  /** A response's own usage, as a session on the login saw it. */
  report(id: string, reading: Reading): void {
    this.need(id)
    if (this.health[id]?.kind === 'logging-in') return
    this.putReading(id, reading)
  }

  // ------------------------------------------------------------ sessions

  register(input: { id: string; pid?: number; slot: string; cwd?: string; isInteractive: boolean }): string {
    let account = this.accounts.find(a => a.slot === input.slot)
    if (account === undefined) {
      // Started on a slot nobody registered (set by hand, or by another tool): adopt it.
      account = { id: freeId(this.accounts), slot: input.slot }
      this.accounts = [...this.accounts, account]
      void this.check(account.id, 'fresh').catch(error => this.deps.log(`checking account ${account?.id} failed: ${String(error)}`))
    }
    const now = this.deps.now()
    const before = this.sessions.get(input.id)
    this.sessions.set(input.id, {
      id: input.id,
      accountId: account.id,
      ...(input.pid === undefined ? {} : { pid: input.pid }),
      ...(input.cwd === undefined ? {} : { cwd: input.cwd }),
      isInteractive: input.isInteractive,
      isBlocked: before?.isBlocked ?? false,
      isPending: false,
      since: before?.since ?? now,
      lastSeen: now,
    })
    this.changed()
    return account.id
  }

  patchSession(id: string, patch: { accountId?: string; isBlocked?: boolean; isPending?: boolean }): void {
    const session = this.sessions.get(id)
    if (session === undefined) throw new HttpError(404, `No session ${id}: register it again.`)
    if (patch.accountId !== undefined) this.need(patch.accountId)
    const next = { ...session, ...patch, lastSeen: this.deps.now() }
    this.sessions.set(id, next)
    if (JSON.stringify({ ...session, lastSeen: 0 }) !== JSON.stringify({ ...next, lastSeen: 0 })) {
      this.changed()
      void this.finishRetirements()
    }
  }

  dropSession(id: string): void {
    if (!this.sessions.delete(id)) return
    this.changed()
    void this.finishRetirements()
  }

  /** A request from a session: it lives. */
  seen(id: string): void {
    const session = this.sessions.get(id)
    if (session !== undefined) session.lastSeen = this.deps.now()
  }

  pollOpened(id: string): void {
    this.openPolls.set(id, (this.openPolls.get(id) ?? 0) + 1)
    this.seen(id)
  }

  pollClosed(id: string): void {
    const open = (this.openPolls.get(id) ?? 1) - 1
    if (open <= 0) this.openPolls.delete(id)
    else this.openPolls.set(id, open)
    this.seen(id)
  }

  /** Drops sessions whose process has ended; one whose process can't be checked, once it has gone quiet. */
  prune(): void {
    const now = this.deps.now()
    let isChanged = false
    for (const session of this.liveSessions()) {
      const isQuiet = (this.openPolls.get(session.id) ?? 0) === 0 && now - session.lastSeen > STALE_SESSION_MS
      const isDead = session.pid === undefined ? isQuiet : !this.deps.isAlive(session.pid)
      if (isDead) {
        this.sessions.delete(session.id)
        this.openPolls.delete(session.id)
        isChanged = true
      }
    }
    if (isChanged) this.changed()
  }

  // ------------------------------------------------------------ accounts

  /** Adds a login in a new slot under ~/.claude/accounts and signs it in. */
  async add(): Promise<string> {
    const id = freeId(this.accounts)
    const slot = await this.deps.makeSlot(id)
    this.accounts = [...this.accounts, { id, slot }]
    this.health = { ...this.health, [id]: { kind: 'login-needed', why: 'not signed in yet' } }
    this.changed()
    this.queueSignIn([id])
    return id
  }

  /** Removes a login: sessions on it move off first, then it is signed out and dropped. */
  async remove(id: string): Promise<void> {
    const account = this.need(id)
    if (account.slot === '') throw new HttpError(400, "Claude Code's own login can't be removed; sign it in to another account with /login instead.")
    const count = this.sessionCount(id)
    if (count > 0) {
      const view = this.view(id)
      const target = pickTarget({ ...view, retiring: [...this.retiring, id] }, this.deps.now())
      if (target === undefined) {
        throw new HttpError(409, `Claude account ${id} is in use by ${count} session${count === 1 ? '' : 's'} and no other account can take over yet; not removed.`)
      }
    }
    this.retiring.add(id)
    this.changed()
    await this.finishRetirements()
  }

  private async finishRetirements(): Promise<void> {
    for (const id of [...this.retiring]) {
      if (this.sessionCount(id) > 0) continue
      this.retiring.delete(id)
      const account = this.find(id)
      if (account === undefined) continue
      if (this.signing?.accountId === id) this.signing.run.cancel()
      this.signQueue = this.signQueue.filter(x => x !== id)
      await this.deps.signOut(account.slot).catch(error => this.deps.log(`signing out account ${id} failed: ${String(error)}`))
      this.accounts = this.accounts.filter(a => a.id !== id)
      const drop = <T>(record: Record<string, T>): Record<string, T> => Object.fromEntries(Object.entries(record).filter(([k]) => k !== id))
      this.readings = drop(this.readings)
      this.health = drop(this.health)
      this.holders = drop(this.holders)
      this.expiresAt = drop(this.expiresAt)
      this.chrome = {
        ...(this.chrome.accountId === id || this.chrome.accountId === undefined ? {} : { accountId: this.chrome.accountId }),
        accountIds: this.chrome.accountIds.filter(x => x !== id),
        ...(this.chrome.miss === undefined || this.chrome.miss === id ? {} : { miss: this.chrome.miss }),
      }
      this.addNotice(`Removed Claude account ${label(account)}.`, false)
    }
  }

  // ------------------------------------------------------------ sign-in

  /** Signs one login in, or every login that needs it, one after another. */
  signIn(id?: string): void {
    if (id !== undefined) {
      this.need(id)
      this.queueSignIn([id])
      return
    }
    this.queueSignIn(this.accounts.filter(a => this.health[a.id]?.kind === 'login-needed').map(a => a.id))
  }

  cancelSignIn(): void {
    this.signQueue = []
    this.signing?.run.cancel()
  }

  private queueSignIn(ids: string[]): void {
    for (const id of ids) {
      if (this.signing?.accountId !== id && !this.signQueue.includes(id)) this.signQueue.push(id)
    }
    this.pump()
  }

  private pump(): void {
    if (this.signing !== undefined) return
    const id = this.signQueue.shift()
    if (id === undefined) return
    const account = this.find(id)
    if (account === undefined) return this.pump()
    const since = this.deps.now()
    // The child opens the browser itself; its paste-a-code link goes unread.
    const run = this.deps.signIn(account.slot, account.email)
    this.signing = { accountId: id, since, run }
    this.health = { ...this.health, [id]: { kind: 'logging-in', since } }
    this.changed()
    void run.done
      .catch(error => ({ code: null, errors: String(error) }))
      .then(async ({ code, errors }) => {
        this.signing = undefined
        if (this.find(id) !== undefined) {
          this.health = { ...this.health, [id]: { kind: 'login-needed', why: 'sign-in not finished' } }
          this.changed()
          if (code !== 0) {
            this.addNotice(`Sign-in for Claude account ${id} did not finish${errors.trim() ? `: ${errors.trim().slice(0, 160)}` : '.'}`, false, id)
          } else await this.adoptSignIn(id)
        }
      })
      .catch(error => this.deps.log(`sign-in of account ${id} failed: ${String(error)}`))
      .finally(() => this.pump())
  }

  /** After a browser sign-in: who signed in, and is it a login already on the list? */
  private async adoptSignIn(id: string): Promise<void> {
    const account = this.find(id)
    if (account === undefined) return
    const who = await this.deps.authStatus(account.slot).catch(() => undefined)
    const twin = who === undefined ? undefined : this.accounts.find(a => a.id !== id && sameLogin(a, who))
    if (twin !== undefined) {
      this.setHealth(id, { kind: 'login-needed', why: `that was account ${label(twin)} again` })
      this.addNotice(
        `Claude account ${id} signed in as account ${label(twin)}. Sign out of claude.ai in your browser (or pick another organization), then sign in again.`,
        false,
        id,
      )
      return
    }
    if (who !== undefined) this.updateAccount(id, who)
    this.setHealth(id, { kind: 'ok' })
    await this.check(id, 'fresh')
  }

  // ------------------------------------------------------------ settings, Chrome, notices

  patchSettings(patch: { rotateTo?: unknown; footer?: unknown }): void {
    if (patch.rotateTo !== undefined) {
      if (typeof patch.rotateTo !== 'string' || !(ROTATE_TOS as readonly string[]).includes(patch.rotateTo)) {
        throw new HttpError(400, `rotateTo is one of ${ROTATE_TOS.join(', ')}.`)
      }
      this.settings = { ...this.settings, rotateTo: patch.rotateTo as RotateTo }
    }
    if (patch.footer !== undefined) {
      if (!isObject(patch.footer)) throw new HttpError(400, 'footer is an object.')
      this.settings = { ...this.settings, footer: footerStyleFrom({ ...this.settings.footer, ...patch.footer }) }
    }
    this.changed()
  }

  patchChrome(patch: { accountId?: unknown; seen?: unknown; miss?: unknown }): void {
    const next = { ...this.chrome }
    if (patch.accountId === null) delete next.accountId
    else if (typeof patch.accountId === 'string') next.accountId = this.need(patch.accountId).id
    if (isObject(patch.seen) && typeof patch.seen.accountId === 'string' && typeof patch.seen.isSeen === 'boolean') {
      const id = patch.seen.accountId
      next.accountIds = patch.seen.isSeen ? [...new Set([...next.accountIds, this.need(id).id])] : next.accountIds.filter(x => x !== id)
    }
    if (patch.miss === null) delete next.miss
    else if (typeof patch.miss === 'string') next.miss = patch.miss
    if (JSON.stringify(next) === JSON.stringify(this.chrome)) return
    this.chrome = next
    this.changed()
  }

  claim(noticeId: number, sessionId: string): boolean {
    const notice = this.notices.find(n => n.id === noticeId)
    if (notice === undefined || !notice.notify || this.claims.has(noticeId)) return false
    this.claims.set(noticeId, sessionId)
    return true
  }

  // ------------------------------------------------------------ the API

  /** Answers one request, as docs/coordinator-api.md says. */
  async handle(req: Request): Promise<Response> {
    try {
      return await this.route(req)
    } catch (error) {
      if (error instanceof HttpError) return { status: error.status, body: { error: error.message } }
      this.deps.log(`${req.method} ${req.path} failed: ${error instanceof Error ? (error.stack ?? error.message) : String(error)}`)
      return { status: 500, body: { error: String(error) } }
    }
  }

  private async route({ method, path, query, body }: Request): Promise<Response> {
    const b = isObject(body) ? body : {}
    const ok = (extra: Record<string, unknown> = {}): Response => ({ status: 200, body: { ...extra, state: this.state() } })
    let parts: string[]
    try {
      // Ids arrive percent-encoded: a session's holds a colon.
      parts = path.split('/').filter(Boolean).map(decodeURIComponent)
    } catch {
      throw new HttpError(400, `${path} is not a valid path.`)
    }
    const sessionId = typeof b.sessionId === 'string' ? b.sessionId : query.session
    if (sessionId !== undefined) this.seen(sessionId)
    const route = `${method} /${parts.map((p, i) => (i === 1 && (parts[0] === 'accounts' || parts[0] === 'sessions' || parts[0] === 'notices') ? ':id' : p)).join('/')}`
    const id = parts[1] ?? ''
    switch (route) {
      case 'GET /hello':
        return { status: 200, body: { name: 'claude-account-rotator', ...this.info } }
      case 'GET /state': {
        const since = Number(query.since)
        if (query.since !== undefined && Number.isFinite(since)) await this.waitForChange(since, Number(query.wait ?? 0) || 0)
        return { status: 200, body: this.state() }
      }
      case 'POST /sessions': {
        if (typeof b.id !== 'string' || b.id === '' || typeof b.slot !== 'string') throw new HttpError(400, 'A session needs an id and a slot.')
        const accountId = this.register({
          id: b.id,
          slot: b.slot,
          isInteractive: b.isInteractive === true,
          ...(typeof b.pid === 'number' ? { pid: b.pid } : {}),
          ...(typeof b.cwd === 'string' ? { cwd: b.cwd } : {}),
        })
        return ok({ accountId })
      }
      case 'PATCH /sessions/:id':
        this.patchSession(id, {
          ...(typeof b.accountId === 'string' ? { accountId: b.accountId } : {}),
          ...(typeof b.isBlocked === 'boolean' ? { isBlocked: b.isBlocked } : {}),
          ...(typeof b.isPending === 'boolean' ? { isPending: b.isPending } : {}),
        })
        return ok()
      case 'DELETE /sessions/:id':
        this.dropSession(id)
        return { status: 200, body: { ok: true } }
      case 'POST /readings': {
        const reading = readingFrom(b.reading)
        if (typeof b.accountId !== 'string' || reading === undefined) throw new HttpError(400, 'A reading needs an accountId and a reading.')
        this.report(b.accountId, reading)
        return ok()
      }
      case 'POST /accounts/:id/spent':
        await this.spent(id)
        return ok()
      case 'POST /accounts/:id/rejected':
        this.rejected(id)
        return ok()
      case 'POST /accounts/:id/check':
        this.need(id)
        await this.check(id, b.fresh === true ? 'fresh' : 'poll')
        return ok()
      case 'POST /check':
        await this.checkAll('fresh')
        return ok()
      case 'POST /accounts':
        return ok({ accountId: await this.add() })
      case 'POST /accounts/:id/remove':
        await this.remove(id)
        return ok()
      case 'POST /signin':
        this.signIn(typeof b.accountId === 'string' ? b.accountId : undefined)
        return ok()
      case 'POST /signin/cancel':
        this.cancelSignIn()
        return ok()
      case 'PATCH /settings':
        this.patchSettings(b)
        return ok()
      case 'PATCH /chrome':
        this.patchChrome(b)
        return ok()
      case 'POST /notices/:id/claim':
        if (typeof b.sessionId !== 'string') throw new HttpError(400, 'A claim needs a sessionId.')
        return { status: 200, body: { claimed: this.claim(Number(id), b.sessionId) } }
      case 'POST /shutdown':
        return { status: 200, body: { ok: true }, shutdown: true }
      default:
        throw new HttpError(404, `No ${method} ${path}.`)
    }
  }
}
