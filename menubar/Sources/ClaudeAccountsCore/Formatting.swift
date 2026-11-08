import Foundation

/// Whether percents count what is used or the room left.
public enum UsageDisplay: String, CaseIterable, Sendable {
  case used, left

  public var title: String {
    switch self {
    case .used: "Used"
    case .left: "Left"
    }
  }

  /// The percent to show for a percent used.
  public func percent(fromUsed used: Double) -> Double {
    let used = min(max(used, 0), 100)
    return self == .used ? used : 100 - used
  }
}

/// Which windows the menu bar title shows.
public enum TitleWindows: String, CaseIterable, Sendable {
  case both, fiveHour, week

  public var title: String {
    switch self {
    case .both: "Both"
    case .fiveHour: "5-hour"
    case .week: "Week"
    }
  }
}

public enum UserDefaultsKeys {
  public static let display = "usageDisplay"
  public static let titleWindows = "titleWindows"
}

/// What the menu bar title shows.
public struct TitleModel: Equatable, Sendable {
  public struct Part: Equatable, Sendable {
    /// "5h" or "wk"
    public var label: String
    /// "38%", or "–" without a figure
    public var value: String

    public init(label: String, value: String) {
      self.label = label
      self.value = value
    }
  }

  public var parts: [Part]
  /// An account needs signing in.
  public var warning: Bool
  /// The coordinator can't be reached.
  public var dimmed: Bool
  /// "38% · 61%"
  public var text: String
  public var accessibilityLabel: String
}

public enum TitleFormatter {
  public static let placeholder = "–"

  public static func make(
    state: CoordinatorState?, isReachable: Bool, now: Date, display: UsageDisplay, windows: TitleWindows
  ) -> TitleModel {
    guard isReachable, let state else {
      // The shape the last state had; none yet, the week alone, as Claude's limits are now.
      return make(
        fiveHourUsed: nil, weekUsed: nil, warning: false, isReachable: false, display: display, windows: windows,
        hasFiveHour: state?.hasFiveHour ?? false)
    }
    return make(
      fiveHourUsed: state.combinedUsedPct(.fiveHour, at: now),
      weekUsed: state.combinedUsedPct(.sevenDay, at: now),
      warning: state.hasLoginNeeded,
      isReachable: true,
      display: display,
      windows: windows,
      hasFiveHour: state.hasFiveHour
    )
  }

  /// Without a 5-hour window on any login, the title is the week alone, unlabelled: it is the only limit.
  public static func make(
    fiveHourUsed: Double?, weekUsed: Double?, warning: Bool, isReachable: Bool, display: UsageDisplay,
    windows: TitleWindows, hasFiveHour: Bool = true
  ) -> TitleModel {
    let windows = hasFiveHour ? windows : .week
    // Without the coordinator the figures are stale: show none.
    let fiveHourUsed = isReachable ? fiveHourUsed : nil
    let weekUsed = isReachable ? weekUsed : nil
    var parts: [TitleModel.Part] = []
    var spoken: [String] = []
    let word = display == .used ? "used" : "left"
    if windows != .week {
      parts.append(.init(label: "5h", value: percentText(fiveHourUsed, display: display)))
      spoken.append("5-hour \(spokenPercent(fiveHourUsed, display: display, word: word))")
    }
    if windows != .fiveHour {
      parts.append(.init(label: hasFiveHour ? "wk" : "", value: percentText(weekUsed, display: display)))
      spoken.append("week \(spokenPercent(weekUsed, display: display, word: word))")
    }
    let text = parts.map(\.value).joined(separator: " · ")
    var accessibility: String
    if isReachable {
      accessibility = "Claude usage: " + spoken.joined(separator: ", ")
      if warning { accessibility += ". An account needs signing in" }
    } else {
      accessibility = "Claude usage: the coordinator isn't running"
    }
    return TitleModel(
      parts: parts,
      warning: isReachable && warning,
      dimmed: !isReachable,
      text: text,
      accessibilityLabel: accessibility
    )
  }

