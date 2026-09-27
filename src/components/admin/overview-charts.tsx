"use client";

import { useState, type ReactNode } from "react";
import type { AdminOverview } from "@/lib/types";
import { formatDate } from "@/lib/utils";

/*
 * Chart colours: brand mint + violet stepped into the chart lightness band and
 * validated (dataviz validate_palette.js, dark, surface #0a0e15):
 * band / chroma / CVD ΔE 20.7 (tritan 10.6) / normal ΔE 26.7 / contrast — all pass.
 */
const SERIES = { registered: "#13a883", attended: "#7b6be8" } as const;
const GRID = "rgb(148 163 184 / 0.12)";

function niceMax(value: number) {
  if (value <= 5) return 5;
  const pow = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => value / s <= 5) ?? pow * 10;
  return Math.ceil(value / step) * step;
}

type Tip = { x: number; y: number; value: string; label: string } | null;

function Tooltip({ tip }: { tip: Tip }) {
  if (!tip) return null;
  return (
    <div
      role="presentation"
      className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-lg border border-line-strong bg-surface-3 px-3 py-2 text-xs shadow-xl"
      style={{ left: tip.x, top: tip.y - 8 }}
    >
      <p className="font-semibold text-ink">{tip.value}</p>
      <p className="text-muted">{tip.label}</p>
    </div>
  );
}

function ChartCard({
  title,
  description,
  legend,
  children,
  table,
}: {
  title: string;
  description?: string;
  legend?: ReactNode;
  children: ReactNode;
  table: ReactNode;
}) {
  return (
    <section className="card p-5 sm:p-6" aria-label={title}>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-ink">{title}</h2>
          {description ? <p className="mt-0.5 text-sm text-muted">{description}</p> : null}
        </div>
        {legend}
      </div>
      {children}
      <details className="mt-4 text-sm">
        <summary className="cursor-pointer text-faint hover:text-ink">View as table</summary>
        <div className="mt-3 overflow-x-auto">{table}</div>
      </details>
    </section>
  );
}

const thClass = "px-3 py-2 text-left font-mono text-xs font-medium uppercase tracking-wider text-faint";
const tdClass = "px-3 py-2 text-muted tabular-nums";

