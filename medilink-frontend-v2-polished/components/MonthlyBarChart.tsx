'use client';

import { useEffect, useId, useMemo, useState } from 'react';
import { formatMoney } from '@/lib/format';

export type ChartRow = {
  date?: string | null;
  amount: number;
};

const LABELS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];

function computeMonths(rows: ChartRow[], year: number) {
  const monthlyTotals = Array(12).fill(0) as number[];
  rows.forEach(row => {
    if (!row.date) return;
    const d = new Date(row.date);
    if (d.getFullYear() !== year) return;
    monthlyTotals[d.getMonth()] += row.amount;
  });
  let cumulative = 0;
  return monthlyTotals.map((amount, i) => {
    cumulative += amount;
    return { label: LABELS[i], amount, cumulative };
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
    maximumFractionDigits: value >= 10000 ? 0 : 1,
  }).format(value);
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
  const yearlyTotal = months.reduce((s, m) => s + m.amount, 0);

  if (isMobile) {
    return <MonthlyBarChartMobile months={months} total={yearlyTotal} label={label} barColor={barColor} lineColor={lineColor} />;
  }

  return <MonthlyBarChartDesktop months={months} label={label} barColor={barColor} lineColor={lineColor} />;
}

function MonthlyBarChartMobile({ months, total, label, barColor, lineColor }: {
  months: { label: string; amount: number; cumulative: number }[];
  total: number;
  label: string;
  barColor: string;
  lineColor: string;
}) {
  const maxAmount = Math.max(...months.map(m => m.amount), 1);

  return (
    <div className="chart-mobile" role="region" aria-label={`Graphique ${label} mensuel`}>
      <div className="chart-mobile-header">
        <span>{label} {months.length > 0 && months[0].label}–{months[months.length - 1]?.label || ''}</span>
        <strong>{formatAxisMoney(total)}</strong>
      </div>
      <div className="chart-mobile-bars">
        {months.map((m) => (
          <div key={m.label} className="chart-mobile-row">
            <span className="chart-mobile-label">{m.label}</span>
            <div className="chart-mobile-track">
              <div
                className="chart-mobile-fill"
                style={{
                  width: `${(m.amount / maxAmount) * 100}%`,
                  backgroundColor: barColor,
                }}
              />
            </div>
            <span className="chart-mobile-value">{formatAxisMoney(m.amount)}</span>
          </div>
        ))}
      </div>
      <div className="chart-mobile-footer">
        <span>Total cumulé</span>
        <strong>{formatMoney(months[months.length - 1]?.cumulative || 0)}</strong>
      </div>
    </div>
  );
}

function MonthlyBarChartDesktop({ months, label, barColor, lineColor }: {
  months: { label: string; amount: number; cumulative: number }[];
  label: string;
  barColor: string;
  lineColor: string;
}) {
  const id = useId().replace(/:/g, '');
  const barGradientId = `barGrad-${id}`;
  const areaGradientId = `areaGrad-${id}`;

  const maxVal = Math.max(...months.map(m => Math.max(m.amount, m.cumulative)), 1);
  const pad = maxVal * 0.1;
  const scaleMax = maxVal + pad;

  const W = 700;
  const H = 260;
  const PAD_LEFT = 42;
  const PAD_RIGHT = 10;
  const PAD_TOP = 20;
  const PAD_BOTTOM = 25;
  const chartW = W - PAD_LEFT - PAD_RIGHT;
  const chartH = H - PAD_TOP - PAD_BOTTOM;
  const barW = chartW / 12 * 0.55;

  function xPos(i: number) {
    return PAD_LEFT + (i + 0.5) * (chartW / 12);
  }

  function yVal(v: number) {
    return PAD_TOP + chartH - (v / scaleMax) * chartH;
  }

  function barHeight(v: number) {
    return (v / scaleMax) * chartH;
  }

  const cumulativeLine = months.map((m, i) => `${i === 0 ? 'M' : 'L'}${xPos(i).toFixed(1)},${yVal(m.cumulative).toFixed(1)}`).join(' ');
  const gridLines = [0, 0.25, 0.5, 0.75, 1];

  return (
    <div className="monthly-chart-shell" role="region" aria-label={`Graphique ${label} mensuel`} tabIndex={0}>
      <svg className="monthly-bar-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Graphique ${label} mensuel`}>
        <defs>
          <linearGradient id={barGradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={barColor} stopOpacity="0.85" />
            <stop offset="100%" stopColor={barColor} stopOpacity="0.4" />
          </linearGradient>
          <linearGradient id={areaGradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={lineColor} stopOpacity="0.12" />
            <stop offset="100%" stopColor={lineColor} stopOpacity="0.01" />
          </linearGradient>
        </defs>

        {gridLines.map((ratio) => {
          const y = PAD_TOP + chartH * (1 - ratio);
          const val = scaleMax * ratio;
          return (
            <g key={ratio}>
              <line x1={PAD_LEFT} x2={W - PAD_RIGHT} y1={y} y2={y} stroke="var(--line)" strokeWidth="1" />
              <text x={PAD_LEFT - 6} y={y + 4} textAnchor="end" fill="var(--muted)" fontSize="9">
                {formatAxisMoney(val)}
              </text>
            </g>
          );
        })}

        {months.map((m, i) => {
          const cx = xPos(i);
          const bh = barHeight(m.amount);
          return (
            <rect
              key={m.label}
              x={cx - barW / 2}
              y={yVal(m.amount)}
              width={barW}
              height={Math.max(bh, 1)}
              fill={`url(#${barGradientId})`}
              rx="3"
            >
              <title>{m.label} : {formatMoney(m.amount)}</title>
            </rect>
          );
        })}

        <path d={`${cumulativeLine} L${xPos(11)},${PAD_TOP + chartH} L${xPos(0)},${PAD_TOP + chartH} Z`} fill={`url(#${areaGradientId})`} />

        <path d={cumulativeLine} fill="none" stroke={lineColor} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />

        {months.map((m, i) => (
          <circle key={m.label} cx={xPos(i)} cy={yVal(m.cumulative)} r="3" fill={lineColor} stroke="var(--surface)" strokeWidth="1.5">
            <title>{m.label} cumul : {formatMoney(m.cumulative)}</title>
          </circle>
        ))}

        {months.map((m, i) => (
          <text key={m.label} x={xPos(i)} y={H - 6} textAnchor="middle" fill="var(--muted)" fontSize="9">
            {m.label}
          </text>
        ))}

        <text x={PAD_LEFT} y={14} fill="var(--muted)" fontSize="9" fontWeight="600">
          {label} mensuel
        </text>
      </svg>
    </div>
  );
}