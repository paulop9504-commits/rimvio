# Rimvio Live Activity Widget

Dynamic Island + Lock Screen UI for MAIN ticket QR (`MainNativeSurfacePayload`).

## Xcode setup (once)

1. Open `ios/App/App.xcworkspace`
2. **File → New → Target → Widget Extension** (include Live Activity)
3. Replace generated Swift with `RimvioLiveActivityWidget.swift` from this folder
4. Add **`ios/Shared/RimvioMainSurfaceAttributes.swift`** to **both** App and Widget extension target membership
5. Set deployment target **iOS 16.2+** for the widget target
6. Ensure main app `Info.plist` has `NSSupportsLiveActivities` = true (already set)

Capacitor bridge: `RimvioMainSurface.syncMainSurface` → `RimvioMainSurfaceLiveActivityController.sync`.
