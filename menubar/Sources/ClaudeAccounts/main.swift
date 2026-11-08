import AppKit
import ClaudeAccountsCore

let arguments = Array(CommandLine.arguments.dropFirst())

if arguments.contains("--help") || arguments.contains("-h") {
  print(RenderCommand.usage)
} else if arguments.contains("--render") {
  RenderCommand.start(arguments: arguments)
} else {
  ClaudeAccountsApp.main()
}
