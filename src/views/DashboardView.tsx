import React from 'react';
import { CbtEntry, PeriodFilter } from '../types';
import { BarChart3, FileSpreadsheet, TrendingUp, ShieldAlert, HeartHandshake, Ban, Activity } from 'lucide-react';
import { CustomDropdown } from '../components/CustomDropdown';

interface DashboardViewProps {
  entries: CbtEntry[];
  dashPeriod: PeriodFilter;
  onPeriodChange: (period: PeriodFilter) => void;
  onExportReport: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  entries,
  dashPeriod,
  onPeriodChange,
  onExportReport,
}) => {
  // Sort entries chronologically ascending for charts
  const chronEntries = [...entries].sort(
    (a, b) => new Date(a.eventDatetime).getTime() - new Date(b.eventDatetime).getTime()
  );

  const totalEntries = chronEntries.length;
  const anxietyEntries = chronEntries.filter((e) => typeof e.overallAnxietyLevel === 'number');
  const avgAnxiety = anxietyEntries.length > 0
    ? Math.round(anxietyEntries.reduce((s, e) => s + (e.overallAnxietyLevel || 0), 0) / anxietyEntries.length)
    : 0;

  const totalControl = chronEntries.reduce((s, e) => s + (Number(e.symptomControlCount) || 0), 0);
  const totalReassurance = chronEntries.reduce((s, e) => s + (Number(e.reassuranceSeekingCount) || 0), 0);
  
  // Calculate total avoidances safely (if avoidanceType or avoidanceDescription exists, count as at least 1)
  const totalAvoidance = chronEntries.reduce((s, e) => {
    if (typeof e.avoidanceCount === 'number' && e.avoidanceCount > 0) {
      return s + e.avoidanceCount;
    }
    if (e.avoidanceType && e.avoidanceType.trim().length > 0) {
      return s + 1;
    }
    return s;
  }, 0);

  const periodOptions: { value: PeriodFilter; label: string }[] = [
    { value: '7', label: 'Ultimi 7 giorni' },
    { value: '14', label: 'Ultimi 14 giorni' },
    { value: '30', label: 'Ultimi 30 giorni' },
    { value: '90', label: 'Ultimi 90 giorni' },
    { value: 'all', label: 'Tutto il periodo' },
  ];

  /* Render Line Chart for Anxiety */
  const renderAnxietyChart = () => {
    if (totalEntries === 0) {
      return (
        <div className="py-8 text-center text-xs font-bold text-[var(--text-secondary)]">
          Nessun dato registrato nel periodo selezionato.
        </div>
      );
    }

    const width = 360;
    const height = 180;
    const padding = 28;
    const values = chronEntries.map((e) => Number(e.overallAnxietyLevel) || 0);
    const stepX = values.length > 1 ? (width - padding * 2) / (values.length - 1) : 0;

    const points = values.map((v, i) => {
      const x = values.length === 1 ? width / 2 : padding + i * stepX;
      const y = height - padding - (Math.min(100, Math.max(0, v)) / 100) * (height - padding * 2);
      return { x, y, v, date: new Date(chronEntries[i].eventDatetime) };
    });

    const pathD = points.map((p, i) => (i === 0 ? `M ${p.x},${p.y}` : `L ${p.x},${p.y}`)).join(' ');
    const areaD = values.length === 1
      ? ''
      : `${pathD} L ${points[points.length - 1].x},${height - padding} L ${points[0].x},${height - padding} Z`;

    const gridValues = [0, 25, 50, 75, 100];

    return (
      <div className="w-full overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto min-w-[300px]">
          <defs>
            <linearGradient id="anxietyGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent-primary)" stopOpacity="0.35" />
              <stop offset="100%" stopColor="var(--accent-primary)" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {gridValues.map((gv) => {
            const y = height - padding - (gv / 100) * (height - padding * 2);
            return (
              <g key={gv}>
                <line
                  x1={padding}
                  y1={y}
                  x2={width - padding}
                  y2={y}
                  stroke="var(--border-solid)"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                />
                <text
                  x="4"
                  y={y + 3}
                  fontSize="9"
                  fill="var(--text-secondary)"
                  fontWeight="bold"
                >
                  {gv}
                </text>
              </g>
            );
          })}

          {/* Area under line */}
          {areaD && <path d={areaD} fill="url(#anxietyGradient)" />}

          {/* Main anxiety trend line */}
          {values.length > 1 && (
            <path
              d={pathD}
              fill="none"
              stroke="var(--accent-btn)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Data points */}
          {points.map((p, i) => (
            <g key={i}>
              <circle
                cx={p.x}
                cy={p.y}
                r="4.5"
                fill="var(--accent-btn)"
                stroke="var(--bg-surface)"
                strokeWidth="2"
              />
              <text
                x={p.x}
                y={p.y - 8}
                fontSize="9"
                textAnchor="middle"
                fill="var(--text-primary)"
                fontWeight="bold"
              >
                {p.v}
              </text>
            </g>
          ))}
        </svg>
      </div>
    );
  };

  /* Render Grouped Bar Chart for Control vs Reassurance */
  const renderBehaviorsChart = () => {
    if (totalEntries === 0) {
      return (
        <div className="py-8 text-center text-xs font-bold text-[var(--text-secondary)]">
          Nessun dato registrato nel periodo selezionato.
        </div>
      );
    }

    // Group by Day
    const byDayMap = new Map<string, { control: number; reassurance: number }>();
    chronEntries.forEach((e) => {
      const key = new Date(e.eventDatetime).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' });
      if (!byDayMap.has(key)) byDayMap.set(key, { control: 0, reassurance: 0 });
      const current = byDayMap.get(key)!;
      current.control += Number(e.symptomControlCount) || 0;
      current.reassurance += Number(e.reassuranceSeekingCount) || 0;
    });

    const days = Array.from(byDayMap.keys());
    const maxVal = Math.max(1, ...Array.from(byDayMap.values()).flatMap((b) => [b.control, b.reassurance]));

    const width = Math.max(340, days.length * 54);
    const height = 180;
    const padding = 28;
    const groupWidth = (width - padding * 2) / Math.max(1, days.length);

    return (
      <div className="space-y-2">
        <div className="w-full overflow-x-auto">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto min-w-[320px]">
            {days.map((day, i) => {
              const { control, reassurance } = byDayMap.get(day)!;
              const groupX = padding + i * groupWidth;
              const barW = Math.min(22, groupWidth * 0.35);

              const hControl = (control / maxVal) * (height - padding * 2);
              const hReassurance = (reassurance / maxVal) * (height - padding * 2);

              return (
                <g key={day}>
                  {/* Control Bar */}
                  {hControl > 0 && (
                    <rect
                      x={groupX + groupWidth * 0.12}
                      y={height - padding - hControl}
                      width={barW}
                      height={hControl}
                      rx="4"
                      fill="var(--accent-btn)"
                    />
                  )}
                  {/* Reassurance Bar */}
                  {hReassurance > 0 && (
                    <rect
                      x={groupX + groupWidth * 0.52}
                      y={height - padding - hReassurance}
                      width={barW}
                      height={hReassurance}
                      rx="4"
                      className="fill-amber-500"
                    />
                  )}
                  {/* Day Label */}
                  <text
                    x={groupX + groupWidth / 2}
                    y={height - 8}
                    fontSize="9"
                    textAnchor="middle"
                    fill="var(--text-primary)"
                    fontWeight="bold"
                  >
                    {day}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center space-x-6 text-xs font-black text-[var(--text-primary)] pt-1">
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded-sm bg-[var(--accent-btn)] inline-block" />
            <span>Check sintomi</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded-sm bg-amber-500 inline-block" />
            <span>Rassicurazioni</span>
          </div>
        </div>
      </div>
    );
  };

  /* Render Avoidances list with clean counters & progress bars (Fixed Layout) */
  const renderAvoidanceList = () => {
    const totals = new Map<string, number>();
    chronEntries.forEach((e) => {
      const type = (e.avoidanceType || '').trim();
      if (!type) return;
      const count = (typeof e.avoidanceCount === 'number' && e.avoidanceCount > 0) ? e.avoidanceCount : 1;
      totals.set(type, (totals.get(type) || 0) + count);
    });

    if (totals.size === 0) {
      return (
        <div className="py-6 text-center text-xs font-bold text-[var(--text-secondary)]">
          Nessun evitamento registrato nel periodo selezionato.
        </div>
      );
    }

    const sorted = Array.from(totals.entries()).sort((a, b) => b[1] - a[1]);
    const maxAvoidance = Math.max(1, ...sorted.map(([, c]) => c));
    const allAvoidanceSum = sorted.reduce((sum, [, c]) => sum + c, 0);

    return (
      <div className="space-y-3">
        {sorted.map(([type, count]) => {
          const percent = Math.round((count / allAvoidanceSum) * 100);
          return (
            <div
              key={type}
              className="p-3.5 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border-solid)] space-y-2.5 shadow-2xs"
            >
              {/* Header: Description & Badge */}
              <div className="flex items-start justify-between gap-3">
                <p className="text-xs font-bold text-[var(--text-primary)] leading-relaxed flex-1 break-words">
                  {type}
                </p>
                <div className="flex items-center space-x-1.5 shrink-0">
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-rose-500/15 text-rose-500 border border-rose-500/30">
                    {count} {count === 1 ? 'volta' : 'volte'}
                  </span>
                  <span className="text-[10px] font-bold text-[var(--text-secondary)]">
                    ({percent}%)
                  </span>
                </div>
              </div>

              {/* Progress Proportion Bar */}
              <div className="w-full h-1.5 bg-[var(--border-solid)]/40 rounded-full overflow-hidden">
                <div
                  className="h-full bg-rose-500 rounded-full transition-all duration-300"
                  style={{ width: `${Math.max(8, (count / maxAvoidance) * 100)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-5 pb-28 animate-fade-in">
      {/* Intro Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 pb-1">
        <div className="space-y-0.5">
          <h2 className="text-2xl font-black text-[var(--text-primary)]">Dashboard Seduta</h2>
          <p className="text-xs font-bold text-[var(--text-secondary)]">
            Sintesi dei progressi e dati per la terapia
          </p>
        </div>

        <button
          type="button"
          onClick={onExportReport}
          className="btn-primary inline-flex items-center space-x-1.5 px-4 py-2.5 min-h-[44px] rounded-full text-xs font-bold shadow-sm transition-all duration-150 active:scale-95 cursor-pointer shrink-0"
        >
          <FileSpreadsheet className="w-4 h-4 stroke-[2.5]" />
          <span className="font-bold">Esporta Report</span>
        </button>
      </div>

      {/* Filter Period Row */}
      <div className="glass-panel rounded-[20px] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-[var(--border-solid)] bg-[var(--bg-surface)] shadow-sm">
        <span className="text-xs font-black text-[var(--text-primary)]">Periodo di Analisi:</span>
        <div className="w-full sm:w-auto">
          <CustomDropdown
            value={dashPeriod}
            onChange={onPeriodChange}
            options={periodOptions}
          />
        </div>
      </div>

      {/* Key Metric Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="glass-panel rounded-[20px] p-4 text-center space-y-1.5 border border-[var(--border-solid)] bg-[var(--bg-surface)] shadow-sm">
          <Activity className="w-5 h-5 text-[var(--accent-primary)] mx-auto stroke-[2.5]" />
          <span className="block text-3xl font-black text-[var(--text-primary)] leading-tight">{totalEntries}</span>
          <span className="block text-xs font-black text-[var(--text-primary)]">Voci Registrate</span>
        </div>

        <div className="glass-panel rounded-[20px] p-4 text-center space-y-1.5 border border-[var(--border-solid)] bg-[var(--bg-surface)] shadow-sm">
          <TrendingUp className="w-5 h-5 text-rose-500 mx-auto stroke-[2.5]" />
          <span className="block text-3xl font-black text-[var(--text-primary)] leading-tight">{avgAnxiety}</span>
          <span className="block text-xs font-black text-[var(--text-primary)]">Ansia Media</span>
        </div>

        <div className="glass-panel rounded-[20px] p-4 text-center space-y-1.5 border border-[var(--border-solid)] bg-[var(--bg-surface)] shadow-sm">
          <ShieldAlert className="w-5 h-5 text-[var(--accent-primary)] mx-auto stroke-[2.5]" />
          <span className="block text-3xl font-black text-[var(--text-primary)] leading-tight">{totalControl}</span>
          <span className="block text-xs font-black text-[var(--text-primary)]">Check Controllo</span>
        </div>

        <div className="glass-panel rounded-[20px] p-4 text-center space-y-1.5 border border-[var(--border-solid)] bg-[var(--bg-surface)] shadow-sm">
          <HeartHandshake className="w-5 h-5 text-amber-500 mx-auto stroke-[2.5]" />
          <span className="block text-3xl font-black text-[var(--text-primary)] leading-tight">{totalReassurance}</span>
          <span className="block text-xs font-black text-[var(--text-primary)]">Rassicurazioni</span>
        </div>

        <div className="glass-panel rounded-[20px] p-4 text-center space-y-1.5 col-span-2 sm:col-span-1 border border-[var(--border-solid)] bg-[var(--bg-surface)] shadow-sm">
          <Ban className="w-5 h-5 text-rose-500 mx-auto stroke-[2.5]" />
          <span className="block text-3xl font-black text-[var(--text-primary)] leading-tight">{totalAvoidance}</span>
          <span className="block text-xs font-black text-[var(--text-primary)]">Evitamenti Totali</span>
        </div>
      </div>

      {/* Chart 1: Overall Anxiety Trend */}
      <div className="glass-panel rounded-[20px] p-5 space-y-3 border border-[var(--border-solid)] bg-[var(--bg-surface)] shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black uppercase tracking-wider text-[var(--text-primary)] flex items-center space-x-2">
            <BarChart3 className="w-4 h-4 text-[var(--accent-primary)] stroke-[2.5]" />
            <span>Andamento Ansia Complessiva</span>
          </h3>
          <span className="text-[10px] font-extrabold text-[var(--text-secondary)]">Scala 0-100</span>
        </div>
        {renderAnxietyChart()}
      </div>

      {/* Chart 2: Control Check vs Reassurance Requests */}
      <div className="glass-panel rounded-[20px] p-5 space-y-3 border border-[var(--border-solid)] bg-[var(--bg-surface)] shadow-sm">
        <h3 className="text-xs font-black uppercase tracking-wider text-[var(--text-primary)]">
          Frequenza Controllo e Rassicurazioni
        </h3>
        {renderBehaviorsChart()}
      </div>

      {/* Chart 3: Avoidance Frequency List */}
      <div className="glass-panel rounded-[20px] p-5 space-y-3 border border-[var(--border-solid)] bg-[var(--bg-surface)] shadow-sm">
        <h3 className="text-xs font-black uppercase tracking-wider text-[var(--text-primary)]">
          Evitamenti per Tipologia
        </h3>
        {renderAvoidanceList()}
      </div>
    </div>
  );
};
