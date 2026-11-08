import AppKit
import ClaudeAccountsCore
import SwiftUI

/// The title's look. Drawn in black: the image is a template, so only its alpha counts and the menu bar tints it.
struct TitleLabel: View {
  let model: TitleModel

  var body: some View {
    HStack(alignment: .firstTextBaseline, spacing: 3) {
      if model.warning {
        Image(systemName: "exclamationmark.triangle.fill")
          .font(.system(size: 11, weight: .semibold))
          .padding(.trailing, 1)
      }
      ForEach(Array(model.parts.enumerated()), id: \.offset) { index, part in
        if index > 0 {
          Text("·")
            .font(.system(size: 13, weight: .bold))
            .opacity(0.5)
        }
        HStack(alignment: .firstTextBaseline, spacing: 1.5) {
          // A tiny label only when one window shows: with both, the order (5-hour, week) says which is which.
          if model.parts.count == 1 && !part.label.isEmpty {
            Text(part.label)
              .font(.system(size: 9, weight: .semibold))
              .opacity(0.6)
          }
          Text(part.value)
            .font(.system(size: 13).monospacedDigit())
        }
      }
    }
    .foregroundStyle(Color.black)
    .opacity(model.dimmed ? 0.35 : 1)
    .padding(.horizontal, 1)
    .frame(height: 18)
    .fixedSize()
  }
}

@MainActor
enum TitleImage {
  private static var cache: (model: TitleModel, scale: CGFloat, image: NSImage)?

  static func image(for model: TitleModel, scale: CGFloat? = nil) -> NSImage {
    let scale = scale ?? NSScreen.main?.backingScaleFactor ?? 2
    if let cache, cache.model == model, cache.scale == scale { return cache.image }
    let renderer = ImageRenderer(content: TitleLabel(model: model))
    renderer.scale = scale
    guard let cgImage = renderer.cgImage else { return NSImage() }
    let size = NSSize(width: CGFloat(cgImage.width) / scale, height: CGFloat(cgImage.height) / scale)
    let image = NSImage(cgImage: cgImage, size: size)
    image.isTemplate = true
    image.accessibilityDescription = model.accessibilityLabel
    cache = (model, scale, image)
    return image
  }
}