export function AttendanceChart({ events }: { events: AdminOverview["recent_events"] }) {
  const [tip, setTip] = useState<Tip>(null);
  const rows = [...events].reverse(); // oldest at top reads chronologically
  const max = niceMax(Math.max(1, ...rows.map((r) => Math.max(r.registered, r.capacity ?? 0))));
  const ticks = [0, max / 4, max / 2, (3 * max) / 4, max];

  const show = (e: React.PointerEvent | React.FocusEvent, value: string, label: string) => {
    const bar = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const host = (e.currentTarget as HTMLElement).closest("[data-chart]")!.getBoundingClientRect();
    setTip({ x: bar.right - host.left, y: bar.top - host.top, value, label });
  };

  return (
    <ChartCard
      title="Registrations vs check-ins"
      description="Most recent events"
      legend={
        <ul className="flex gap-4 text-xs text-muted">
          <li className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm" style={{ background: SERIES.registered }} aria-hidden /> Registered
          </li>
          <li className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm" style={{ background: SERIES.attended }} aria-hidden /> Checked in
          </li>
        </ul>
      }
      table={
        <table className="w-full min-w-[28rem] text-sm">
          <thead>
            <tr>
              <th className={thClass}>Event</th>
              <th className={thClass}>Date</th>
              <th className={thClass}>Registered</th>
              <th className={thClass}>Checked in</th>
              <th className={thClass}>Capacity</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {events.map((e) => (
              <tr key={e.id}>
                <td className="px-3 py-2 text-ink">{e.title}</td>
                <td className={tdClass}>{formatDate(e.starts_at)}</td>
                <td className={tdClass}>{e.registered}</td>
                <td className={tdClass}>{e.attended}</td>
                <td className={tdClass}>{e.capacity ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      }
    >
      {rows.length === 0 ? (
        <p className="py-10 text-center text-sm text-faint">No events yet.</p>
      ) : (
        <div data-chart className="relative" onPointerLeave={() => setTip(null)}>
          <div className="grid grid-cols-[minmax(0,11rem)_1fr] gap-x-4 sm:grid-cols-[minmax(0,15rem)_1fr]">
            {rows.map((r) => {
              const rate = r.registered ? Math.round((r.attended / r.registered) * 100) : 0;
              return (
                <div key={r.id} className="contents">
                  <div className="min-w-0 py-2.5">
                    <p className="truncate text-sm text-ink" title={r.title}>
                      {r.title}
                    </p>
                    <p className="text-xs text-faint">
                      {r.registered} reg · {r.attended} in{r.registered ? ` (${rate}%)` : ""}
                    </p>
                  </div>
                  <div className="relative flex flex-col justify-center gap-[2px] py-2.5">
                    {ticks.map((t) => (
                      <span
                        key={t}
                        className="absolute inset-y-0 w-px"
                        style={{ left: `${(t / max) * 100}%`, background: GRID }}
                        aria-hidden
                      />
                    ))}
                    {(
                      [
                        ["registered", r.registered, `${r.registered} registered`],
                        ["attended", r.attended, `${r.attended} checked in`],
                      ] as const
                    ).map(([key, value, text]) => (
                      <button
                        key={key}
                        type="button"
                        aria-label={`${r.title}: ${text}`}
                        onPointerEnter={(e) => show(e, text, r.title)}
                        onFocus={(e) => show(e, text, r.title)}
                        onBlur={() => setTip(null)}
                        className="relative h-3 rounded-r-[4px] outline-offset-2 transition-[filter] hover:brightness-125 focus-visible:brightness-125"
                        style={{
                          width: `max(${(value / max) * 100}%, ${value ? "3px" : "0px"})`,
                          background: SERIES[key],
                          minWidth: value ? 3 : 0,
                        }}
                      >
                        {/* taller invisible hit area than the 12px mark */}
                        <span className="absolute inset-x-0 -inset-y-1.5" aria-hidden />
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
            <div />
            <div className="relative mt-1 h-5 text-[0.68rem] text-faint" aria-hidden>
              {ticks.map((t, i) => (
                <span
                  key={t}
                  className="absolute tabular-nums"
                  style={{
                    left: `${(t / max) * 100}%`,
                    transform: i === 0 ? "none" : i === ticks.length - 1 ? "translateX(-100%)" : "translateX(-50%)",
                  }}
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
          <Tooltip tip={tip} />
        </div>
      )}
    </ChartCard>
  );
}

/** `series` is pre-filled server-side with lib/weeks.fillWeeks. */
export function SignupsChart({ series }: { series: AdminOverview["signups_by_week"] }) {
  const [tip, setTip] = useState<Tip>(null);

  const max = niceMax(Math.max(1, ...series.map((s) => s.count)));
  const total = series.reduce((sum, s) => sum + s.count, 0);
  const H = 160;

  return (
    <ChartCard
      title="New accounts per week"
      description={`${total} in the last 12 weeks`}
      table={
        <table className="w-full min-w-[20rem] text-sm">
          <thead>
            <tr>
              <th className={thClass}>Week of</th>
              <th className={thClass}>New accounts</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {series.map((s) => (
              <tr key={s.week}>
                <td className={tdClass}>{formatDate(s.week)}</td>
                <td className={tdClass}>{s.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      }
    >
      <div data-chart className="relative flex gap-3" onPointerLeave={() => setTip(null)}>
        <div
          className="relative w-6 shrink-0 text-right text-[0.68rem] text-faint tabular-nums"
          style={{ height: H }}
          aria-hidden
        >
          {[max, max / 2, 0].map((t, i) => (
            <span key={t} className="absolute right-0" style={{ top: `${(i / 2) * 100}%`, transform: "translateY(-50%)" }}>
              {t}
            </span>
          ))}
        </div>
        <div className="min-w-0 flex-1">
          <div className="relative flex items-end gap-[2px]" style={{ height: H }}>
            {[0, 0.5, 1].map((f) => (
              <span key={f} className="absolute inset-x-0 h-px" style={{ top: `${f * 100}%`, background: GRID }} aria-hidden />
            ))}
            {series.map((s, i) => {
              const last = i === series.length - 1;
              const label = `Week of ${formatDate(s.week)}`;
              const text = `${s.count} new ${s.count === 1 ? "account" : "accounts"}`;
              const show = (e: React.PointerEvent | React.FocusEvent) => {
                const col = (e.currentTarget as HTMLElement).getBoundingClientRect();
                const host = (e.currentTarget as HTMLElement).closest("[data-chart]")!.getBoundingClientRect();
                const barTop = col.bottom - (s.count / max) * H;
                setTip({ x: col.left + col.width / 2 - host.left, y: barTop - host.top, value: text, label });
              };
              return (
                <button
                  key={s.week}
                  type="button"
                  aria-label={`${label}: ${text}`}
                  onPointerEnter={show}
                  onFocus={show}
                  onBlur={() => setTip(null)}
                  className="group relative flex h-full flex-1 items-end justify-center outline-offset-2"
                >
                  <span
                    className="relative w-full max-w-6 rounded-t-[4px] transition-[filter] group-hover:brightness-125 group-focus-visible:brightness-125"
                    style={{ height: `${(s.count / max) * 100}%`, minHeight: s.count ? 3 : 0, background: SERIES.registered }}
                  >
                    {last && s.count ? (
                      <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-xs font-medium text-ink" aria-hidden>
                        {s.count}
                      </span>
                    ) : null}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="mt-2 flex gap-[2px] text-[0.65rem] text-faint" aria-hidden>
            {series.map((s, i) => (
              <span key={s.week} className="flex-1 truncate text-center">
                {i % 3 === 2 ? formatDate(s.week).split(" ").slice(0, 2).join(" ") : ""}
              </span>
            ))}
          </div>
        </div>
        <Tooltip tip={tip} />
      </div>
    </ChartCard>
  );
}
