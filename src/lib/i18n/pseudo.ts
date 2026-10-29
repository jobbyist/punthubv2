const MAP: Record<string, string> = {
  a: "á",
  e: "é",
  i: "í",
  o: "ó",
  u: "ú",
  y: "ý",
  A: "Á",
  E: "É",
  I: "Í",
  O: "Ó",
  U: "Ú",
  Y: "Ý",
  c: "ç",
  n: "ñ",
  s: "š",
  z: "ž",
};

/** Accent vowels, pad about 30%, wrap in brackets. Keeps {{interpolation}} and <1>tags</1> intact. */
export function pseudoString(input: string): string {
  // Splitting on a capture group puts the protected tokens at odd indices.
  const segments = input.split(/(\{\{[^}]*\}\}|<\/?\d+>|\$t\([^)]*\))/g);
  let letters = 0;
  const body = segments
    .map((seg, i) =>
      i % 2 === 1
        ? seg
        : seg.replace(/[A-Za-z]/g, (ch) => {
            letters += 1;
            return MAP[ch] ?? ch;
          }),
    )
    .join("");
  const pad = "·".repeat(Math.ceil(letters * 0.3));
  return `[${body}${pad}]`;
}

export function pseudolocalise(value: unknown): unknown {
  if (typeof value === "string") return pseudoString(value);
  if (Array.isArray(value)) return value.map(pseudolocalise);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, pseudolocalise(v)]));
  }
  return value;
}
