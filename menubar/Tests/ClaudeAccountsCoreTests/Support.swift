import ClaudeAccountsCore
import Foundation

enum Paths {
  /// menubar/
  static let package = URL(fileURLWithPath: #filePath)
    .deletingLastPathComponent()
    .deletingLastPathComponent()
    .deletingLastPathComponent()

  static func fixture(_ name: String) -> URL {
    package.appendingPathComponent("dev/fixtures/\(name).json")
  }

  static let fakeCoordinator = package.appendingPathComponent("dev/fake-coordinator.mjs")
}

struct TestFailure: Error, CustomStringConvertible {
  var description: String
}

func loadFixture(_ name: String) throws -> CoordinatorState {
  try CoordinatorState.decode(Data(contentsOf: Paths.fixture(name)))
}

/// A short-lived directory under /tmp: Unix socket paths must stay under about 100 bytes.
func makeShortTempDirectory() throws -> URL {
  var template = Array("/tmp/ar-test-XXXXXX".utf8CString)
  guard let made = mkdtemp(&template) else {
    throw TestFailure(description: "mkdtemp failed: errno \(errno)")
  }
  return URL(fileURLWithPath: String(cString: made))
}

/// dev/fake-coordinator.mjs on a socket in its own temporary directory.
final class FakeCoordinator: @unchecked Sendable {
  let directory: URL
  let socketPath: String
  let process = Process()
  private let logURL: URL

  init(fixture: String = "three-accounts") throws {
    directory = try makeShortTempDirectory()
    socketPath = directory.appendingPathComponent("coordinator.sock").path
    logURL = directory.appendingPathComponent("fake.log")
    FileManager.default.createFile(atPath: logURL.path, contents: nil)
    let log = try FileHandle(forWritingTo: logURL)

    process.executableURL = URL(fileURLWithPath: "/usr/bin/env")
    process.arguments = ["node", Paths.fakeCoordinator.path, "--fixture", Paths.fixture(fixture).path]
    var environment = ProcessInfo.processInfo.environment
    environment[CoordinatorPaths.directoryEnvironmentKey] = directory.path
    process.environment = environment
    process.standardOutput = log
    process.standardError = log
    do {
      try process.run()
    } catch {
      throw TestFailure(description: "couldn't start node (is it on PATH?): \(error)")
    }

    // Wait for the socket to appear.
    let deadline = Date().addingTimeInterval(10)
    while !FileManager.default.fileExists(atPath: socketPath) {
      guard process.isRunning else {
        throw TestFailure(description: "the fake coordinator exited:\n\(self.log)")
      }
      guard Date() < deadline else {
        throw TestFailure(description: "the fake coordinator didn't open \(socketPath) in 10 s:\n\(self.log)")
      }
      usleep(20_000)
    }
  }

  var log: String { (try? String(contentsOf: logURL, encoding: .utf8)) ?? "" }

  var client: CoordinatorClient { CoordinatorClient(socketPath: socketPath, timeout: 5) }

  /// Stops it as a crash would: the socket file stays behind with nothing listening on it.
  func kill() {
    guard process.isRunning else { return }
    Darwin.kill(process.processIdentifier, SIGKILL)
    process.waitUntilExit()
  }

  func stop() {
    if process.isRunning {
      process.terminate()
      process.waitUntilExit()
    }
    try? FileManager.default.removeItem(at: directory)
  }

  deinit {
    stop()
  }
}
