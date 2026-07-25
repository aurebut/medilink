'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { formatMoney } from '@/lib/format';

export type ChartRow = {
  date?: string | null;
  amount: number;
};

type MonthPoint = {
  index: number;
  label: string;
  long: string;
  amount: number;
  cumulative: number;
  future: boolean;
};

const LABELS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
const LONG_LABELS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

function computeMonths(rows: ChartRow[], year: number): MonthPoint[] {
  const monthlyTotals = Array(12).fill(0) as number[];
  rows.forEach(row => {
    if (!row.date) return;
    const d = new Date(row.date);
    if (d.getFullYear() !== year) return;
    monthlyTotals[d.getMonth()] += row.amount;
  });

  const now = new Date();
  let lastRealMonth = 11;
  if (year === now.getFullYear()) lastRealMonth = now.getMonth();
  if (year > now.getFullYear()) lastRealMonth = 0;
  monthlyTotals.forEach((amount, i) => {
    if (amount !== 0 && i > lastRealMonth) lastRealMonth = i;
  });

  let cumulative = 0;
  return monthlyTotals.map((amount, i) => {
    cumulative += amount;
    return {
      index: i,
      label: LABELS[i],
      long: LONG_LABELS[i],
      amount,
      cumulative,
      future: i > lastRealMonth,
    };
  });
}

function useIsMobile() {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 719px)');
    setMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return mobile;
}

function formatAxisMoney(value: number) {
  if (Math.abs(value) < 1000) return formatMoney(Math.round(value));
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    notation: 'compact',
    maximumFractionDigits: Math.abs(value) >= 10000 ? 0 : 1,
  }).format(value);
}

/** Rounds the axis maximum up to a readable value so gridlines land on clean numbers. */
function niceCeiling(value: number, ticks: number) {
  if (!Number.isFinite(value) || value <= 0) return 1;
  const rawStep = value / ticks;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const normalized = rawStep / magnitude;
  const niceStep = (normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 2.5 ? 2.5 : normalized <= 5 ? 5 : 10) * magnitude;
  return niceStep * ticks;
}

