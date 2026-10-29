# Sign-in email (OTP)

Sign-in is an email code (`signInWithOtp` + `verifyOtp`). The text of that email is set in the Supabase dashboard, not in code, so paste the text below into **Authentication → Email Templates**. New users receive the **Confirm signup** template and returning users the **Magic Link** template, so set both to the same text.

Also check **Authentication → Providers → Email**: "Confirm email" on, and the OTP length 6 (the join screen takes six digits). Keep the default one-hour expiry or shorten it.

## Subject

```
Your Puntr code
```

## Body (HTML)

```html
<h2>Your Puntr code</h2>
<p>Enter this code to sign in to Puntr:</p>
<p style="font-size:28px;font-weight:700;letter-spacing:6px;">{{ .Token }}</p>
<p>
  It works once and expires soon. If you didn't ask for it, ignore this email: nobody can sign in
  without the code.
</p>
<p style="font-size:12px;color:#59625D;">
  Puntr is for people aged 18 and over. Gamble responsibly. Helpline: 0800 006 008.
</p>
```

## Sender

Set the SMTP sender to a verified puntr.co.za address (decision D4) so the code does not land in spam. The built-in Supabase mailer is rate-limited and for testing only.
