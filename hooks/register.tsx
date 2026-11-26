import { atom, read, update } from 'claude-code'
import type { EngineInterface, McpToolResult, Register, SessionRateLimit, Timer } from 'claude-code'

import type { Account, FooterStyle, Reading, RotateTo, SharedState, View, Work } from '../types'
import { VERSION, compareVersions, isNodeName } from '../coordinator/version'
import {
  CHROME_SERVER,
  CHROME_TOOL,
  EMPTY_VIEW,
  LEAVE_FIVE_HOUR,
  blockedText,
  browsersFrom,
  canConnectChrome,
  chromeNote,
  isUnansweredCall,
  isOnNormalLogin,
  isPolicyRefusal,
  label,
  pickTarget,
  readingFromLimits,
  sameUsage,
  modelWindow,
  isNearlySpent,
  isSpent,
  shouldLeave,
  viewScope,
  soonerTarget,
  spentReading,
  windowPct,
} from './model'
import { Band, Footer, Pane } from './view'
import { cdTarget, parseStatus } from './work'
import type { Actions } from './view'

// Each session runs this mod. What every session shares (the logins, their usage
// and health, the settings, which sessions are on which login) lives in one
// coordinator process (coordinator/), which sessions reach over a Unix socket:
// it reads the logins' sign-ins and polls their usage once for all of them, and
// runs browser sign-ins. What only a session can do stays here: pointing its own
// requests at a login, reporting its responses' usage, and Claude in Chrome.

type Host = EngineInterface

const PANE = 'claude-accounts'
const TITLE = 'Claude accounts'
/** The dock width the pane asks for: a login's line, its buttons and its usage rows fit on one line each. */
const PANE_COLUMNS = 64
/** Claude Code caches a keychain read for 30 s, so a switch lands within this. */
const SETTLE_MS = 35_000
/** A switch no response has shown after this long is reported as not taken. */
const CONFIRM_GIVE_UP_MS = 4 * 60_000
/** From this percent of a model's own week, a response asks for fresh usage: the poll every 5 minutes could miss the 98% mark. */
const WATCH_MODEL_FROM = 80
/** How often a session asks for its model week afresh, at most. */
const MODEL_FRESH_MS = 60_000
/** When this session last asked for its model week afresh. */
let modelCheckedAt = -Infinity
/**
 * Claude Code refreshes a token 5 minutes before it expires. A refresh that
 * runs while the old login's read is still cached is saved under the new
 * slot, overwriting that login: so no switch this close to the expiry.
 */
const REFRESH_GUARD_MS = 8 * 60_000
/** How long the mod waits on Claude in Chrome to list its browsers, connecting first, before going on without. */
const CHROME_WAIT_MS = 15_000
/** How long a long poll on the coordinator waits for a change: under the 30 s Claude Code gives a `$.http.fetch` before it aborts. */
const WAIT_MS = 25_000
/** A response's usage goes to the coordinator when it moved by this many points, or this long after the last. */
const REPORT_POINTS = 1
const REPORT_EVERY_MS = 60_000
/**
 * A guard against a rotation that goes back and forth: a session whose
 * rotation switched this many times within BOUNCE_WINDOW_MS stops switching on
 * its own for BOUNCE_PAUSE_MS, and says so. Use now still switches.
 */
const BOUNCE_MAX = 3
const BOUNCE_WINDOW_MS = 60_000
const BOUNCE_PAUSE_MS = 15 * 60_000
/** When the rotation last switched this session on its own, epoch ms. */
let autoSwitches: { at: number; from: string; to: string }[] = []
/** Until when the guard holds the rotation back in this session. */
let pausedUntil: number | undefined
const CONTINUE =
  'Claude Code switched to another of your Claude accounts because the previous one hit its usage limit or lost its sign-in. Continue where you left off.'

const viewAtom = atom({ plugin: 'account-rotator', key: 'view' } as const, EMPTY_VIEW)

/**
 * Whether this session's pane shows. A press opens or closes it in its own
 * turn, with no read before: the engine counts an open as the person's only
 * there, and places it at any width; one made after an await waits undrawn
 * below 144 columns. Kept in step with closes by the person and with reloads.
 */
let isPaneShown = false
/** A switch the refresh guard holds back: the latest one asked for, tried again each minute until it goes. */
let held: { target: Account; why: string; how: SwitchHow; timer: Timer } | undefined
/** Logins a switch to did not take this session: the rotation leaves them be; Use now still tries. */
const untaken = new Set<string>()
/** Logins this session left because they filled: the rotation keeps away until their readings drop (isNearlySpent). */
const leftFull = new Set<string>()
/** When this session last moved to another login: until SETTLE_MS after, its requests may still go out as the one before. */
let movedAt: number | undefined
/** When this session last sent a model request: Claude Code reads its sign-in again just before one. */
let lastRequestAt: number | undefined

/**
 * The turns under way in this session, its subagents' too. A switch waits for a
 * response to confirm it, and while one of these runs that response may be on
 * its way: the rotation leaves the switch be. An idle session's switch can
 * wait for days; with none running, the rotation may move it on again.
 */
const turns = new Set<string>()
/** Connect is under way: the rotation waits for it, and browser calls are held back. */
let isConnectingChrome = false
/** This session as the coordinator knows it: its id there, and the details it registers with. */
let session: { key: string; pid?: number; slot: string; cwd?: string; isInteractive: boolean } | undefined
/** The state version this session last read, and the notices it has shown. */
let version = 0
/**
 * When the coordinator whose state the session last took started. A restarted one counts its versions from the start
 * again, so a lower version from it is news, not a late answer.
 */
let versionOf: number | undefined
let lastNotice: number | undefined
/** Claude Code's login, guessed for the Chrome extension, found no browser: not guessed again. */
let chromeMiss: string | undefined
/** The last reading reported, so a busy session doesn't report every response. */
let reported: { id: string; reading: Reading } | undefined

// ---------------------------------------------------------------- the view

/** The view survives a hot reload as the code before wrote it: what this code added starts as in a new session. */
const current = (v: View): View => ({ ...EMPTY_VIEW, ...v })
const getView = async ($: Host): Promise<View> => current(await read($, viewAtom))
const setView = ($: Host, fn: (v: View) => View): Promise<View> => update($, viewAtom, v => fn(current(v)))
/** Something the person should know that nothing on screen says: a toast, on screen for a while. */
const tell = ($: Host, text: string) => $.ui.toast(text, { timeoutMs: 8000 })
const debug = ($: Host, text: string) => $.ui.log(`account-rotator: ${text}`, { to: 'debug' })

// ---------------------------------------------------------------- the coordinator

class CoordinatorError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function socketPath($: Host): Promise<string> {
  const dir = (await $.env.get('CLAUDE_ACCOUNT_ROTATOR_DIR')) ?? `${(await $.env.get('HOME')) ?? ''}/.claude/account-rotator`
  return `${dir}/coordinator.sock`
}

