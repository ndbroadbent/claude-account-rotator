// The systemd user service that runs the coordinator on Linux, as the LaunchAgent does on macOS.

/** One word of a unit file, quoted: systemd reads backslash escapes inside double quotes, and expands % specifiers everywhere. */
export const unitWord = (s: string) => `"${s.replaceAll('\\', '\\\\').replaceAll('"', '\\"').replaceAll('%', '%%')}"`

/**
 * The unit file: restarted after a crash, not after a clean exit (an upgrade's
 * /shutdown), as the LaunchAgent is, and started with the user's manager.
 */
export function unitFile(o: { args: string[]; env: Record<string, string>; workingDir: string; log: string }): string {
  // A path setting takes the rest of the line as it is: no quotes, only % specifiers to escape.
  const log = o.log.replaceAll('%', '%%')
  return `[Unit]
Description=Claude account rotator coordinator (claude-account-rotator)

[Service]
ExecStart=${o.args.map(unitWord).join(' ')}
WorkingDirectory=${o.workingDir.replaceAll('%', '%%')}
${Object.entries(o.env)
  .map(([k, v]) => `Environment=${unitWord(`${k}=${v}`)}`)
  .join('\n')}
Restart=on-failure
RestartSec=10
StandardOutput=append:${log}
StandardError=append:${log}

[Install]
WantedBy=default.target
`
}
