/** One usage window of a login: percent used, and when it resets (ISO 8601). */
export type UsageWindow = { pct: number; resetsAt?: string }

/**
 * A login's usage as last read, `at` in epoch milliseconds. `models` holds the
 * weeks a model family has of its own, by the name the usage endpoint gives it
 * (`Fable`): a session on that model also stops at its own week. Only the
 * usage endpoint reports them, not a response.
 */
export type Reading = { fiveHour?: UsageWindow; sevenDay?: UsageWindow; models?: Record<string, UsageWindow>; at: number }

/** Whether a login can serve requests, or why not. */
export type Health =
  | { kind: 'ok'; refreshExpiresAt?: number }
  | { kind: 'login-needed'; why: string }
  | { kind: 'logging-in'; since: number }

/**
 * One Claude login. `slot` is the credentials directory Claude Code reads it
 * from: '' is the normal login, anything else an absolute directory.
 */
export type Account = {
  id: string
  slot: string
  email?: string
  /** One email can hold logins in several organizations (your Max plan, a Team seat). */
  orgId?: string
  orgName?: string
  /** `subscriptionType` as `claude auth status` reports it: max, team, pro. */
  plan?: string
  /** The organization's rate-limit tier as the profile endpoint answers it, such as `default_claude_max_20x`. */
  tier?: string
}

/**
 * Who a login's sign-in belongs to, as the profile endpoint answered for the
 * token `token` digests; the plan as Claude Code reads it from the sign-in.
 */
export type Holder = { token: string; who: Pick<Account, 'email' | 'orgId' | 'orgName' | 'plan' | 'tier'> & { email: string } }

/** How the footer draws one of its rows: a glyph per login, or not at all. */
export type Glyphs = 'bars' | 'pie' | 'braille' | 'none'

/** How the footer marks the login in use: a dark line down each side of its column, a tile behind it, or the rest dimmed. */
export type Highlight = 'lines' | 'tile' | 'dim'

/** What glyphs and bars fill with: the room a login has left, or what it has used. */
export type Fill = 'left' | 'used'

/**
 * Which login the rotation moves to: the one whose 5-hour window resets
 * soonest, the one with the most room right now, or the next in the list; or
 * none, the rotation off: the session moves only when the person picks.
 */
export type RotateTo = 'reset' | 'room' | 'order' | 'off'

/** The footer's look, picked in the pane and kept across sessions. */
export type FooterStyle = {
  session: Glyphs
  week: Glyphs
  /** Whether a row ends with the login in use's percent. */
  sessionPercent: boolean
  weekPercent: boolean
  active: Highlight
  /** Either way the colors go from green with all the room left to red with none. */
  fill: Fill
}

/**
 * Claude in Chrome in one session: the account its connection was made as,
 * where known, and whether a browser answered there; `hasFailed` once a
 * browser call found none, until one is answered again.
 */
export type ChromeLink = { as?: string; isPaired: boolean; hasFailed?: boolean }

/** A run of the footer's text: its color, and the lighter one it takes while the pointer is over the footer. */
export type FooterRun = { text: string; color?: string; lit?: string; backgroundColor?: string; dimColor?: boolean }

/** The coordinator's own details, as it answers them. */
export type CoordinatorInfo = { version: string; pid: number; startedAt: number; isManaged: boolean }

/** One login as the coordinator shares it: the login and what it knows of it. Where its sessions go is the mod's to work out. */
export type AccountState = Account & {
  health: Health
  reading?: Reading
  holder?: Holder
  /** When its access token expires, epoch ms. */
  expiresAt?: number
  /** The plan's size: 10 for Ultra (formerly Max 20x), 5 for Max (formerly Max 5x), 1 for Pro or unknown. */
  weight: number
  /** Being removed: sessions on it move off, then it is signed out and dropped. */
  isRetiring?: boolean
  /** Live sessions on it. */
  sessionCount: number
}

/** One usage window across every signed-in login with a reading, weighted by plan size. */
export type CombinedWindow = { pct: number; accounts: number; nextResetAt?: string }

