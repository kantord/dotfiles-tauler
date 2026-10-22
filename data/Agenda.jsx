// Data component: one day of calendar events. Draws nothing; `Chart` (rect marks) or a list
// can draw them.
//
//   <Agenda>{(events, info) => events.map(e => <span>{e.start} {e.title}</span>)}</Agenda>
//   <Agenda day={1}>{...}</Agenda>          // tomorrow
//
// `events` is `[{ title, start, end, color }]`, times as "HH:MM", sorted by start; empty until
// the first fetch. `info` is `{ day, date, month, dayOfMonth, isToday }` for the day shown:
// `date` is "YYYY-MM-DD" and `month` a short English name ("Oct").
//
// `day` is an offset from today (0 today, -1 yesterday). It is part of the command, so changing
// it restarts the source with one fresh fetch. `bin` is the source: any program that takes the
// offset as its first argument and prints those JSON lines. The default, bin/tauler-agenda-gcalcli,
// reads Google Calendar through gcalcli.
export const DEFAULT_BIN = "~/.local/bin/tauler-agenda-gcalcli";
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function dayInfo(day) {
  const d = new Date();
  d.setDate(d.getDate() + day);
  const pad = n => String(n).padStart(2, "0");
  return {
    day,
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    month: MONTHS[d.getMonth()],
    dayOfMonth: d.getDate(),
    isToday: day === 0,
  };
}

export default function Agenda({ bin = DEFAULT_BIN, day = 0, children }) {
  const offset = Number.isInteger(Number(day)) ? Number(day) : 0;
  const events = useJSONStream("/usr/bin/bash", `exec ${bin} ${offset}`);
  const child = Array.isArray(children) ? children[0] : children;
  return child(Array.isArray(events) ? events : [], dayInfo(offset));
}
