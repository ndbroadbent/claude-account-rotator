import ClaudeAccountsCore
import SwiftUI

/// One login in the panel: who it is, its two windows, its markers, and its sign-in when it needs one.
struct AccountRow: View {
  let account: AccountState
  let state: CoordinatorState
  let now: Date
  let display: UsageDisplay
  let store: CoordinatorStore

  var body: some View {
    VStack(alignment: .leading, spacing: 8) {
      HStack(alignment: .top, spacing: 8) {
        AccountBadge(id: account.id, isActive: account.sessionCount > 0)
          .padding(.top, 0.5)
        VStack(alignment: .leading, spacing: 3) {
          HStack(alignment: .firstTextBaseline, spacing: 6) {
            Text(account.displayName)
              .font(.system(size: 13, weight: .semibold))
              .lineLimit(1)
              .truncationMode(.middle)
            Spacer(minLength: 4)
            if let plan = PlanLabel.label(for: account) {
              Text(plan)
                .font(.system(size: 11))
                .foregroundStyle(.secondary)
                .fixedSize()
            }
          }
          if account.orgName != nil || !markers.isEmpty {
            HStack(spacing: 4) {
              if let orgName = account.orgName {
                Text(orgName)
                  .font(.system(size: 11))
                  .foregroundStyle(.secondary)
                  .lineLimit(1)
                  .truncationMode(.tail)
              }
              Spacer(minLength: 4)
              ForEach(markers) { marker in
                Pill(text: marker.text, systemImage: marker.systemImage, tint: marker.tint)
                  .help(marker.help)
              }
            }
          }
        }
      }
      VStack(spacing: 5) {
        if state.hasFiveHour {
          UsageLine(title: "5-hour", window: account.reading?.fiveHour, now: now, display: display)
        }
        UsageLine(title: "Week", window: account.reading?.sevenDay, now: now, display: display)
      }
      // A login that needs signing in has a stale reading.
      .opacity(account.health.isLoginNeeded || account.health.isLoggingIn ? 0.55 : 1)
      healthLine
    }
  }

  @ViewBuilder private var healthLine: some View {
    switch account.health {
    case .loginNeeded(let why):
      HStack(alignment: .center, spacing: 8) {
        Image(systemName: "exclamationmark.triangle.fill")
          .font(.system(size: 12))
          .foregroundStyle(.orange)
        Text(why.isEmpty ? "This login needs signing in again." : why)
          .font(.system(size: 11))
          .fixedSize(horizontal: false, vertical: true)
        Spacer(minLength: 4)
        Button("Sign in") { store.signIn(accountId: account.id) }
          .controlSize(.small)
          .disabled(store.isBusy("signin:\(account.id)") || state.signIn != nil)
      }
      .padding(.horizontal, 8)
      .padding(.vertical, 6)
      .background(Color.orange.opacity(0.12), in: RoundedRectangle(cornerRadius: 7, style: .continuous))
    case .loggingIn:
      HStack(alignment: .center, spacing: 8) {
        ProgressView()
          .controlSize(.small)
          .frame(width: 14, height: 14)
          .scaleEffect(0.75)
        Text("Signing in… approve it in your browser.")
          .font(.system(size: 11))
          .fixedSize(horizontal: false, vertical: true)
        Spacer(minLength: 4)
        Button("Cancel") { store.cancelSignIn() }
          .controlSize(.small)
          .disabled(store.isBusy("cancel"))
      }
      .padding(.horizontal, 8)
      .padding(.vertical, 6)
      .background(Color.primary.opacity(0.06), in: RoundedRectangle(cornerRadius: 7, style: .continuous))
    case .ok, .other:
      EmptyView()
    }
  }

  private struct Marker: Identifiable {
    var id: String
    var text: String
    var systemImage: String
    var tint: Color
    var help: String
  }

  private var markers: [Marker] {
    var markers: [Marker] = []
    let count = account.sessionCount
    if count > 0 {
      markers.append(
        Marker(
          id: "sessions", text: count == 1 ? "1 session" : "\(count) sessions", systemImage: "terminal.fill",
          tint: .accentColor, help: "In use by \(count == 1 ? "1 session" : "\(count) sessions")"))
    }
    if state.chrome.accountId == account.id {
      markers.append(
        Marker(id: "chrome", text: "Chrome", systemImage: "globe", tint: .teal, help: "Claude in Chrome uses this login"))
    }
    if account.isSpent {
      let help = account.moveTo.map { "Past its limits: sessions move to account \($0)" } ?? "Past its limits"
      markers.append(Marker(id: "spent", text: "Spent", systemImage: "hourglass", tint: .red, help: help))
    }
    if account.isRetiring {
      markers.append(
        Marker(
          id: "retiring", text: "Retiring", systemImage: "arrow.uturn.right", tint: .orange,
          help: "Being removed: its sessions move off first"))
    }
    return markers
  }
}

/// "5-hour [bar] 62%  resets in 1h 20m"
struct UsageLine: View {
  let title: String
  let window: UsageWindow?
  let now: Date
  let display: UsageDisplay
  @Environment(\.colorScheme) private var colorScheme

  var body: some View {
    let used = window?.usedPct(at: now)
    HStack(spacing: 8) {
      Text(title)
        .font(.system(size: 11))
        .foregroundStyle(.secondary)
        .frame(width: 36, alignment: .leading)
      UsageBar(
        fraction: used.map { display.percent(fromUsed: $0) / 100 },
        color: RoomPalette.color(roomLeft: 100 - (used ?? 0), scheme: colorScheme)
      )
      Text(TitleFormatter.percentText(used, display: display))
        .font(.system(size: 11, weight: .medium).monospacedDigit())
        .frame(width: 36, alignment: .trailing)
      Text(resetText)
        .font(.system(size: 11).monospacedDigit())
        .foregroundStyle(.secondary)
        .lineLimit(1)
        .frame(width: 96, alignment: .leading)
    }
  }

  private var resetText: String {
    guard let window else { return "no reading" }
    return RelativeTime.resetsIn(window.resetsAt, now: now) ?? ""
  }
}
