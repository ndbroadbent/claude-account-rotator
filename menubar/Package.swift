// swift-tools-version: 6.0
import PackageDescription

let package = Package(
  name: "ClaudeAccounts",
  platforms: [.macOS(.v14)],
  products: [
    .executable(name: "ClaudeAccounts", targets: ["ClaudeAccounts"]),
  ],
  targets: [
    // Everything that can be tested without a window: the State model, the socket client, the store and the formatting.
    .target(name: "ClaudeAccountsCore"),
    // The menu bar app, its SwiftUI views and the --render mode.
    .executableTarget(name: "ClaudeAccounts", dependencies: ["ClaudeAccountsCore"]),
    .testTarget(name: "ClaudeAccountsCoreTests", dependencies: ["ClaudeAccountsCore"]),
  ]
)
