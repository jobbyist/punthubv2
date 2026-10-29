# Sign-in, email confirmation and two-factor

## Ways to sign up and sign in (all on `/join`)

| Method | Sign up | Sign in | Notes |
|---|---|---|---|
| Google | Continue with Google | Continue with Google | Needs the Google provider set up (below). The email arrives confirmed. The 18+ box, year of birth and Terms are asked in onboarding. |
| Email + password | Yes | Yes | No confirmation step. |
| Username + password | No (a username is chosen in onboarding) | Yes, in the same "Email or username" box | Done on the server: it finds the email and signs in itself, then returns only session tokens. A username never reveals an email, and every failure looks the same. |
| Email code or link | Yes (no password at all) | Yes | One email carries a 6-digit code and a one-tap link. Asking for a code for an address with no account looks identical to asking for one that has an account. |

Members with two-factor on are asked for the authenticator code after any of these.

Members sign up with **email + password** and are signed in straight away. They are then asked, in a dismissible
bar and on `/account/security`, to confirm their email and turn on two-factor sign-in (authenticator app).
Returning members can also ask for a **6-digit sign-in code** by email ("Email me a sign-in code instead"), which
also works if they forget the password.

## Supabase settings (dashboard, by hand)

**Authentication → Sign In / Providers → Email**
- **Confirm email: OFF.** This is what lets people in without confirming first. (If it is left ON, the join screen
  falls back to asking for the emailed code, so nothing breaks.)
- Minimum password length: 8 (the app also checks 8 to 72 bytes and refuses common passwords).
- Leaked-password protection: turn on if your plan allows it.

**Authentication → Sign In / Providers → Multi-Factor**
- **TOTP (authenticator app): enabled** for enrolment and verification.

**Authentication → URL Configuration**
- Site URL `https://puntr.co.za`; Redirect URLs `https://puntr.co.za/**`. Magic links and Google both return to
  `/join`, so this must be listed. A preview address that is not listed falls back to the Site URL.

**Authentication → Sign In / Providers → Google** (needed for the Google button)
1. In Google Cloud Console, create or choose a project, then **APIs & Services → OAuth consent screen**: app name
   Puntr, support email, privacy policy `https://puntr.co.za/privacy`, authorised domain `puntr.co.za`.
2. **Credentials → Create credentials → OAuth client ID → Web application.** Authorised JavaScript origin:
   `https://puntr.co.za`. Authorised redirect URI: `https://hucjuekhitjuygcoomhw.supabase.co/auth/v1/callback`.
3. Copy the Client ID and Client Secret into Supabase → Google provider, switch it on, and save.
4. Publish the consent screen (move it from Testing to In production) so people outside your test list can sign in.

**Authentication → Emails → Templates**: set **Confirm signup** and **Magic Link** to the text below, so one email
carries both the 6-digit code and a one-tap link.

### Subject

```
Your Puntr code
```

### Body (HTML)

```html
<h2>Your Puntr code</h2>
<p>Enter this code in Puntr:</p>
<p style="font-size:28px;font-weight:700;letter-spacing:6px;">{{ .Token }}</p>
<p>Or <a href="{{ .ConfirmationURL }}">tap here to sign in</a> on this device.</p>
<p>
  It works once and expires soon. If you didn't ask for it, ignore this email: nobody can use it
  without the code.
</p>
<p style="font-size:12px;color:#59625D;">
  Puntr is for people aged 18 and over. Gamble responsibly. Helpline: 0800 006 008.
</p>
```

### Sender

Set the SMTP sender to a verified puntr.co.za address (decision D4) so codes do not land in spam. The built-in
Supabase mailer is rate-limited and for testing only.

## What an unconfirmed email can and cannot do

Anyone can create an account with any email address, so an unconfirmed email is not proof of identity:

- **Founding spots held for early-access people need a confirmed email.** An unconfirmed sign-up with a held email
  gets no number, the spot stays held, and `claim_reserved_founding()` gives them the number once they confirm
  (the app calls it automatically; the database checks the confirmation itself).
- **Two-factor is enforced by the database,** not just the screen. Once a member has a verified authenticator
  factor, a session that has not passed the code (`aal1`) cannot post a pick, read or change the profile, or file a
  report (`mfa_ok()`, a trigger on `predictions` and restrictive policies on `profiles` and `reports`).
- **Known risk: pre-registration.** Someone could register another person's email with a password of their own
  before that person does. Mitigations: the real owner can still sign in with an emailed code, a held Founding spot
  can only be claimed with a confirmed email, and launch emails go only to the early-access list. A stronger fix
  (forcing a password reset when an unconfirmed account is first confirmed by code) is not built yet.

## Things to know

- **Rate limits.** Supabase limits sign-ins per IP address. Username sign-in is made from the server, so those
  attempts share the server's address; the limits are generous at launch scale. Watch for 429s as traffic grows.
- **Google and privacy.** Choosing Google sends the member to Google. The Privacy notice and Cookie policy should
  name Google as a sign-in provider; the legal pages are left for the attorney.
- **Pre-registration and Google.** If someone registered an email with a password before its owner did, check how
  Supabase links a later Google sign-in to that account (Authentication settings) before launch.
