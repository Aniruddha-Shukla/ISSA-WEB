/** Last `count` ISO weeks (Monday starts, UTC — matches Postgres date_trunc('week')), zero-filled. */
export function fillWeeks(weeks: { week: string; count: number }[], now: number, count = 12) {
  const byWeek = new Map(weeks.map((w) => [w.week.slice(0, 10), w.count]));
  const monday = new Date(now);
  monday.setUTCHours(0, 0, 0, 0);
  monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
  const series: { week: string; count: number }[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(monday.getTime() - i * 7 * 86_400_000).toISOString().slice(0, 10);
    series.push({ week: d, count: byWeek.get(d) ?? 0 });
  }
  return series;
}
