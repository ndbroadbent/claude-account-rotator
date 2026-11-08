import Foundation

public enum CoordinatorPaths {
  public static let directoryEnvironmentKey = "CLAUDE_ACCOUNT_ROTATOR_DIR"

  /// `~/.claude/account-rotator`, or `$CLAUDE_ACCOUNT_ROTATOR_DIR`.
  public static func directory(environment: [String: String] = ProcessInfo.processInfo.environment) -> String {
    if let dir = environment[directoryEnvironmentKey], !dir.isEmpty {
      return (dir as NSString).expandingTildeInPath
    }
    return (NSHomeDirectory() as NSString).appendingPathComponent(".claude/account-rotator")
  }

  public static func socketPath(environment: [String: String] = ProcessInfo.processInfo.environment) -> String {
    (directory(environment: environment) as NSString).appendingPathComponent("coordinator.sock")
  }
}

/// Talks to the coordinator over its Unix socket. Each call is one connection with `Connection: close`.
public struct CoordinatorClient: Sendable {
  public let socketPath: String
  /// How long a call may take, on top of a long poll's wait.
  public var timeout: TimeInterval

  /// The long poll's wait: the coordinator caps it at 55 s.
  public static let longPollWaitMs = 50_000

  public init(socketPath: String = CoordinatorPaths.socketPath(), timeout: TimeInterval = 10) {
    self.socketPath = socketPath
    self.timeout = timeout
  }

  public func hello() async throws -> Hello {
    try decode(Hello.self, from: try await request("GET", "/hello"))
  }

  /// The state now, or with `since` (the version you have), once it changes or `waitMs` passes.
  public func state(since: Int? = nil, waitMs: Int? = nil) async throws -> CoordinatorState {
    var query: [String] = []
    if let since { query.append("since=\(since)") }
    if let waitMs { query.append("wait=\(waitMs)") }
    let path = query.isEmpty ? "/state" : "/state?" + query.joined(separator: "&")
    let extra = TimeInterval(waitMs ?? 0) / 1000
    return try decode(CoordinatorState.self, from: try await request("GET", path, timeout: timeout + extra))
  }

  /// Re-reads every login now.
  public func check() async throws -> CoordinatorState {
    try await stateCall("POST", "/check", body: Empty())
  }

  /// Starts the browser sign-in of one login, or of every login that needs one.
  public func signIn(accountId: String?) async throws -> CoordinatorState {
    try await stateCall("POST", "/signin", body: SignInBody(accountId: accountId))
  }

  public func cancelSignIn() async throws -> CoordinatorState {
    try await stateCall("POST", "/signin/cancel", body: Empty())
  }

  public func setRotateTo(_ value: String) async throws -> CoordinatorState {
    try await stateCall("PATCH", "/settings", body: SettingsBody(rotateTo: value))
  }

  // MARK: -

  private struct Empty: Encodable {}

  private struct SignInBody: Encodable {
    var accountId: String?
  }

  private struct SettingsBody: Encodable {
    var rotateTo: String
  }

  private struct StateEnvelope: Decodable {
    var state: CoordinatorState
  }

  private struct ErrorBody: Decodable {
    var error: String
  }

  private func stateCall(_ method: String, _ path: String, body: some Encodable) async throws -> CoordinatorState {
    let data = try JSONEncoder().encode(body)
    return try decode(StateEnvelope.self, from: try await request(method, path, body: data)).state
  }

  public func request(_ method: String, _ path: String, body: Data? = nil, timeout: TimeInterval? = nil) async throws
    -> HTTPResponse
  {
    guard FileManager.default.fileExists(atPath: socketPath) else {
      throw CoordinatorError.notRunning("no socket at \(socketPath)")
    }
    var head = "\(method) \(path) HTTP/1.1\r\nHost: coordinator\r\nConnection: close\r\nAccept: application/json\r\n"
    if let body {
      head += "Content-Type: application/json\r\nContent-Length: \(body.count)\r\n"
    }
    head += "\r\n"
    var data = Data(head.utf8)
    if let body { data.append(body) }
    let exchange = UnixSocketExchange(socketPath: socketPath, request: data, timeout: timeout ?? self.timeout)
    return try await exchange.run()
  }

  private func decode<T: Decodable>(_ type: T.Type, from response: HTTPResponse) throws -> T {
    guard (200..<300).contains(response.status) else {
      let message = (try? JSONDecoder().decode(ErrorBody.self, from: response.body))?.error
        ?? String(decoding: response.body.prefix(200), as: UTF8.self)
      throw CoordinatorError.http(status: response.status, message: message)
    }
    do {
      return try JSONDecoder().decode(type, from: response.body)
    } catch {
      throw CoordinatorError.badResponse("\(T.self): \(error)")
    }
  }
}
