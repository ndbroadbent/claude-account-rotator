import ClaudeAccountsCore
import Foundation
import Testing

/// The client and the store against dev/fake-coordinator.mjs on a real Unix socket.
@Suite struct SocketClientTests {
  @Test func helloAndState() async throws {
    let fake = try FakeCoordinator()
    defer { fake.stop() }
    let client = fake.client

    let hello = try await client.hello()
    #expect(hello.name.contains("fake"))
    #expect(hello.version == "0.4.0")

    let state = try await client.state()
    #expect(state.version == 1842)
    #expect(state.accounts.count == 3)
    // The fake moves the fixture's times to now, so resets are still ahead.
    let now = try #require(state.now)
    #expect(abs(now.timeIntervalSinceNow) < 5)
    let resetsAt = try #require(state.accounts[0].reading?.fiveHour?.resetsAt)
    #expect(abs(resetsAt.timeIntervalSince(now) - 80 * 60) < 10)
  }

  @Test func longPollReturnsWhenTheStateChanges() async throws {
    let fake = try FakeCoordinator()
    defer { fake.stop() }
    let client = fake.client
    let first = try await client.state()

    let started = Date()
    async let polled = client.state(since: first.version, waitMs: 10_000)
    try await Task.sleep(for: .milliseconds(400))
    let checked = try await client.check()
    #expect(checked.version == first.version + 1)

    let next = try await polled
    let elapsed = Date().timeIntervalSince(started)
    #expect(next.version == first.version + 1)
    // It waited for the change, and returned soon after it rather than at the end of the wait.
    #expect(elapsed >= 0.35)
    #expect(elapsed < 5)
  }

  @Test func longPollAnswersAfterTheWaitWithoutAChange() async throws {
    let fake = try FakeCoordinator()
    defer { fake.stop() }
    let client = fake.client
    let first = try await client.state()

    let started = Date()
    let next = try await client.state(since: first.version, waitMs: 500)
    #expect(next.version == first.version)
    #expect(Date().timeIntervalSince(started) >= 0.45)
  }

  @Test func actions() async throws {
    let fake = try FakeCoordinator()
    defer { fake.stop() }
    let client = fake.client

    #expect(try await client.setRotateTo("room").settings.rotateTo == "room")
    await #expect(throws: CoordinatorError.http(status: 400, message: "rotateTo is one of reset, room, order or off.")) {
      try await client.setRotateTo("sideways")
    }

    let signingIn = try await client.signIn(accountId: "3")
    #expect(signingIn.accounts[2].health.isLoggingIn)
    #expect(signingIn.signIn?.accountId == "3")

    let cancelled = try await client.cancelSignIn()
    #expect(cancelled.accounts[2].health == .loginNeeded(why: "Claude rejected its sign-in: the refresh token has expired."))
    #expect(cancelled.signIn == nil)

    await #expect(throws: CoordinatorError.http(status: 404, message: "No login 9.")) {
      try await client.signIn(accountId: "9")
    }
  }

  @Test func noSocketIsNotRunning() async throws {
    let directory = try makeShortTempDirectory()
    defer { try? FileManager.default.removeItem(at: directory) }
    let client = CoordinatorClient(socketPath: directory.appendingPathComponent("coordinator.sock").path, timeout: 2)
    let error = await #expect(throws: CoordinatorError.self) { try await client.state() }
    #expect(error?.isNotRunning == true, "\(String(describing: error))")
  }

  @Test func aSocketLeftByACrashIsNotRunning() async throws {
    let fake = try FakeCoordinator()
    defer { fake.stop() }
    fake.kill()
    #expect(FileManager.default.fileExists(atPath: fake.socketPath))
    let error = await #expect(throws: CoordinatorError.self) { try await fake.client.state() }
    #expect(error?.isNotRunning == true, "\(String(describing: error))")
  }

  @Test @MainActor func storeFollowsTheLongPoll() async throws {
    let fake = try FakeCoordinator()
    defer { fake.stop() }
    let store = CoordinatorStore(client: fake.client)
    store.start()
    defer { store.stop() }

    try await waitUntil { store.state != nil }
    #expect(store.connection == .connected)
    let version = try #require(store.state?.version)

    // A change made by someone else arrives through the long poll.
    _ = try await fake.client.setRotateTo("order")
    try await waitUntil { store.state?.version == version + 1 }
    #expect(store.state?.settings.rotateTo == "order")

    // And the store's own actions apply their answer.
    store.checkNow()
    try await waitUntil { (store.state?.version ?? 0) >= version + 2 && !store.isBusy("check") }
    #expect(store.actionError == nil)

    // When the coordinator goes away, the store says so and schedules a retry.
    fake.stop()
    try await waitUntil { store.connection == .notRunning }
    #expect(store.nextRetryAt != nil)
  }

  @MainActor private func waitUntil(
    timeout: TimeInterval = 5, _ condition: @MainActor () -> Bool, sourceLocation: SourceLocation = #_sourceLocation
  ) async throws {
    let deadline = Date().addingTimeInterval(timeout)
    while !condition() {
      guard Date() < deadline else {
        throw TestFailure(description: "condition not met in \(timeout) s at \(sourceLocation)")
      }
      try await Task.sleep(for: .milliseconds(25))
    }
  }
}

extension CoordinatorError {
  var isNotRunning: Bool {
    if case .notRunning = self { return true }
    return false
  }
}
