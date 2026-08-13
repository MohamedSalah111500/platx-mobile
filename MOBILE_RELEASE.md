# PlatX Mobile — Production Release Runbook

This replaces the old dev-only build guides (`ANDROID_BUILD_GUIDE.md`,
`BUILD_REPORT.md`) for the one thing they never covered: actually cutting a
release build to hand off for Play Store / App Store submission.

## Before every release

1. Bump the version in **both** places (they must match):
   - `app.json` → `expo.version` (e.g. `1.0.6`) and `expo.android.versionCode`
     (integer, always +1 from the last release — Play Store rejects a re-upload
     with the same or lower `versionCode`).
   - `android/app/build.gradle` → `versionName` / `versionCode` under
     `defaultConfig` (must match `app.json` exactly; the app already had one
     drift like this fixed this session).
2. Decide which backend the build should hit — controlled by
   `EXPO_PUBLIC_APP_ENV`, read in `app/config/env.ts`:
   - `production` → `https://platx-backend-prod.runasp.net/` (real data, real
     tenants — this is what a store build must use).
   - `development` (or unset, local `expo start`) → `https://platx.runasp.net/`
     (test backend). The `preview` EAS profile intentionally still uses this
     so an internal/QA build never accidentally touches production data.
   - Local `expo start`/`expo run:android` dev builds fall back to React
     Native's own `__DEV__` flag (dev backend) unless `EXPO_PUBLIC_APP_ENV`
     is exported in the shell first.

## Path A — EAS cloud build (recommended)

Requires an Expo account with access to this project (`eas login` once).

```bash
npx eas-cli build --profile production --platform android
```

This uses `eas.json`'s `production` profile: `EXPO_PUBLIC_APP_ENV=production`,
Android output is an `.aab` app bundle (what Play Store requires — not an
`.apk`). EAS handles signing using the credentials you configure in the EAS
dashboard the first time you run this (upload the same `android/app/release.keystore`
+ the alias/passwords from `android/gradle.properties` when prompted, or let
EAS generate/manage a new upload key — either works, just be consistent release
to release).

Download the resulting `.aab` from the EAS build page (or the CLI prints a
direct link) and upload it to Play Console manually — this project intentionally
does not use `eas submit`/a Google Play service account; the Play Console
listing is managed directly.

For an internal/QA build to test on a real device without touching prod data:

```bash
npx eas-cli build --profile preview --platform android
```

This produces an installable `.apk` (not app-bundle) pointed at the test
backend, distributed internally (no store submission).

## Path B — Local Gradle build (no EAS account needed)

Requires the Android SDK + a JDK locally (this machine already has both —
`ANDROID_HOME` resolved via `android/local.properties`, `JAVA_HOME` set).
The release signing config in `android/app/build.gradle` already points at
`android/app/release.keystore` with credentials from `android/gradle.properties`
(both files are gitignored — they exist locally but were never meant to be
committed; there is no other copy of them, so back the keystore up somewhere
durable outside git, e.g. a password manager or secrets vault — losing it means
you can never publish an update to the same Play Store listing again).

```bash
cd android
set EXPO_PUBLIC_APP_ENV=production
gradlew.bat bundleRelease --no-daemon
```

Output: `android/app/build/outputs/bundle/release/app-release.aab` — upload
this file directly to Play Console.

To produce an installable `.apk` instead (e.g. for sideloading a test device):

```bash
gradlew.bat assembleRelease --no-daemon
```

Output: `android/app/build/outputs/apk/release/app-release.apk`.

## Verify before uploading

- Install the release build on a real device and smoke-test: login, the tab
  bar, opening a course lesson, and (if you have a Staff/Admin test account)
  creating a live session and viewing Reports — these are the newest features
  and haven't been through a store review cycle yet.
- Confirm it's actually hitting production (`platx-backend-prod.runasp.net`),
  not the test backend, before uploading to Play Console.

## iOS

Not covered here yet — deferred. `app.json` has no `ios.infoPlist` usage
strings (camera/mic/photo library — required, this app uses all three via
`expo-av`/`expo-image-picker`/`expo-document-picker`) and no
`GoogleService-Info.plist` (iOS Firebase/push is unconfigured). Needs both of
those plus a confirmed Apple Developer Program membership before a first
`eas build --profile production --platform ios` is worth attempting.
