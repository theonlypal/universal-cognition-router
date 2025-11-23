import Foundation
import Combine

public struct DeviceInstruction: Codable {
    public let text: String
    public let metadata: [String: String]?
}

public struct DeviceResponse: Codable {
    public let status: String
    public let output: String
}

public final class DeviceAgent {
    private let queue = DispatchQueue(label: "ucr.device.agent")
    public init() {}

    public func handle(_ instruction: DeviceInstruction, completion: @escaping (Result<DeviceResponse, Error>) -> Void) {
        queue.async {
            // Placeholder logic: echo back the instruction with timestamp.
            let output = "[DeviceAgent] Received: \(instruction.text) at \(Date())"
            let response = DeviceResponse(status: "ok", output: output)
            completion(.success(response))
        }
    }
}

// Example usage for iOS Shortcut bridge:
// let agent = DeviceAgent()
// agent.handle(DeviceInstruction(text: "Hello", metadata: nil)) { result in
//     switch result {
//     case .success(let response):
//         print(response)
//     case .failure(let error):
//         print(error)
//     }
// }
