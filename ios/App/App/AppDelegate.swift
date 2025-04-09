import UIKit
import AVFoundation
import MediaPlayer
import Capacitor

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {
    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        if let window = self.window {
            window.backgroundColor = UIColor.white
        }
        
        disableMediaControls()
        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {
        UIApplication.shared.isIdleTimerDisabled = false
        disableMediaControls()
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        disableMediaControls()
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        disableMediaControls()
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        UIApplication.shared.isIdleTimerDisabled = true
        disableMediaControls()
    }

    func applicationWillTerminate(_ application: UIApplication) {
        disableMediaControls()
    }

  func disableMediaControls() {

          do {
              let audioSession = AVAudioSession.sharedInstance()
              try audioSession.setActive(false, options: .notifyOthersOnDeactivation)
          } catch {
              print("⚠️ Error deactivating audio session: \(error.localizedDescription)")
          }

          // 🛑 Fully disable remote commands
          let commandCenter = MPRemoteCommandCenter.shared()
          commandCenter.playCommand.isEnabled = false
          commandCenter.pauseCommand.isEnabled = false
          commandCenter.stopCommand.isEnabled = false
          commandCenter.togglePlayPauseCommand.isEnabled = false
          commandCenter.previousTrackCommand.isEnabled = false
          commandCenter.nextTrackCommand.isEnabled = false

          // 🛑 Ensure remote control events are disabled
          UIApplication.shared.endReceivingRemoteControlEvents()
          MPNowPlayingInfoCenter.default().nowPlayingInfo = nil
      }
}
