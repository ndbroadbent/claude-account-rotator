import AppKit
import ClaudeAccountsCore
import SwiftUI

/// `--render <out.png> [--state <fixture.json>] [--appearance light|dark] [--display used|left]
/// [--windows both|fiveHour|week]`: draws the menu bar title (in each of its looks) and the panel to a PNG and exits,
/// without showing anything on screen. Without `--state`, it asks the running coordinator once, and draws the
/// unreachable state if there is none.
@MainActor
enum RenderCommand {
  static let usage = """
    Usage: Claude Accounts [--render <out.png> [--state <fixture.json>] [--appearance light|dark]
                           [--display used|left] [--windows both|fiveHour|week]]

    With no arguments it runs as the menu bar app.
    --render draws the menu bar title and the panel to a PNG and exits, without showing anything.
    """

  struct Options {
    var output: String
    var statePath: String?
    var isDark = false
    var display = UsageDisplay.used
    var windows = TitleWindows.both
  }

  struct RenderError: Error, CustomStringConvertible {
    var description: String
  }

  static func start(arguments: [String]) -> Never {
    NSApplication.shared.setActivationPolicy(.prohibited)
    Task { @MainActor in
      do {
        let options = try parse(arguments)
        try await render(options)
        print("Rendered \(options.output)")
        exit(0)
      } catch {
        FileHandle.standardError.write(Data("error: \(error)\n\n\(usage)\n".utf8))
        exit(1)
      }
    }
    NSApplication.shared.run()
    exit(0)
  }

  static func parse(_ arguments: [String]) throws -> Options {
    var options = Options(output: "")
    var index = 0
    func value(_ flag: String) throws -> String {
      index += 1
      guard index < arguments.count, !arguments[index].hasPrefix("--") else {
        throw RenderError(description: "\(flag) needs a value")
      }
      return arguments[index]
    }
    while index < arguments.count {
      let flag = arguments[index]
      switch flag {
      case "--render": options.output = try value(flag)
      case "--state": options.statePath = try value(flag)
      case "--appearance":
        let appearance = try value(flag)
        guard ["light", "dark"].contains(appearance) else {
          throw RenderError(description: "--appearance is light or dark, not \"\(appearance)\"")
        }
        options.isDark = appearance == "dark"
      case "--display":
        let raw = try value(flag)
        guard let display = UsageDisplay(rawValue: raw) else {
          throw RenderError(description: "--display is used or left, not \"\(raw)\"")
        }
        options.display = display
      case "--windows":
        let raw = try value(flag)
        guard let windows = TitleWindows(rawValue: raw) else {
          throw RenderError(description: "--windows is both, fiveHour or week, not \"\(raw)\"")
        }
        options.windows = windows
      default:
        throw RenderError(description: "unknown argument \"\(flag)\"")
      }
      index += 1
    }
    guard !options.output.isEmpty else { throw RenderError(description: "--render needs an output path") }
    return options
  }

