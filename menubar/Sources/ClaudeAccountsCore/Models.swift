import Foundation

// The coordinator's State, as docs/coordinator-api.md describes it. Decoding is tolerant: unknown fields are ignored,
// a field of the wrong type reads as missing, and an array element that can't be read is skipped. Only `version` is
// required, so an error body is never mistaken for a State.

public enum UsageWindowKind: String, Sendable, CaseIterable {
  case fiveHour
  case sevenDay
}

public struct UsageWindow: Decodable, Sendable, Equatable {
  /// Percent used when read, 0-100.
  public var pct: Double
  public var resetsAt: Date?

  public init(pct: Double, resetsAt: Date? = nil) {
    self.pct = pct
    self.resetsAt = resetsAt
  }

  enum CodingKeys: String, CodingKey { case pct, resetsAt }

  public init(from decoder: Decoder) throws {
    let c = try decoder.container(keyedBy: CodingKeys.self)
    pct = c.lenient(Double.self, .pct) ?? 0
    resetsAt = c.isoDate(.resetsAt)
  }

  public func hasReset(at now: Date) -> Bool {
    guard let resetsAt else { return false }
    return resetsAt <= now
  }

  /// Percent used now: a window whose reset has passed counts as 0 until the coordinator reads it again.
  public func usedPct(at now: Date) -> Double {
    hasReset(at: now) ? 0 : min(max(pct, 0), 100)
  }
}

public struct Reading: Decodable, Sendable, Equatable {
  public var fiveHour: UsageWindow?
  public var sevenDay: UsageWindow?
  /// The weeks a model family has of its own, by name ("Fable"): its sessions also move on once it is spent.
  public var models: [String: UsageWindow]
  public var at: Date?

  public init(fiveHour: UsageWindow? = nil, sevenDay: UsageWindow? = nil, models: [String: UsageWindow] = [:], at: Date? = nil) {
    self.fiveHour = fiveHour
    self.sevenDay = sevenDay
    self.models = models
    self.at = at
  }

  enum CodingKeys: String, CodingKey { case fiveHour, sevenDay, models, at }

  public init(from decoder: Decoder) throws {
    let c = try decoder.container(keyedBy: CodingKeys.self)
    fiveHour = c.lenient(UsageWindow.self, .fiveHour)
    sevenDay = c.lenient(UsageWindow.self, .sevenDay)
    // A model's week that can't be read is left out, not the rest with it.
    models = (c.lenient([String: Lenient<UsageWindow>].self, .models) ?? [:]).compactMapValues(\.value)
    at = c.epochDate(.at)
  }

  /// The model weeks by name, in a steady order.
  public var modelWeeks: [(name: String, window: UsageWindow)] {
    models.keys.sorted().compactMap { name in models[name].map { (name, $0) } }
  }

  public subscript(kind: UsageWindowKind) -> UsageWindow? {
    switch kind {
    case .fiveHour: fiveHour
    case .sevenDay: sevenDay
    }
  }
}

public enum Health: Decodable, Sendable, Equatable {
  case ok(refreshExpiresAt: Date?)
  case loginNeeded(why: String)
  case loggingIn(since: Date?)
  /// A kind this app doesn't know yet.
  case other(kind: String)

  enum CodingKeys: String, CodingKey { case kind, refreshExpiresAt, why, since }

  public init(from decoder: Decoder) throws {
    let c = try decoder.container(keyedBy: CodingKeys.self)
    let kind = c.lenient(String.self, .kind) ?? ""
    switch kind {
    case "ok": self = .ok(refreshExpiresAt: c.epochDate(.refreshExpiresAt))
    case "login-needed": self = .loginNeeded(why: c.lenient(String.self, .why) ?? "")
    case "logging-in": self = .loggingIn(since: c.epochDate(.since))
    default: self = .other(kind: kind)
    }
  }

  public var isLoginNeeded: Bool {
    if case .loginNeeded = self { return true }
    return false
  }

  public var isLoggingIn: Bool {
    if case .loggingIn = self { return true }
    return false
  }
}

