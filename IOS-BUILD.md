# FHB Remote Sales — iOS App Build Guide

## Prerequisites
- Mac with Xcode 15+ installed
- Apple Developer account (already set up from Forge)
- CocoaPods: `sudo gem install cocoapods` (if not installed)

## Quick Start

### 1. Clone / Copy the project to your Mac

```bash
# If using git:
git clone <your-repo> fhb-lead-pilot
cd fhb-lead-pilot

# Or scp from server:
scp -r root@104.131.46.253:/root/.openclaw/workspace/fhb-lead-pilot ~/fhb-lead-pilot
cd ~/fhb-lead-pilot
```

### 2. Install dependencies

```bash
npm install
npx cap sync ios
```

### 3. Open in Xcode

```bash
npx cap open ios
```

This opens the `ios/App/App.xcworkspace` in Xcode.

### 4. Configure in Xcode

1. **Select the "App" target** in the left sidebar
2. **Signing & Capabilities tab:**
   - Team: Select your Apple Developer team
   - Bundle ID: `com.favoredhomebuyers.leadpilot`
   - Check "Automatically manage signing"
3. **Add Push Notification capability:**
   - Click "+ Capability"
   - Search "Push Notifications"
   - Add it
4. **General tab:**
   - Display Name: `FHB Remote Sales`
   - Version: `1.0.0`
   - Build: `1`
   - Deployment Target: `16.0`

### 5. App Icons

Replace the icons in `ios/App/App/Assets.xcassets/AppIcon.appiconset/`:
- You need a 1024x1024 PNG (no transparency, no alpha)
- Use https://www.appicon.co/ to generate all sizes from one image
- Drop them into the asset catalog in Xcode

### 6. Splash Screen

Edit `ios/App/App/Base.lproj/LaunchScreen.storyboard` in Xcode:
- Set background to #0a0a0a (black)
- Add your logo/text in the center

### 7. Build & Run

1. Connect your iPhone or select a simulator
2. Press **Cmd+R** to build and run
3. The app loads `https://leads.favoredbuyers.com` in a native shell

### 8. TestFlight

1. **Product → Archive** in Xcode
2. Click **Distribute App**
3. Select **App Store Connect**
4. Upload
5. Go to https://appstoreconnect.apple.com
6. Find the build under TestFlight
7. Add internal testers (your team)

### 9. App Store Submission

In App Store Connect:
1. Create a new app listing
2. App name: **FHB Remote Sales**
3. Bundle ID: `com.favoredhomebuyers.leadpilot`
4. Add screenshots (iPhone 6.7" and 6.1")
5. Description, keywords, category (Business)
6. Privacy Policy URL (required)
7. Select your TestFlight build
8. Submit for review

## How It Works

The iOS app is a native WKWebView shell that loads your live web app at
`https://leads.favoredbuyers.com`. This means:

- **Updates are instant** — change the web app, everyone gets it immediately
- **No App Store update needed** for UI changes
- **Native push notifications** via APNs (Apple Push Notification service)
- **Native status bar, keyboard handling, splash screen**

## Architecture

```
iOS Native Shell (Capacitor)
  └── WKWebView → https://leads.favoredbuyers.com
       └── Next.js app (same one running on server)
            ├── Zoho CRM API
            ├── RingCentral SMS API
            └── Push Notifications (Web Push + APNs)
```

## Updating the App

When you change the web app:
- **Web features:** Just deploy to the server. No iOS update needed.
- **Native features (new plugins, config):** Run `npx cap sync ios`, rebuild in Xcode.
- **App Store metadata:** Update in App Store Connect.

## Bundle ID & Identifiers

- Bundle ID: `com.favoredhomebuyers.leadpilot`
- App Name: FHB Remote Sales
- Capacitor App ID: `com.favoredhomebuyers.leadpilot`
