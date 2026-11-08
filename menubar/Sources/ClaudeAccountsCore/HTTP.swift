import Foundation
import Network

public struct HTTPResponse: Sendable, Equatable {
  public var status: Int
  /// Header names lowercased.
  public var headers: [String: String]
  public var body: Data
}

public enum CoordinatorError: Error, Equatable, LocalizedError {
  /// No socket, or nothing listening on it.
  case notRunning(String)
  case timedOut
  /// A 4xx or 5xx answer, with the coordinator's `error` sentence.
  case http(status: Int, message: String)
  case badResponse(String)

  public var errorDescription: String? {
    switch self {
    case .notRunning(let why): "The coordinator isn't running (\(why))."
    case .timedOut: "The coordinator didn't answer in time."
    case .http(let status, let message): "The coordinator answered \(status): \(message)"
    case .badResponse(let why): "The coordinator's answer couldn't be read: \(why)."
    }
  }
}

public enum HTTPParser {
  private static let headerEnd = Data("\r\n\r\n".utf8)

  /// The response in `data`, or nil while more bytes are needed. At EOF a short body throws.
  public static func parse(_ data: Data, atEOF: Bool) throws -> HTTPResponse? {
    guard let end = data.range(of: headerEnd) else {
      if atEOF {
        // The coordinator went away mid-request (it exits to upgrade, or crashed): not an error of its own.
        if data.isEmpty { throw CoordinatorError.notRunning("it closed the connection without answering") }
        throw CoordinatorError.badResponse("no end of headers")
      }
      return nil
    }
    guard let head = String(data: data[data.startIndex..<end.lowerBound], encoding: .utf8) else {
      throw CoordinatorError.badResponse("headers aren't UTF-8")
    }
    var lines = head.components(separatedBy: "\r\n")
    let statusLine = lines.removeFirst()
    let statusParts = statusLine.split(separator: " ", maxSplits: 2)
    guard statusParts.count >= 2, statusParts[0].hasPrefix("HTTP/"), let status = Int(statusParts[1]) else {
      throw CoordinatorError.badResponse("bad status line \"\(statusLine)\"")
    }
    var headers: [String: String] = [:]
    for line in lines {
      guard let colon = line.firstIndex(of: ":") else { continue }
      let name = line[..<colon].trimmingCharacters(in: .whitespaces).lowercased()
      let value = line[line.index(after: colon)...].trimmingCharacters(in: .whitespaces)
      headers[name] = value
    }
    let rest = Data(data[end.upperBound...])

    if headers["transfer-encoding"]?.lowercased().contains("chunked") == true {
      guard let body = try decodeChunked(rest, atEOF: atEOF) else { return nil }
      return HTTPResponse(status: status, headers: headers, body: body)
    }
    if let lengthText = headers["content-length"] {
      guard let length = Int(lengthText), length >= 0 else {
        throw CoordinatorError.badResponse("bad Content-Length \"\(lengthText)\"")
      }
      if rest.count >= length {
        return HTTPResponse(status: status, headers: headers, body: Data(rest.prefix(length)))
      }
      if atEOF {
        throw CoordinatorError.badResponse("the body ended after \(rest.count) of \(length) bytes")
      }
      return nil
    }
    // No length: the body runs to EOF.
    return atEOF ? HTTPResponse(status: status, headers: headers, body: rest) : nil
  }

  private static func decodeChunked(_ data: Data, atEOF: Bool) throws -> Data? {
    var body = Data()
    var index = data.startIndex
    let crlf = Data("\r\n".utf8)
    while true {
      guard let lineEnd = data.range(of: crlf, in: index..<data.endIndex) else { break }
      let sizeLine = String(decoding: data[index..<lineEnd.lowerBound], as: UTF8.self)
      let sizeText = sizeLine.split(separator: ";").first.map(String.init)?.trimmingCharacters(in: .whitespaces) ?? ""
      guard let size = Int(sizeText, radix: 16) else {
        throw CoordinatorError.badResponse("bad chunk size \"\(sizeLine)\"")
      }
      if size == 0 { return body }
      let chunkStart = lineEnd.upperBound
      guard data.distance(from: chunkStart, to: data.endIndex) >= size + 2 else { break }
      let chunkEnd = data.index(chunkStart, offsetBy: size)
      body.append(data[chunkStart..<chunkEnd])
      index = data.index(chunkEnd, offsetBy: 2)
    }
    if atEOF { throw CoordinatorError.badResponse("the chunked body ended early") }
    return nil
  }
}

