import { expect, test } from 'claude-code/testing'

import { branchLabel, cdTarget, modelLabel, parseStatus, resolvePath, shortHint, workText } from './work'

test('models are named as people say them', () => {
  expect(modelLabel('claude-fable-5-2')).toBe('Fable 5.2')
  expect(modelLabel('claude-opus-5-5[1m]')).toBe('Opus 5.5 1M')
  expect(modelLabel('claude-sonnet-4-20250514')).toBe('Sonnet 4')
  expect(modelLabel('Fable 5.2')).toBe('Fable 5.2')
  expect(modelLabel('')).toBeUndefined()
  expect(modelLabel(undefined)).toBeUndefined()
})

test('a branch drops whose it is and is cut to fit', () => {
  expect(branchLabel('nathan/sc-6450/least-privilege-ci-oidc')).toBe('sc-6450 least-privilege-ci-oidc')
  expect(branchLabel('feature/login')).toBe('feature/login')
  expect(branchLabel('main')).toBe('main')
  expect(branchLabel('nathan/sc-1/a-very-long-branch-name-that-goes-on-and-on')).toBe('sc-1 a-very-long-branch-name-that-goes-…')
})

test('the directory a Bash command ends in is its last top-level cd', () => {
  const home = '/Users/n'
  expect(cdTarget('cd ~/code/docspring-wt/sc-1 && git status', '/x', home)).toBe('/Users/n/code/docspring-wt/sc-1')
  expect(cdTarget('cd sub; make', '/repo', home)).toBe('/repo/sub')
  expect(cdTarget('cd a && cd ../b && ls', '/repo', home)).toBe('/repo/b')
  expect(cdTarget('cd "/path with space" && ls', '/repo', home)).toBe('/path with space')
  expect(cdTarget('cd /a\nmake test', '/repo', home)).toBe('/a')
  expect(cdTarget('(cd menubar && swift test)', '/repo', home)).toBeUndefined()
  expect(cdTarget('cd $DIR && ls', '/repo', home)).toBeUndefined()
  expect(cdTarget('cd - && ls', '/repo', home)).toBeUndefined()
  expect(cdTarget('git status', '/repo', home)).toBeUndefined()
  expect(cdTarget('echo cd /x', '/repo', home)).toBeUndefined()
  expect(resolvePath('/a/b', '../../c/./d')).toBe('/c/d')
})

test('git status gives the branch, how far ahead it is and whether anything is uncommitted', () => {
  expect(parseStatus('# branch.oid a\n# branch.head main\n# branch.upstream origin/main\n# branch.ab +3 -1\n')).toEqual({ branch: 'main', ahead: 3, hasUpstream: true, isDirty: false })
  expect(parseStatus('# branch.oid a\n# branch.head (detached)\n? new.txt\n')).toEqual({ branch: 'detached', hasUpstream: false, isDirty: true })
  expect(parseStatus('fatal: not a git repository')).toBeUndefined()
  expect(workText({ branch: 'main', unpushed: 0, isDirty: false })).toBe('main')
  expect(workText({ branch: 'nathan/sc-1/x', unpushed: 4, isDirty: true })).toBe('sc-1 x ↑4 ●')
})

test('the permission mode is shortened and the rest of the hint kept', () => {
  expect(shortHint('⏵⏵ bypass permissions on (shift+tab to cycle)')).toBe('⏵⏵ bypass')
  expect(shortHint('⏵⏵ accept edits on (shift+tab to cycle)')).toBe('⏵⏵ accept edits')
  expect(shortHint('⏸ plan mode on (shift+tab to cycle) · esc to interrupt')).toBe('⏸ plan mode · esc to interrupt')
  expect(shortHint('⏵⏵ bypass permissions on · 2 shells')).toBe('⏵⏵ bypass · 2 shells')
  expect(shortHint('? for shortcuts')).toBe('? for shortcuts')
})
