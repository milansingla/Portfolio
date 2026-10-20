const f = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
/** "12 March 2026", always in UTC so a date never shifts with the reader's time zone. */
export const fmtDate = (s: string) => f.format(new Date(s.length === 10 ? s + "T00:00:00Z" : s));