public struct AccountState: Decodable, Sendable, Equatable, Identifiable {
  public var id: String
  public var slot: String
  public var email: String?
  public var orgId: String?
  public var orgName: String?
  public var plan: String?
  public var tier: String?
  /// Plan size: 10 for Ultra (formerly Max 20x), 5 for Max (formerly Max 5x), 1 for Pro or unknown.
  public var weight: Double
  public var health: Health
  public var reading: Reading?
  public var expiresAt: Date?
  public var isSpent: Bool
  public var isRetiring: Bool
  public var moveTo: String?
  public var sessionCount: Int

  enum CodingKeys: String, CodingKey {
    case id, slot, email, orgId, orgName, plan, tier, weight, health, reading, expiresAt, isSpent, isRetiring, moveTo,
      sessionCount
  }

  public init(from decoder: Decoder) throws {
    let c = try decoder.container(keyedBy: CodingKeys.self)
    // An account without an id can't be shown or acted on: skip it (the accounts array is lossy).
    if let s = c.lenient(String.self, .id) {
      id = s
    } else if let n = c.lenient(Int.self, .id) {
      id = String(n)
    } else {
      throw DecodingError.keyNotFound(CodingKeys.id, .init(codingPath: c.codingPath, debugDescription: "account id"))
    }
    slot = c.lenient(String.self, .slot) ?? ""
    email = c.nonEmpty(.email)
    orgId = c.nonEmpty(.orgId)
    orgName = c.nonEmpty(.orgName)
    plan = c.nonEmpty(.plan)
    tier = c.nonEmpty(.tier)
    weight = c.lenient(Double.self, .weight) ?? 1
    health = c.lenient(Health.self, .health) ?? .other(kind: "")
    reading = c.lenient(Reading.self, .reading)
    expiresAt = c.epochDate(.expiresAt)
    isSpent = c.lenient(Bool.self, .isSpent) ?? false
    isRetiring = c.lenient(Bool.self, .isRetiring) ?? false
    moveTo = c.nonEmpty(.moveTo)
    sessionCount = c.lenient(Int.self, .sessionCount) ?? 0
  }

  /// "alex@example.com", or "Account 2" before the coordinator has read the profile.
  public var displayName: String { email ?? "Account \(id)" }
}

public struct CombinedWindow: Decodable, Sendable, Equatable {
  /// Weighted mean percent used, 0-100.
  public var pct: Double
  public var accounts: Int
  public var nextResetAt: Date?

  enum CodingKeys: String, CodingKey { case pct, accounts, nextResetAt }

  public init(from decoder: Decoder) throws {
    let c = try decoder.container(keyedBy: CodingKeys.self)
    pct = c.lenient(Double.self, .pct) ?? 0
    accounts = c.lenient(Int.self, .accounts) ?? 0
    nextResetAt = c.isoDate(.nextResetAt)
  }
}

public struct Combined: Decodable, Sendable, Equatable {
  public var fiveHour: CombinedWindow?
  public var sevenDay: CombinedWindow?

  public init() {}

  enum CodingKeys: String, CodingKey { case fiveHour, sevenDay }

  public init(from decoder: Decoder) throws {
    let c = try decoder.container(keyedBy: CodingKeys.self)
    fiveHour = c.lenient(CombinedWindow.self, .fiveHour)
    sevenDay = c.lenient(CombinedWindow.self, .sevenDay)
  }

  public subscript(kind: UsageWindowKind) -> CombinedWindow? {
    switch kind {
    case .fiveHour: fiveHour
    case .sevenDay: sevenDay
    }
  }
}

public enum RotateTo: String, Sendable, CaseIterable {
  case reset, room, order, off

  public var title: String {
    switch self {
    case .reset: "Soonest reset"
    case .room: "Most room"
    case .order: "Next in list"
    case .off: "Off"
    }
  }
}

public struct Settings: Decodable, Sendable, Equatable {
  /// 'reset' | 'room' | 'order' | 'off'; kept as a string so a new value doesn't fail decoding.
  public var rotateTo: String

  public init(rotateTo: String = RotateTo.reset.rawValue) {
    self.rotateTo = rotateTo
  }

  enum CodingKeys: String, CodingKey { case rotateTo }

