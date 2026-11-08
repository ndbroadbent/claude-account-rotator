import AppKit
import ClaudeAccountsCore
import SwiftUI

/// The panel the menu bar title opens.
struct PanelView: View {
  let store: CoordinatorStore
  @Bindable var settings: DisplaySettings

  private var display: UsageDisplay { settings.display }

  static let width: CGFloat = 340
  private let gutter: CGFloat = 14

  var body: some View {
    VStack(alignment: .leading, spacing: 0) {
      header
        .padding(.horizontal, gutter)
        .padding(.top, 12)
        .padding(.bottom, 10)
      if let state = store.state, store.connection.isReachable {
        Divider()
        accounts(state)
        Divider()
        controls(state)
          .padding(.horizontal, gutter)
          .padding(.vertical, 10)
        Divider()
        sessionsAndNotices(state)
          .padding(.horizontal, gutter)
          .padding(.vertical, 10)
      } else {
        Divider()
        unreachable
          .padding(.horizontal, gutter)
          .padding(.vertical, 12)
      }
      Divider()
      footer
        .padding(.horizontal, gutter)
        .padding(.top, 9)
        .padding(.bottom, 11)
    }
    .frame(width: Self.width)
    .onAppear { store.retryNow() }
  }

  // MARK: - Header

  private var header: some View {
    HStack(alignment: .firstTextBaseline, spacing: 8) {
      Text("Claude Accounts")
        .font(.system(size: 13, weight: .semibold))
      Spacer(minLength: 8)
      if let state = store.state, store.connection.isReachable {
        Text(combinedSummary(state))
          .font(.system(size: 11).monospacedDigit())
          .foregroundStyle(.secondary)
          .lineLimit(1)
      }
    }
  }

  /// "week 61% used": the combined week. A 5-hour window shows only on the row of a login that has one.
  private func combinedSummary(_ state: CoordinatorState) -> String {
    let week = TitleFormatter.percentText(state.combinedUsedPct(.sevenDay, at: store.now), display: display)
    return "week \(week) \(display == .used ? "used" : "left")"
  }

  // MARK: - Accounts

  @ViewBuilder private func accounts(_ state: CoordinatorState) -> some View {
    if state.accounts.isEmpty {
      Text("No logins yet. Add one from the account-rotator panel in Claude Code.")
        .font(.system(size: 12))
        .foregroundStyle(.secondary)
        .padding(.horizontal, gutter)
        .padding(.vertical, 12)
    } else {
      VStack(spacing: 0) {
        ForEach(Array(state.accounts.enumerated()), id: \.element.id) { index, account in
          if index > 0 {
            Divider().padding(.leading, gutter)
          }
          AccountRow(account: account, state: state, now: store.now, display: display, store: store)
            .padding(.horizontal, gutter)
            .padding(.vertical, 10)
        }
      }
    }
  }

  // MARK: - Rotation and Check now

  private func controls(_ state: CoordinatorState) -> some View {
    HStack(spacing: 8) {
      Text("Rotate to")
        .font(.system(size: 12))
      Picker("Rotate to", selection: rotateBinding(state)) {
        ForEach(RotateTo.allCases, id: \.self) { option in
          Text(option.title).tag(option.rawValue)
        }
        if state.rotateTo == nil {
          Text(state.settings.rotateTo.isEmpty ? "Unknown" : state.settings.rotateTo).tag(state.settings.rotateTo)
        }
      }
      .labelsHidden()
      .pickerStyle(.menu)
      .controlSize(.small)
      .fixedSize()
      .disabled(store.isBusy("rotate"))
      Spacer(minLength: 8)
      Button {
        store.checkNow()
      } label: {
        Label("Check now", systemImage: "arrow.clockwise")
      }
      .controlSize(.small)
      .disabled(store.isBusy("check"))
      .help("Re-read every login's sign-in and usage now")
    }
  }

  private func rotateBinding(_ state: CoordinatorState) -> Binding<String> {
    Binding(
      get: { state.settings.rotateTo },
      set: { store.setRotateTo($0) }
    )
  }

  // MARK: - Sessions and notices

