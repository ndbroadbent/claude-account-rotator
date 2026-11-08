import Foundation
import Observation

/// The app's own display settings: percents as used or left.
@MainActor
@Observable
public final class DisplaySettings {
  public var display: UsageDisplay {
    didSet { defaults?.set(display.rawValue, forKey: UserDefaultsKeys.display) }
  }

  @ObservationIgnored private let defaults: UserDefaults?

  /// Settings kept in `defaults`.
  public init(defaults: UserDefaults) {
    self.defaults = defaults
    display = defaults.string(forKey: UserDefaultsKeys.display).flatMap(UsageDisplay.init(rawValue:)) ?? .used
  }

  /// Settings kept in memory only (render mode, tests).
  public init(display: UsageDisplay = .used) {
    defaults = nil
    self.display = display
  }
}