/** Monotone cubic interpolation (Fritsch–Carlson): a smooth curve that never overshoots. */
function smoothPath(points: { x: number; y: number }[]) {
  const n = points.length;
  if (n === 0) return '';
  if (n === 1) return `M${points[0].x},${points[0].y}`;

  const dx: number[] = [];
  const slope: number[] = [];
  for (let i = 0; i < n - 1; i += 1) {
    dx[i] = points[i + 1].x - points[i].x;
    slope[i] = (points[i + 1].y - points[i].y) / (dx[i] || 1);
  }

  const m: number[] = [slope[0]];
  for (let i = 1; i < n - 1; i += 1) {
    if (slope[i - 1] * slope[i] <= 0) {
      m[i] = 0;
    } else {
      const w1 = 2 * dx[i] + dx[i - 1];
      const w2 = dx[i] + 2 * dx[i - 1];
      m[i] = (w1 + w2) / (w1 / slope[i - 1] + w2 / slope[i]);
    }
  }
  m[n - 1] = slope[n - 2];

  let d = `M${points[0].x.toFixed(1)},${points[0].y.toFixed(1)}`;
  for (let i = 0; i < n - 1; i += 1) {
    const third = dx[i] / 3;
    const c1x = points[i].x + third;
    const c1y = points[i].y + m[i] * third;
    const c2x = points[i + 1].x - third;
    const c2y = points[i + 1].y - m[i + 1] * third;
    d += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${points[i + 1].x.toFixed(1)},${points[i + 1].y.toFixed(1)}`;
  }
  return d;
}

function roundedBarPath(x: number, y: number, w: number, h: number, radius: number) {
  const r = Math.max(0, Math.min(radius, w / 2, h));
  return [
    `M${x.toFixed(1)},${(y + h).toFixed(1)}`,
    `L${x.toFixed(1)},${(y + r).toFixed(1)}`,
    `Q${x.toFixed(1)},${y.toFixed(1)} ${(x + r).toFixed(1)},${y.toFixed(1)}`,
    `L${(x + w - r).toFixed(1)},${y.toFixed(1)}`,
    `Q${(x + w).toFixed(1)},${y.toFixed(1)} ${(x + w).toFixed(1)},${(y + r).toFixed(1)}`,
    `L${(x + w).toFixed(1)},${(y + h).toFixed(1)}`,
    'Z',
  ].join(' ');
}

export function MonthlyBarChart({ rows, year, label = 'Montant', barColor = 'var(--teal)', lineColor = 'var(--heading)' }: {
  rows: ChartRow[];
  year: number;
  label?: string;
  barColor?: string;
  lineColor?: string;
}) {
  const isMobile = useIsMobile();
  const months = useMemo(() => computeMonths(rows, year), [rows, year]);

  const stats = useMemo(() => {
    const total = months.reduce((sum, month) => sum + month.amount, 0);
    const active = months.filter(month => month.amount !== 0);
    const best = active.reduce<MonthPoint | null>((top, month) => (!top || month.amount > top.amount ? month : top), null);
    const elapsed = months.filter(month => !month.future).length || 1;
    const last = months[elapsed - 1] || null;
    const previous = last && last.index > 0 ? months[last.index - 1] : null;
    const delta = last && previous && previous.amount > 0
      ? ((last.amount - previous.amount) / previous.amount) * 100
      : null;
    return {
      total,
      best,
      last,
      delta,
      activeCount: active.length,
      average: total / elapsed,
      elapsed,
    };
  }, [months]);

  const style = { '--mc-bar': barColor, '--mc-line': lineColor } as React.CSSProperties;

  return (
    <section
      className="mchart"
      style={style}
      data-empty={stats.total === 0 ? 'true' : 'false'}
      aria-label={`${label} par mois en ${year}, total ${formatMoney(stats.total)}`}
    >
      <header className="mchart-head">
        <div className="mchart-head-main">
          <span className="mchart-eyebrow">{label} · exercice {year}</span>
          <strong className="mchart-total">{formatMoney(stats.total)}</strong>
          <span className="mchart-sub">
            {stats.activeCount > 0
              ? `Moyenne ${formatAxisMoney(stats.average)} / mois · ${stats.activeCount} mois actif${stats.activeCount > 1 ? 's' : ''}`
              : 'Aucun mouvement enregistré sur cet exercice'}
          </span>
        </div>
        <div className="mchart-legend" aria-hidden="true">
          <span className="mchart-legend-item"><i className="mchart-swatch mchart-swatch-bar" />Par mois</span>
          <span className="mchart-legend-item"><i className="mchart-swatch mchart-swatch-line" />Cumul</span>
        </div>
      </header>

      {isMobile
        ? <MonthlyChartMobile months={months} best={stats.best} label={label} />
        : <MonthlyChartDesktop months={months} average={stats.average} label={label} />}

      <footer className="mchart-foot">
        <div className="mchart-foot-item">
          <span>Meilleur mois</span>
          <div className="mchart-foot-value">
            <strong>{stats.best ? stats.best.long : '—'}</strong>
          </div>
          <small>{stats.best ? formatMoney(stats.best.amount) : 'Pas encore de données'}</small>
        </div>
        <div className="mchart-foot-item">
          <span>Moyenne mensuelle</span>
          <div className="mchart-foot-value">
            <strong>{formatAxisMoney(stats.average)}</strong>
          </div>
          <small>Sur {stats.elapsed} mois écoulé{stats.elapsed > 1 ? 's' : ''}</small>
        </div>
        <div className="mchart-foot-item">
          <span>Dernier mois</span>
          <div className="mchart-foot-value">
            <strong>{stats.last ? formatAxisMoney(stats.last.amount) : '—'}</strong>
            {stats.delta !== null ? (
              <b className="mchart-trend" data-dir={stats.delta > 1 ? 'up' : stats.delta < -1 ? 'down' : 'flat'}>
                {stats.delta > 1 ? '↗' : stats.delta < -1 ? '↘' : '→'} {Math.abs(Math.round(stats.delta))}%
              </b>
            ) : null}
          </div>
          <small>{stats.last ? `${stats.last.long} vs mois précédent` : 'Aucune donnée'}</small>
        </div>
      </footer>
    </section>
  );
}

const W = 760;
const H = 268;
const PAD_LEFT = 54;
const PAD_RIGHT = 18;
const PAD_TOP = 16;
const PAD_BOTTOM = 30;
const CHART_W = W - PAD_LEFT - PAD_RIGHT;
const CHART_H = H - PAD_TOP - PAD_BOTTOM;
const SLOT = CHART_W / 12;
const BAR_W = Math.min(SLOT * 0.46, 26);
const TICKS = 4;

function MonthlyChartDesktop({ months, average, label }: {
  months: MonthPoint[];
  average: number;
  label: string;
}) {
  const rawId = useId().replace(/[:]/g, '');
  const barGradient = `mc-bar-${rawId}`;
  const barGradientActive = `mc-bar-active-${rawId}`;
  const areaGradient = `mc-area-${rawId}`;
  const lineGlow = `mc-glow-${rawId}`;

  const plotRef = useRef<HTMLDivElement | null>(null);
  const [active, setActive] = useState<number | null>(null);

  const visible = months.filter(month => !month.future);
  const linePoints = visible.length > 0 ? visible : months.slice(0, 1);
  const lastVisible = visible.length > 0 ? visible[visible.length - 1].index : 0;
  const peak = Math.max(...months.map(month => Math.max(month.amount, month.cumulative)), 0);
  const scaleMax = peak > 0 ? niceCeiling(peak * 1.08, TICKS) : 1000;

  const xPos = useCallback((i: number) => PAD_LEFT + (i + 0.5) * SLOT, []);
  const yPos = useCallback((v: number) => PAD_TOP + CHART_H - (Math.max(v, 0) / scaleMax) * CHART_H, [scaleMax]);

  const curve = smoothPath(linePoints.map(month => ({ x: xPos(month.index), y: yPos(month.cumulative) })));
  const baseline = PAD_TOP + CHART_H;
  const areaPath = linePoints.length > 1
    ? `${curve} L${xPos(linePoints[linePoints.length - 1].index).toFixed(1)},${baseline} L${xPos(linePoints[0].index).toFixed(1)},${baseline} Z`
    : '';

  const ticks = Array.from({ length: TICKS + 1 }, (_, i) => i / TICKS);
  const averageY = yPos(average);
  const showAverage = average > 0 && average < scaleMax * 0.94;

  const handlePointer = (event: React.PointerEvent<HTMLDivElement>) => {
    const node = plotRef.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    if (rect.width === 0) return;
    const svgX = ((event.clientX - rect.left) / rect.width) * W;
    const raw = Math.floor((svgX - PAD_LEFT) / SLOT);
    const index = raw < 0 ? 0 : raw > 11 ? 11 : raw;
    setActive(months[index].future ? null : index);
  };

  const handleKey = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault();
      const step = event.key === 'ArrowRight' ? 1 : -1;
      setActive(current => {
        const next = (current === null ? (step > 0 ? 0 : lastVisible) : current + step);
        return next < 0 ? 0 : next > lastVisible ? lastVisible : next;
      });
    } else if (event.key === 'Escape') {
      setActive(null);
    }
  };

  const activeMonth = active === null ? null : months[active];
  const totalToDate = months[months.length - 1]?.cumulative || 0;

  return (
    <div
      className="mchart-plot"
      ref={plotRef}
      onPointerMove={handlePointer}
      onPointerLeave={() => setActive(null)}
      onKeyDown={handleKey}
      onBlur={() => setActive(null)}
      role="img"
      tabIndex={0}
      aria-label={`Graphique ${label} mensuel, cumul ${formatMoney(totalToDate)}`}
    >
      <svg className="mchart-svg" viewBox={`0 0 ${W} ${H}`} focusable="false" aria-hidden="true">
        <defs>
          <linearGradient id={barGradient} className="mchart-grad-bar" x1="0" y1="0" x2="0" y2="1">
            <stop className="mc-stop-1" offset="0%" />
            <stop className="mc-stop-2" offset="100%" />
          </linearGradient>
          <linearGradient id={barGradientActive} className="mchart-grad-bar-active" x1="0" y1="0" x2="0" y2="1">
            <stop className="mc-stop-1" offset="0%" />
            <stop className="mc-stop-2" offset="100%" />
          </linearGradient>
          <linearGradient id={areaGradient} className="mchart-grad-area" x1="0" y1="0" x2="0" y2="1">
            <stop className="mc-stop-1" offset="0%" />
            <stop className="mc-stop-2" offset="60%" />
            <stop className="mc-stop-3" offset="100%" />
          </linearGradient>
          <filter id={lineGlow} x="-8%" y="-40%" width="116%" height="180%">
            <feDropShadow dx="0" dy="4" stdDeviation="5" floodOpacity="0.18" className="mchart-shadow" />
          </filter>
        </defs>

        {ticks.map(ratio => {
          const y = PAD_TOP + CHART_H * (1 - ratio);
          return (
            <g key={ratio} className="mchart-grid">
              <line x1={PAD_LEFT - 6} x2={W - PAD_RIGHT} y1={y} y2={y} className={ratio === 0 ? 'mchart-grid-base' : 'mchart-grid-line'} />
              <text x={PAD_LEFT - 14} y={y + 3.5} className="mchart-axis-y">{formatAxisMoney(scaleMax * ratio)}</text>
            </g>
          );
        })}

        {showAverage ? (
          <g className="mchart-average">
            <line x1={PAD_LEFT} x2={W - PAD_RIGHT} y1={averageY} y2={averageY} className="mchart-average-line" />
            <text x={W - PAD_RIGHT} y={averageY - 6} className="mchart-average-label">moy.</text>
          </g>
        ) : null}

        {months.map(month => (
          month.future ? null : (
            <rect
              key={`hit-${month.label}`}
              className="mchart-hit"
              x={PAD_LEFT + month.index * SLOT}
              y={PAD_TOP}
              width={SLOT}
              height={CHART_H}
              data-active={active === month.index ? 'true' : 'false'}
            />
          )
        ))}

        {active !== null && !months[active].future ? (
          <line
            className="mchart-crosshair"
            x1={xPos(active)}
            x2={xPos(active)}
            y1={PAD_TOP}
            y2={baseline}
          />
        ) : null}

        {areaPath ? (
          <path className="mchart-area" d={areaPath} fill={`url(#${areaGradient})`} />
        ) : null}

        <g className="mchart-bars" data-active={active === null ? 'false' : 'true'}>
          {months.map(month => {
            if (month.future) return null;
            const height = (Math.max(month.amount, 0) / scaleMax) * CHART_H;
            const drawn = Math.max(height, month.amount > 0 ? 3 : 0);
            const isActive = active === month.index;
            return (
              <g key={month.label} className="mchart-bar-group" style={{ '--i': month.index } as React.CSSProperties}>
                <path
                  className="mchart-bar-track"
                  d={roundedBarPath(xPos(month.index) - BAR_W / 2, PAD_TOP + CHART_H - 3, BAR_W, 3, 2)}
                />
                {drawn > 0 ? (
                  <path
                    className="mchart-bar"
                    data-active={isActive ? 'true' : 'false'}
                    d={roundedBarPath(xPos(month.index) - BAR_W / 2, baseline - drawn, BAR_W, drawn, 5)}
                    fill={`url(#${isActive ? barGradientActive : barGradient})`}
                  />
                ) : null}
              </g>
            );
          })}
        </g>

        {curve ? (
          <path className="mchart-line" d={curve} filter={`url(#${lineGlow})`} pathLength={1} />
        ) : null}

        {linePoints.map(month => (
          <circle
            key={`dot-${month.label}`}
            className="mchart-dot"
            data-active={active === month.index ? 'true' : 'false'}
            cx={xPos(month.index)}
            cy={yPos(month.cumulative)}
            r={active === month.index ? 5 : 3.2}
          />
        ))}

        {months.map(month => (
          <text
            key={`x-${month.label}`}
            className="mchart-axis-x"
            data-active={active === month.index ? 'true' : 'false'}
            data-future={month.future ? 'true' : 'false'}
            x={xPos(month.index)}
            y={H - 9}
          >
            {month.label}
          </text>
        ))}
      </svg>

      {activeMonth && !activeMonth.future ? (
        <div
          className="mchart-tip"
          style={{ left: `${(xPos(activeMonth.index) / W) * 100}%` }}
          data-align={activeMonth.index <= 2 ? 'start' : activeMonth.index >= 9 ? 'end' : 'center'}
        >
          <span className="mchart-tip-month">{activeMonth.long}</span>
          <span className="mchart-tip-row"><i className="mchart-swatch mchart-swatch-bar" />{formatMoney(activeMonth.amount)}</span>
          <span className="mchart-tip-row"><i className="mchart-swatch mchart-swatch-line" />Cumul {formatMoney(activeMonth.cumulative)}</span>
          {totalToDate > 0 ? (
            <span className="mchart-tip-share">{Math.round((activeMonth.amount / totalToDate) * 100)}% de l’exercice</span>
          ) : null}
        </div>
      ) : null}

      <div className="mchart-empty" aria-hidden="true">
        <span>Aucun mouvement sur {label.toLowerCase()} pour cet exercice</span>
      </div>
    </div>
  );
}

