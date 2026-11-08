import AppKit
import ClaudeAccountsCore
import SwiftUI

/// A thin bar, colored by the room left.
struct UsageBar: View {
  /// 0-1, or nil without a reading.
  let fraction: Double?
  let color: Color

  var body: some View {
    GeometryReader { geometry in
      ZStack(alignment: .leading) {
        Capsule().fill(Color.primary.opacity(0.1))
        if let fraction, fraction > 0 {
          Capsule()
            .fill(color)
            .frame(width: max(geometry.size.width * min(fraction, 1), 5))
        }
      }
    }
    .frame(height: 6)
  }
}

/// The room colors, built from the system's red, yellow and green for the appearance.
@MainActor
enum RoomPalette {
  private static var anchors: [Bool: RoomColor.Anchors] = [:]

  static func color(roomLeft: Double, scheme: ColorScheme) -> Color {
    let hsb = RoomColor.color(roomLeft: roomLeft, anchors: anchors(isDark: scheme == .dark))
    return Color(hue: hsb.hue, saturation: hsb.saturation, brightness: hsb.brightness)
  }

  private static func anchors(isDark: Bool) -> RoomColor.Anchors {
    if let cached = anchors[isDark] { return cached }
    var result = RoomColor.Anchors.plain
    if let appearance = NSAppearance(named: isDark ? .darkAqua : .aqua) {
      appearance.performAsCurrentDrawingAppearance {
        result = RoomColor.Anchors(red: hsb(.systemRed), yellow: hsb(.systemYellow), green: hsb(.systemGreen))
      }
    }
    anchors[isDark] = result
    return result
  }

  private static func hsb(_ color: NSColor) -> HSB {
    guard let rgb = color.usingColorSpace(.sRGB) else { return HSB(hue: 0, saturation: 0, brightness: 0.5) }
    return HSB(hue: rgb.hueComponent, saturation: rgb.saturationComponent, brightness: rgb.brightnessComponent)
  }
}

/// A small tinted capsule: "12 sessions", "Chrome", "Spent".
struct Pill: View {
  let text: String
  let systemImage: String
  let tint: Color

  var body: some View {
    HStack(spacing: 3) {
      Image(systemName: systemImage)
        .font(.system(size: 8.5, weight: .bold))
      Text(text)
        .font(.system(size: 10, weight: .semibold))
        .lineLimit(1)
    }
    .foregroundStyle(tint)
    .padding(.horizontal, 6)
    .padding(.vertical, 2)
    .background(tint.opacity(0.14), in: Capsule())
    .fixedSize()
  }
}

/// The account's number in a circle.
struct AccountBadge: View {
  let id: String
  let isActive: Bool

  var body: some View {
    Group {
      if let number = Int(id), (0...50).contains(number) {
        Image(systemName: "\(number).circle.fill")
          .font(.system(size: 17))
          .symbolRenderingMode(.hierarchical)
      } else {
        Text(id)
          .font(.system(size: 10, weight: .bold))
          .frame(width: 17, height: 17)
          .background(Circle().fill(.quaternary))
      }
    }
    .foregroundStyle(isActive ? Color.accentColor : Color.secondary)
  }
}

/// A small, bold, secondary heading for a section of the panel.
struct SectionHeader: View {
  let title: String
  var trailing: String?

  var body: some View {
    HStack(alignment: .firstTextBaseline) {
      Text(title)
        .font(.system(size: 11, weight: .semibold))
        .foregroundStyle(.secondary)
      if let trailing {
        Text(trailing)
          .font(.system(size: 11).monospacedDigit())
          .foregroundStyle(.tertiary)
      }
      Spacer()
    }
  }
}

/// Lays its children out in rows, wrapping to the width it is given.
struct FlowLayout: Layout {
  var spacing: CGFloat = 4
  var lineSpacing: CGFloat = 4

  func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
    let rows = arrange(width: proposal.width ?? .infinity, subviews: subviews)
    let width = proposal.width ?? rows.map(\.width).max() ?? 0
    let height = rows.reduce(0) { $0 + $1.height } + lineSpacing * CGFloat(max(rows.count - 1, 0))
    return CGSize(width: width, height: height)
  }

  func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
    var y = bounds.minY
    for row in arrange(width: bounds.width, subviews: subviews) {
      var x = bounds.minX
      for index in row.indices {
        let size = subviews[index].sizeThatFits(.unspecified)
        subviews[index].place(at: CGPoint(x: x, y: y + (row.height - size.height) / 2), proposal: .unspecified)
        x += size.width + spacing
      }
      y += row.height + lineSpacing
    }
  }

  private struct Row {
    var indices: [Int] = []
    var width: CGFloat = 0
    var height: CGFloat = 0
  }

  private func arrange(width: CGFloat, subviews: Subviews) -> [Row] {
    var rows: [Row] = []
    var row = Row()
    for index in subviews.indices {
      let size = subviews[index].sizeThatFits(.unspecified)
      let needed = row.indices.isEmpty ? size.width : row.width + spacing + size.width
      if !row.indices.isEmpty, needed > width {
        rows.append(row)
        row = Row()
      }
      row.width = row.indices.isEmpty ? size.width : row.width + spacing + size.width
      row.height = max(row.height, size.height)
      row.indices.append(index)
    }
    if !row.indices.isEmpty { rows.append(row) }
    return rows
  }
}