  public init(from decoder: Decoder) throws {
    let c = try decoder.container(keyedBy: CodingKeys.self)
    rotateTo = c.lenient(String.self, .rotateTo) ?? ""
  }
}

public struct ChromeState: Decodable, Sendable, Equatable {
  public var accountId: String?
  public var accountIds: [String]
  public var miss: String?

  public init() {
    accountIds = []
  }

  enum CodingKeys: String, CodingKey { case accountId, accountIds, miss }

  public init(from decoder: Decoder) throws {
    let c = try decoder.container(keyedBy: CodingKeys.self)
    accountId = c.nonEmpty(.accountId)
    accountIds = c.lenient(LossyArray<String>.self, .accountIds)?.elements ?? []
    miss = c.nonEmpty(.miss)
  }
}

public struct SessionInfo: Decodable, Sendable, Equatable, Identifiable {
  public var id: String
  public var accountId: String
  public var pid: Int?
  public var cwd: String?
  public var isInteractive: Bool
  public var isBlocked: Bool
  public var isPending: Bool
  public var since: Date?
  public var lastSeen: Date?

  enum CodingKeys: String, CodingKey { case id, accountId, pid, cwd, isInteractive, isBlocked, isPending, since, lastSeen }

  public init(from decoder: Decoder) throws {
    let c = try decoder.container(keyedBy: CodingKeys.self)
    id = c.lenient(String.self, .id) ?? UUID().uuidString
    accountId = c.lenient(String.self, .accountId) ?? ""
    pid = c.lenient(Int.self, .pid)
    cwd = c.nonEmpty(.cwd)
    isInteractive = c.lenient(Bool.self, .isInteractive) ?? false
    isBlocked = c.lenient(Bool.self, .isBlocked) ?? false
    isPending = c.lenient(Bool.self, .isPending) ?? false
    since = c.epochDate(.since)
    lastSeen = c.epochDate(.lastSeen)
  }
}

public struct Notice: Decodable, Sendable, Equatable, Identifiable {
  public var id: Int
  public var at: Date?
  public var text: String
  public var notify: Bool
  public var accountId: String?

  enum CodingKeys: String, CodingKey { case id, at, text, notify, accountId }

  public init(from decoder: Decoder) throws {
    let c = try decoder.container(keyedBy: CodingKeys.self)
    guard let id = c.lenient(Int.self, .id), let text = c.lenient(String.self, .text) else {
      throw DecodingError.dataCorrupted(.init(codingPath: c.codingPath, debugDescription: "notice without id or text"))
    }
    self.id = id
    self.text = text
    at = c.epochDate(.at)
    notify = c.lenient(Bool.self, .notify) ?? false
    accountId = c.nonEmpty(.accountId)
  }
}

public struct CoordinatorInfo: Decodable, Sendable, Equatable {
  public var version: String?
  public var pid: Int?
  public var startedAt: Date?
  public var isManaged: Bool

  enum CodingKeys: String, CodingKey { case version, pid, startedAt, isManaged }

  public init(from decoder: Decoder) throws {
    let c = try decoder.container(keyedBy: CodingKeys.self)
    version = c.nonEmpty(.version)
    pid = c.lenient(Int.self, .pid)
    startedAt = c.epochDate(.startedAt)
    isManaged = c.lenient(Bool.self, .isManaged) ?? false
  }
}

public struct SignInState: Decodable, Sendable, Equatable {
  public var accountId: String
  public var since: Date?

  enum CodingKeys: String, CodingKey { case accountId, since }

  public init(from decoder: Decoder) throws {
    let c = try decoder.container(keyedBy: CodingKeys.self)
    accountId = c.lenient(String.self, .accountId) ?? ""
    since = c.epochDate(.since)
  }
}

public struct CoordinatorState: Decodable, Sendable, Equatable {
  /// Bumps on every change.
  public var version: Int
  public var coordinator: CoordinatorInfo?
  /// The coordinator's clock when it answered.
  public var now: Date?
  public var accounts: [AccountState]
  public var combined: Combined
  public var settings: Settings
  public var chrome: ChromeState
  public var sessions: [SessionInfo]
  /// The latest 20, oldest first.
  public var notices: [Notice]
  public var signIn: SignInState?

