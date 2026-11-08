import AppKit
import ClaudeAccountsCore
import SwiftUI

@MainActor
final class AppDelegate: NSObject, NSApplicationDelegate {
  let store = CoordinatorStore(client: CoordinatorClient())
  let settings = DisplaySettings(defaults: .standard)

  func applicationDidFinishLaunching(_ notification: Notification) {
    store.start()
  }

  func applicationWillTerminate(_ notification: Notification) {
    store.stop()
  }
}

struct ClaudeAccountsApp: App {
  @NSApplicationDelegateAdaptor(AppDelegate.self) private var appDelegate

  var body: some Scene {
    MenuBarExtra {
      PanelView(store: appDelegate.store, settings: appDelegate.settings)
    } label: {
      MenuBarTitle(store: appDelegate.store, settings: appDelegate.settings)
    }
    .menuBarExtraStyle(.window)
  }
}

/// The menu bar title: the combined usage, drawn as a template image so the system tints it for the menu bar.
struct MenuBarTitle: View {
  let store: CoordinatorStore
  let settings: DisplaySettings

  var body: some View {
    let model = TitleFormatter.make(
      state: store.state,
      isReachable: store.connection.isReachable,
      now: store.now,
      display: settings.display
    )
    Image(nsImage: TitleImage.image(for: model))
      .accessibilityLabel(model.accessibilityLabel)
  }
}
