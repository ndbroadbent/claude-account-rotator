// `bin/account-rotator-claude-accounts`: the arguments CodexBar passes (no shell), and the coordinator's state read
// over its socket. It never starts a coordinator: one started here could take the socket from a node (Fleetlayer's
// or Quietdeck's) that is restarting. The first Claude Code session starts it, and each read here keeps it from
// exiting idle.

import http from 'node:http'

import type { SharedState } from '../types/index.d.ts'
import { BIN, ListError, accountList } from './account-list.ts'
import { socketPath } from './server.ts'
import { VERSION } from './version.ts'

/** How long one read may take, well inside CodexBar's 30 seconds. */
const TIMEOUT_MS = 10_000

const HELP = `${BIN} ${VERSION}: every account the Claude account rotator knows, with its usage, as claude-swap's
account list (schema v1), for menu bar apps such as CodexBar ("Read accounts from claude-swap", with this as the
executable).

Usage:
  ${BIN} --list --json    print the account list (an error prints {schemaVersion, error} and exits 1)
  ${BIN} --version        print the version
  ${BIN} --help           print this

It reads the coordinator at ${socketPath()}, which a Claude Code session starts. Switching accounts isn't
supported: --switch-to fails, because the rotator picks each session's account.
`

function state(): Promise<SharedState> {
  return new Promise((resolve, reject) => {
    const req = http.request({ socketPath: socketPath(), path: '/state', method: 'GET', headers: { connection: 'close' }, timeout: TIMEOUT_MS }, res => {
      let raw = ''
      res.setEncoding('utf8')
      res.on('data', chunk => {
        raw += chunk
      })
      res.on('end', () => {
        if (res.statusCode !== 200) return reject(new ListError('CoordinatorError', `the coordinator answered HTTP ${res.statusCode}`))
        try {
          resolve(JSON.parse(raw) as SharedState)
        } catch {
          reject(new ListError('CoordinatorError', 'the coordinator answered with something other than JSON'))
        }
      })
    })
    req.on('timeout', () => req.destroy(new ListError('Timeout', `the coordinator at ${socketPath()} didn't answer in time`)))
    req.on('error', error =>
      reject(
        error instanceof ListError
          ? error
          : new ListError('CoordinatorNotRunning', `the account rotator's coordinator isn't running (${error.message}); it starts with your first Claude Code session`),
      ),
    )
    req.end()
  })
}

async function main(args: string[]): Promise<number> {
  const a = args.join(' ')
  if (a === '--help' || a === '-h') {
    process.stdout.write(HELP)
    return 0
  }
  if (a === '') {
    process.stderr.write(HELP)
    return 2
  }
  if (a === '--version' || a === '-V') {
    process.stdout.write(`${BIN} ${VERSION}\n`)
    return 0
  }
  if (a === '--list --json' || a === '--json --list' || a === '--list') {
    try {
      process.stdout.write(`${JSON.stringify(accountList(await state()))}\n`)
      return 0
    } catch (error) {
      const e = error instanceof ListError ? error : new ListError('Internal', String(error))
      process.stdout.write(`${JSON.stringify(e.json())}\n`)
      return 1
    }
  }
  const e = args[0] === '--switch-to'
    ? new ListError('SwitchingUnsupported', "the account rotator doesn't switch the machine's account: it picks each session's account")
    : new ListError('Usage', `usage: ${BIN} --list --json | --version | --help`)
  process.stdout.write(`${JSON.stringify(e.json())}\n`)
  return 2
}

process.exitCode = await main(process.argv.slice(2))