/** A Claude Code session the coordinator knows of. */
export type SessionInfo = {
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

/** Something every session should hear once: a toast in each, a desktop notification from the first that claims it. */
export type Notice = { id: number; at: number; text: string; notify: boolean; accountId?: string }

/** Everything the coordinator shares: what GET /state answers (docs/coordinator-api.md). */
export type SharedState = {
  version: number
  coordinator: CoordinatorInfo
  now: number
  accounts: AccountState[]
  combined: { fiveHour?: CombinedWindow; sevenDay?: CombinedWindow }
  settings: { rotateTo: RotateTo; footer: FooterStyle }
  chrome: { accountId?: string; accountIds: string[]; miss?: string }
  sessions: SessionInfo[]
  notices: Notice[]
  signIn?: { accountId: string; since: number }
  /** Set when something else manages the sign-ins (Fleetlayer's auth hub): who, as the mod names it. The mod then offers no sign-in, add or remove, which the coordinator refuses. */
  managedBy?: string
}

/**
 * The git branch a session works on, where the footer shows it: `unpushed`, the
 * commits no remote has (undefined in a repository with no remote); `isDirty`,
 * changes not committed, untracked files included.
 */
export type Work = { branch: string; unpushed?: number; isDirty: boolean }

/** Everything the footer, band and pane draw from. */
export type View = {
  accounts: Account[]
  readings: Record<string, Reading>
  health: Record<string, Health>
  /** Who each login's sign-in belongs to: a /login in a session on a login signs in there, whoever it signs in. */
  holders: Record<string, Holder>
  /** When each login's access token expires, as the coordinator last read it. */
  expiresAt?: Record<string, number>
  /** This session's model, as `/model` shows it: a model with its own week (Fable) also leaves a login once that week is spent. */
  model?: string
  /** This session only: the branch it works on, in the directory its Bash commands last moved to (else its own); absent outside a repository. */
  work?: Work
  /** This session only: how full its context window is, 0 to 100, once a response reported it. */
  contextPct?: number
  /** Logins being removed. */
  retiring?: string[]
  /** Live sessions on each login, every session counted. */
  sessionCounts?: Record<string, number>
  /** Usage across every login, as the coordinator weighs it. */
  combined?: SharedState['combined']
  /** The coordinator as last reached; `error` while it can't be. */
  coordinator?: { info?: CoordinatorInfo; error?: string }
  /** Who manages the sign-ins when the person doesn't (SharedState.managedBy). */
  managedBy?: string
  /** The login this session sends its requests with. */
  activeId: string
  /**
   * Set after a switch until a response shows the new login's usage. `isPicked`:
   * the person pressed Use now, so the rotation leaves it be until a response confirms it.
   */
  pending?: { id: string; from: string; since: number; isPicked?: boolean }
  /** Account id whose removal waits for a second press. */
  removing?: string
  footer: FooterStyle
  /** Which login the rotation moves to, picked in the pane and kept across sessions. */
  rotateTo: RotateTo
  /** This session only: Claude Code's security default refuses switching, as on a Team or Enterprise account. */
  isSwitchBlocked?: boolean
  /**
   * The account the Chrome extension is signed in to, the only one it answers:
   * picked in the pane, or learned when Claude in Chrome paired; kept across sessions.
   */
  chromeAccountId?: string
  /** The accounts a Chrome extension has answered as, kept across sessions: the Chrome box lists them. */
  chromeAccountIds?: string[]
  /** This session only: the Chrome box also lists the accounts no Chrome extension has answered as yet. */
  isChromeOthersShown?: boolean
  /** This session only: whether it has Claude in Chrome, once a call to it told. */
  hasChrome?: boolean
  /** This session only: Claude in Chrome's connection, once made. */
  chrome?: ChromeLink
  /** This session only: Connect is under way, to this account. */
  chromeConnecting?: string
  /** This session's id, which `claude --resume` takes. */
  sessionId?: string
  /** This session only: the footer draws imitated usage, to judge its look. */
  demo?: boolean
  /** This session's terminal draws block characters from its font, short of the line, as Terminal.app does. */
  hasFontBlocks: boolean
}

declare module 'claude-code' {
  interface PluginState {
    'account-rotator': { view: View }
  }
}
