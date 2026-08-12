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
  const avgAnxiety = totalEntries > 0
    ? Math.round(chronEntries.reduce((s, e) => s + (e.overallAnxietyLevel || 0), 0) / totalEntries)
    : 0;
  const totalControl = chronEntries.reduce((s, e) => s + (e.symptomControlCount || 0), 0);
  const totalReassurance = chronEntries.reduce((s, e) => s + (e.reassuranceSeekingCount || 0), 0);
  const totalAvoidance = chronEntries.reduce((s, e) => s + (e.avoidanceCount || 0), 0);

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
        <div className="py-8 text-center text-xs font-bold text-[#4A5550] dark:text-[#D5E0D8]">
          Nessun dato registrato nel periodo selezionato.
        </div>
      );
    }

    const width = 360;
    const height = 180;
    const padding = 28;
    const values = chronEntries.map((e) => e.overallAnxietyLevel || 0);
    const stepX = values.length > 1 ? (width - padding * 2) / (values.length - 1) : 0;

    const points = values.map((v, i) => {
      const x = padding + i * stepX;
      const y = height - padding - (v / 100) * (height - padding * 2);
      return { x, y, v, date: new Date(chronEntries[i].eventDatetime) };
    });

    const pathD = points.map((p, i) => (i === 0 ? `M ${p.x},${p.y}` : `L ${p.x},${p.y}`)).join(' ');
    const areaD = `${pathD} L ${points[points.length - 1].x},${height - padding} L ${points[0].x},${height - padding} Z`;

    const gridValues = [0, 25, 50, 75, 100];

    return (
      <div className="w-full overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto min-w-[300px]">
          <defs>
            <linearGradient id="anxietyGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#485696" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#485696" stopOpacity="0.0" />
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
                  stroke="currentColor"
                  className="text-[#D8E0D9] dark:text-[#2B3A31]"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                />
                <text
                  x="4"
                  y={y + 3}
                  fontSize="9"
                  className="fill-[#111815] dark:fill-[#EEF3EF] font-black"
                >
                  {gv}
                </text>
              </g>
            );
          })}

          {/* Area under line */}
          <path d={areaD} fill="url(#anxietyGradient)" />

          {/* Main anxiety trend line */}
          <path
            d={pathD}
            fill="none"
            stroke="#5B67CA"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data points */}
          {points.map((p, i) => (
            <g key={i}>
              <circle
                cx={p.x}
                cy={p.y}
                r="4.5"
                className="fill-[#5B67CA] stroke-white dark:stroke-[#1B2520]"
                strokeWidth="2"
              />
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
        <div className="py-8 text-center text-xs font-bold text-[#4A5550] dark:text-[#D5E0D8]">
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
      current.control += e.symptomControlCount || 0;
      current.reassurance += e.reassuranceSeekingCount || 0;
    });

    const days = Array.from(byDayMap.keys());
    const maxVal = Math.max(1, ...Array.from(byDayMap.values()).flatMap((b) => [b.control, b.reassurance]));

    const width = Math.max(340, days.length * 54);
    const height = 180;
    const padding = 28;
    const groupWidth = (width - padding * 2) / days.length;

    return (
      <div className="space-y-2">
        <div className="w-full overflow-x-auto">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto min-w-[320px]">
            {days.map((day, i) => {
              const { control, reassurance } = byDayMap.get(day)!;
              const groupX = padding + i * groupWidth;
              const barW = groupWidth * 0.32;

              const hControl = (control / maxVal) * (height - padding * 2);
              const hReassurance = (reassurance / maxVal) * (height - padding * 2);

              return (
                <g key={day}>
                  {/* Control Bar */}
                  <rect
                    x={groupX + groupWidth * 0.12}
                    y={height - padding - hControl}
                    width={barW}
                    height={hControl}
                    rx="3"
                    className="fill-[#5B67CA]"
                  />
                  {/* Reassurance Bar */}
                  <rect
                    x={groupX + groupWidth * 0.52}
                    y={height - padding - hReassurance}
                    width={barW}
                    height={hReassurance}
                    rx="3"
                    className="fill-amber-500"
                  />
                  {/* Day Label */}
                  <text
                    x={groupX + groupWidth / 2}
                    y={height - 8}
                    fontSize="9"
                    textAnchor="middle"
                    className="fill-[#111815] dark:fill-[#EEF3EF] font-black"
                  >
                    {day}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center space-x-6 text-xs font-black text-[#111815] dark:text-[#EEF3EF] pt-1">
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded-sm bg-[#5B67CA] inline-block" />
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

  /* Render Avoidances list with frequency dots */
  const renderAvoidanceList = () => {
    const totals = new Map<string, number>();
    chronEntries.forEach((e) => {
      if (!e.avoidanceType || !e.avoidanceCount) return;
      const key = e.avoidanceType.trim();
      totals.set(key, (totals.get(key) || 0) + e.avoidanceCount);
    });

    if (totals.size === 0) {
      return (
        <div className="py-6 text-center text-xs font-bold text-[#4A5550] dark:text-[#D5E0D8]">
          Nessun evitamento registrato nel periodo.
        </div>
      );
    }

    const sorted = Array.from(totals.entries()).sort((a, b) => b[1] - a[1]);

    return (
      <div className="space-y-2">
        {sorted.map(([type, count]) => (
          <div
            key={type}
            className="flex items-center justify-between py-2 border-b border-[#D8E0D9] dark:border-[#2B3A31] last:border-none text-xs"
          >
            <span className="font-black text-[#14241B] dark:text-[#EEF3EF]">{type}</span>
            <div className="flex items-center space-x-1">
              {Array.from({ length: Math.min(10, count) }).map((_, idx) => (
                <span
                  key={idx}
                  className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block shadow-sm"
                />
              ))}
              {count > 10 && (
                <span className="text-xs font-black text-rose-600 dark:text-rose-400 ml-1">
                  +{count - 10}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-5 pb-28 animate-fade-in">
      {/* Intro Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 pb-1">
        <div className="space-y-0.5">
          <h2 className="text-2xl font-black text-[#15251C] dark:text-[#EEF3EF]">Dashboard Seduta</h2>
          <p className="text-xs font-bold text-[#2C3E35] dark:text-[#D5E0D8]">
            Sintesi dei progressi e dati per la terapia
          </p>
        </div>

        <button
          type="button"
          onClick={onExportReport}
          className="btn-primary inline-flex items-center space-x-1.5 px-4 py-2.5 min-h-[44px] rounded-full bg-[#5B67CA] text-white border border-[#5B67CA] text-xs font-bold shadow-sm hover:bg-[#4A55B8] transition-all duration-150 active:scale-95 cursor-pointer shrink-0"
        >
          <FileSpreadsheet className="w-4 h-4 stroke-[2.5] text-white" />
          <span className="text-white font-bold">Esporta Report</span>
        </button>
      </div>

      {/* Filter Period Row */}
      <div className="glass-panel rounded-[20px] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-[#C8D5CB] dark:border-[#2B3A31] bg-white dark:bg-[#1B2520] shadow-sm">
        <span className="text-xs font-black text-[#15251C] dark:text-[#EEF3EF]">Periodo di Analisi:</span>
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
        <div className="glass-panel rounded-[20px] p-4 text-center space-y-1.5 border border-[#C8D5CB] dark:border-[#2B3A31] bg-white dark:bg-[#1B2520] shadow-sm">
          <Activity className="w-5 h-5 text-[#5B67CA] dark:text-[#9CA6DC] mx-auto stroke-[2.5]" />
          <span className="block text-3xl font-black text-[#15251C] dark:text-[#EEF3EF] leading-tight">{totalEntries}</span>
          <span className="block text-xs font-black text-[#15251C] dark:text-[#EEF3EF]">Voci Registrate</span>
        </div>

        <div className="glass-panel rounded-[20px] p-4 text-center space-y-1.5 border border-[#C8D5CB] dark:border-[#2B3A31] bg-white dark:bg-[#1B2520] shadow-sm">
          <TrendingUp className="w-5 h-5 text-rose-600 dark:text-rose-400 mx-auto stroke-[2.5]" />
          <span className="block text-3xl font-black text-[#15251C] dark:text-[#EEF3EF] leading-tight">{avgAnxiety}</span>
          <span className="block text-xs font-black text-[#15251C] dark:text-[#EEF3EF]">Ansia Media</span>
        </div>

        <div className="glass-panel rounded-[20px] p-4 text-center space-y-1.5 border border-[#C8D5CB] dark:border-[#2B3A31] bg-white dark:bg-[#1B2520] shadow-sm">
          <ShieldAlert className="w-5 h-5 text-[#5B67CA] dark:text-[#9CA6DC] mx-auto stroke-[2.5]" />
          <span className="block text-3xl font-black text-[#15251C] dark:text-[#EEF3EF] leading-tight">{totalControl}</span>
          <span className="block text-xs font-black text-[#15251C] dark:text-[#EEF3EF]">Check Controllo</span>
        </div>

        <div className="glass-panel rounded-[20px] p-4 text-center space-y-1.5 border border-[#C8D5CB] dark:border-[#2B3A31] bg-white dark:bg-[#1B2520] shadow-sm">
          <HeartHandshake className="w-5 h-5 text-amber-600 dark:text-amber-400 mx-auto stroke-[2.5]" />
          <span className="block text-3xl font-black text-[#15251C] dark:text-[#EEF3EF] leading-tight">{totalReassurance}</span>
          <span className="block text-xs font-black text-[#15251C] dark:text-[#EEF3EF]">Rassicurazioni</span>
        </div>

        <div className="glass-panel rounded-[20px] p-4 text-center space-y-1.5 col-span-2 sm:col-span-1 border border-[#C8D5CB] dark:border-[#2B3A31] bg-white dark:bg-[#1B2520] shadow-sm">
          <Ban className="w-5 h-5 text-rose-600 dark:text-rose-400 mx-auto stroke-[2.5]" />
          <span className="block text-3xl font-black text-[#15251C] dark:text-[#EEF3EF] leading-tight">{totalAvoidance}</span>
          <span className="block text-xs font-black text-[#15251C] dark:text-[#EEF3EF]">Evitamenti Totali</span>
        </div>
      </div>

      {/* Chart 1: Overall Anxiety Trend */}
      <div className="glass-panel rounded-[20px] p-5 space-y-3 border border-[#C8D5CB] dark:border-[#2B3A31] bg-white dark:bg-[#1B2520] shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black uppercase tracking-wider text-[#15251C] dark:text-[#EEF3EF] flex items-center space-x-2">
            <BarChart3 className="w-4 h-4 text-[#5B67CA] dark:text-[#9CA6DC] stroke-[2.5]" />
            <span>Andamento Ansia Complessiva</span>
          </h3>
          <span className="text-[10px] font-extrabold text-[#2C3E35] dark:text-[#D5E0D8]">Scala 0-100</span>
        </div>
        {renderAnxietyChart()}
      </div>

      {/* Chart 2: Control Check vs Reassurance Requests */}
      <div className="glass-panel rounded-[20px] p-5 space-y-3 border border-[#C8D5CB] dark:border-[#2B3A31] bg-white dark:bg-[#1B2520] shadow-sm">
        <h3 className="text-xs font-black uppercase tracking-wider text-[#15251C] dark:text-[#EEF3EF]">
          Frequenza Controllo & Rassicurazioni
        </h3>
        {renderBehaviorsChart()}
      </div>

      {/* Chart 3: Avoidance Frequency List */}
      <div className="glass-panel rounded-[20px] p-5 space-y-3 border border-[#C8D5CB] dark:border-[#2B3A31] bg-white dark:bg-[#1B2520] shadow-sm">
        <h3 className="text-xs font-black uppercase tracking-wider text-[#15251C] dark:text-[#EEF3EF]">
          Evitamenti per Tipologia
        </h3>
        {renderAvoidanceList()}
      </div>
    </div>
  );
};
