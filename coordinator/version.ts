/** The mod's and the coordinator's version: a session whose mod is newer than the running coordinator upgrades it. */
export const VERSION = '0.8.0'

/**
 * What GET /hello names a node that serves this API in place of the coordinator and runs for as long as the node
 * does: Quietdeck's node, and Fleetlayer's claude-auth-manager plugin. Sessions and `cli.ts` leave it be, whatever its
 * version.
 */
export const NODE_NAMES: readonly string[] = ['quietdeck-node', 'fleetlayer-claude-auth-manager']

/** Whether GET /hello's name is a node's (see NODE_NAMES). */
export function isNodeName(name: string | undefined): boolean {
  return name !== undefined && NODE_NAMES.includes(name)
}

/** -1, 0 or 1 as `a` is older than, the same as, or newer than `b` (dotted numbers). */
export function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number)
  const pb = b.split('.').map(Number)
  for (let i = 0; i < Math.max(pa.length, pb.length); i += 1) {
    const x = pa[i] ?? 0
    const y = pb[i] ?? 0
    if (x !== y) return x < y ? -1 : 1
  }
  return 0
}
