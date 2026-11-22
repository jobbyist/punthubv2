# Puntr PWA, authentication return paths and Web Push

## Scope
This milestone makes the installed Puntr app open on `/predictions`, preserves a user's intended destination through authentication, replaces the Predictions signup iframe with first-party navigation, and adds opt-in Web Push with account-level opt-out and an admin delivery console.

## Authentication continuation
- A root-level route tracker stores the last same-origin app destination in session storage, while guest gates can pass an explicit /join?next=... . The join route prefers the explicit destination, then the tracked route, then /predictions.
- `safeNext()` accepts same-site internal paths only and rejects protocol-relative paths, encoded slash/backslash tricks, credentials, and auth/admin/API destinations.
- Password, email OTP, email confirmation, Google OAuth PKCE, onboarding and password recovery preserve the original path.
- OAuth returns through `/auth/callback`, exchanges the PKCE code, then resumes `/join` so profile completion and MFA checks remain in the normal flow.
- Email confirmation links still require a user tap; link scanners cannot consume the token automatically.
- The Predictions guest gate navigates to the first-party `/join` route. It no longer embeds the auth app in an iframe.

## Web Push architecture
- Browser subscription is created only after an explicit user gesture and browser permission grant.
- `PushNotificationPrompt` is shown to signed-in users in installed standalone mode¶»§q«^