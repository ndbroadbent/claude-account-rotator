import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import fs from 'node:fs'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'
import { describe, test } from 'node:test'
import { fileURLToPath } from 'node:url'

import type { AccountState, SharedState } from '../types/index.d.ts'
import { ListError, accountList } from './account-list.ts'

const NOW = Date.parse('2026-11-27T10:00:00Z')
const BIN = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'bin', 'account-rotator-claude-accounts')

const account = (id: string, rest: Partial<AccountState> = {}): AccountState => ({
  id,
  slot: id === '1' ? '' : `/Users/tester/.claude/accounts/${id}`,
  health: { kind: 'ok' },
  weight: 5,
  sessionCount: 0,
  ...rest,
})

const sharedState = (accounts: AccountState[]): SharedState => ({
  version: 1,
  coordinator: { version: '0.9.0', pid: 1, startedAt: NOW, isManaged: false },
  now: NOW,
  accounts,
  combined: {},
  settings: { rotateTo: 'soonest-reset', footer: { fill: 'bars', top: 'week' } } as unknown as SharedState['settings'],
  chrome: { accountIds: [] },
  sessions: [],
  notices: [],
})

describe('accountList', () => {
  test('gives each login a row with its usage, plan weight and status, as claude-swap prints them', () => {
    const list = accountList(
      sharedState([
        account('2', {
          email: 'two@example.com',
          weight: 10,
          reading: { sevenDay: { pct: 40, resetsAt: '2026-11-30T12:00:00.250Z' }, models: { Fable: { pct: 70, resetsAt: '2026-11-30T12:00:00Z' } }, at: NOW - 60_000 },
        }),
        account('1', {
          email: 'one@example.com',
          orgId: 'org-1',
          orgName: 'One',
          reading: { fiveHour: { pct: 91, resetsAt: '2026-11-27T12:00:00Z' }, sevenDay: { pct: 15 }, at: NOW },
        }),
        account('3', { email: 'three@example.com', health: { kind: 'login-needed', why: 'signed out' } }),
      ]),
    )
    assert.deepEqual(list, {
      schemaVersion: 1,
      activeAccountNumber: null,
      supportsAccountSwitching: false,
      accounts: [
        {
          number: 1,
          active: false,
          usageStatus: 'ok',
          email: 'one@example.com',
          organizationUuid: 'org-1',
          organizationName: 'One',
          alias: null,
          usage: { fiveHour: { pct: 91, resetsAt: '2026-11-27T12:00:00Z' }, sevenDay: { pct: 15 } },
          usageFetchedAt: '2026-11-27T10:00:00Z',
          weight: 5,
        },
        {
          number: 2,
          active: false,
          usageStatus: 'ok',
          email: 'two@example.com',
          organizationUuid: '',
          organizationName: '',
          alias: null,
          usage: { sevenDay: { pct: 40, resetsAt: '2026-11-30T12:00:00Z' }, scoped: [{ name: 'Fable', pct: 70, resetsAt: '2026-11-30T12:00:00Z' }] },
          usageFetchedAt: '2026-11-27T09:59:00Z',
          weight: 10,
        },
        {
          number: 3,
          active: false,
          usageStatus: 'relogin_required',
          email: 'three@example.com',
          organizationUuid: '',
          organizationName: '',
          alias: null,
          usage: {},
          weight: 5,
        },
      ],
    })
  })

  test('a window past its reset is empty, and a login not read yet is unavailable', () => {
    const list = accountList(
      sharedState([account('1', { reading: { sevenDay: { pct: 99, resetsAt: '2026-11-27T09:00:00Z' }, at: NOW - 3600_000 } }), account('2', { email: 'b@example.com' })]),
    ) as { accounts: { usage: unknown; usageStatus: string }[] }
    assert.deepEqual(list.accounts[0]?.usage, { sevenDay: { pct: 0 } })
    assert.equal(list.accounts[1]?.usageStatus, 'unavailable')
  })

  test('a login is named by its own email, as the panel names it, and by who signed in only before it has one', () => {
    const list = accountList(
      sharedState([
        account('1', { email: 'own@example.com', orgId: 'org-own', holder: { token: 't', who: { email: 'other@example.com', orgId: 'org-other' } } }),
        account('2', { holder: { token: 'u', who: { email: 'new@example.com', orgId: 'org-n', orgName: 'New' } } }),
      ]),
    ) as { accounts: { email: string; organizationUuid: string; organizationName: string }[] }
    assert.deepEqual(
      list.accounts.map(a => [a.email, a.organizationUuid, a.organizationName]),
      [
        ['own@example.com', 'org-own', ''],
        ['new@example.com', 'org-n', 'New'],
      ],
    )
  })

  test('no accounts is an error CodexBar shows', () => {
    assert.throws(() => accountList(sharedState([])), (e: unknown) => e instanceof ListError && e.kind === 'NoAccounts')
  })
})

describe('bin/account-rotator-claude-accounts', () => {
  const run = (args: string[], dir: string) =>
    new Promise<{ code: number; out: string }>(resolve => {
      const env = { HOME: dir, CLAUDE_ACCOUNT_ROTATOR_DIR: dir, PATH: '/usr/bin:/bin:/usr/sbin:/sbin' }
      execFile(BIN, args, { encoding: 'utf8', env }, (error, stdout) => resolve({ code: error === null ? 0 : Number(error.code), out: stdout }))
    })

  test("finds the coordinator's Node with a GUI app's PATH, and reads the account list over the socket", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rotator-list-'))
    fs.writeFileSync(path.join(dir, 'node'), `${process.execPath}\n`)
    const server = http.createServer((req, res) => {
      res.writeHead(req.url === '/state' ? 200 : 404, { 'content-type': 'application/json' })
      res.end(JSON.stringify(sharedState([account('1', { email: 'one@example.com', reading: { sevenDay: { pct: 12 }, at: NOW } })])))
    })
    await new Promise<void>(resolve => server.listen(path.join(dir, 'coordinator.sock'), () => resolve()))
    try {
      const { code, out } = await run(['--list', '--json'], dir)
      assert.equal(code, 0)
      const list = JSON.parse(out) as { accounts: { number: number; usage: unknown }[] }
      assert.deepEqual(list.accounts.map(a => [a.number, a.usage]), [[1, { sevenDay: { pct: 12 } }]])
      assert.match((await run(['--version'], dir)).out, /^account-rotator-claude-accounts \d+\.\d+\.\d+\n$/)
    } finally {
      server.close()
      fs.rmSync(dir, { recursive: true, force: true })
    }
  })

  test('with no coordinator, it prints an error CodexBar shows, and it never switches', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rotator-list-'))
    fs.writeFileSync(path.join(dir, 'node'), `${process.execPath}\n`)
    try {
      const listed = await run(['--list', '--json'], dir)
      assert.equal(listed.code, 1)
      assert.equal((JSON.parse(listed.out) as { error: { type: string } }).error.type, 'CoordinatorNotRunning')
      const switched = await run(['--switch-to', '2', '--json'], dir)
      assert.equal(switched.code, 2)
      assert.equal((JSON.parse(switched.out) as { error: { type: string } }).error.type, 'SwitchingUnsupported')
    } finally {
      fs.rmSync(dir, { recursive: true, force: true })
    }
  })
})
