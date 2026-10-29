/**
 * House formatting, identical in every language (decision D12).
 * Money and odds never go through Intl.NumberFormat per locale: Node's rand formatting
 * differs between en-ZA, af-ZA, zu-ZA and xh-ZA. Dates and times may use Intl.
 */

const TIME_ZONE = "Africa/Johannesburg";
const NBSP = " ";

function groupThousands(integer: string): string {
  return integer.replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
}

/** money(1234) -> "R1 234"; money(1234.5) -> "R1 234,50". Whole rand has no cents. */
export function money(amount: number): string {
  if (!Number.isFinite(amount)) return "";
  const negative = amount < 0;
  const cents = Math.round(Math.abs(amount) * 100);
  const rand = Math.floor(cents / 100);
  const rest = cents % 100;
  const body =
    groupThousands(String(rand)) + (rest === 0 ? "" : `,${String(rest).padStart(2, "0")}`);
  return `${negative ? "-" : ""}R${body}`;
}

/** odds(2.1) -> "2.10". Bookmaker decimal point, two places. */
export function odds(value: number): string {
  if (!Number.isFinite(value)) return "";
  return value.toFixed(2);
}

/** pct(0.62) -> "62%". Takes a fraction. */
export function pct(fraction: number, digits = 0): string {
  if (!Number.isFinite(fraction)) return "";
  return `${(fraction * 100).toFixed(digits)}%`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function parts(date: Date) {
  const fmt = new Intl.DateTimeFormat("en-ZA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    weekday: "short",
  });
  const out: Record<string, string> = {};
  for (const p of fmt.formatToParts(date)) out[p.type] = p.value;
  return {
    day: Number(out["day"]),
    month: Number(out["month"]),
    year: Number(out["year"]),
    hour: out["hour"] ?? "00",
    minute: out["minute"] ?? "00",
    weekday:
      DAYS[
        new Date(
          Date.UTC(Number(out["year"]), Number(out["month"]) - 1, Number(out["day"])),
        ).getUTCDay()
      ],
  };
}

/** "Sat 31 Oct 2026" in Africa/Johannesburg. */
export function formatDate(input: Date | string | number): string {
  const p = parts(new Date(input));
  return `${p.weekday} ${p.day} ${MONTHS[p.month - 1]} ${p.year}`;
}

/** "17:30 SAST" (24-hour). */
export function formatTime(input: Date | string | number): string {
  const p = parts(new Date(input));
  return `${p.hour}:${p.minute} SAST`;
}

/** "Sat 31 Oct 2026, 17:30 SAST". */
export function formatDateTime(input: Date | string | number): string {
  return `${formatDate(input)}, ${formatTime(input)}`;
}

/** South African numbers in international form: "082 123 4567" -> "+27 82 123 4567". */
export function formatPhone(input: string): string {
  const digits = input.replace(/\D/g, "");
  const national = digits.startsWith("27") ? digits.slice(2) : digits.replace(/^0/, "");
  if (national.length !== 9) return input;
  return `+27 ${national.slice(0, 2)} ${national.slice(2, 5)} ${national.slice(5)}`;
}