/** One call to the coordinator: its JSON answer, or a CoordinatorError with its words. */
async function api<T>($: Host, method: string, path: string, body?: unknown): Promise<T> {
  const res = await $.http.fetch(`http://coordinator${path}`, {
    method,
    socketPath: await socketPath($),
    headers: { 'content-type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })
  let parsed: unknown
  try {
    parsed = res.text === '' ? undefined : JSON.parse(res.text)
  } catch {
    // An answer that is not JSON is the coordinator failing; the status says so below.
    parsed = undefined
  }
  if (!res.ok) {
    const error = typeof parsed === 'object' && parsed !== null ? (parsed as { error?: unknown }).error : undefined
    throw new CoordinatorError(res.status, typeof error === 'string' ? error : `the coordinator answered HTTP ${res.status}`)
  }
  return parsed as T
}

/** Calls the coordinator and takes the state it answers with. */
async function act($: Host, method: string, path: string, body?: unknown): Promise<SharedState> {
  const answer = await api<{ state: SharedState }>($, method, path, body)
  await applyState($, answer.state)
  return answer.state
}

/**
 * Makes sure a coordinator this version or newer runs: starts one where none
 * answers (launchd's, where it is installed), and upgrades an older one.
 * A node serving the same API (Quietdeck's, or Fleetlayer's claude-auth-manager) is left as it is.
 */
async function ensureCoordinator($: Host): Promise<void> {
  const hello = await api<{ name?: string; version: string }>($, 'GET', '/hello').catch(() => undefined)
  if (hello !== undefined && (isNodeName(hello.name) || compareVersions(hello.version, VERSION) >= 0)) return
  const verb = hello === undefined ? 'start' : 'upgrade'
  let result
  try {
    result = await $.process.run(['node', `${$.plugin.root}/coordinator/cli.ts`, verb], { timeoutMs: 90_000 })
  } catch (error) {
    throw new Error(`could not run node to start the account coordinator (it needs Node.js 22.18 or later on PATH): ${String(error)}`)
  }
  if (result.exitCode !== 0) throw new Error((result.stderr.trim() || result.stdout.trim() || `coordinator ${verb} failed`).slice(0, 300))
}

async function registerSession($: Host): Promise<void> {
  if (session === undefined) return
  const answer = await api<{ accountId: string; state: SharedState }>($, 'POST', '/sessions', {
    id: session.key,
    slot: session.slot,
    isInteractive: session.isInteractive,
    ...(session.pid === undefined ? {} : { pid: session.pid }),
    ...(session.cwd === undefined ? {} : { cwd: session.cwd }),
  })
  await applyState($, answer.state, answer.accountId)
  const view = await getView($)
  // A coordinator that restarted learns again what it can't tell from the slot.
  if (view.isSwitchBlocked || view.pending !== undefined) {
    await patchSession($, { isBlocked: view.isSwitchBlocked === true, isPending: view.pending !== undefined }, false)
  }
}

/** Tells the coordinator what changed in this session; one that no longer knows it (it restarted) gets it registered again, once. */
function patchSession($: Host, patch: { accountId?: string; isBlocked?: boolean; isPending?: boolean; why?: string }, canRegister = true): Promise<void> {
  if (session === undefined) return Promise.resolve()
  return api($, 'PATCH', `/sessions/${encodeURIComponent(session.key)}`, patch)
    .then(() => undefined)
    .catch(async error => {
      if (canRegister && error instanceof CoordinatorError && error.status === 404) await registerSession($)
      else await debug($, `session update failed: ${String(error)}`)
    })
}

/**
 * Takes the coordinator's state into this session's view. A reading this
 * session made itself and the coordinator hasn't caught up with stays. New
 * notices show as toasts; the first session to claim one that asks for it
 * posts the desktop notification.
 */
async function applyState($: Host, state: SharedState, activeId?: string): Promise<void> {
  if (state.version < version && state.coordinator.startedAt === versionOf) return
  version = state.version
  versionOf = state.coordinator.startedAt
  chromeMiss = state.chrome.miss
  const accounts: Account[] = state.accounts.map(a => ({
    id: a.id,
    slot: a.slot,
    ...(a.email === undefined ? {} : { email: a.email }),
    ...(a.orgId === undefined ? {} : { orgId: a.orgId }),
    ...(a.orgName === undefined ? {} : { orgName: a.orgName }),
    ...(a.plan === undefined ? {} : { plan: a.plan }),
    ...(a.tier === undefined ? {} : { tier: a.tier }),
  }))
  await setView($, v => {
    const readings: Record<string, Reading> = {}
    for (const a of state.accounts) {
      const mine = v.readings[a.id]
      const theirs = a.reading
      const newer = mine !== undefined && (theirs === undefined || mine.at > theirs.at) ? mine : theirs
      // A response's reading has no model weeks: the coordinator's poll has them.
      const models = newer?.models ?? theirs?.models
      const reading = newer === undefined || models === undefined ? newer : { ...newer, models }
      if (reading !== undefined) readings[a.id] = reading
    }
    const pick = <T,>(f: (a: SharedState['accounts'][number]) => T | undefined): Record<string, T> =>
      Object.fromEntries(state.accounts.flatMap(a => {
        const value = f(a)
        return value === undefined ? [] : [[a.id, value] as const]
      }))
    return {
      ...v,
      accounts,
      readings,
      health: pick(a => a.health),
      holders: pick(a => a.holder),
      expiresAt: pick(a => a.expiresAt),
      retiring: state.accounts.filter(a => a.isRetiring).map(a => a.id),
      sessionCounts: pick(a => a.sessionCount),
      combined: state.combined,
      footer: state.settings.footer,
      rotateTo: state.settings.rotateTo,
      chromeAccountId: state.chrome.accountId,
      chromeAccountIds: state.chrome.accountIds,
      coordinator: { info: state.coordinator },
      managedBy: state.managedBy,
      ...(activeId === undefined ? {} : { activeId }),
    }
  })
  await showNotices($, state)
}

async function showNotices($: Host, state: SharedState): Promise<void> {
  const newest = state.notices.at(-1)?.id ?? 0
  if (lastNotice === undefined) {
    // A session shows what happens after it starts, not what happened before.
    lastNotice = newest
    return
  }
  const fresh = state.notices.filter(n => n.id > (lastNotice ?? 0))
  lastNotice = Math.max(lastNotice, newest)
  for (const notice of fresh) {
    $.ui.toast(notice.text, { timeoutMs: 8000 })
    if (!notice.notify || session === undefined) continue
    const { claimed } = await api<{ claimed: boolean }>($, 'POST', `/notices/${notice.id}/claim`, { sessionId: session.key }).catch(() => ({ claimed: false }))
    if (claimed) await $.ui.notify(notice.text, { title: TITLE })
  }
}

/**
 * Follows the coordinator for the session's life: a long poll that answers on
 * each change. A coordinator gone (restarted, upgraded, killed) is started
 * again and the session registered there again. Ends with the module.
 */
async function watch($: Host): Promise<void> {
  let failures = 0
  for (;;) {
    try {
      const key = session === undefined ? '' : `&session=${encodeURIComponent(session.key)}`
      const state = await api<SharedState>($, 'GET', `/state?since=${version}&wait=${WAIT_MS}${key}`)
      if (failures > 0) await setView($, v => ({ ...v, coordinator: { info: state.coordinator } }))
      failures = 0
      if (session !== undefined && !state.sessions.some(s => s.id === session?.key)) await registerSession($)
      else if (state.version !== version) await applyState($, state)
      await settlePending($, false)
      await maybeRotate($)
    } catch (error) {
      failures += 1
      const why = error instanceof Error ? error.message : String(error)
      await setView($, v => ({ ...v, coordinator: { ...(v.coordinator?.info ? { info: v.coordinator.info } : {}), error: why } }))
      // Rejects once the module is gone, which ends the loop.
      await $.clock.sleep(Math.min(30_000, 2_000 * failures))
      if (failures === 1 || failures % 5 === 0) {
        await ensureCoordinator($).catch(async e => debug($, `coordinator start failed: ${String(e)}`))
      }
    }
  }
}

// ---------------------------------------------------------------- switching

/** Points this session's requests, and every child it starts after, at a slot's login. */
async function useSlot($: Host, slot: string): Promise<void> {
  const set = await $.env.set('CLAUDE_SECURESTORAGE_CONFIG_DIR', slot === '' ? undefined : slot)
  if (set.deny !== undefined) throw new SwitchHeld(set.deny)
  // Registered again (a coordinator restarted), the session is on the login this slot holds.
  if (session !== undefined) session.slot = slot
}

/**
 * Claude Code's security policy refuses switching in this session: says so
 * once, as a toast and a notification, and the pane says so while it lasts.
 * False when it was said already.
 */
async function blocked($: Host): Promise<boolean> {
  const view = await getView($)
  if (view.isSwitchBlocked) return false
  await setView($, v => ({ ...v, isSwitchBlocked: true }))
  void patchSession($, { isBlocked: true })
  const text = blockedText(isOnNormalLogin(view))
  $.ui.toast(text, { timeoutMs: 15_000 })
  await $.ui.notify(text, { title: TITLE })
  return true
}

/**
 * A switch Claude Code itself held back: in a session that takes its settings
 * from its organization, the write resolves with why, where the security
 * default's refusal rejects. Either way the session can't switch.
 */
class SwitchHeld extends Error {}

/** Whether a switch failed because Claude Code won't let this session switch, however it said so. */
const isRefusal = (error: unknown): boolean => error instanceof SwitchHeld || isPolicyRefusal(error)

/**
 * Sets the slot already in use, which changes nothing: the policy that refuses
 * a switch refuses this too, so a session that cannot switch says so at its start.
 */
async function checkSwitching($: Host, slot: string): Promise<void> {
  try {
    await useSlot($, slot)
  } catch (error) {
    if (isRefusal(error)) await blocked($)
    else await debug($, `switch check failed: ${String(error)}`)
  }
}

/** Why the login in use is left, counted the way the footer shows it: room left, or what is used. */
function whyLeave(view: View, now: number): string {
  if (view.health[view.activeId]?.kind === 'login-needed') return `account ${view.activeId} needs a sign-in`
  if (view.retiring?.includes(view.activeId)) return `account ${view.activeId} is being removed`
  const r = view.readings[view.activeId]
  const five = windowPct(r?.fiveHour, now) ?? 0
  const scope = viewScope(view)
  const model = windowPct(modelWindow(r, scope), now) ?? 0
  const [window, used] =
    five >= LEAVE_FIVE_HOUR
      ? ['5-hour window', five]
      : scope !== undefined && model >= (windowPct(r?.sevenDay, now) ?? 0)
        ? [`${scope} week`, model]
        : ['week', windowPct(r?.sevenDay, now) ?? 0]
  return view.footer.fill === 'left'
    ? `account ${view.activeId} has ${Math.round(100 - used)}% of its ${window} left`
    : `account ${view.activeId} has used ${Math.round(used)}% of its ${window}`
}

/**
 * Where a session goes, once it must leave the login it is on or, with
 * 'soonest reset', once another login's week resets sooner: every session
 * picks from the same shared state, so they agree, leaving out the logins a
 * switch didn't take here.
 */
function targetFor(view: View, now: number): Account | undefined {
  const scope = viewScope(view)
  for (const id of leftFull) if (!isNearlySpent(view.readings[id], now, scope)) leftFull.delete(id)
  const own = { ...view, accounts: view.accounts.filter(a => !untaken.has(a.id) && !leftFull.has(a.id)) }
  return shouldLeave(view, now) ? pickTarget(own, now) : soonerTarget(own, now)
}

/** The rotation check under way: the coordinator's changes, a response and a timer can all ask at once, and one switch answers them all. */
let rotating: Promise<boolean> | undefined

/**
 * Once the active login is spent, locked out or being removed, or with
 * 'soonest reset' once another login's week resets sooner (at start-up too),
 * moves to where the coordinator sends sessions on it, a session whose last
 * switch still waits for a response too; never while the rotation is off,
 * Claude Code's policy refuses it, Connect holds the session where it is, or a
 * turn runs while a switch waits, or the switch waiting is one the person picked.
 */
function maybeRotate($: Host, isOpening = false): Promise<boolean> {
  rotating ??= rotateOnce($, isOpening).finally(() => {
    rotating = undefined
  })
  return rotating
}

async function rotateOnce($: Host, isOpening: boolean): Promise<boolean> {
  const now = await $.clock.now()
  const view = await getView($)
  if (view.accounts.length === 0 || isConnectingChrome || view.isSwitchBlocked || (view.pending !== undefined && (view.pending.isPicked === true || turns.size > 0))) return false
  // A pick of the person's that the refresh guard holds back is the switch made once it lifts.
  if (held?.how.isPicked === true) return false
  const isLeaving = shouldLeave(view, now)
  if (!isLeaving && view.rotateTo !== 'reset') return false
  const isRetiring = view.retiring?.includes(view.activeId) === true
  if (view.rotateTo === 'off' && !isRetiring) return false
  // With none to move to, the band above the prompt says when the next login frees up.
  const target = targetFor(view, now)
  if (target === undefined) return false
  if (isBouncing($, now)) return false
  // The rotation's later looks don't make an opening move the guard holds back before its time.
  const how = { isOpening: isOpening || held?.how.isOpening === true }
  const from = view.activeId
  const moved = await switchTo($, target, isLeaving ? whyLeave(view, now) : `its week resets before account ${view.activeId}'s`, how)
  if (moved) {
    autoSwitches.push({ at: now, from, to: target.id })
    noteLeft(view, now)
  }
  return moved
}

/** A login the session leaves because it filled is kept away from until its reading drops. */
function noteLeft(view: View, now: number): void {
  if (isSpent(view.readings[view.activeId], now, viewScope(view))) leftFull.add(view.activeId)
}

/**
 * Whether the guard holds the rotation back: it switched BOUNCE_MAX times in
 * the last minute (whatever made it), so it stops for a while, telling the
 * person and the coordinator's log once.
 */
function isBouncing($: Host, now: number): boolean {
  if (pausedUntil !== undefined && now < pausedUntil) return true
  autoSwitches = autoSwitches.filter(s => now - s.at < BOUNCE_WINDOW_MS)
  if (autoSwitches.length < BOUNCE_MAX) return false
  pausedUntil = now + BOUNCE_PAUSE_MS
  const path = [autoSwitches[0]?.from, ...autoSwitches.map(s => s.to)].join(' -> ')
  autoSwitches = []
  tell($, `The rotation switched this session ${BOUNCE_MAX} times in a minute (accounts ${path}), so it stops switching here for ${BOUNCE_PAUSE_MS / 60_000} minutes. Use now still switches.`)
  void patchSession($, { why: `rotation paused after switching ${path} within a minute` })
  return true
}

/**
 * The login in use, when its token refreshes too soon for the refresh guard
 * to let the session leave it for `target`. As a session opens, also one whose
 * token has run out, as overnight: Claude Code refreshes it at the session's
 * first request, which may come while its read of the login is still cached,
 * and would save the refreshed token in the slot the session moved to, over
 * that account's sign-in. Other moves don't wait on a token that may never
 * refresh.
 */
function refreshingSoon(view: View, target: Account, now: number, isOpening = false): { account: Account; hasRunOut: boolean } | undefined {
  const active = view.accounts.find(a => a.id === view.activeId)
  if (active === undefined || active.id === target.id) return undefined
  const expiresAt = view.expiresAt?.[active.id]
  if (expiresAt === undefined || expiresAt - now >= REFRESH_GUARD_MS) return undefined
  const hasRunOut = expiresAt <= now
  return hasRunOut && !isOpening ? undefined : { account: active, hasRunOut }
}

/**
 * How a switch is made. Quiet: no toast. Picked (Use now): the rotation leaves
 * it be until a response confirms it. Opening: the move a session makes as it
 * opens, which also waits for a token that has run out.
 */
type SwitchHow = { isQuiet?: boolean; isPicked?: boolean; isOpening?: boolean }

/** Points this session at `target`; false while the refresh guard holds it back, or Claude Code's policy refuses it. */
async function switchTo($: Host, target: Account, why: string, how: SwitchHow = {}): Promise<boolean> {
  const { isQuiet = false, isPicked = false } = how
  // Until the session's first request, which refreshes the token where it is.
  const isOpening = how.isOpening === true && lastRequestAt === undefined
  const turning = refreshingSoon(await getView($), target, await $.clock.now(), isOpening)
  if (turning !== undefined) {
    if (held === undefined) {
      const { account, hasRunOut } = turning
      tell(
        $,
        hasRunOut
          ? `Switching to Claude account ${target.id} once account ${account.id}'s token has refreshed, as this session's first request does.`
          : `Switching to Claude account ${target.id} in a few minutes, once account ${account.id}'s token has refreshed.`,
      )
      const retry = () => {
        if (held !== undefined) void switchTo($, held.target, held.why, held.how)
      }
      held = { target, why, how, timer: $.clock.every(60_000, retry) }
    } else held = { ...held, target, why, how }
    return false
  }
  held?.timer.cancel()
  held = undefined
  await keepChrome($)
  try {
    await useSlot($, target.slot)
  } catch (error) {
    if (!isRefusal(error)) throw error
    // A press of Use now or Rotate now gets an answer, even once the notice has shown.
    if (!(await blocked($))) tell($, blockedText(isOnNormalLogin(await getView($))))
    return false
  }
  const now = await $.clock.now()
  movedAt = now
  reported = undefined
  await setView($, v => ({
    ...v,
    activeId: target.id,
    // A switch made while another waits keeps the login the last response confirmed, which a switch that doesn't take goes back to.
    pending: { id: target.id, from: v.pending?.from ?? v.activeId, since: now, ...(isPicked ? { isPicked: true } : {}) },
    removing: undefined,
  }))
  void patchSession($, { accountId: target.id, isPending: true, why })
  if (!isQuiet) $.ui.toast(`Switched to Claude account ${label(target)}: ${why}.`, { timeoutMs: 6000 })
  return true
}

/**
 * After a switch: which login answered the latest response? The new one
 * (confirmed), or too soon to say. Only a response still answered by the old
 * login minutes later is reported: an idle session has no new response to tell.
 * Then the session is pointed back at the old login, and the footer and pane
 * mark it in use again, as it is the one spending.
 */
async function settlePending($: Host, isResponse: boolean): Promise<void> {
  const { pending, accounts } = await getView($)
  if (pending === undefined) return
  const now = await $.clock.now()
  if (now - pending.since < SETTLE_MS) return
  // Read before the coordinator is asked: a request sent while it answers was not read for yet. Only a request that
  // went out once the switch could land read the new sign-in; a late response to an earlier one says nothing of it.
  const isTried = lastRequestAt !== undefined && lastRequestAt >= pending.since + SETTLE_MS
  const reading = readingFromLimits((await $.session.usage()).rateLimits, now)
  // Only a response can change this session's reading, so only a response asks for fresh usage: idle sessions compare with what the coordinator already has.
  if (isResponse) await act($, 'POST', `/accounts/${pending.id}/check`, { fresh: true }).catch(error => debug($, `check of account ${pending.id} failed: ${String(error)}`))
  if (sameUsage(reading, (await getView($)).readings[pending.id], now)) {
    untaken.delete(pending.id)
    await setView($, v => (isStill(v, pending) ? { ...v, pending: undefined } : v))
    void patchSession($, { isPending: false })
  } else if (isResponse && isTried && now - pending.since > CONFIRM_GIVE_UP_MS) {
    const from = accounts.find(a => a.id === pending.from)
    if (from !== undefined) await act($, 'POST', `/accounts/${from.id}/check`, { fresh: true }).catch(() => undefined)
    // Another switch may have taken this one's place while the coordinator answered.
    if (!isStill(await getView($), pending)) return
    if (from === undefined || !sameUsage(reading, (await getView($)).readings[from.id], now)) {
      await setView($, v => ({ ...v, pending: undefined }))
      void patchSession($, { isPending: false })
      tell($, `The switch to Claude account ${pending.id} has not shown in responses.`)
      return
    }
    untaken.add(pending.id)
    try {
      await useSlot($, from.slot)
      movedAt = now
    } catch (error) {
      await debug($, `switch back failed: ${String(error)}`)
    }
    await setView($, v => ({ ...v, activeId: from.id, pending: undefined }))
    void patchSession($, { accountId: from.id, isPending: false })
    tell(
      $,
      `The switch to Claude account ${pending.id} did not take: responses still use account ${label(from)}, so it shows in use again. ` +
        `The rotation leaves account ${pending.id} be in this session; Use now tries it again.`,
    )
  }
}

/** Whether `pending` is still the switch the session waits on: another may have taken its place meanwhile. */
function isStill(v: View, pending: NonNullable<View['pending']>): boolean {
  return v.pending?.id === pending.id && v.pending.since === pending.since
}

/** Reports a response's usage to the coordinator, once it has moved enough or a while has passed. */
async function report($: Host, id: string, reading: Reading): Promise<void> {
  const last = reported?.id === id ? reported.reading : undefined
  const moved = (a: Reading['fiveHour'], b: Reading['fiveHour']) =>
    (a === undefined) !== (b === undefined) || (a !== undefined && b !== undefined && (Math.abs(a.pct - b.pct) >= REPORT_POINTS || a.resetsAt !== b.resetsAt))
  const isDue = last === undefined || reading.at - last.at >= REPORT_EVERY_MS || moved(last.fiveHour, reading.fiveHour) || moved(last.sevenDay, reading.sevenDay)
  if (!isDue) return
  reported = { id, reading }
  await act($, 'POST', '/readings', { accountId: id, reading, ...(session === undefined ? {} : { sessionId: session.key }) })
}

/** A response's own usage: the active login's, unless a switch is still settling. */
async function onMeasure($: Host, limits: readonly SessionRateLimit[]): Promise<void> {
  const view = await getView($)
  if (view.pending !== undefined) {
    await settlePending($, true)
    // A switch the response confirmed lets the rotation look again now, not at the next response.
    if ((await getView($)).pending === undefined) await maybeRotate($)
    return
  }
  const now = await $.clock.now()
  const given = readingFromLimits(limits, now)
  if (given === undefined || view.accounts.length === 0) return
  const id = view.activeId
  await noteModel($)
  // A response reports no model weeks: keep the coordinator's.
  const models = view.readings[id]?.models
  const reading = models === undefined ? given : { ...given, models }
  await setView($, v => ({ ...v, readings: { ...v.readings, [id]: reading } }))
  await report($, id, given).catch(error => debug($, `usage report failed: ${String(error)}`))
  await refreshModelWeek($, now)
  await maybeRotate($)
}

/** Keeps the view's model as `/model` shows it: a model with its own week (Fable) also leaves a login once that week is spent. */
async function noteModel($: Host): Promise<void> {
  const model = await $.session.model().catch(() => undefined)
  if (model !== undefined && model !== (await getView($)).model) await setView($, v => ({ ...v, model }))
}

/**
 * A response doesn't report a model's own week, so while this session's model
 * week runs high, each response asks the coordinator for fresh usage; it calls
 * the usage endpoint at most once a minute per login, however many ask.
 */
async function refreshModelWeek($: Host, now: number): Promise<void> {
  const view = await getView($)
  const w = modelWindow(view.readings[view.activeId], viewScope(view))
  if (w === undefined || (windowPct(w, now) ?? 0) < WATCH_MODEL_FROM || now - modelCheckedAt < MODEL_FRESH_MS) return
  modelCheckedAt = now
  await act($, 'POST', `/accounts/${view.activeId}/check`, { fresh: true }).catch(error => debug($, `check failed: ${String(error)}`))
}

/** A turn that died on a usage limit or a rejected sign-in: switch, then carry on. */
async function onStopFailure($: Host, error: string): Promise<void> {
  if (error !== 'rate_limit' && error !== 'authentication_failed') return
  const view = await getView($)
  const active = view.accounts.find(a => a.id === view.activeId)
  if (active === undefined) return
  const { pending } = view
  if (pending !== undefined && (await $.clock.now()) - pending.since < SETTLE_MS) {
    // Claude Code rereads a sign-in at most every 30 s: so soon after a switch the turn may have gone out as the
    // login the session left. Fresh usage says which one is spent or locked; neither is presumed.
    const check = (id: string) => act($, 'POST', `/accounts/${id}/check`, { fresh: true }).catch(e => debug($, `check of account ${id} failed: ${String(e)}`))
    if (pending.from !== active.id) await check(pending.from)
    await check(active.id)
    const now = await $.clock.now()
    if (!shouldLeave(await getView($), now)) {
      if (isConnectingChrome) isCutByVisit = true
      // Once the switch lands, as for a turn the switch itself cut short.
      else $.clock.after(Math.max(0, pending.since + SETTLE_MS - now), () => void $.prompt.submit({ text: CONTINUE }))
      return
    }
  }
  const scope = viewScope(view)
  await act($, 'POST', `/accounts/${active.id}/${error === 'rate_limit' ? 'spent' : 'rejected'}`, {
    ...(session === undefined ? {} : { sessionId: session.key }),
    ...(scope === undefined ? {} : { model: scope }),
  })
  if (error === 'rate_limit') {
    // The coordinator's reading may be older than this session's own: the limit was hit, so the window that limits it is full.
    const now = await $.clock.now()
    await setView($, v => (shouldLeave(v, now) ? v : { ...v, readings: { ...v.readings, [active.id]: spentReading(v.readings[active.id], now, scope) } }))
  }
  await setView($, v => ({ ...v, pending: undefined }))
  if (await maybeRotate($)) {
    $.clock.after(SETTLE_MS, () => void $.prompt.submit({ text: CONTINUE }))
  } else if (isConnectingChrome) isCutByVisit = true
}

// ---------------------------------------------------------------- the session's work
// The footer names the branch the session works on. Sessions often start in one
// checkout and work in a worktree of it, moving there with `cd` in their Bash
// commands, either once (the Bash tool keeps the directory) or at the start of
// every command: the last directory a command moved to in a repository is
// where the work is, else the session's own.

/** A burst of tool calls reads git once, this long after the first. */
const WORK_DELAY_MS = 1_000
/** The last directory in a repository a Bash command moved to. */
let workDir: string | undefined
/** The session's own directory when last read: a move of its own (a worktree it entered) starts over from there. */
let lastCwd: string | undefined
let workTimer: Timer | undefined
let isReadingWork = false

/** Git's output in `dir`, or undefined when it fails; it takes no optional locks, so the session's own git commands never meet its index.lock. */
async function gitIn($: Host, dir: string, args: readonly string[]): Promise<string | undefined> {
  const run = await $.process.run(['git', '--no-optional-locks', '-C', dir, ...args], { timeoutMs: 10_000 }).catch(() => undefined)
  return run?.exitCode === 0 ? run.stdout : undefined
}

/** The branch in `dir`, what no remote has of it and whether anything is uncommitted; undefined outside a repository. */
async function readWork($: Host, dir: string): Promise<Work | undefined> {
  const status = await gitIn($, dir, ['status', '--porcelain=v2', '--branch'])
  const parsed = status === undefined ? undefined : parseStatus(status)
  if (parsed === undefined) return undefined
  let unpushed = parsed.ahead
  if (!parsed.hasUpstream) {
    // A branch never pushed: its commits that no remote branch has.
    const hasRemote = ((await gitIn($, dir, ['remote'])) ?? '').trim() !== ''
    const count = hasRemote ? Number((await gitIn($, dir, ['rev-list', '--count', 'HEAD', '--not', '--remotes']))?.trim()) : NaN
    unpushed = Number.isInteger(count) ? count : undefined
  }
  return { branch: parsed.branch, ...(unpushed === undefined ? {} : { unpushed }), isDirty: parsed.isDirty }
}

/** Where the work is: the last directory a Bash command moved to, unless the session itself moved since. */
async function workDirectory($: Host): Promise<string | undefined> {
  const cwd = await $.session.cwd().catch(() => undefined)
  if (cwd !== lastCwd) {
    lastCwd = cwd
    workDir = undefined
  }
  return workDir ?? cwd
}

/** Reads the work again and keeps it in the view. */
async function refreshWork($: Host): Promise<void> {
  if (isReadingWork) return scheduleWork($)
  isReadingWork = true
  try {
    const dir = await workDirectory($)
    const work = dir === undefined ? undefined : await readWork($, dir)
    const now = JSON.stringify(work)
    if (now !== JSON.stringify((await getView($)).work)) await setView($, v => ({ ...v, work }))
  } finally {
    isReadingWork = false
  }
}

/** Reads the work again soon: once for a burst of calls. */
function scheduleWork($: Host): void {
  if (workTimer !== undefined) return
  workTimer = $.clock.after(WORK_DELAY_MS, () => {
    workTimer = undefined
    void refreshWork($).catch(error => debug($, `reading the branch failed: ${String(error)}`))
  })
}

/** A Bash command ran: a `cd` in it into a repository moves the work there. */
async function onBash($: Host, command: string): Promise<void> {
  const home = (await $.env.get('HOME')) ?? '/'
  const from = (await workDirectory($)) ?? home
  const target = cdTarget(command, from, home)
  if (target !== undefined && target !== workDir && (await readWork($, target)) !== undefined) workDir = target
  scheduleWork($)
}

// ---------------------------------------------------------------- Claude in Chrome
// The Chrome extension answers only connections made as the claude.ai account
// it is signed in to. Claude in Chrome connects at its first call, as the login
// the session's requests use then, and keeps that until it reconnects. So
// Connect moves the session to the extension's account and connects there: as
// the session opens, while it can still move, and when a browser call finds no
// browser. The connection stays as the rotation moves the session on.

type ChromeAnswer = 'paired' | 'unpaired' | 'failed' | 'absent'

/** Claude was held back from the browser, or found none: once Claude in Chrome connects, it is told to carry on. */
let isChromeAwaited = false
/** Connect found no browser as the extension's account: until one answers, a browser call that finds none asks the person instead. */
let hasChromeMissed = false
/** The mod's own call to Claude in Chrome is under way: Connect does not hold it back. */
let isAskingChrome = false
/** A turn hit a usage limit while Connect held the session on the extension's account: it carries on once the session is back. */
let isCutByVisit = false

/** Names the account the Chrome extension is signed in to, for every session; none forgets it. */
async function setChromeAccount($: Host, id: string | undefined): Promise<void> {
  await setView($, v => ({ ...v, chromeAccountId: id }))
  await act($, 'PATCH', '/chrome', { accountId: id ?? null })
}

/** A Chrome extension answered as `id`, or none did: the Chrome box lists it, or not, for every session. */
async function noteChromeAccount($: Host, id: string, isSeen: boolean): Promise<void> {
  await setView($, v => {
    const before = v.chromeAccountIds ?? []
    return { ...v, chromeAccountIds: isSeen ? [...new Set([...before, id])] : before.filter(x => x !== id) }
  })
  await act($, 'PATCH', '/chrome', { seen: { accountId: id, isSeen } })
}

/**
 * Asks Claude in Chrome which browsers answer, connecting it if this session
 * has not yet: 'failed' when it could not tell (no connection, or no answer in
 * time), 'absent' in a session without Claude in Chrome.
 */
async function askChrome($: Host): Promise<ChromeAnswer> {
  let answer: McpToolResult | undefined
  isAskingChrome = true
  try {
    const late = $.clock.sleep(CHROME_WAIT_MS).then(() => undefined)
    answer = await Promise.race([$.mcp.call(CHROME_SERVER, 'list_connected_browsers', {}), late])
  } catch (error) {
    // No Claude in Chrome tools in this session, or a hook refused the call.
    await debug($, `Claude in Chrome not reached: ${String(error)}`)
    return 'absent'
  } finally {
    isAskingChrome = false
  }
  if (answer === undefined || answer.isError) return 'failed'
  const browsers = browsersFrom(answer.content.map(block => block.text ?? '').join(''))
  return browsers === undefined ? 'failed' : browsers > 0 ? 'paired' : 'unpaired'
}

/** With no account named for the Chrome extension yet, the one a browser answered as is it, for every session. */
async function learnChrome($: Host, account: Account): Promise<void> {
  if ((await getView($)).chromeAccountId !== undefined) return
  await setChromeAccount($, account.id)
  tell($, `Claude in Chrome connects as Claude account ${label(account)}: your Chrome extension is signed in to it.`)
}

/**
 * What an answer tells, Claude in Chrome having connected as `as`: whether the
 * session has it, how its connection stands, whether the Chrome box lists the
 * account, and, a browser answering, the extension's account. A guess at
 * Claude Code's login that finds none is kept, so it is not tried again.
 */
async function noteChrome($: Host, as: Account, answer: ChromeAnswer): Promise<void> {
  if (answer === 'absent' || answer === 'failed') {
    await setView($, v => ({ ...v, hasChrome: answer === 'failed' }))
    return
  }
  const isPaired = answer === 'paired'
  await setView($, v => ({
    ...v,
    hasChrome: true,
    chrome: { as: as.id, isPaired, ...(!isPaired && v.chrome?.hasFailed ? { hasFailed: true } : {}) },
  }))
  await noteChromeAccount($, as.id, isPaired)
  if (isPaired) await learnChrome($, as)
  else if ((await getView($)).chromeAccountId === undefined && as.slot === '') {
    chromeMiss = as.id
    await act($, 'PATCH', '/chrome', { miss: as.id })
  }
}

/**
 * Before the session moves off the login it is on: where that is the account
 * the Chrome extension is signed in to (or, none named yet, Claude Code's
 * login, where it most often is), connects Claude in Chrome there first, once a
 * session. The connection keeps that account as the session moves on.
 */
async function keepChrome($: Host): Promise<void> {
  const view = await getView($)
  if (view.chrome !== undefined || view.hasChrome === false || isConnectingChrome) return
  // Until a switch lands, the connection could be made as either login.
  if (movedAt !== undefined && (await $.clock.now()) - movedAt < SETTLE_MS) return
  const active = view.accounts.find(a => a.id === view.activeId)
  if (active === undefined) return
  const isGuess = view.chromeAccountId === undefined && active.slot === '' && chromeMiss !== active.id
  if (view.chromeAccountId !== active.id && !isGuess) return
  await noteChrome($, active, await askChrome($))
}

/**
 * Whether the session connects Claude in Chrome as it opens: an account is
 * named for the extension, signed in. Whatever usage it has left: connecting
 * uses its sign-in, not its usage. Later, a session Claude Code stops from
 * switching couldn't go there.
 */
function shouldConnectAtOpen(view: View): boolean {
  const target = view.accounts.find(a => a.id === view.chromeAccountId)
  if (target === undefined || !canConnectChrome(view)) return false
  const health = view.health[target.id]?.kind
  return target.id === view.activeId || (health !== 'login-needed' && health !== 'logging-in')
}

/**
 * Connect: visits the account the Chrome extension is signed in to, or one
 * tried for it, as Claude Code connects Claude in Chrome with the sign-in the
 * session uses: moves the session there, has Claude in Chrome connect once the
 * move lands (again, where it connected before), asks which browsers answer,
 * and moves back. The connection stays. Then Claude carries on: held back from
 * the browser, or cut by a usage limit on the way. Quiet as the session opens:
 * the pane says how it went. Answers what the browsers did, where it asked them.
 */
function connectChrome($: Host, isQuiet = false, tryId?: string): Promise<ChromeAnswer | undefined> {
  if (isConnectingChrome) return Promise.resolve(undefined)
  isConnectingChrome = true
  return (async () => {
    let done: { target: Account; answer: ChromeAnswer; isVisit: boolean } | undefined
    try {
      done = await connectingChrome($, isQuiet, tryId)
    } finally {
      isConnectingChrome = false
      await setView($, v => ({ ...v, chromeConnecting: undefined }))
    }
    const isMoved = (await maybeRotate($)) || done?.isVisit === true
    const isConnected = done?.answer === 'paired' && isChromeAwaited
    const text = isConnected && done !== undefined ? `Claude in Chrome is connected as Claude account ${label(done.target)}. Continue where you left off.` : isCutByVisit ? CONTINUE : undefined
    if (isConnected) isChromeAwaited = false
    isCutByVisit = false
    if (text !== undefined) {
      // Once the move back lands: until then the turn's requests may go out as the extension's account.
      if (isMoved) $.clock.after(SETTLE_MS, () => void $.prompt.submit({ text }))
      else void $.prompt.submit({ text })
    }
    return done?.answer
  })()
}

/**
 * Use for Chrome, on an account a browser answered as, or Try to connect, on
 * another: Claude in Chrome connects as the account, which once a browser
 * answers there is the extension's, in this session now and in every session
 * from now on. Where none answers, the Chrome box lists it no more, and Claude
 * in Chrome connects again as the account picked before.
 */
async function tryChromeAccount($: Host, id: string): Promise<void> {
  const answer = await connectChrome($, false, id)
  const picked = (await getView($)).chromeAccountId
  if (answer === 'paired') await setView($, v => ({ ...v, isChromeOthersShown: false }))
  else if ((answer === 'unpaired' || answer === 'failed') && picked !== undefined && picked !== id) await connectChrome($)
}

async function connectingChrome(
  $: Host,
  isQuiet: boolean,
  tryId: string | undefined,
): Promise<{ target: Account; answer: ChromeAnswer; isVisit: boolean } | undefined> {
  const view = await getView($)
  const target = view.accounts.find(a => a.id === (tryId ?? view.chromeAccountId))
  const from = view.accounts.find(a => a.id === view.activeId)
  if (target === undefined || from === undefined || !canConnectChrome({ ...view, chromeAccountId: target.id })) return undefined
  // Tried for the extension: the account picked before stays its own until a browser answers as this one.
  const isTrial = target.id !== view.chromeAccountId
  // Quiet is Connect as the session opens.
  const turning = refreshingSoon(view, target, await $.clock.now(), isQuiet)
  if (turning !== undefined) {
    if (!isQuiet) tell($, `Chrome can connect as account ${target.id} once account ${turning.account.id}'s token has refreshed: try again in a few minutes.`)
    return undefined
  }
  await setView($, v => ({ ...v, chromeConnecting: target.id }))
  const isVisit = from.id !== target.id
  // A pick of the person's that no response has confirmed yet is still theirs once Connect is done.
  const isFromPicked = view.pending?.isPicked === true && view.pending.id === from.id
  if (isVisit && !(await switchTo($, target, 'Claude in Chrome connects as it', { isQuiet: true }))) return undefined
  const wait = movedAt === undefined ? 0 : movedAt + SETTLE_MS - (await $.clock.now())
  if (wait > 0) await $.clock.sleep(wait)
  // A connection made before, as whichever login the session was on then, is made again as this one.
  const before = await getView($)
  if (before.chrome !== undefined || before.hasChrome === true) {
    try {
      await $.command.run({ command: 'mcp', args: `reconnect ${CHROME_SERVER}` })
    } catch (error) {
      await debug($, `/mcp reconnect ${CHROME_SERVER} failed: ${String(error)}`)
    }
  }
  const answer = await askChrome($)
  if (isTrial && answer === 'paired') await setChromeAccount($, target.id)
  await noteChrome($, target, answer)
  // Whether a browser answers as the extension's account: a trial that found none didn't ask there.
  if (!isTrial || answer === 'paired') hasChromeMissed = answer === 'unpaired'
  if (answer === 'paired') {
    // A browser answering as the account shows the switch took: the rotation need not wait for a response to say so.
    untaken.delete(target.id)
    // Not a pick's: it waits for a request there, as the rotation would otherwise take it over.
    await setView($, v => (v.pending?.id === target.id && v.pending.isPicked !== true ? { ...v, pending: undefined } : v))
  }
  if (isVisit) await leaveVisit($, from, isFromPicked)
  if (!isQuiet && answer === 'paired') tell($, `Claude in Chrome is connected as Claude account ${label(target)}.`)
  if (!isQuiet && answer === 'unpaired') {
    const back = isTrial ? view.accounts.find(a => a.id === view.chromeAccountId) : undefined
    tell(
      $,
      `No Chrome extension answers as Claude account ${label(target)}. Open Chrome and check its Claude extension is signed in with that email; if it is, restart Chrome${isTrial ? ' and try again' : ''}.` +
        (back === undefined ? '' : ` Claude in Chrome goes back to account ${label(back)}.`),
    )
  }
  return { target, answer, isVisit }
}

/**
 * After Connect's visit: where the session would go from the login it was on.
 * With 'soonest reset', that is the login whose week resets soonest (which can
 * be the one visited), without a stop back on the login it came from, as a
 * session opening on Claude Code's login would; else back to that login while
 * it can serve, or with the rotation off; else on to the one the coordinator
 * picks. Other than that, the extension's account's usage is not the
 * session's to spend. A login the person picked with Use now, unconfirmed yet,
 * is gone back to whatever the rotation would pick.
 */
async function leaveVisit($: Host, from: Account, isPicked: boolean): Promise<void> {
  if (isPicked) {
    await switchTo($, from, 'back from connecting Claude in Chrome', { isQuiet: true, isPicked: true })
    return
  }
  const now = await $.clock.now()
  const view = await getView($)
  const fromView = { ...view, activeId: from.id }
  const health = view.health[from.id]?.kind
  const canServe = health !== 'login-needed' && health !== 'logging-in' && !shouldLeave(fromView, now)
  const sooner = canServe && view.rotateTo === 'reset' ? targetFor(fromView, now) : undefined
  if (sooner !== undefined) {
    if (sooner.id !== view.activeId) await switchTo($, sooner, `its week resets before account ${from.id}'s`)
    return
  }
  if (view.rotateTo === 'off' || canServe) {
    await switchTo($, from, 'back from connecting Claude in Chrome', { isQuiet: true })
    return
  }
  const target = targetFor(fromView, now)
  if (target !== undefined && (await switchTo($, target, whyLeave(fromView, now)))) noteLeft(fromView, now)
}

/**
 * After a call to one of Claude in Chrome's tools. One answered marks the
 * connection paired and, as the session's first, names the extension's
 * account where none is. One that found no browser marks it so, for the band,
 * and returns what Claude reads in place of Claude Code's advice to /login:
 * that the mod connects it now, or what to ask the person.
 */
async function onBrowserCall($: Host, isUnanswered: boolean): Promise<string | undefined> {
  const view = await getView($)
  const isSure = movedAt === undefined || (await $.clock.now()) - movedAt >= SETTLE_MS
  const as = view.chrome?.as ?? (isSure ? view.activeId : undefined)
  const chrome = { ...(as === undefined ? {} : { as }), isPaired: !isUnanswered, ...(isUnanswered ? { hasFailed: true } : {}) }
  const after = await setView($, v => ({ ...v, hasChrome: true, chrome }))
  if (!isUnanswered) {
    hasChromeMissed = false
    if (as !== undefined) await noteChromeAccount($, as, true)
    const active = view.accounts.find(a => a.id === view.activeId)
    if (view.chrome === undefined && isSure && active !== undefined) await learnChrome($, active)
    return undefined
  }
  if (after.chromeAccountId === undefined) {
    isChromeAwaited = true
    return chromeNote(after, 'unset')
  }
  // Where Connect can't run: connected as the extension's account already, so Chrome may be closed, or the session can't move there.
  if (!canConnectChrome(after)) return chromeNote(after, after.chrome?.as === after.chromeAccountId ? 'no-browser' : 'blocked')
  isChromeAwaited = true
  if (hasChromeMissed) return chromeNote(after, 'no-browser')
  // Once this hook is done: the turn waits on it, and Connect's /mcp reconnect waits on the turn.
  $.clock.after(0, () => void connectChrome($).catch(error => debug($, `Chrome connect failed: ${String(error)}`)))
  return chromeNote(after, 'connecting')
}

// ---------------------------------------------------------------- wiring

/** The footer's one press: opens the pane, or closes it while it shows. */
function togglePane($: Host): Promise<unknown> {
  isPaneShown = !isPaneShown
  return isPaneShown ? $.ui.open({ id: PANE, title: TITLE, columns: PANE_COLUMNS }) : $.ui.close({ id: PANE })
}

/** After a /login, which signs in the login this session is on: who it is now, and a move off it when that is another login's account. */
async function checkActive($: Host): Promise<void> {
  const view = await getView($)
  await act($, 'POST', `/accounts/${view.activeId}/check`, { fresh: true })
  await maybeRotate($)
}

/** Rotate now: moves to the login the pane's Rotation setting picks, as the rotation would once this one runs low; with it off, the most room. */
async function rotate($: Host): Promise<void> {
  const view = await getView($)
  const target = pickTarget({ ...view, accounts: view.accounts.filter(a => !view.retiring?.includes(a.id)) }, await $.clock.now())
  if (target === undefined) tell($, 'No other Claude account can take over right now.')
  else await switchTo($, target, 'you pressed Rotate now')
}

/**
 * Remove: the coordinator signs a login out once no session is on it, so a
 * login sessions use goes only while another can take them over, as a session
 * on any model would pick.
 */
async function removeAccount($: Host, id: string): Promise<void> {
  const view = await setView($, v => ({ ...v, removing: undefined }))
  const count = view.sessionCounts?.[id] ?? 0
  const { model: _model, ...anyModel } = view
  const target = pickTarget({ ...anyModel, activeId: id, retiring: [...(view.retiring ?? []), id] }, await $.clock.now())
  if (count > 0 && target === undefined) {
    tell($, `Claude account ${id} is in use by ${count} session${count === 1 ? '' : 's'} and no other account can take over yet; not removed.`)
    return
  }
  try {
    await act($, 'POST', `/accounts/${id}/remove`)
  } catch (error) {
    if (error instanceof CoordinatorError) tell($, error.message)
    else throw error
  }
  await maybeRotate($)
}

/** Every press starts its work in the background: a sign-in outlives the press. */
function actions($: Host): Actions {
  const background = (work: Promise<unknown>) => {
    work.catch(error => tell($, `Something went wrong: ${error instanceof Error ? error.message : String(error)}`))
  }
  return {
    togglePane: () => background(togglePane($)),
    rotate: () => background(rotate($)),
    signInAll: () => background(act($, 'POST', '/signin', {})),
    signInOne: id => background(act($, 'POST', '/signin', { accountId: id })),
    cancelSignIn: () => background(act($, 'POST', '/signin/cancel')),
    add: () => background(act($, 'POST', '/accounts')),
    use: id =>
      background(
        getView($).then(view => {
          const account = view.accounts.find(a => a.id === id)
          if (account === undefined) return false
          // A pick of the person's lets the rotation come back to the login, whatever it reads.
          leftFull.delete(account.id)
          return switchTo($, account, 'you picked it', { isPicked: true })
        }),
      ),
    askRemove: id => background(setView($, v => ({ ...v, removing: id }))),
    remove: id => background(removeAccount($, id)),
    setFooter: (change: Partial<FooterStyle>) => background(act($, 'PATCH', '/settings', { footer: change })),
    setRotateTo: (rotateTo: RotateTo) => background(act($, 'PATCH', '/settings', { rotateTo })),
    tryChromeAccount: id => background(tryChromeAccount($, id)),
    toggleChromeOthers: () => background(setView($, v => ({ ...v, isChromeOthersShown: !v.isChromeOthersShown }))),
    connectChrome: () => background(connectChrome($)),
    setDemo: on => background(setView($, v => ({ ...v, demo: on }))),
    retryCoordinator: () => background(ensureCoordinator($).then(() => registerSession($))),
  }
}

/** The process this session runs as: the parent of a shell it starts. */
async function sessionPid($: Host): Promise<number | undefined> {
  const { exitCode, stdout } = await $.process.run(['/bin/sh', '-c', 'echo $PPID'], { timeoutMs: 5_000 }).catch(() => ({ exitCode: -1, stdout: '' }))
  const pid = Number(stdout.trim())
  return exitCode === 0 && Number.isInteger(pid) && pid > 1 ? pid : undefined
}

/** Joins the coordinator (starting it where none runs), then follows it; Claude in Chrome connects as the extension's account first. */
async function boot($: Host, isInteractive: boolean): Promise<void> {
  // Terminal.app is the terminal that names itself so and draws block characters from its font.
  const hasFontBlocks = (await $.env.get('TERM_PROGRAM')) === 'Apple_Terminal'
  const sessionId = await $.session.id().catch(() => undefined)
  await setView($, v => ({ ...v, hasFontBlocks, ...(sessionId === undefined ? {} : { sessionId }) }))
  // A session started with its own CLAUDE_CONFIG_DIR reads its login there, unless the mod moved it.
  const slot = (await $.env.get('CLAUDE_SECURESTORAGE_CONFIG_DIR')) ?? ''
  const pid = await sessionPid($)
  const cwd = await $.session.cwd().catch(() => undefined)
  await noteModel($)
  const context = await $.session.usage().then(u => u.context.percent).catch(() => undefined)
  if (context !== undefined) await setView($, v => ({ ...v, contextPct: context }))
  void refreshWork($).catch(error => debug($, `reading the branch failed: ${String(error)}`))
  session = {
    key: `${sessionId ?? 'session'}:${pid ?? Math.random().toString(36).slice(2)}`,
    slot,
    isInteractive,
    ...(pid === undefined ? {} : { pid }),
    ...(cwd === undefined ? {} : { cwd }),
  }
  try {
    await ensureCoordinator($)
    await registerSession($)
  } catch (error) {
    await setView($, v => ({ ...v, coordinator: { error: error instanceof Error ? error.message : String(error) } }))
  }
  await checkSwitching($, slot)
  // First, while the session can still move: the rotation waits for it.
  if (isInteractive && shouldConnectAtOpen(await getView($))) {
    void connectChrome($, true).catch(error => debug($, `Chrome connect failed: ${String(error)}`))
  }
  await maybeRotate($, true)
  void watch($).catch(error => debug($, `stopped following the coordinator: ${String(error)}`))
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const started = await next(e)
    // The coordinator's own `claude -p /usage` run, which only refreshes a login's token: no session to join or move.
    if ((await $.env.get('CLAUDE_ACCOUNT_ROTATOR_REFRESH')) === '1') return started
    void boot($, e.isInteractive).catch(error => debug($, `start failed: ${String(error)}`))
    void $.ui.panes().then(panes => {
      isPaneShown = panes.some(p => p.id === PANE && p.isShown)
    })
    // A switch settles, and a window resets, with no change at the coordinator to say so.
    $.clock.every(60_000, () => {
      void noteModel($)
        .then(() => settlePending($, false))
        .then(() => maybeRotate($))
        .catch(error => debug($, `sync failed: ${String(error)}`))
    })
    return started
  })

  on('session.end', async ($, e, next) => {
    if (session !== undefined) void api($, 'DELETE', `/sessions/${encodeURIComponent(session.key)}`).catch(() => undefined)
    return next(e)
  }).catch(($, e, next) => next(e))

  on('turn.start', async ($, e, next) => {
    turns.add(e.turnId)
    return next(e)
  })

  // Claude Code reads the sign-in again just before a request: only a request after a switch could land tests it.
  on('turn.step', async function* ($, e, next) {
    lastRequestAt = await $.clock.now()
    return yield* next(e)
  })

  on('turn.complete', async ($, e, next) => {
    turns.delete(e.turnId)
    scheduleWork($)
    return next(e)
  })

  // The footer's branch: a Bash command may move the work (`cd`), commit or push; a file edit leaves changes uncommitted.
  on('tool.call', { tool: /^(Bash|Edit|MultiEdit|Write|NotebookEdit)$/ }, async ($, e, next) => {
    const done = await next(e)
    if (e.tool === 'Bash') void onBash($, e.command).catch(error => debug($, `reading the branch failed: ${String(error)}`))
    else scheduleWork($)
    return done
  }).catch(($, e, next) => next(e))

  // The footer names the model as soon as /model changes it.
  on('command.run', { command: 'model' }, async ($, e, next) => {
    const ran = await next(e)
    void noteModel($).catch(error => debug($, `reading the model failed: ${String(error)}`))
    return ran
  }).catch(($, e, next) => next(e))

  on('session.measure', async ($, e, next) => {
    const contextPct = e.context.percent
    if (e.changed.includes('context') && contextPct !== undefined) {
      void setView($, v => ({ ...v, contextPct })).catch(error => debug($, `context failed: ${String(error)}`))
    }
    if (e.changed.includes('rateLimits')) {
      void onMeasure($, e.rateLimits).catch(error => debug($, `measure failed: ${String(error)}`))
    }
    return next(e)
  })

  on('classic.StopFailure', async ($, e, next) => {
    void onStopFailure($, e.error).catch(error => debug($, `stop failure handling failed: ${String(error)}`))
    return next(e)
  }).catch(($, e, next) => next(e))

  // Typed at the prompt, /login answers once its sign-in is done; run mid-turn, at once, and the checks find it later.
  on('command.run', { command: 'login' }, async ($, e, next) => {
    const ran = await next(e)
    void checkActive($).catch(error => debug($, `check after /login failed: ${String(error)}`))
    return ran
  }).catch(($, e, next) => next(e))

  // While Connect is under way a browser call would connect as the login being left: Claude waits, and is told when to carry on.
  on('tool.check', { tool: CHROME_TOOL }, async ($, e, next) => {
    if (!isConnectingChrome || isAskingChrome) return next(e)
    if (e.tool_use_id !== undefined) isChromeAwaited = true
    return { decision: 'deny' as const, reason: chromeNote(await getView($), 'held') }
  }).catch(($, e, next) => next(e))

  // Claude Code's words for a browser call that found no browser send the person to /login, which here signs in the wrong account.
  on('tool.call', { tool: CHROME_TOOL }, async ($, e, next) => {
    const done = await next(e)
    // The mod's own question to Claude in Chrome is answered where it asked.
    if (done.deny !== undefined || isAskingChrome) return done
    const note = await onBrowserCall($, isUnansweredCall(e.tool, done.text ?? '', done.isError === true)).catch(async error => {
      await debug($, `browser call handling failed: ${String(error)}`)
      return undefined
    })
    return note === undefined ? done : { ...done, context: [...(done.context ?? []), note] }
  }).catch(($, e, next) => next(e))

  on('ui.close', async ($, e, next) => {
    if (e.id === PANE) isPaneShown = false
    return next(e)
  })

  on('ui.render', { component: 'SessionMode' }, async ($, e, next) => {
    const view = await getView($)
    if (view.accounts.length === 0) return next(e)
    return Footer($.ui.resolve(e), view, e.props.modes, await $.clock.now(), actions($))
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) return next(e)
    const view = await getView($)
    return Band($.ui.resolve(e), view, await $.clock.now(), actions($)) ?? next(e)
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const view = await getView($)
    return Pane($.ui.resolve(e), view, await $.clock.now(), actions($))
  })
}