  enum CodingKeys: String, CodingKey {
    case version, coordinator, now, accounts, combined, settings, chrome, sessions, notices, signIn
  }

  public init(from decoder: Decoder) throws {
    let c = try decoder.container(keyedBy: CodingKeys.self)
    version = try c.decode(Int.self, forKey: .version)
    coordinator = c.lenient(CoordinatorInfo.self, .coordinator)
    now = c.epochDate(.now)
    accounts = c.lenient(LossyArray<AccountState>.self, .accounts)?.elements ?? []
    combined = c.lenient(Combined.self, .combined) ?? Combined()
    settings = c.lenient(Settings.self, .settings) ?? Settings(rotateTo: "")
    chrome = c.lenient(ChromeState.self, .chrome) ?? ChromeState()
    sessions = c.lenient(LossyArray<SessionInfo>.self, .sessions)?.elements ?? []
    notices = c.lenient(LossyArray<Notice>.self, .notices)?.elements ?? []
    signIn = c.lenient(SignInState.self, .signIn)
  }

  public static func decode(_ data: Data) throws -> CoordinatorState {
    try JSONDecoder().decode(CoordinatorState.self, from: data)
  }

  public var hasLoginNeeded: Bool { accounts.contains { $0.health.isLoginNeeded } }
}

public struct Hello: Decodable, Sendable, Equatable {
  public var name: String
  public var version: String
  public var pid: Int?
  public var startedAt: Date?

  enum CodingKeys: String, CodingKey { case name, version, pid, startedAt }

  public init(from decoder: Decoder) throws {
    let c = try decoder.container(keyedBy: CodingKeys.self)
    name = c.lenient(String.self, .name) ?? ""
    version = c.lenient(String.self, .version) ?? ""
    pid = c.lenient(Int.self, .pid)
    startedAt = c.epochDate(.startedAt)
  }
}

// MARK: - Tolerant decoding helpers

/// An array that skips the elements it can't decode instead of failing.
struct LossyArray<Element: Decodable>: Decodable {
  var elements: [Element]

  private struct Skip: Decodable {
    init(from decoder: Decoder) {}
  }

  init(from decoder: Decoder) throws {
    var c = try decoder.unkeyedContainer()
    var out: [Element] = []
    while !c.isAtEnd {
      if let element = try? c.decode(Element.self) {
        out.append(element)
      } else {
        // A failed decode leaves the cursor in place; Skip always succeeds and moves past the element.
        _ = try c.decode(Skip.self)
      }
    }
    elements = out
  }
}

enum ISODate {
  private static let withFraction = Date.ISO8601FormatStyle(includingFractionalSeconds: true)
  private static let plain = Date.ISO8601FormatStyle()

  static func parse(_ string: String) -> Date? {
    (try? withFraction.parse(string)) ?? (try? plain.parse(string))
  }
}

extension Date {
  /// A date from milliseconds since the epoch, as the coordinator sends them.
  public init(epochMs: Double) {
    self.init(timeIntervalSince1970: epochMs / 1000)
  }

  public var epochMs: Double { timeIntervalSince1970 * 1000 }
}

/// A value that decodes as nil where it can't be read, so a collection of them keeps the rest.
struct Lenient<T: Decodable>: Decodable {
  let value: T?
  init(from decoder: Decoder) throws { value = try? T(from: decoder) }
}

extension KeyedDecodingContainer {
  /// The value, or nil when it is missing, null or of the wrong type.
  func lenient<T: Decodable>(_ type: T.Type, _ key: Key) -> T? {
    (try? decodeIfPresent(type, forKey: key)) ?? nil
  }

  func nonEmpty(_ key: Key) -> String? {
    guard let s = lenient(String.self, key), !s.isEmpty else { return nil }
    return s
  }

  func epochDate(_ key: Key) -> Date? {
    lenient(Double.self, key).map { Date(epochMs: $0) }
  }

  func isoDate(_ key: Key) -> Date? {
    lenient(String.self, key).flatMap(ISODate.parse)
  }
}
