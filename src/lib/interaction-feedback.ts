export function triggerSuccessFeedback() {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate?.(12);
    } catch {
      /* Haptics are optional. */
    }
  }
  if (typeof window !== "undefined") window.dispatchEvent(new Event("puntr:success-feedback"));
}
