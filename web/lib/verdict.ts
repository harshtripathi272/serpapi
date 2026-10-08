import type { CheckReport } from "./schema";

export type Lang = "en" | "hi";

const EN_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const EN_MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September",
  "October", "November", "December"];
const HI_MONTHS = ["जनवरी", "फ़रवरी", "मार्च", "अप्रैल", "मई", "जून", "जुलाई", "अगस्त", "सितंबर", "अक्टूबर", "नवंबर", "दिसंबर"];

function parts(iso: string): [number, number, number] {
  const [y, m, d] = iso.split("-").map(Number);
  return [y, m, d];
}

export function monthYear(iso: string, lang: Lang = "en"): string {
  const [y, m] = parts(iso);
  return lang === "en" ? `${EN_MONTHS[m - 1]} ${y}` : `${HI_MONTHS[m - 1]} ${y}`;
}

export function longDate(iso: string): string {
  const [y, m, d] = parts(iso);
  return `${d} ${EN_MONTHS_LONG[m - 1]} ${y}`;
}

export function shortDate(iso: string): string {
  const [y, m, d] = parts(iso);
  return `${d} ${EN_MONTHS[m - 1]} ${y}`;
}

function yearsBetween(from: string, to: string): number {
  return Math.floor((Date.parse(to) - Date.parse(from)) / (365.25 * 24 * 3600 * 1000));
}

export type Tone = "alert" | "info" | "neutral";

export function verdictView(r: CheckReport, lang: Lang = "en"): { tone: Tone; kicker: string; title: string; sub: string } {
  const date = r.first_seen?.date;
  if (r.verdict.label === "no_history" || !date) {
    return lang === "en"
      ? { tone: "neutral", kicker: "No history", title: "No earlier copies found",
          sub: "That fits a new photo, or one too new to be indexed. It doesn't prove it's real." }
      : { tone: "neutral", kicker: "कोई इतिहास नहीं", title: "कोई पुरानी कॉपी नहीं मिली",
          sub: "तस्वीर नई हो सकती है, या अभी इंटरनेट पर दर्ज न हुई हो। इससे यह सच साबित नहीं होती।" };
  }
  const years = yearsBetween(date, r.searched_on);
  const age = years >= 1 ? `${years} ${years === 1 ? "year" : "years"}` : "months";
  if (r.verdict.label === "older_than_claimed") {
    return lang === "en"
      ? { tone: "alert", kicker: "Not new", title: `Online since at least ${monthYear(date)}`,
          sub: `The message says it's recent. This exact photo has been online for over ${age}.` }
      : { tone: "alert", kicker: "नई नहीं है", title: `कम से कम ${monthYear(date, "hi")} से ऑनलाइन`,
          sub: "संदेश इसे नई बताता है, पर यही तस्वीर कई साल पहले से इंटरनेट पर है।" };
  }
  return lang === "en"
    ? { tone: "info", kicker: "First seen", title: `Online since at least ${monthYear(date)}`,
        sub: "The earliest date that several websites agree on." }
    : { tone: "info", kicker: "पहली बार दिखी", title: `कम से कम ${monthYear(date, "hi")} से ऑनलाइन`,
        sub: "सबसे पुरानी तारीख जिस पर कई वेबसाइटें सहमत हैं।" };
}

export const TONE = {
  alert: { band: "bg-alert-soft", text: "text-alert", dot: "bg-alert" },
  info: { band: "bg-info-soft", text: "text-info", dot: "bg-info" },
  neutral: { band: "bg-fill", text: "text-sub", dot: "bg-mute" },
} as const;
