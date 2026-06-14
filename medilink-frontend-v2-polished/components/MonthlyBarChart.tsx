'use client';

import { useMemo } from 'react';
import { formatMoney } from '@/lib/format';

export type ChartRow = {
  date?: string | null;
  amount: number;
};

export function MonthlyBarChart({ rows, year, label = 'Montant', barColor = 'var(--teal)', lineColor = 'var(--heading)' }: {
  rows: ChartRow[];
  year: number;
  label?: string;
  barColor?: string;
  lineColor?: string;
}) {
  const months = useMemo(() => {
    const monthlyTotals = Array(12).fill(0) as number[];
    rows.forEach(row => {
      if (!row.date) return;
      const d = new Date(row.date);
      if (d.getFullYear() !== year) return;
      monthlyTotals[d.getMonth()] += row.amount;
    });

    const labels = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
    let cumulative = 0;
    return monthlyTotals.map((amount, i) => {
      cumulative += amount;
      return { label: labels[i], amount, cumulative };
    });
  }, [rows, year]);

  const maxVal = Math.max(...months.map(m => Math.max(m.amount, m.cumulative)), 1);
  const pad = maxVal * 0.1;
  const scaleMax = maxVal + pad;

  const W = 700;
  const H = 220;
  const PAD_LEFT = 45;
  const PAD_RIGHT = 10;
  const PAD_TOP = 20;
  const PAD_BOTTOM = 30;
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
  const total = months[months.length - 1]?.cumulative || 0;
  const yearlyTotal = months.reduce((s, m) => s + m.amount, 0);
  const avgMonthly = yearlyTotal / 12;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }} role="img" aria-label={`Graphique ${label} mensuel`}>
      <defs>
        <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={barColor} stopOpacity="0.85" />
          <stop offset="100%" stopColor={barColor} stopOpacity="0.4" />
        </linearGradient>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
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
            <text x={PAD_LEFT - 6} y={y + 4} textAnchor="end" fill="var(--muted)" fontSize="11">
              {formatMoney(val)}
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
            fill="url(#barGrad)"
            rx="3"
          >
            <title>{m.label} : {formatMoney(m.amount)}</title>
          </rect>
        );
      })}

      <path d={cumulativeLine} fill="none" stroke={lineColor} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

      <path d={`${cumulativeLine} L${xPos(11)},${PAD_TOP + chartH} L${xPos(0)},${PAD_TOP + chartH} Z`} fill="url(#areaGrad)" />

      {months.map((m, i) => (
        <circle key={m.label} cx={xPos(i)} cy={yVal(m.cumulative)} r="3" fill={lineColor}>
          <title>{m.label} cumul : {formatMoney(m.cumulative)}</title>
        </circle>
      ))}

      {months.map((m, i) => {
        const show = i % 2 === 0;
        return show ? (
          <text key={m.label} x={xPos(i)} y={H - 6} textAnchor="middle" fill="var(--muted)" fontSize="11">
            {m.label}
          </text>
        ) : null;
      })}

      <text x={PAD_LEFT} y={14} fill="var(--muted)" fontSize="11" fontWeight="600">
        {label} mensuel
      </text>
    </svg>
  );
}
