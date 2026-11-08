import ClaudeAccountsCore
import Foundation
import Testing

@Suite struct TitleTests {
  private func title(
    _ week: Double?, warning: Bool = false, reachable: Bool = true, display: UsageDisplay = .used
  ) -> TitleModel {
    TitleFormatter.make(weekUsed: week, warning: warning, isReachable: reachable, display: display)
  }

  @Test func weekUsed() {
    let model = title(61.5)
    #expect(model.text == "62%")
    #expect(!model.warning)
    #expect(!model.dimmed)
    #expect(model.accessibilityLabel == "Claude usage: week 62 percent used")
  }

  @Test func left() {
    #expect(title(61, display: .left).text == "39%")
  }

  @Test func clampsAndPlaceholders() {
    #expect(title(130).text == "100%")
    #expect(title(-4).text == "0%")
    #expect(title(nil).text == "–")
  }

  @Test func warningWhenALoginNeedsSigningIn() {
    #expect(title(20, warning: true).warning)
  }

  @Test func unreachableIsDimmedWithoutFigures() {
    let model = title(61, warning: true, reachable: false)
    #expect(model.dimmed)
    #expect(!model.warning)
    #expect(model.text == "–")
  }

  @Test func fromStateIsTheCombinedWeekEvenWithAFiveHourWindow() throws {
    // three-accounts has 5-hour windows: the title leaves them to their logins' rows.
    let state = try loadFixture("three-accounts")
    let now = try #require(state.now)
    let model = TitleFormatter.make(state: state, isReachable: true, now: now, display: .used)
    #expect(model.text == "60%")
    #expect(model.warning)
    #expect(TitleFormatter.make(state: state, isReachable: false, now: now, display: .used).dimmed)
    #expect(TitleFormatter.make(state: try loadFixture("week-only"), isReachable: true, now: now, display: .used).text == "70%")
  }

  @Test func combinedIsWorkedOutOnceItsResetPasses() throws {
    let state = try loadFixture("three-accounts")
    let now = try #require(state.now)
    // Before account 1's reset (in 1h 20m), the coordinator's figure.
    #expect(state.combinedUsedPct(.fiveHour, at: now) == 77.5)
    // After it, account 1 counts as 0 and account 2 still has 93; account 3 needs a sign-in and doesn't count.
    let later = now.addingTimeInterval(81 * 60)
    #expect(state.combinedUsedPct(.fiveHour, at: later) == 46.5)
    #expect(state.combinedUsedPct(.sevenDay, at: later) == 59.5)
  }

  @Test func windowCountsAsZeroOnceReset() {
    let now = Date(epochMs: 1_000_000)
    let window = UsageWindow(pct: 80, resetsAt: now)
    #expect(window.usedPct(at: now.addingTimeInterval(-1)) == 80)
    #expect(window.usedPct(at: now) == 0)
    #expect(UsageWindow(pct: 80).usedPct(at: now) == 80)
  }
}

@Suite struct RelativeTimeTests {
  @Test func durations() {
    #expect(RelativeTime.duration(10) == "1m")
    #expect(RelativeTime.duration(45 * 60) == "45m")
    #expect(RelativeTime.duration(59 * 60 + 1) == "1h")
    #expect(RelativeTime.duration(80 * 60) == "1h 20m")
    #expect(RelativeTime.duration(79 * 60 + 10) == "1h 20m")
    #expect(RelativeTime.duration(2 * 3600) == "2h")
    #expect(RelativeTime.duration(3 * 86_400 + 4 * 3600) == "3d 4h")
    #expect(RelativeTime.duration(6 * 86_400) == "6d")
  }

  @Test func resetsIn() {
    let now = Date(epochMs: 1_794_218_400_000)
    #expect(RelativeTime.resetsIn(now.addingTimeInterval(80 * 60), now: now) == "resets in 1h 20m")
    #expect(RelativeTime.resetsIn(now, now: now) == "just reset")
    #expect(RelativeTime.resetsIn(now.addingTimeInterval(-60), now: now) == "just reset")
    #expect(RelativeTime.resetsIn(nil, now: now) == nil)
  }

  @Test func ago() {
    let now = Date(epochMs: 1_794_218_400_000)
    #expect(RelativeTime.ago(now, now: now) == "just now")
    #expect(RelativeTime.ago(now.addingTimeInterval(-12), now: now) == "12s ago")
    #expect(RelativeTime.ago(now.addingTimeInterval(-5 * 60 - 30), now: now) == "5m ago")
    #expect(RelativeTime.ago(now.addingTimeInterval(-2 * 3600), now: now) == "2h ago")
    #expect(RelativeTime.ago(now.addingTimeInterval(-3 * 86_400), now: now) == "3d ago")
    // A reading stamped a moment ahead of this clock.
    #expect(RelativeTime.ago(now.addingTimeInterval(3), now: now) == "just now")
  }
}

@Suite struct RoomColorTests {
  @Test func endsAndMiddle() {
    let anchors = RoomColor.Anchors.plain
    #expect(RoomColor.color(roomLeft: 100, anchors: anchors) == anchors.green)
    #expect(RoomColor.color(roomLeft: 50, anchors: anchors) == anchors.yellow)
    #expect(RoomColor.color(roomLeft: 0, anchors: anchors) == anchors.red)
    #expect(RoomColor.color(roomLeft: 150, anchors: anchors) == anchors.green)
    #expect(RoomColor.color(roomLeft: -5, anchors: anchors) == anchors.red)
  }

