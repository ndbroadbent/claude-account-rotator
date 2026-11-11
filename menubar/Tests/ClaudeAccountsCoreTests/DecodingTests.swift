import ClaudeAccountsCore
import Foundation
import Testing

@Suite struct DecodingTests {
  @Test func threeAccountsFixture() throws {
    let state = try loadFixture("three-accounts")
    #expect(state.version == 1842)
    #expect(state.coordinator?.version == "0.4.0")
    #expect(state.coordinator?.isManaged == true)
    #expect(state.now == Date(epochMs: 1_794_218_400_000))
    #expect(state.accounts.map(\.id) == ["1", "2", "3"])

    let first = state.accounts[0]
    #expect(first.email == "alex@example.com")
    #expect(first.weight == 20)
    #expect(first.sessionCount == 12)
    #expect(first.health == .ok(refreshExpiresAt: Date(epochMs: 1_795_946_400_000)))
    #expect(first.reading?.fiveHour?.pct == 62)
    let resetsAt = try #require(first.reading?.fiveHour?.resetsAt)
    #expect(resetsAt.timeIntervalSince(try #require(state.now)) == 80 * 60)

    #expect(state.accounts[1].isSpent)
    #expect(state.accounts[1].moveTo == "1")
    #expect(state.accounts[1].orgName == "Example Studio")
    #expect(state.accounts[2].health == .loginNeeded(why: "Claude rejected its sign-in: the refresh token has expired."))
    #expect(state.hasLoginNeeded)

    #expect(state.combined.fiveHour?.pct == 77.5)
    #expect(state.combined.sevenDay?.accounts == 2)
    #expect(state.settings.rotateTo == "reset")
    #expect(state.rotateTo == .reset)
    #expect(state.chrome.accountId == "1")
    #expect(state.chrome.accountIds == ["1", "2"])
    #expect(state.sessions.count == 12)
    #expect(state.notices.map(\.id) == [41, 42, 43, 44])
    #expect(state.signIn == nil)
  }

  @Test func singleAccountFixture() throws {
    let state = try loadFixture("single-account")
    #expect(state.accounts.count == 1)
    #expect(PlanLabel.label(for: state.accounts[0]) == "Max 5x")
    #expect(!state.hasLoginNeeded)
  }

  @Test func edgeCasesAreReadTolerantly() throws {
    let state = try loadFixture("edge-cases")
    // The account without an id is skipped; the rest, with fields this app doesn't know, are read.
    #expect(state.accounts.map(\.id) == ["1", "2", "3", "12"])
    #expect(state.accounts[0].health.isLoggingIn)
    #expect(state.accounts[1].isRetiring)
    #expect(state.accounts[1].reading?.sevenDay == nil)
    #expect(state.accounts[2].reading == nil)
    #expect(state.accounts[2].plan == nil)
    #expect(state.accounts[3].email == nil)
    #expect(state.accounts[3].displayName == "Account 12")
    #expect(state.accounts[3].health == .other(kind: "quarantined"))
    // The notice with a string id is skipped.
    #expect(state.notices.isEmpty)
    #expect(state.rotateTo == .off)
    #expect(state.chrome.accountId == nil)
    #expect(state.chrome.miss == "No browser answered.")
    #expect(state.signIn?.accountId == "1")
  }

  @Test func minimalStateGetsDefaults() throws {
    let state = try CoordinatorState.decode(Data(#"{"version": 3}"#.utf8))
    #expect(state.version == 3)
    #expect(state.accounts.isEmpty)
    #expect(state.combined.fiveHour == nil)
    #expect(state.coordinator == nil)
    #expect(state.rotateTo == nil)
  }

  @Test func wrongTypesReadAsMissing() throws {
    let json = #"""
      {"version": 5, "now": "soon", "accounts": [{"id": 2, "weight": "big", "isSpent": "yes", "sessionCount": 4,
        "reading": {"fiveHour": {"pct": 40, "resetsAt": "not a date"}, "at": 1794218400000}}]}
      """#
    let state = try CoordinatorState.decode(Data(json.utf8))
    #expect(state.now == nil)
    let account = try #require(state.accounts.first)
    #expect(account.id == "2")
    #expect(account.weight == 1)
    #expect(account.isSpent == false)
    #expect(account.sessionCount == 4)
    #expect(account.reading?.fiveHour == UsageWindow(pct: 40, resetsAt: nil))
  }

  @Test func isoDatesWithAndWithoutFractions() throws {
    let json = #"""
      {"version": 1, "accounts": [{"id": "1", "reading": {
        "fiveHour": {"pct": 1, "resetsAt": "2026-11-09T11:20:00.000Z"},
        "sevenDay": {"pct": 2, "resetsAt": "2026-11-09T11:20:00Z"}}}]}
      """#
    let reading = try #require(try CoordinatorState.decode(Data(json.utf8)).accounts.first?.reading)
    let expected = Date(epochMs: 1_794_223_200_000)
    #expect(reading.fiveHour?.resetsAt == expected)
    #expect(reading.sevenDay?.resetsAt == expected)
  }

  @Test func modelWeeks() throws {
    let json = #"""
      {"version": 1, "accounts": [{"id": "1", "reading": {"at": 1,
        "sevenDay": {"pct": 80, "resetsAt": "2026-11-09T11:20:00Z"},
        "models": {"Fable": {"pct": 100, "resetsAt": "2026-11-09T11:20:00Z"}, "Bad": "x"}}}]}
      """#
    let reading = try #require(try CoordinatorState.decode(Data(json.utf8)).accounts.first?.reading)
    #expect(reading.modelWeeks.map(\.name) == ["Fable"])
    #expect(reading.models["Fable"]?.pct == 100)
  }

  @Test func anErrorBodyIsNotAState() {
    #expect(throws: DecodingError.self) {
      try CoordinatorState.decode(Data(#"{"error": "No such thing."}"#.utf8))
    }
  }
}
