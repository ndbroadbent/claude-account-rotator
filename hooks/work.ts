// What the footer says about the session's work, left of the accounts: its
// model, the git branch it works on with what isn't pushed or committed, and
// how full its context is. Pure helpers; register.tsx reads git and the
// session, view.tsx draws.

import type { Work } from '../types'

/**
 * A model as the footer names it: `claude-fable-5-2` as `Fable 5.2`, a
 * million-token window (`[1m]`) as ` 1M`. A name in another shape shows as it is.
 */
export function modelLabel(model: string | undefined): string | undefined {
  if (model === undefined || model.trim() === '') return undefined
  const isMillion = /\[1m\]/i.test(model)
  const bare = model.replace(/\[1m\]/i, '').trim()
  const id = /^claude-([a-z]+)-(\d+)(?:-(\d{1,2}))?(?:-\d{8})?$/i.exec(bare)
  const name = id === null ? bare : `${id[1]!.charAt(0).toUpperCase()}${id[1]!.slice(1).toLowerCase()} ${id[3] === undefined ? id[2] : `${id[2]}.${id[3]}`}`
  return isMillion ? `${name} 1M` : name
}

/** The footer's longest branch name: a longer one is cut at the end. */
const BRANCH_WIDTH = 40

/**
 * A branch as the footer names it: `nathan/sc-6450/least-privilege-ci-oidc` as
 * `sc-6450 least-privilege-ci-oidc` (with three or more parts, the first is
 * whose it is), cut to BRANCH_WIDTH.
 */
export function branchLabel(branch: string): string {
  const parts = branch.split('/').filter(p => p !== '')
  const label = (parts.length >= 3 ? parts.slice(1) : parts).join(parts.length >= 3 ? ' ' : '/')
  return label.length > BRANCH_WIDTH ? `${label.slice(0, BRANCH_WIDTH - 1)}…` : label
}

/** One word of a shell command: its quotes taken off, `~` as home. */
function unquote(word: string, home: string): string {
  const bare = word.replace(/^(['"])(.*)\1$/, '$2')
  return bare === '~' ? home : bare.startsWith('~/') ? `${home}${bare.slice(1)}` : bare
}

/** `to` from `from`: absolute as it is, else joined, `.` and `..` taken out. */
export function resolvePath(from: string, to: string): string {
  const parts: string[] = []
  for (const part of `${to.startsWith('/') ? '' : `${from}/`}${to}`.split('/')) {
    if (part === '' || part === '.') continue
    if (part === '..') parts.pop()
    else parts.push(part)
  }
  return `/${parts.join('/')}`
}

/**
 * The directory a Bash command's later commands ran in, by the last `cd` it
 * runs at its top level (`cd ~/code/x && make`, a `cd` on a line of its own);
 * undefined when it runs none. A `cd` in a subshell (`(cd x && make)`) moves
 * nothing after it, and a `cd` to a variable or with no argument is unknown.
 */
export function cdTarget(command: string, from: string, home: string): string | undefined {
  let dir: string | undefined
  for (const segment of command.split(/&&|\|\||;|\n/)) {
    const m = /^\s*cd\s+("[^"]*"|'[^']*'|[^\s|&;()<>]+)\s*$/.exec(segment)
    if (m === null) continue
    const word = unquote(m[1]!, home)
    if (word.includes('$') || word === '-') continue
    dir = resolvePath(dir ?? from, word)
  }
  return dir
}

/**
 * The branch and whether anything is uncommitted, from
 * `git status --porcelain=v2 --branch`; `ahead` is the commits the upstream
 * lacks, undefined where the branch has none. Undefined for output not in that
 * shape.
 */
export function parseStatus(stdout: string): { branch: string; ahead?: number; hasUpstream: boolean; isDirty: boolean } | undefined {
  let branch: string | undefined
  let ahead: number | undefined
  let hasUpstream = false
  let isDirty = false
  for (const line of stdout.split('\n')) {
    if (line.startsWith('# branch.head ')) branch = line.slice('# branch.head '.length).trim()
    else if (line.startsWith('# branch.upstream ')) hasUpstream = true
    else if (line.startsWith('# branch.ab ')) {
      const m = /^# branch\.ab \+(\d+) -\d+/.exec(line)
      if (m !== null) ahead = Number(m[1])
    } else if (line.trim() !== '' && !line.startsWith('#')) isDirty = true
  }
  if (branch === undefined) return undefined
  return { branch: branch === '(detached)' ? 'detached' : branch, ...(ahead === undefined ? {} : { ahead }), hasUpstream, isDirty }
}

/** The footer's words for the work: the branch, `↑n` for commits not pushed, `●` for changes not committed. */
export function workText(work: Work): string {
  return [branchLabel(work.branch), ...(work.unpushed !== undefined && work.unpushed > 0 ? [`↑${work.unpushed}`] : []), ...(work.isDirty ? ['●'] : [])].join(' ')
}

/** From this full, the context's figure turns the theme's warning color. */
export const CONTEXT_WARN_PCT = 80

/**
 * Claude Code's permission mode as the hint line under the prompt names it,
 * shortened: `⏵⏵ bypass permissions on (shift+tab to cycle)` as `⏵⏵ bypass`,
 * `⏵⏵ accept edits on (shift+tab to cycle)` as `⏵⏵ accept edits`. The rest of
 * the line stays.
 */
export function shortHint(hint: string): string {
  return hint
    .replace(/ permissions on(?= \(shift\+tab to cycle\)|\s*$| ·)/, '')
    .replace(/ on(?= \(shift\+tab to cycle\))/, '')
    .replace(/\s*\(shift\+tab to cycle\)/, '')
}