function MonthlyChartMobile({ months, best, label }: {
  months: MonthPoint[];
  best: MonthPoint | null;
  label: string;
}) {
  const maxAmount = Math.max(...months.map(month => month.amount), 1);
  const visible = months.filter(month => !month.future);
  const sparkPoints = visible.length > 1 ? visible : months;
  const sparkMax = Math.max(...sparkPoints.map(month => month.cumulative), 1);
  const spark = smoothPath(sparkPoints.map((month, i) => ({
    x: (i / Math.max(sparkPoints.length - 1, 1)) * 100,
    y: 30 - (month.cumulative / sparkMax) * 26,
  })));

  return (
    <div className="mchart-mobile" role="img" aria-label={`Graphique ${label} mensuel`}>
      <div className="mchart-spark">
        <svg viewBox="0 0 100 32" preserveAspectRatio="none" aria-hidden="true">
          {spark ? <path className="mchart-spark-area" d={`${spark} L100,32 L0,32 Z`} /> : null}
          {spark ? <path className="mchart-spark-line" d={spark} pathLength={1} /> : null}
        </svg>
        <span>Cumul</span>
      </div>
      <ul className="mchart-rows">
        {months.map(month => (
          <li
            key={month.label}
            className="mchart-row"
            data-future={month.future ? 'true' : 'false'}
            data-best={best && best.index === month.index ? 'true' : 'false'}
          >
            <span className="mchart-row-label">{month.label}</span>
            <span className="mchart-row-track">
              <span className="mchart-row-fill" style={{ width: `${Math.max((month.amount / maxAmount) * 100, month.amount > 0 ? 3 : 0)}%` }} />
            </span>
            <span className="mchart-row-value">{month.amount === 0 ? '—' : formatAxisMoney(month.amount)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
