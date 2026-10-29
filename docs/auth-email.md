# Sign-in, email confirmation and two-factor

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
- Site URL `https://puntr.co.za`; Redirect URLs `https://puntr.co.za/**`.

**Authentication → Emails → Templates**: set **Confirm signup** and **Magic Link** to the code text below, so a
confirmation or sign-in email shows a code, not a link.

### Subject

```
Your Puntr code
```

### Body (HTML)

```html
<h2>Your Puntr code</h2>
<p>Enter this code in Puntr:</p>
<p style="font-size:28px;font-weight:700;letter-spacing:6px;">{{ .Token }}</p>
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
