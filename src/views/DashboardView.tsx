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
    const paddingLeft = 32;
    const paddingRight = 20;
    const paddingTop = 24;
    const paddingBottom = 28;

    const values = chronEntries.map((e) => Number(e.overallAnxietyLevel) || 0);
    const chartW = width - paddingLeft - paddingRight;
    const chartH = height - paddingTop - paddingBottom;
    const stepX = values.length > 1 ? chartW / (values.length - 1) : 0;

    const points = values.map((v, i) => {
      const x = values.length === 1 ? paddingLeft + chartW / 2 : paddingLeft + i * stepX;
      const y = paddingTop + chartH - (Math.min(100, Math.max(0, v)) / 100) * chartH;
      const dateObj = new Date(chronEntries[i].eventDatetime);
      const dateLabel = dateObj.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' });
      return { x, y, v, dateLabel };
    });

    const pathD = points.map((p, i) => (i === 0 ? `M ${p.x},${p.y}` : `L ${p.x},${p.y}`)).join(' ');
    const areaD = values.length === 1
      ? ''
      : `${pathD} L ${points[points.length - 1].x},${paddingTop + chartH} L ${points[0].x},${paddingTop + chartH} Z`;

    const gridValues = [0, 25, 50, 75, 100];

    return (
      <div className="space-y-2">
        <div className="w-full overflow-x-auto">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto min-w-[300px]">
            <defs>
              <linearGradient id="anxietyGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366F1" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#6366F1" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Grid lines & Y-axis scale */}
            {gridValues.map((gv) => {
              const y = paddingTop + chartH - (gv / 100) * chartH;
              return (
                <g key={gv}>
                  <line
                    x1={paddingLeft}
                    y1={y}
                    x2={width - paddingRight}
                    y2={y}
                    stroke="var(--border-solid)"
                    strokeWidth="1"
                    strokeDasharray="3 3"
                  />
                  <text
                    x={paddingLeft - 6}
                    y={y + 3}
                    fontSize="9"
                    textAnchor="end"
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
                stroke="#6366F1"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Data points with numeric values */}
            {points.map((p, i) => (
              <g key={i}>
                <circle
                  cx={p.x}
                  cy={p.y}
                  r="4.5"
                  fill="#6366F1"
                  stroke="var(--bg-surface)"
                  strokeWidth="2"
                />
                <rect
                  x={p.x - 11}
                  y={p.y - 19}
                  width="22"
                  height="13"
                  rx="4"
                  fill="var(--bg-surface)"
                  stroke="#6366F1"
                  strokeWidth="1"
                  className="shadow-xs"
                />
                <text
                  x={p.x}
                  y={p.y - 10}
                  fontSize="8.5"
                  textAnchor="middle"
                  fill="var(--text-primary)"
                  fontWeight="bold"
                >
                  {p.v}
                </text>
                {/* X axis date label */}
                <text
                  x={p.x}
                  y={height - 8}
                  fontSize="9"
                  textAnchor="middle"
                  fill="var(--text-secondary)"
                  fontWeight="bold"
                >
                  {p.dateLabel}
                </text>
              </g>
            ))}
          </svg>
        </div>
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
    const byDayMap = new Map<string, { control: number; reassurance: number; fullDate: string }>();
    chronEntries.forEach((e) => {
      const d = new Date(e.eventDatetime);
      const key = d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' });
      const fullDate = d.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' });
      if (!byDayMap.has(key)) byDayMap.set(key, { control: 0, reassurance: 0, fullDate });
      const current = byDayMap.get(key)!;
      current.control += Number(e.symptomControlCount) || 0;
      current.reassurance += Number(e.reassuranceSeekingCount) || 0;
    });

    const dayKeys = Array.from(byDayMap.keys());
    const dayEntriesList = Array.from(byDayMap.entries());

    // Calculate max value with minimum scale ceiling of 5 to avoid giant distorted 100% bars
    const rawMax = Math.max(0, ...Array.from(byDayMap.values()).flatMap((b) => [b.control, b.reassurance]));
    const maxVal = Math.max(5, Math.ceil(rawMax * 1.25));

    // Dynamic grid ticks (e.g. 0, 2, 4, 6 or 0, 5, 10)
    const tickStep = maxVal <= 6 ? 1 : maxVal <= 12 ? 2 : Math.ceil(maxVal / 4);
    const gridTicks: number[] = [];
    for (let t = 0; t <= maxVal; t += tickStep) {
      gridTicks.push(t);
    }
    if (gridTicks[gridTicks.length - 1] < maxVal) {
      gridTicks.push(maxVal);
    }

    const width = Math.max(340, dayKeys.length * 70);
    const height = 190;
    const paddingLeft = 32;
    const paddingRight = 20;
    const paddingTop = 28;
    const paddingBottom = 30;

    const chartW = width - paddingLeft - paddingRight;
    const chartH = height - paddingTop - paddingBottom;
    const groupWidth = chartW / Math.max(1, dayKeys.length);

    return (
      <div className="space-y-4">
        {/* Header KPI Summary Pills */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border-solid)]">
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 rounded-full bg-[#4F46E5] inline-block shadow-xs" />
            <span className="text-xs font-bold text-[var(--text-primary)]">
              Controlli Totali: <strong className="text-[#4F46E5] font-black">{totalControl}</strong>
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 rounded-full bg-[#F59E0B] inline-block shadow-xs" />
            <span className="text-xs font-bold text-[var(--text-primary)]">
              Rassicurazioni Totali: <strong className="text-[#F59E0B] font-black">{totalReassurance}</strong>
            </span>
          </div>
        </div>

        {/* SVG Bar Chart with Gridlines & Exact Values */}
        <div className="w-full overflow-x-auto">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto min-w-[320px]">
            {/* Horizontal Gridlines & Y-Axis Scale Values */}
            {gridTicks.map((tick) => {
              const y = paddingTop + chartH - (tick / maxVal) * chartH;
              return (
                <g key={tick}>
                  <line
                    x1={paddingLeft}
                    y1={y}
                    x2={width - paddingRight}
                    y2={y}
                    stroke="var(--border-solid)"
                    strokeWidth="1"
                    strokeDasharray="3 3"
                  />
                  <text
                    x={paddingLeft - 6}
                    y={y + 3.5}
                    fontSize="9"
                    textAnchor="end"
                    fill="var(--text-secondary)"
                    fontWeight="bold"
                  >
                    {tick}
                  </text>
                </g>
              );
            })}

            {/* Day Groups */}
            {dayKeys.map((day, i) => {
              const { control, reassurance } = byDayMap.get(day)!;
              const groupCenterX = paddingLeft + i * groupWidth + groupWidth / 2;
              const barW = Math.min(22, Math.max(12, groupWidth * 0.28));
              const barSpacing = 4;

              const xControl = groupCenterX - barW - barSpacing / 2;
              const xReassurance = groupCenterX + barSpacing / 2;

              const hControl = (control / maxVal) * chartH;
              const hReassurance = (reassurance / maxVal) * chartH;

              const yControl = paddingTop + chartH - hControl;
              const yReassurance = paddingTop + chartH - hReassurance;

              return (
                <g key={day}>
                  {/* Subtle Base Placeholder for Control */}
                  <rect
                    x={xControl}
                    y={paddingTop}
                    width={barW}
                    height={chartH}
                    rx="4"
                    fill="var(--border-solid)"
                    opacity="0.15"
                  />
                  {/* Control Bar (Indigo) */}
                  {control > 0 ? (
                    <g>
                      <rect
                        x={xControl}
                        y={yControl}
                        width={barW}
                        height={Math.max(4, hControl)}
                        rx="4"
                        fill="#4F46E5"
                      />
                      <text
                        x={xControl + barW / 2}
                        y={yControl - 5}
                        fontSize="9.5"
                        textAnchor="middle"
                        fill="#4F46E5"
                        fontWeight="900"
                      >
                        {control}
                      </text>
                    </g>
                  ) : (
                    <text
                      x={xControl + barW / 2}
                      y={paddingTop + chartH - 4}
                      fontSize="8"
                      textAnchor="middle"
                      fill="var(--text-secondary)"
                      opacity="0.6"
                      fontWeight="bold"
                    >
                      0
                    </text>
                  )}

                  {/* Subtle Base Placeholder for Reassurance */}
                  <rect
                    x={xReassurance}
                    y={paddingTop}
                    width={barW}
                    height={chartH}
                    rx="4"
                    fill="var(--border-solid)"
                    opacity="0.15"
                  />
                  {/* Reassurance Bar (Amber) */}
                  {reassurance > 0 ? (
                    <g>
                      <rect
                        x={xReassurance}
                        y={yReassurance}
                        width={barW}
                        height={Math.max(4, hReassurance)}
                        rx="4"
                        fill="#F59E0B"
                      />
                      <text
                        x={xReassurance + barW / 2}
                        y={yReassurance - 5}
                        fontSize="9.5"
                        textAnchor="middle"
                        fill="#F59E0B"
                        fontWeight="900"
                      >
                        {reassurance}
                      </text>
                    </g>
                  ) : (
                    <text
                      x={xReassurance + barW / 2}
                      y={paddingTop + chartH - 4}
                      fontSize="8"
                      textAnchor="middle"
                      fill="var(--text-secondary)"
                      opacity="0.6"
                      fontWeight="bold"
                    >
                      0
                    </text>
                  )}

                  {/* Day Date Label */}
                  <text
                    x={groupCenterX}
                    y={height - 10}
                    fontSize="9.5"
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
        <div className="flex items-center justify-center space-x-6 text-xs font-black text-[var(--text-primary)] pt-0.5">
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded-md bg-[#4F46E5] inline-block shadow-xs" />
            <span>Check sintomi (corpo/sensazioni)</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded-md bg-[#F59E0B] inline-block shadow-xs" />
            <span>Richieste rassicurazioni</span>
          </div>
        </div>

        {/* Daily Breakdown Cards */}
        <div className="pt-2 border-t border-[var(--border-subtle)] space-y-2">
          <span className="block text-[11px] font-black uppercase tracking-wider text-[var(--text-secondary)]">
            Dettaglio Giornaliero
          </span>
          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {dayEntriesList.map(([key, data]) => (
              <div
                key={key}
                className="p-2.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-solid)] flex items-center justify-between text-xs"
              >
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-[var(--text-primary)] capitalize">{data.fullDate}</span>
                </div>
                <div className="flex items-center space-x-2 font-bold">
                  <span className="px-2 py-0.5 rounded-md bg-[#4F46E5]/15 text-[#4F46E5] border border-[#4F46E5]/30">
                    {data.control} {data.control === 1 ? 'controllo' : 'controlli'}
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/30">
                    {data.reassurance} {data.reassurance === 1 ? 'rassicurazione' : 'rassicurazioni'}
                  </span>
                </div>
              </div>
            ))}
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
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-[var(--text-primary)] flex items-center space-x-2">
              <BarChart3 className="w-4 h-4 text-[#6366F1] stroke-[2.5]" />
              <span>Andamento Picco d'Ansia</span>
            </h3>
            <p className="text-[11px] font-bold text-[var(--text-secondary)] mt-0.5">
              Intensità dell'ansia (scala 0-100) per ciascun episodio registrato
            </p>
          </div>
        </div>
        {renderAnxietyChart()}
      </div>

      {/* Chart 2: Control Check vs Reassurance Requests */}
      <div className="glass-panel rounded-[20px] p-5 space-y-3 border border-[var(--border-solid)] bg-[var(--bg-surface)] shadow-sm">
        <div>
          <h3 className="text-xs font-black uppercase tracking-wider text-[var(--text-primary)] flex items-center space-x-2">
            <ShieldAlert className="w-4 h-4 text-[#4F46E5] stroke-[2.5]" />
            <span>Controlli Sintomi & Richieste Rassicurazioni</span>
          </h3>
          <p className="text-[11px] font-bold text-[var(--text-secondary)] mt-0.5">
            Conteggio giornaliero di verifiche fisiche/sintomi (blu) e richieste di rassicurazione esterne (arancione)
          </p>
        </div>
        {renderBehaviorsChart()}
      </div>

      {/* Chart 3: Avoidance Frequency List */}
      <div className="glass-panel rounded-[20px] p-5 space-y-3 border border-[var(--border-solid)] bg-[var(--bg-surface)] shadow-sm">
        <div>
          <h3 className="text-xs font-black uppercase tracking-wider text-[var(--text-primary)] flex items-center space-x-2">
            <Ban className="w-4 h-4 text-rose-500 stroke-[2.5]" />
            <span>Evitamenti per Tipologia</span>
          </h3>
          <p className="text-[11px] font-bold text-[var(--text-secondary)] mt-0.5">
            Situazioni, luoghi o attività evitate e relativo impatto percentuale
          </p>
        </div>
        {renderAvoidanceList()}
      </div>
    </div>
  );
};
