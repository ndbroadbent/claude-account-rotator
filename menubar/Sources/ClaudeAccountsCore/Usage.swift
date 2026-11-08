import Foundation

extension CoordinatorState {
  /// Whether any login reports a 5-hour window. As of November 2026 Claude has no 5-hour limit, so none does, and the
  /// title and panel show only the week; a plan that reports one again brings it back.
  public var hasFiveHour: Bool {
    accounts.contains { $0.reading?.fiveHour != nil }
  }

  /// The combined percent used of a window across every login, weighted by plan size.
  ///
  /// It is `combined` as the coordinator sent it, until its `nextResetAt` passes: from then on one login's window has
  /// refilled and the coordinator's figure is stale, so it is worked out here from the logins' own readings, with each
  /// window whose reset has passed counted as 0. The logins counted are those with a reading of the window that don't
  /// need a sign-in, which is how the contract describes `combined` ("every signed-in login with a reading").
  public func combinedUsedPct(_ kind: UsageWindowKind, at now: Date) -> Double? {
    guard let window = combined[kind] else { return nil }
    guard let nextReset = window.nextResetAt, nextReset <= now else {
      return min(max(window.pct, 0), 100)
    }
    var weighted = 0.0
    var totalWeight = 0.0
    for account in accounts where !account.health.isLoginNeeded {
      guard let reading = account.reading?[kind] else { continue }
      let weight = max(account.weight, 0)
      weighted += weight * reading.usedPct(at: now)
      totalWeight += weight
    }
    guard totalWeight > 0 else { return 0 }
    return weighted / totalWeight
  }

  /// When the usage was last read: the newest reading among the logins.
  public var lastReadAt: Date? {
    accounts.compactMap { $0.reading?.at }.max()
  }

  /// The latest notices, newest first.
  public func latestNotices(_ count: Int) -> [Notice] {
    Array(notices.suffix(count).reversed())
  }

  /// Live sessions grouped by the name of their working folder, the biggest groups first.
  public var sessionGroups: [SessionGroup] {
    SessionGroup.group(sessions)
  }

  public var rotateTo: RotateTo? { RotateTo(rawValue: settings.rotateTo) }
}

public struct SessionGroup: Equatable, Sendable, Identifiable {
  public var name: String
  public var count: Int
  public var id: String { name }

  public init(name: String, count: Int) {
    self.name = name
    self.count = count
  }

  public static let unknownFolder = "other"

  public static func group(_ sessions: [SessionInfo]) -> [SessionGroup] {
    var counts: [String: Int] = [:]
    for session in sessions {
      counts[folderName(session.cwd), default: 0] += 1
    }
    return counts.map { SessionGroup(name: $0.key, count: $0.value) }
      .sorted { $0.count != $1.count ? $0.count > $1.count : $0.name.localizedStandardCompare($1.name) == .orderedAscending }
  }

  static func folderName(_ cwd: String?) -> String {
    guard let cwd else { return unknownFolder }
    var trimmed = cwd
    while trimmed.count > 1, trimmed.hasSuffix("/") { trimmed.removeLast() }
    let name = (trimmed as NSString).lastPathComponent
    return name.isEmpty ? unknownFolder : name
  }

  /// "docspring ×12"
  public var label: String { "\(name) ×\(count)" }
}

public enum PlanLabel {
  /// "Max 20x", "Max 5x", "Pro", "Team seat", "Enterprise seat", or nil when nothing says.
  public static func label(plan: String?, tier: String?, weight: Double) -> String? {
    let plan = plan?.lowercased() ?? ""
    let tier = tier?.lowercased() ?? ""
    if plan == "team" || tier.contains("team") { return "Team seat" }
    if plan == "enterprise" || tier.contains("enterprise") { return "Enterprise seat" }
    if plan == "max" || tier.contains("max") {
      if tier.contains("20x") || weight >= 20 { return "Max 20x" }
      if tier.contains("5x") || weight >= 5 { return "Max 5x" }
      return "Max"
    }
    if plan == "pro" || tier.contains("pro") { return "Pro" }
    if !plan.isEmpty { return plan.prefix(1).uppercased() + plan.dropFirst() }
    if weight >= 20 { return "Max 20x" }
    if weight >= 5 { return "Max 5x" }
    return nil
  }

  public static func label(for account: AccountState) -> String? {
    label(plan: account.plan, tier: account.tier, weight: account.weight)
  }
}