  @Test func hueFallsAsRoomRunsOut() {
    var last = Double.infinity
    for room in stride(from: 100.0, through: 0, by: -10) {
      let hue = RoomColor.color(roomLeft: room).hue
      #expect(hue <= last)
      last = hue
    }
  }

  @Test func redJustBelowOneMeetsYellowThroughOrange() {
    // The system red's hue is about 0.99: the mix must not pass through blue.
    let anchors = RoomColor.Anchors(
      red: HSB(hue: 0.99, saturation: 0.8, brightness: 1),
      yellow: HSB(hue: 0.13, saturation: 1, brightness: 1),
      green: HSB(hue: 0.37, saturation: 0.75, brightness: 0.8))
    for room in stride(from: 0.0, through: 50, by: 5) {
      let hue = RoomColor.color(roomLeft: room, anchors: anchors).hue
      #expect(hue >= 0.98 || hue <= 0.13, "room \(room) gave hue \(hue)")
    }
    let quarter = RoomColor.color(roomLeft: 25, anchors: anchors).hue
    #expect(abs(quarter - 0.06) < 0.0001)
  }
}

@Suite struct MiscTests {
  @Test func planLabels() {
    #expect(PlanLabel.label(plan: "max", tier: "default_claude_max_20x", weight: 20) == "Max 20x")
    #expect(PlanLabel.label(plan: "max", tier: nil, weight: 5) == "Max 5x")
    #expect(PlanLabel.label(plan: nil, tier: "default_claude_max_5x", weight: 1) == "Max 5x")
    #expect(PlanLabel.label(plan: "pro", tier: nil, weight: 1) == "Pro")
    #expect(PlanLabel.label(plan: "team", tier: nil, weight: 1) == "Team seat")
    #expect(PlanLabel.label(plan: "enterprise", tier: nil, weight: 1) == "Enterprise seat")
    #expect(PlanLabel.label(plan: "student", tier: nil, weight: 1) == "Student")
    #expect(PlanLabel.label(plan: nil, tier: nil, weight: 1) == nil)
  }

  @Test func sessionGroups() throws {
    let state = try loadFixture("three-accounts")
    #expect(
      state.sessionGroups.map(\.label) == ["docspring ×7", "claude-account-rotator ×3", "infra ×1", "other ×1"])
    let edge = try loadFixture("edge-cases")
    // A trailing slash doesn't make a second group.
    #expect(edge.sessionGroups.first == SessionGroup(name: "api", count: 2))
  }

  @Test func latestNoticesNewestFirst() throws {
    let state = try loadFixture("three-accounts")
    #expect(state.latestNotices(3).map(\.id) == [44, 43, 42])
  }

  @Test func backoff() {
    var backoff = Backoff()
    #expect((0..<7).map { _ in backoff.next() } == [2, 4, 8, 16, 30, 30, 30])
    backoff.reset()
    #expect(backoff.next() == 2)
  }

  @Test func socketPath() {
    #expect(
      CoordinatorPaths.socketPath(environment: ["CLAUDE_ACCOUNT_ROTATOR_DIR": "/tmp/ar"]) == "/tmp/ar/coordinator.sock")
    #expect(CoordinatorPaths.socketPath(environment: [:]).hasSuffix("/.claude/account-rotator/coordinator.sock"))
  }
}

@Suite struct HTTPParserTests {
  private func data(_ s: String) -> Data { Data(s.utf8) }

  @Test func contentLength() throws {
    let raw = "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: 11\r\n\r\n{\"ok\":true}"
    let response = try #require(try HTTPParser.parse(data(raw), atEOF: true))
    #expect(response.status == 200)
    #expect(response.headers["content-type"] == "application/json")
    #expect(String(decoding: response.body, as: UTF8.self) == "{\"ok\":true}")
  }

  @Test func waitsForTheRestOfTheBody() throws {
    let raw = "HTTP/1.1 200 OK\r\nContent-Length: 11\r\n\r\n{\"ok\""
    #expect(try HTTPParser.parse(data(raw), atEOF: false) == nil)
    #expect(throws: CoordinatorError.self) { try HTTPParser.parse(data(raw), atEOF: true) }
    #expect(try HTTPParser.parse(data("HTTP/1.1 200 OK\r\nContent-Le"), atEOF: false) == nil)
  }

  @Test func chunked() throws {
    let raw = "HTTP/1.1 200 OK\r\nTransfer-Encoding: chunked\r\n\r\n4\r\n{\"a\"\r\n3\r\n:1}\r\n0\r\n\r\n"
    let response = try #require(try HTTPParser.parse(data(raw), atEOF: false))
    #expect(String(decoding: response.body, as: UTF8.self) == "{\"a\":1}")
  }

  @Test func bodyToEOFWithoutLength() throws {
    let raw = "HTTP/1.1 404 Not Found\r\n\r\n{\"error\":\"No.\"}"
    #expect(try HTTPParser.parse(data(raw), atEOF: false) == nil)
    let response = try #require(try HTTPParser.parse(data(raw), atEOF: true))
    #expect(response.status == 404)
  }

  @Test func garbage() {
    #expect(throws: CoordinatorError.self) { try HTTPParser.parse(data("nonsense\r\n\r\n"), atEOF: true) }
    #expect(throws: CoordinatorError.self) { try HTTPParser.parse(Data(), atEOF: true) }
  }
}
