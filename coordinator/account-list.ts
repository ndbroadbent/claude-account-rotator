// The coordinator's accounts and usage as claude-swap's account list (schema v1), the external account source of menu
// bar apps such as CodexBar ("Read accounts from claude-swap", with `bin/account-rotator-claude-accounts` as the
// executable). `accountList` is the pure mapping; `bin/account-rotator-claude-accounts` runs `account-list-cli.ts`.

import type { AccountState, SharedState, UsageWindow } from '../types/index.d.ts'
import { windowPct } from '../hooks/model.ts'

/** The command's name, as `--version` prints it. */
export const BIN = 'account-rotator-claude-accounts'

/** A failure, printed as `{schemaVersion: 1, error: {type, message}}` with a non-zero exit. */
export class ListError extends Error {
  readonly kind: string
  constructor(kind: string, message: string) {
    super(message)
    this.kind = kind
  }
  json(): unknown {
    return { schemaVersion: 1, error: { type: this.kind, message: this.message } }
  }
}

/** ISO 8601 in whole seconds, or undefined for what isn't a time: CodexBar rejects the whole list over one bad date. */
function iso(ms: number): string | undefined {
  if (!Number.isFinite(ms)) return undefined
  return new Date(Math.floor(ms / 1000) * 1000).toISOString().replace('.000Z', 'Z')
}

/** One window as claude-swap prints it; a window past its reset is empty, as the coordinator counts it. */
function window(w: UsageWindow | undefined, now: number): { pct: number; resetsAt?: string } | undefined {
  const pct = windowPct(w, now)
  if (w === undefined || pct === undefined || !Number.isFinite(pct)) return undefined
  const resetsAt = w.resetsAt === undefined ? undefined : Date.parse(w.resetsAt)
  const reset = resetsAt !== undefined && resetsAt > now ? iso(resetsAt) : undefined
  return { pct, ...(reset === undefined ? {} : { resetsAt: reset }) }
}

function usage(a: AccountState, now: number): Record<string, unknown> {
  const r = a.reading
  if (r === undefined) return {}
  const out: Record<string, unknown> = {}
  const fiveHour = window(r.fiveHour, now)
  const sevenDay = window(r.sevenDay, now)
  if (fiveHour !== undefined) out.fiveHour = fiveHour
  if (sevenDay !== undefined) out.sevenDay = sevenDay
  const scoped = Object.entries(r.models ?? {}).flatMap(([name, w]) => {
    const s = window(w, now)
    return s === undefined ? [] : [{ name, ...s }]
  })
  if (scoped.length > 0) out.scoped = scoped
  return out
}

/** claude-swap's status for a login: whether it can serve requests, or why not. */
function status(a: AccountState): string {
  if (a.health.kind === 'login-needed') return 'relogin_required'
  if (a.health.kind === 'logging-in' || a.reading === undefined) return 'unavailable'
  return 'ok'
}

/**
 * The account list. Each login's number is its ID (`1`, `2`, ...), as the panel numbers it. None is active and
 * switching is off: the rotator moves each session on its own, and there is no one account the machine uses.
 * `weight` is the plan's size (Ultra 10, Max 5, else 1), for a combined percentage (CodexBar issue 5194); readers
 * that don't know it ignore it.
 */
export function accountList(state: SharedState): unknown {
  const rows = state.accounts.flatMap(a => {
    const number = Number(a.id)
    if (!Number.isInteger(number) || number <= 0) return []
    // Named as the panel names it (`label`): by the login's own email, and by who signed in only before it has one.
    const email = a.email ?? a.holder?.who.email ?? ''
    const orgId = a.email === undefined ? a.holder?.who.orgId : a.orgId
    const orgName = a.email === undefined ? a.holder?.who.orgName : a.orgName
    const fetchedAt = a.reading === undefined ? undefined : iso(a.reading.at)
    return [
      {
        number,
        active: false,
        usageStatus: status(a),
        email,
        organizationUuid: orgId ?? '',
        organizationName: orgName ?? '',
        alias: null,
        usage: usage(a, state.now),
        ...(fetchedAt === undefined ? {} : { usageFetchedAt: fetchedAt }),
        weight: a.weight,
      },
    ]
  })
  if (rows.length === 0) throw new ListError('NoAccounts', "the account rotator has no accounts yet: click the usage in a Claude Code session's footer and press + Add an account")
  return { schemaVersion: 1, activeAccountNumber: null, supportsAccountSwitching: false, accounts: rows.sort((x, y) => x.number - y.number) }
}
