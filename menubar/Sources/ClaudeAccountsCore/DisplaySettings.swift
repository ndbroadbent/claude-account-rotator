import Foundation
import Observation

/// The app's own display settings: percents as used or left, and which windows the menu bar title shows.
@MainActor
@Observable
public final class DisplaySettings {
  public var display: UsageDisplay {
    didSet { defaults?.set(display.rawValue, forKey: UserDefaultsKeys.display) }
  }

  public var titleWindows: TitleWindows {
    didSet { defaults?.set(titleWindows.rawValue, forKey: UserDefaultsKeys.titleWindows) }
  }

  @ObservationIgnored private let defaults: UserDefaults?

  /// Settings kept in `defaults`.
  public init(defaults: UserDefaults) {
    self.defaults = defaults
    display = defaults.string(forKey: UserDefaultsKeys.display).flatMap(UsageDisplay.init(rawValue:)) ?? .used
    titleWindows = defaults.string(forKey: UserDefaultsKeys.titleWindows).flatMap(TitleWindows.init(rawValue:)) ?? .both
  }

  /// Settings kept in memory only (render mode, tests).
  public init(display: UsageDisplay = .used, titleWindows: TitleWindows = .both) {
    defaults = nil
    self.display = display
    self.titleWindows = titleWindows
  }
}
