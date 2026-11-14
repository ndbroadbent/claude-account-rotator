# Coordinator API

One coordinator process per user holds everything the sessions share: the list of
Claude logins, their usage, their health, the settings, and which sessions are on
which login. It is the only process that reads the logins' tokens and the only one
that calls Anthropic's usage and profile endpoints, so the cost of running 30
sessions is one poller, not thirty.

Clients: the Claude Code mod (one per session) and the macOS menu bar app.

## Transport

HTTP/1.1 over a Unix domain socket:

- Socket: `~/.claude/account-rotator/coordinator.sock` (the directory is mode 0700).
  `CLAUDE_ACCOUNT_ROTATOR_DIR` overrides the directory (tests).
- The URL host is ignored; use `http://coordinator/<path>`.
- Requests and responses are JSON (`Content-Type: application/json`). A client may
  send `Connection: close`; the coordinator answers with `Content-Length`.
- Errors: a 4xx or 5xx status with `{ "error": "<sentence>" }`.

## Endpoints

| Method and path | Body | Answer |
| --- | --- | --- |
| `GET /hello` | | `{ name, version, pid, startedAt }` |
| `GET /state?since=V&wait=MS&session=ID` | | `State`. With `since` equal to the current `version`, the answer waits until the state changes or `wait` ms pass (at most 55000), then answers the current state. `session` marks that session alive. A Claude Code session asks for 25000 at most: `$.http.fetch` aborts after 30 s. |
| `POST /sessions` | `{ id, pid?, slot, cwd?, isInteractive }` | `{ accountId, state }`. Registers a session on the login whose `slot` it reads; an unknown slot becomes a new login. |
| `PATCH /sessions/:id` | `{ accountId?, isBlocked?, isPending? }` | `{ state }` |
| `DELETE /sessions/:id` | | `{ ok: true }` |
| `POST /readings` | `{ accountId, reading, sessionId? }` | `{ state }`. A response's rate-limit windows, as the session saw them. |
| `POST /accounts/:id/spent` | `{ sessionId?, model? }` | `{ state }`. A turn hit the usage limit on this login. `model` names a model with a week of its own (`Fable`) the session was on: while the login's week has room, that week counts as full, not the login's. |
| `POST /accounts/:id/rejected` | `{ sessionId? }` | `{ state }`. A turn's sign-in was rejected. |
| `POST /accounts/:id/check` | `{ fresh? }` | `{ state }`. Re-reads the sign-in now, and with `fresh` the usage too (at most once per 30 s per login). |
| `POST /check` | | `{ state }`. Re-reads every login now. |
| `POST /accounts` | | `{ accountId, state }`. Adds a login in a new slot and starts its browser sign-in. |
| `POST /accounts/:id/remove` | | `{ state }`. Sessions on it move off, then it is signed out and dropped. |
| `POST /signin` | `{ accountId? }` | `{ state }`. Starts the browser sign-in of one login, or of every login that needs one. |
| `POST /signin/cancel` | | `{ state }` |
| `PATCH /settings` | `{ rotateTo?, footer? }` | `{ state }` |
| `PATCH /chrome` | `{ accountId?: string \| null, seen?: { accountId, isSeen }, miss?: string \| null }` | `{ state }` |
| `POST /notices/:id/claim` | `{ sessionId }` | `{ claimed }`. The first claimant posts the desktop notification; the rest only show a toast. |
| `POST /shutdown` | | `{ ok: true }`, then the process exits (an upgrade). |

## State

```ts
type State = {
  /** Bumps on every change. */
  version: number
  coordinator: { version: string; pid: number; startedAt: number; isManaged: boolean }
  /** The coordinator's clock, epoch ms. */
  now: number
  accounts: AccountState[]
  /** Usage across every signed-in login with a reading, weighted by plan size. */
  combined: { fiveHour?: CombinedWindow; sevenDay?: CombinedWindow }
  settings: { rotateTo: 'reset' | 'room' | 'order' | 'off'; footer: FooterStyle }
  chrome: { accountId?: string; accountIds: string[]; miss?: string }
  sessions: SessionInfo[]
  /** The latest 20, oldest first. */
  notices: Notice[]
  /** The browser sign-in under way. */
  signIn?: { accountId: string; since: number }
}

type AccountState = {
  id: string                     // "1", "2", ...; "1" is Claude Code's own login
  slot: string                   // '' for Claude Code's own login, else an absolute directory
  email?: string
  orgId?: string
  orgName?: string
  plan?: string                  // 'max' | 'pro' | 'team' | 'enterprise' | ...
  tier?: string                  // e.g. 'default_claude_max_20x'
  weight: number                 // plan size: 10 for Ultra (formerly Max 20x), 5 for Max (formerly Max 5x), 1 for Pro or unknown
  health:
    | { kind: 'ok'; refreshExpiresAt?: number }
    | { kind: 'login-needed'; why: string }
    | { kind: 'logging-in'; since: number }
  reading?: {
    fiveHour?: { pct: number; resetsAt?: string }   // pct used, 0-100; resetsAt ISO 8601
    sevenDay?: { pct: number; resetsAt?: string }
    // A model family's own week, by the name the usage endpoint gives it (as of November 2026, only Fable).
    // Only the usage endpoint reports these; a session's reading keeps the last poll's.
    models?: Record<string, { pct: number; resetsAt?: string }>
    at: number                                     // when read, epoch ms
  }
  holder?: { token: string; who: { email: string; orgId?: string; orgName?: string; plan?: string } }
  /** When its access token expires, epoch ms. */
  expiresAt?: number
  /** Past the leave thresholds (90% of the 5-hour window, or 98% of the week). A model's own week doesn't count here. */
  isSpent: boolean
  isRetiring?: boolean
  /** Where sessions on this login go once they must leave it; absent while they can stay or none can take over. */
  moveTo?: string
  /** The same for sessions on a model with a week of its own, by its name: they leave once either week is at 98%. */
  moveToFor?: Record<string, string>
  /** Live sessions on it. */
  sessionCount: number
}

type CombinedWindow = {
  pct: number               // weighted mean percent used, 0-100
  accounts: number          // logins counted
  nextResetAt?: string      // the soonest reset among them, ISO 8601
}

type SessionInfo = {
  id: string
  accountId: string
  pid?: number
  cwd?: string
  isInteractive: boolean
  isBlocked: boolean
  isPending: boolean
  since: number
  lastSeen: number
}

type Notice = { id: number; at: number; text: string; notify: boolean; accountId?: string }

type FooterStyle = {
  session: 'bars' | 'pie' | 'braille' | 'none'
  week: 'bars' | 'pie' | 'braille' | 'none'
  sessionPercent: boolean
  weekPercent: boolean
  active: 'lines' | 'tile' | 'dim'
  fill: 'left' | 'used'
}
```

A window's `pct` is as last read: a client should count it as 0 once `resetsAt` has
passed.
