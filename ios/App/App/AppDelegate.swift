import UIKit
import AVFoundation
import MediaPlayer
import Capacitor

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {
    var window: UIWindow?

    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
    ) -> Bool {
        if let window = self.window {
            window.backgroundColor = UIColor.white
        }
        // ✅ Allow audio playback even when iPhone is on silent
        do {
            try AVAudioSession.sharedInstance().setCategory(.playback, mode: .default, options: [])
            try AVAudioSession.sharedInstance().setActive(true)
            print("✅ AVAudioSession playback category set successfully")
        } catch {
            print("⚠️ Failed to set AVAudioSession category: \(error)")
        }
        // ✅ Keep the audio session active and configured for playback
        configureAudioSession()
        UIApplication.shared.isIdleTimerDisabled = true
        return true
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        UIApplication.shared.isIdleTimerDisabled = true
        configureAudioSession()
    }

    func applicationWillResignActive(_ application: UIApplication) {
        UIApplication.shared.isIdleTimerDisabled = false
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // no need to deactivate audio session here
    }

  private func configureAudioSession() {
      let session = AVAudioSession.sharedInstance()

      do {
          // Only reset if needed — avoids spamming logs and error -50
          if session.category != .playback {
              try session.setCategory(.playback, options: [.mixWithOthers, .allowBluetooth])
          }
          try session.setActive(true, options: [])
      } catch {
          print("⚠️ Error configuring audio session safely: \(error.localizedDescription)")
      }

      // Disable remote controls
      let commandCenter = MPRemoteCommandCenter.shared()
      [
          commandCenter.playCommand,
          commandCenter.pauseCommand,
          commandCenter.stopCommand,
          commandCenter.togglePlayPauseCommand,
          commandCenter.previousTrackCommand,
          commandCenter.nextTrackCommand
      ].forEach { $0.isEnabled = false }

      UIApplication.shared.endReceivingRemoteControlEvents()
      MPNowPlayingInfoCenter.default().nowPlayingInfo = nil
  }

}
