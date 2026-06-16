import Foundation
import Capacitor
import UIKit

@objc(RimvioMainSurfacePlugin)
public class RimvioMainSurfacePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "RimvioMainSurface"
    public let jsName = "RimvioMainSurface"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "syncMainSurface", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "endAllMainSurfaces", returnType: CAPPluginReturnPromise),
    ]

    private var savedBrightness: CGFloat?

    @objc func syncMainSurface(_ call: CAPPluginCall) {
        guard let command = call.getObject("command") else {
            call.reject("missing_command")
            return
        }

        let lifecycle = command["lifecycle"] as? String ?? "end"
        let payload = command["payload"] as? JSObject

        if lifecycle == "end" || payload == nil {
            clearSurface()
            call.resolve([
                "ok": true,
                "platform": "ios",
                "lifecycle": "end",
            ])
            return
        }

        let preferScanBrightness = payload?["preferScanBrightness"] as? Bool ?? false
        applyScanBrightness(preferScanBrightness)

        if let payload = payload,
           let data = try? JSONSerialization.data(withJSONObject: payload, options: []) {
            UserDefaults.standard.set(data, forKey: "rimvio.mainSurface.payload")
        }

        call.resolve([
            "ok": true,
            "platform": "ios",
            "lifecycle": lifecycle,
            "note": "ios_payload_stored_activitykit_pending",
        ])
    }

    @objc func endAllMainSurfaces(_ call: CAPPluginCall) {
        clearSurface()
        call.resolve(["ok": true])
    }

    private func clearSurface() {
        UserDefaults.standard.removeObject(forKey: "rimvio.mainSurface.payload")
        applyScanBrightness(false)
    }

    private func applyScanBrightness(_ enable: Bool) {
        if enable {
            if savedBrightness == nil {
                savedBrightness = UIScreen.main.brightness
            }
            UIScreen.main.brightness = 1.0
        } else if let prior = savedBrightness {
            UIScreen.main.brightness = prior
            savedBrightness = nil
        }
    }
}
