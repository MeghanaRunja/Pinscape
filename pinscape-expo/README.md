# Pinscape — Expo App

Test on your phone today using **Expo Go** (free, no developer account needed).

---

## ⚡ Quick start — on your phone in 5 minutes

### Step 1 — Install Expo Go on your phone
- **iPhone:** https://apps.apple.com/app/expo-go/id982107779
- **Android:** https://play.google.com/store/apps/details?id=host.exp.exponent

### Step 2 — Set up the project on your computer

```bash
# Unzip and enter the project
cd pinscape-expo

# Install dependencies
npm install

# Point the app at your FastAPI backend
# Edit src/services/api.ts — change API_BASE to your machine's local IP:
# export const API_BASE = 'http://192.168.1.42:8000';
# (Your phone and computer must be on the same WiFi network)
```

### Step 3 — Start your FastAPI backend
```bash
# In the pinscape-backend folder:
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### Step 4 — Start Expo
```bash
npm start
# or
npx expo start
```

A QR code will appear in your terminal.

### Step 5 — Open on your phone
- **iPhone:** Open the Camera app and scan the QR code — it opens Expo Go automatically
- **Android:** Open Expo Go, tap "Scan QR code", scan the code

That's it — the app loads live on your phone. Any code changes instantly hot-reload.

---

## Finding your local IP address

```bash
# Mac
ipconfig getifaddr en0

# Windows
ipconfig  # look for IPv4 Address under your WiFi adapter

# Linux
hostname -I
```

Then update `src/services/api.ts`:
```ts
export const API_BASE = 'http://YOUR_IP_HERE:8000';
```

---

## Project structure

```
pinscape-expo/
├── App.tsx                        # Root: navigation + auth hydration
├── app.json                       # Expo config (name, icons, permissions)
├── src/
│   ├── theme.ts                   # Colors, spacing, radius tokens
│   ├── config/categories.ts       # Per-category config (icons, angles, steps)
│   ├── navigation/RootNavigator.tsx
│   ├── store/authStore.ts         # Zustand + SecureStore persistence
│   ├── services/api.ts            # Axios → FastAPI backend
│   └── screens/
│       ├── HomeScreen.tsx         # Category picker grid
│       ├── UploadScreen.tsx       # Camera + photo library + angle chips
│       ├── PinsScreen.tsx         # Pinterest boards + pin upload
│       ├── PinterestAuthScreen.tsx # In-app WebView OAuth
│       ├── BoardPinsScreen.tsx    # Full pin grid for a board
│       ├── AnalyzingScreen.tsx    # Animated loader + real API call
│       └── ResultsScreen.tsx      # 3 AI results + share/save
```

---

## Screen flow

```
HomeScreen → UploadScreen → PinsScreen → AnalyzingScreen → ResultsScreen
                                ↕
                        PinterestAuthScreen (modal)
                        BoardPinsScreen (modal)
```

---

## Building a shareable link (no computer needed for testers)

Once you're happy with the app, you can publish it so others can open it
directly in Expo Go without cloning the repo:

```bash
npx expo publish
# Gives you a URL like exp://u.expo.dev/... that anyone with Expo Go can open
```

---

## Building a real .ipa / .apk for distribution

When you're ready to distribute outside Expo Go:

```bash
# Install EAS CLI
npm install -g eas-cli
eas login

# Configure your build
eas build:configure

# Build for iOS (needs Apple Developer account $99/yr)
eas build --platform ios

# Build for Android (free, produces .apk or .aab)
eas build --platform android
```

EAS (Expo Application Services) handles the build in the cloud —
no Xcode or Android Studio required.