  private func sessionsAndNotices(_ state: CoordinatorState) -> some View {
    VStack(alignment: .leading, spacing: 12) {
      VStack(alignment: .leading, spacing: 6) {
        SectionHeader(title: "Sessions", trailing: "\(state.sessions.count)")
        let groups = state.sessionGroups
        if groups.isEmpty {
          Text("No Claude Code sessions are running.")
            .font(.system(size: 11))
            .foregroundStyle(.secondary)
        } else {
          FlowLayout(spacing: 4, lineSpacing: 4) {
            ForEach(groups) { group in
              HStack(spacing: 3) {
                Text(group.name)
                  .lineLimit(1)
                  .truncationMode(.middle)
                  .frame(maxWidth: 200)
                  .fixedSize()
                Text("×\(group.count)")
                  .foregroundStyle(.secondary)
              }
              .font(.system(size: 11).monospacedDigit())
              .padding(.horizontal, 6)
              .padding(.vertical, 2)
              .background(Color.primary.opacity(0.06), in: RoundedRectangle(cornerRadius: 5, style: .continuous))
            }
          }
        }
      }
      let notices = state.latestNotices(3)
      if !notices.isEmpty {
        VStack(alignment: .leading, spacing: 5) {
          SectionHeader(title: "Notices")
          ForEach(notices) { notice in
            HStack(alignment: .firstTextBaseline, spacing: 8) {
              Text(notice.at.map { RelativeTime.ago($0, now: store.now) } ?? "")
                .font(.system(size: 10.5).monospacedDigit())
                .foregroundStyle(.secondary)
                .lineLimit(1)
                .frame(width: 50, alignment: .leading)
              Text(notice.text)
                .font(.system(size: 11))
                .lineLimit(3)
                .fixedSize(horizontal: false, vertical: true)
            }
          }
        }
      }
    }
  }

  // MARK: - Display settings

  /// Percents as used or left, as a menu of checkmarked choices.
  private var displayMenu: some View {
    Menu {
      Picker("Percents", selection: $settings.display) {
        Text("Show used").tag(UsageDisplay.used)
        Text("Show left").tag(UsageDisplay.left)
      }
      .pickerStyle(.inline)
    } label: {
      Image(systemName: "gearshape")
    }
    .menuStyle(.borderlessButton)
    .menuIndicator(.hidden)
    .fixedSize()
    .help("Display: percents used or left")
  }

  // MARK: - Footer

  private var footer: some View {
    VStack(alignment: .leading, spacing: 6) {
      if let error = store.actionError {
        Label(error, systemImage: "exclamationmark.circle.fill")
          .font(.system(size: 11))
          .foregroundStyle(.red)
          .fixedSize(horizontal: false, vertical: true)
      }
      HStack(alignment: .center, spacing: 8) {
        statusText
          .font(.system(size: 11))
          .foregroundStyle(.secondary)
          .fixedSize(horizontal: false, vertical: true)
        Spacer(minLength: 8)
        displayMenu
        Button("Quit") { NSApplication.shared.terminate(nil) }
          .controlSize(.small)
          .keyboardShortcut("q")
      }
    }
  }

  private var statusText: Text {
    switch store.connection {
    case .connected:
      let version = store.state?.coordinator?.version.map { "Coordinator v\($0)" } ?? "Coordinator"
      guard let updated = store.state?.lastReadAt ?? store.receivedAt else { return Text(version) }
      return Text("\(version), updated \(RelativeTime.ago(updated, now: store.now))")
    case .connecting:
      return Text("Connecting…")
    case .notRunning, .failing:
      return Text("Not connected.") + retryText
    }
  }

  /// Why there's nothing to show, in the body where it has the panel's width.
  private var unreachable: some View {
    HStack(alignment: .top, spacing: 10) {
      Image(systemName: store.connection == .connecting ? "hourglass" : "bolt.horizontal.circle")
        .font(.system(size: 18))
        .foregroundStyle(.secondary)
      Group {
        switch store.connection {
        case .connecting:
          Text("Connecting to the coordinator…")
        case .notRunning:
          // Non-breaking spaces keep the command on one line.
          Text(
            "**Coordinator not running:** start a Claude Code session with the account-rotator mod, or run `node\u{00A0}coordinator/cli.ts\u{00A0}start`."
          )
        case .failing(let message):
          Text("**Coordinator error:** ") + Text(message)
        case .connected:
          EmptyView()
        }
      }
      .font(.system(size: 12))
      .fixedSize(horizontal: false, vertical: true)
    }
  }

  private var retryText: Text {
    guard let next = store.nextRetryAt else { return Text("") }
    let seconds = max(Int(next.timeIntervalSince(Date()).rounded(.up)), 0)
    return Text(seconds > 0 ? " Retrying in \(seconds)s." : " Retrying…")
  }
}
