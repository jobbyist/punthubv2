/** Username ideas from the email's local part: "thabo.m@…" gives thabo_m, thabo_m_za, thabo_m26. */
export function usernameIdeas(email: string, year = new Date().getFullYear()): string[] {
  const local = (email.split("@")[0] ?? "").toLowerCase();
  let base = local
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
  if (base.length > 14) base = base.slice(0, 14).replace(/_$/, "");
  if (base.length < 3) base = `punter${base}`;
  const yy = String(year).slice(-2);
  return [...new Set([base, `${base}_za`, `${base}${yy}`, `${base}_tips`])].filter((v) =>
    /^[a-z0-9_]{3,20}$/.test(v),
  );
}
