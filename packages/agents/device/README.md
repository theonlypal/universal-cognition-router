# Device Agent (iOS/macOS bridge)

A lightweight Swift helper that accepts text instructions and returns JSON encoded responses. Integrate with Shortcuts or app extensions.

## Usage

```swift
let agent = DeviceAgent()
let instruction = DeviceInstruction(text: "Take a note", metadata: ["source": "shortcut"])
agent.handle(instruction) { result in
    switch result {
    case .success(let response):
        print("Status: \(response.status) Output: \(response.output)")
    case .failure(let error):
        print("Error: \(error)")
    }
}
```
