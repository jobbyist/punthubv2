const REF_KEY = "puntr:ref";

/** The referral code is not personal information. It waits in localStorage until the profile exists. */
export function rememberRef(ref: string | undefined | null) {
  try {
    if (ref) window.localStorage.setItem(REF_KEY, ref.slice(0, 32));
  } catch {
    /* storage can be blocked; the link still works for this visit */
  }
}

export function storedRef(): string | null {
  try {
    return window.localStorage.getItem(REF_KEY);
  } catch {
    return null;
  }
}

export function forgetRef() {
  try {
    window.localStorage.removeItem(REF_KEY);
  } catch {
    /* nothing to do */
  }
}