/// One HTTP/1.1 request over a Unix domain socket with the Network framework: connect, send, read to EOF.
final class UnixSocketExchange: @unchecked Sendable {
  // Every mutable property is touched only on `queue`.
  private let queue = DispatchQueue(label: "com.github.ndbroadbent.claude-accounts.socket")
  private let connection: NWConnection
  private let socketPath: String
  private let request: Data
  private let timeout: TimeInterval
  private var buffer = Data()
  private var continuation: CheckedContinuation<HTTPResponse, Error>?
  private var isDone = false

  init(socketPath: String, request: Data, timeout: TimeInterval) {
    self.socketPath = socketPath
    self.request = request
    self.timeout = timeout
    connection = NWConnection(to: .unix(path: socketPath), using: .tcp)
  }

  func run() async throws -> HTTPResponse {
    try await withTaskCancellationHandler {
      try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<HTTPResponse, Error>) in
        queue.async { self.begin(continuation) }
      }
    } onCancel: {
      queue.async { self.finish(.failure(CancellationError())) }
    }
  }

  private func begin(_ continuation: CheckedContinuation<HTTPResponse, Error>) {
    if isDone {
      // Cancelled before it started.
      continuation.resume(throwing: CancellationError())
      return
    }
    self.continuation = continuation
    connection.stateUpdateHandler = { [self] state in
      switch state {
      case .ready:
        send()
      case .waiting(let error), .failed(let error):
        finish(.failure(mapError(error)))
      case .cancelled:
        finish(.failure(CoordinatorError.badResponse("the connection was cancelled")))
      default:
        break
      }
    }
    connection.start(queue: queue)
    queue.asyncAfter(deadline: .now() + timeout) { [self] in
      finish(.failure(CoordinatorError.timedOut))
    }
  }

  private func send() {
    connection.send(content: request, completion: .contentProcessed { [self] error in
      if let error {
        finish(.failure(mapError(error)))
      }
    })
    receive()
  }

  private func receive() {
    connection.receive(minimumIncompleteLength: 1, maximumLength: 256 * 1024) { [self] data, _, isComplete, error in
      if isDone { return }
      if let data { buffer.append(data) }
      if isComplete {
        finish(
          Result {
            guard let response = try HTTPParser.parse(buffer, atEOF: true) else {
              throw CoordinatorError.badResponse("the answer ended early")
            }
            return response
          })
        return
      }
      if let error {
        finish(.failure(mapError(error)))
        return
      }
      // We ask for `Connection: close` and read to EOF, but stop early if the server keeps the connection open after
      // a complete answer.
      if let response = try? HTTPParser.parse(buffer, atEOF: false) {
        finish(.success(response))
        return
      }
      receive()
    }
  }

  private func finish(_ result: Result<HTTPResponse, Error>) {
    guard !isDone else { return }
    isDone = true
    connection.stateUpdateHandler = nil
    connection.cancel()
    continuation?.resume(with: result)
    continuation = nil
  }

  private func mapError(_ error: NWError) -> Error {
    if case .posix(let code) = error {
      switch code {
      case .ENOENT: return CoordinatorError.notRunning("no socket at \(socketPath)")
      case .ECONNREFUSED: return CoordinatorError.notRunning("nothing is listening on \(socketPath)")
      case .ENOTSOCK: return CoordinatorError.notRunning("\(socketPath) isn't a socket")
      case .ECONNRESET, .EPIPE: return CoordinatorError.notRunning("it closed the connection")
      default: break
      }
    }
    return CoordinatorError.badResponse(error.localizedDescription)
  }
}