  static func render(_ options: Options) async throws {
    guard let appearance = NSAppearance(named: options.isDark ? .darkAqua : .aqua) else {
      throw RenderError(description: "no system appearance")
    }
    NSApplication.shared.appearance = appearance

    let store: CoordinatorStore
    if let path = options.statePath {
      let url = URL(fileURLWithPath: (path as NSString).expandingTildeInPath)
      let data: Data
      do {
        data = try Data(contentsOf: url)
      } catch {
        throw RenderError(description: "can't read \(url.path): \(error.localizedDescription)")
      }
      let state: CoordinatorState
      do {
        state = try CoordinatorState.decode(data)
      } catch {
        throw RenderError(description: "\(url.path) isn't a State: \(error)")
      }
      store = CoordinatorStore(fixedState: state, connection: .connected)
    } else {
      let client = CoordinatorClient(timeout: 2)
      do {
        store = CoordinatorStore(fixedState: try await client.state(), connection: .connected)
      } catch {
        print("No coordinator at \(client.socketPath) (\(error.localizedDescription)): drawing the unreachable state.")
        store = CoordinatorStore(fixedState: nil, connection: .notRunning)
      }
    }

    // The title in each of its looks, drawn by the same code as the menu bar's.
    let now = store.now
    func title(_ display: UsageDisplay, _ windows: TitleWindows, reachable: Bool = true) -> NSImage {
      let model = TitleFormatter.make(
        state: store.state, isReachable: reachable && store.connection.isReachable, now: now, display: display,
        windows: windows)
      return TitleImage.image(for: model, scale: 2)
    }
    let titles: [RenderSheet.TitleSample] = [
      .init(caption: "Menu bar (\(options.display.rawValue), \(options.windows.title.lowercased()))",
            image: title(options.display, options.windows)),
      .init(caption: "Left, both", image: title(.left, .both)),
      .init(caption: "5-hour only", image: title(options.display, .fiveHour)),
      .init(caption: "Week only", image: title(options.display, .week)),
      .init(caption: "Unreachable", image: title(options.display, options.windows, reachable: false)),
    ]

    // The settings come from the arguments and stay in memory: the user's own defaults are neither read nor written.
    let settings = DisplaySettings(display: options.display, titleWindows: options.windows)
    let sheet = RenderSheet(titles: titles, store: store, settings: settings, isDark: options.isDark)
      .environment(\.colorScheme, options.isDark ? .dark : .light)
    let png = try snapshot(sheet, appearance: appearance)
    let url = URL(fileURLWithPath: (options.output as NSString).expandingTildeInPath)
    try FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
    try png.write(to: url)
  }

  /// Draws the view in a window that is never ordered on screen. The panel is drawn this way, not with ImageRenderer,
  /// because ImageRenderer leaves placeholders where AppKit draws a control (segmented pickers, progress spinners).
  static func snapshot(_ view: some View, appearance: NSAppearance) throws -> Data {
    let host = NSHostingView(rootView: view)
    host.appearance = appearance
    let size = host.fittingSize
    let window = OffscreenKeyWindow(
      contentRect: NSRect(origin: .zero, size: size), styleMask: [.borderless], backing: .buffered, defer: false)
    window.isReleasedWhenClosed = false
    window.appearance = appearance
    window.contentView = host
    host.frame = NSRect(origin: .zero, size: size)
    host.layoutSubtreeIfNeeded()
    host.display()
    guard let rep = host.bitmapImageRepForCachingDisplay(in: host.bounds) else {
      throw RenderError(description: "couldn't make a bitmap of \(size)")
    }
    host.cacheDisplay(in: host.bounds, to: rep)
    guard let png = rep.representation(using: .png, properties: [:]) else {
      throw RenderError(description: "couldn't encode the PNG")
    }
    return png
  }
}

/// Draws its controls as in a key window, as the panel's are while it is open.
private final class OffscreenKeyWindow: NSWindow {
  override var isKeyWindow: Bool { true }
  override var canBecomeKey: Bool { true }
}

/// The render: the title's looks on menu bar strips, then the panel as it opens under the title.
struct RenderSheet: View {
  struct TitleSample: Identifiable {
    var caption: String
    var image: NSImage
    var id: String { caption }
  }

  let titles: [TitleSample]
  let store: CoordinatorStore
  let settings: DisplaySettings
  let isDark: Bool

  var body: some View {
    VStack(alignment: .leading, spacing: 14) {
      Grid(alignment: .leading, horizontalSpacing: 10, verticalSpacing: 6) {
        ForEach(titles) { sample in
          GridRow {
            Text(sample.caption)
              .font(.system(size: 11))
              .foregroundStyle(.secondary)
            HStack(spacing: 0) {
              Image(nsImage: sample.image)
                .renderingMode(.template)
                .foregroundStyle(isDark ? Color.white : Color.black)
            }
            .padding(.horizontal, 8)
            .frame(height: 24)
            .background(isDark ? Color(white: 0.17) : Color(white: 0.94), in: RoundedRectangle(cornerRadius: 5))
          }
        }
      }
      PanelView(store: store, settings: settings)
        .background(Color(nsColor: .windowBackgroundColor))
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        .overlay(
          RoundedRectangle(cornerRadius: 12, style: .continuous)
            .strokeBorder(Color.primary.opacity(isDark ? 0.18 : 0.12), lineWidth: 1)
        )
    }
    .padding(16)
    .background(isDark ? Color(white: 0.08) : Color(white: 0.82))
  }
}
