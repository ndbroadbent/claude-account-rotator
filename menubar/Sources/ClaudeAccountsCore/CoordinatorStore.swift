import Foundation
import Observation

/// Retry delays after a failed call: 2 s, doubling to 30 s.
public struct Backoff: Sendable {
  public static let first: TimeInterval = 2
  public static let limit: TimeInterval = 30
  private var current: TimeInterval?

  public init() {}

  public mutating func next() -> TimeInterval {
    let delay = current.map { min($0 * 2, Self.limit) } ?? Self.first
    current = delay
    return delay
  }

  public mutating func reset() {
    current = nil
  }
}

public enum ConnectionStatus: Equatable, Sendable {
  case connecting
  case connected
  /// No socket, or nothing listening on it.
  case notRunning
  /// The coordinator answered with an error, or something that couldn't be read.
  case failing(String)

  public var isReachable: Bool { self == .connected }
}

/// The coordinator's state as the app sees it, kept current with the long poll.
@MainActor
@Observable
public final class CoordinatorStore {
  public private(set) var state: CoordinatorState?
  public private(set) var connection: ConnectionStatus = .connecting
  /// The current time on the coordinator's clock, refreshed every few seconds for relative times.
  public private(set) var now: Date
  /// When the last answer arrived.
  public private(set) var receivedAt: Date?
  public private(set) var nextRetryAt: Date?
  /// The last action's error, shown until the next action or answer.
  public private(set) var actionError: String?
  /// Actions under way, by key ("check", "signin", "cancel", "rotate").
  public private(set) var busy: Set<String> = []

  @ObservationIgnored private let client: CoordinatorClient?
  @ObservationIgnored private var pollTask: Task<Void, Never>?
  @ObservationIgnored private var tickTask: Task<Void, Never>?
  @ObservationIgnored private var clockOffset: TimeInterval = 0
  @ObservationIgnored private var needsFreshState = true

  public static let tickInterval: Duration = .seconds(5)

  public init(client: CoordinatorClient) {
    self.client = client
    now = Date()
  }

  /// A store that never connects, for rendering a fixed state. Times are relative to the state's own `now`.
  public init(fixedState: CoordinatorState?, connection: ConnectionStatus, receivedAt: Date? = nil) {
    client = nil
    state = fixedState
    self.connection = connection
    now = fixedState?.now ?? Date()
    self.receivedAt = receivedAt ?? fixedState?.now
  }

  public func start() {
    guard client != nil, pollTask == nil else { return }
    pollTask = Task { [weak self] in await self?.pollLoop() }
    tickTask = Task { [weak self] in
      while !Task.isCancelled {
        try? await Task.sleep(for: Self.tickInterval)
        self?.tick()
      }
    }
  }

  public func stop() {
    pollTask?.cancel()
    pollTask = nil
    tickTask?.cancel()
    tickTask = nil
  }

  /// Retries at once while the coordinator is unreachable (the panel calls it when it opens).
  public func retryNow() {
    guard client != nil, !connection.isReachable else { return }
    pollTask?.cancel()
    pollTask = Task { [weak self] in await self?.pollLoop() }
  }

  public func tick() {
    now = Date().addingTimeInterval(clockOffset)
  }

  // MARK: - Actions

  public func checkNow() {
    perform("check") { try await $0.check() }
  }

  public func signIn(accountId: String) {
    perform("signin:\(accountId)") { try await $0.signIn(accountId: accountId) }
  }

  public func cancelSignIn() {
    perform("cancel") { try await $0.cancelSignIn() }
  }

  public func setRotateTo(_ value: String) {
    guard value != state?.settings.rotateTo else { return }
    perform("rotate") { try await $0.setRotateTo(value) }
  }

  public func isBusy(_ key: String) -> Bool { busy.contains(key) }

  private func perform(_ key: String, _ call: @escaping @Sendable (CoordinatorClient) async throws -> CoordinatorState) {
    guard let client, !busy.contains(key) else { return }
    busy.insert(key)
    actionError = nil
    Task {
      defer { busy.remove(key) }
      do {
        apply(try await call(client))
      } catch {
        actionError = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
      }
    }
  }

  // MARK: - Long poll

  private func pollLoop() async {
    guard let client else { return }
    var backoff = Backoff()
    while !Task.isCancelled {
      do {
        // After an error, start from a plain read: a restarted coordinator counts versions from scratch.
        let since = needsFreshState ? nil : state?.version
        let next = try await client.state(since: since, waitMs: since == nil ? nil : CoordinatorClient.longPollWaitMs)
        if Task.isCancelled { return }
        apply(next)
        needsFreshState = false
        connection = .connected
        nextRetryAt = nil
        backoff.reset()
      } catch {
        if Task.isCancelled || error is CancellationError { return }
        needsFreshState = true
        connection = Self.status(for: error)
        let delay = backoff.next()
        nextRetryAt = Date().addingTimeInterval(delay)
        try? await Task.sleep(for: .seconds(delay))
      }
    }
  }

  /// Takes a state from the long poll or an action's answer, unless it is older than the one held.
  public func apply(_ next: CoordinatorState) {
    let received = Date()
    if let current = state,
      current.coordinator?.startedAt == next.coordinator?.startedAt,
      current.coordinator?.pid == next.coordinator?.pid,
      next.version < current.version
    {
      return
    }
    state = next
    receivedAt = received
    if let coordinatorNow = next.now {
      clockOffset = coordinatorNow.timeIntervalSince(received)
    }
    tick()
  }

  static func status(for error: Error) -> ConnectionStatus {
    switch error {
    case CoordinatorError.notRunning: .notRunning
    case let error as LocalizedError: .failing(error.errorDescription ?? "\(error)")
    default: .failing("\(error)")
    }
  }
}