  /// "38%" for a percent used, as used or left; "–" without one.
  public static func percentText(_ used: Double?, display: UsageDisplay) -> String {
    guard let used else { return placeholder }
    return "\(Int(display.percent(fromUsed: used).rounded()))%"
  }

  private static func spokenPercent(_ used: Double?, display: UsageDisplay, word: String) -> String {
    guard let used else { return "unknown" }
    return "\(Int(display.percent(fromUsed: used).rounded())) percent \(word)"
  }
}

public enum RelativeTime {
  /// A countdown: "45m", "1h 20m", "2h", "3d 4h". Rounded up to the minute, so it never says 0m before the time.
  public static func duration(_ seconds: TimeInterval) -> String {
    let minutes = max(Int((seconds / 60).rounded(.up)), 1)
    if minutes < 60 { return "\(minutes)m" }
    if minutes < 24 * 60 {
      let h = minutes / 60
      let m = minutes % 60
      return m == 0 ? "\(h)h" : "\(h)h \(m)m"
    }
    let d = minutes / (24 * 60)
    let h = (minutes % (24 * 60)) / 60
    return h == 0 ? "\(d)d" : "\(d)d \(h)h"
  }

  /// "resets in 1h 20m"; "just reset" once the time has passed; nil without a reset time.
  public static func resetsIn(_ resetsAt: Date?, now: Date) -> String? {
    guard let resetsAt else { return nil }
    let seconds = resetsAt.timeIntervalSince(now)
    if seconds <= 0 { return "just reset" }
    return "resets in \(duration(seconds))"
  }

  /// "just now", "12s ago", "5m ago", "2h ago", "3d ago".
  public static func ago(_ date: Date, now: Date) -> String {
    let seconds = Int(now.timeIntervalSince(date).rounded(.down))
    if seconds < 5 { return "just now" }
    if seconds < 60 { return "\(seconds)s ago" }
    if seconds < 3600 { return "\(seconds / 60)m ago" }
    if seconds < 86_400 { return "\(seconds / 3600)h ago" }
    return "\(seconds / 86_400)d ago"
  }
}

/// A color as hue, saturation and brightness, each 0-1.
public struct HSB: Equatable, Sendable {
  public var hue: Double
  public var saturation: Double
  public var brightness: Double

  public init(hue: Double, saturation: Double, brightness: Double) {
    self.hue = hue
    self.saturation = saturation
    self.brightness = brightness
  }
}

/// The color of a usage bar, by the room left: green with all of it, through yellow at half, to red with none.
public enum RoomColor {
  public struct Anchors: Sendable {
    public var red: HSB
    public var yellow: HSB
    public var green: HSB

    public init(red: HSB, yellow: HSB, green: HSB) {
      self.red = red
      self.yellow = yellow
      self.green = green
    }

    /// Plain red, yellow and green; the app passes the system colors for the appearance instead.
    public static let plain = Anchors(
      red: HSB(hue: 0, saturation: 1, brightness: 1),
      yellow: HSB(hue: 1.0 / 6.0, saturation: 1, brightness: 1),
      green: HSB(hue: 1.0 / 3.0, saturation: 1, brightness: 1)
    )
  }

  /// `roomLeft` is the percent left, 0-100.
  public static func color(roomLeft: Double, anchors: Anchors = .plain) -> HSB {
    let t = min(max(roomLeft, 0), 100) / 100
    if t >= 0.5 {
      return mix(anchors.yellow, anchors.green, (t - 0.5) * 2)
    }
    return mix(anchors.red, anchors.yellow, t * 2)
  }

  private static func mix(_ a: HSB, _ b: HSB, _ t: Double) -> HSB {
    // Hue is an angle: go the short way round, so a red at 0.99 meets yellow through orange, not through blue.
    var delta = b.hue - a.hue
    if delta > 0.5 { delta -= 1 }
    if delta < -0.5 { delta += 1 }
    var hue = (a.hue + delta * t).truncatingRemainder(dividingBy: 1)
    if hue < 0 { hue += 1 }
    return HSB(
      hue: hue,
      saturation: a.saturation + (b.saturation - a.saturation) * t,
      brightness: a.brightness + (b.brightness - a.brightness) * t
    )
  }
}
