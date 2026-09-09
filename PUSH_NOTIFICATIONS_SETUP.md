# Push Notifications — Setup & Architecture

Real cross-platform push (Android + iOS) via **Expo Push Service** (routes to FCM on Android, APNs on iOS).

## How it works now

**Backend (portal-backend):**
- New table `UserDeviceTokens` (UserId, Token, Platform, TenantId) — unique index on Token. Migration `AddUserDeviceTokens` auto-applies on startup.
- `POST api/DeviceToken/register` / `POST api/DeviceToken/unregister` (authorized; user id derived from JWT, never from client).
- `ExpoPushNotificationService` posts to `https://exp.host/--/api/v2/push/send` in batches of 100, enqueued via Hangfire from `NotificationService.AddNotificationAsync` / `AddEventNotificationAsync` (never inline in the request). `DeviceNotRegistered` tickets auto-delete stale tokens.

**Mobile (platx-mobile):**
- `app/services/realtime/pushNotifications.ts` — gets Expo push token after login/session-restore and registers it with the backend; unregisters on logout (token captured before auth clears).
- Fallback: if push registration fails (no projectId / no permission), the old background-fetch polling task is registered instead.
- Foreground dedup: remote pushes are suppressed while the SignalR hub is connected (SignalR already shows a local notification + updates the list live).
- Tapping any notification (foreground, background, or cold start) navigates to the Notifications screen.

## One-time setup required before push actually fires

1. **Link the EAS project** (writes `extra.eas.projectId` into app.json — the mobile code reads it from there):
   ```
   npx eas init
   ```
2. **Android — FCM V1 credentials:** in Firebase console → Project settings → Service accounts → generate private key JSON, then upload it:
   ```
   npx eas credentials   # Android → Google Service Account → FCM V1
   ```
3. **iOS — APNs key:** requires an Apple Developer account:
   ```
   npx eas credentials   # iOS → Push Notifications key
   ```
   (The expo-notifications config plugin adds the APNs entitlement automatically at build time.)
4. **Rebuild both apps** (`eas build`) — push tokens can't be fetched by builds made before the projectId existed.

Until step 1–4 are done the app silently falls back to the background polling behavior, so nothing breaks in the meantime.

## Testing

- Log in on a physical device (emulators without Google Play won't get FCM), check backend `UserDeviceTokens` table for the row.
- Send a notification from the admin panel → device should receive it with the app killed.
- Quick manual test without the backend: paste the `ExponentPushToken[...]` into https://expo.dev/notifications
