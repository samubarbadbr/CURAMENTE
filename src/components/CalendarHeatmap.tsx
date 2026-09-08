import React, { useState, useMemo, useRef } from 'react';
import { CbtEntry, Tag } from '../types';
import { Calendar, Sparkles, Flame, Info } from 'lucide-react';

interface CalendarHeatmapProps {
  entries: CbtEntry[];
  allTags: Tag[];
}

interface DayData {
  date: Date;
  dateStr: string; // YYYY-MM-DD
  dayOfWeek: number; // 0 = Mon, 6 = Sun
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
  entries: CbtEntry[];
  emotionTags: string[];
  symptomTags: string[];
  isFuture: boolean;
}

const MONTH_NAMES = [
  'Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu',
  'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'
];

const DAY_LABELS = [
  { day: 0, label: 'Lun' },
  { day: 2, label: 'Mer' },
  { day: 4, label: 'Ven' },
];

export const CalendarHeatmap: React.FC<CalendarHeatmapProps> = ({ entries, allTags }) => {
  const [selectedDay, setSelectedDay] = useState<DayData | null>(null);
  const [hoveredDay, setHoveredDay] = useState<DayData | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Map tags id -> label
  const tagMap = useMemo(() => {
    const map = new Map<string, Tag>();
    allTags.forEach((t) => map.set(t.id, t));
    return map;
  }, [allTags]);

  // Aggregate entries by YYYY-MM-DD
  const entriesByDate = useMemo(() => {
    const map = new Map<string, CbtEntry[]>();
    entries.forEach((entry) => {
      try {
        const d = new Date(entry.eventDatetime);
        if (isNaN(d.getTime())) return;
        const key = d.toISOString().slice(0, 10);
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(entry);
      } catch {
        // Ignore invalid dates
      }
    });
    return map;
  }, [entries]);

  // Build grid for last 52 weeks (approx 12 months)
  const { weeks, monthLabels, totalDaysWithEntries, maxEntriesInOneDay, currentStreak } = useMemo(() => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    // Calculate start date: 52 weeks ago, aligned to Monday
    const start = new Date(today);
    start.setDate(today.getDate() - (52 * 7));
    // Normalize start to Monday (0=Mon, 6=Sun)
    const currentDayOfWeek = (start.getDay() + 6) % 7; // Monday = 0
    start.setDate(start.getDate() - currentDayOfWeek);
    start.setHours(0, 0, 0, 0);

    const weekList: DayData[][] = [];
    const months: { label: string; colIndex: number }[] = [];
    let lastMonth = -1;

    let totalActiveDays = 0;
    let maxCount = 0;

    const curr = new Date(start);
    let currentWeek: DayData[] = [];

    while (curr <= today) {
      const dateStr = curr.toISOString().slice(0, 10);
      const dayOfWeek = (curr.getDay() + 6) % 7; // 0=Mon, 6=Sun
      const dayEntries = entriesByDate.get(dateStr) || [];
      const count = dayEntries.length;

      if (count > 0) totalActiveDays++;
      if (count > maxCount) maxCount = count;

      // Extract unique tags
      const emotionTagsSet = new Set<string>();
      const symptomTagsSet = new Set<string>();

      dayEntries.forEach((e) => {
        (e.emotionTagIds || []).forEach((id) => {
          const t = tagMap.get(id);
          if (t) emotionTagsSet.add(t.label);
        });
        (e.physicalSymptomTagIds || []).forEach((id) => {
          const t = tagMap.get(id);
          if (t) symptomTagsSet.add(t.label);
        });
      });

      // 4 intensities: 0, 1, 2, 3, 4+
      let level: 0 | 1 | 2 | 3 | 4 = 0;
      if (count === 1) level = 1;
      else if (count === 2) level = 2;
      else if (count === 3) level = 3;
      else if (count >= 4) level = 4;

      const dayData: DayData = {
        date: new Date(curr),
        dateStr,
        dayOfWeek,
        count,
        level,
        entries: dayEntries,
        emotionTags: Array.from(emotionTagsSet),
        symptomTags: Array.from(symptomTagsSet),
        isFuture: false,
      };

      currentWeek.push(dayData);

      // Track month transitions for header
      const m = curr.getMonth();
      if (m !== lastMonth && dayOfWeek === 0) {
        months.push({ label: MONTH_NAMES[m], colIndex: weekList.length });
        lastMonth = m;
      }

      // If Sunday or today is the end of loop
      if (dayOfWeek === 6) {
        weekList.push(currentWeek);
        currentWeek = [];
      }

      curr.setDate(curr.getDate() + 1);
    }

    if (currentWeek.length > 0) {
      // Pad rest of the last week with future/dummy days
      while (currentWeek.length < 7) {
        const dummyDate = new Date(curr);
        const dayOfWeek = (dummyDate.getDay() + 6) % 7;
        currentWeek.push({
          date: dummyDate,
          dateStr: dummyDate.toISOString().slice(0, 10),
          dayOfWeek,
          count: 0,
          level: 0,
          entries: [],
          emotionTags: [],
          symptomTags: [],
          isFuture: true,
        });
        curr.setDate(curr.getDate() + 1);
      }
      weekList.push(currentWeek);
    }

    // Calculate current streak
    let streak = 0;
    const checkDate = new Date();
    checkDate.setHours(0, 0, 0, 0);

    // If today has no entries, check if yesterday had
    const todayStr = checkDate.toISOString().slice(0, 10);
    if (!entriesByDate.has(todayStr)) {
      checkDate.setDate(checkDate.getDate() - 1);
    }

    while (true) {
      const k = checkDate.toISOString().slice(0, 10);
      if (entriesByDate.has(k) && entriesByDate.get(k)!.length > 0) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    return {
      weeks: weekList,
      monthLabels: months,
      totalDaysWithEntries: totalActiveDays,
      maxEntriesInOneDay: maxCount,
      currentStreak: streak,
    };
  }, [entriesByDate, tagMap]);

  // Handle cell interaction
  const handleMouseEnter = (day: DayData, e: React.MouseEvent) => {
    if (day.isFuture) return;
    setHoveredDay(day);
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const cellRect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      setTooltipPos({
        x: cellRect.left - rect.left + cellRect.width / 2,
        y: cellRect.top - rect.top - 8,
      });
    }
  };

  const handleMouseLeave = () => {
    setHoveredDay(null);
    setTooltipPos(null);
  };

  const handleClick = (day: DayData) => {
    if (day.isFuture) return;
    if (selectedDay?.dateStr === day.dateStr) {
      setSelectedDay(null);
    } else {
      setSelectedDay(day);
    }
  };

  const activeInfoDay = selectedDay || hoveredDay;

  // Format date helper in Italian
  const formatDateFull = (d: Date) => {
    return d.toLocaleDateString('it-IT', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  // Get inline background color using theme variables
  const getCellBg = (level: number) => {
    switch (level) {
      case 1:
        return 'var(--heatmap-l1)';
      case 2:
        return 'var(--heatmap-l2)';
      case 3:
        return 'var(--heatmap-l3)';
      case 4:
        return 'var(--heatmap-l4)';
      default:
        return 'var(--heatmap-empty)';
    }
  };

  return (
    <div className="glass-panel rounded-[24px] p-5 space-y-4 border border-[var(--border-solid)] bg-[var(--bg-surface)] shadow-sm">
      {/* Header & Stats Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-[var(--border-subtle)]">
        <div className="space-y-0.5">
          <h3 className="text-xs font-black uppercase tracking-wider text-[var(--text-primary)] flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-indigo-500 stroke-[2.5]" />
            <span>Mappa del Calore dei Pensieri</span>
          </h3>
          <p className="text-[11px] font-bold text-[var(--text-secondary)]">
            Frequenza e costanza delle registrazioni negli ultimi 12 mesi
          </p>
        </div>

        {/* Quick Summary Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[var(--bg-subtle)] border border-[var(--border-solid)] text-[11px] font-bold text-[var(--text-primary)]">
            <Sparkles className="w-3 h-3 text-indigo-400" />
            <span>{totalDaysWithEntries} giorni attivi</span>
          </div>

          {currentStreak > 0 && (
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-[11px] font-bold text-amber-500">
              <Flame className="w-3 h-3 stroke-[2.5]" />
              <span>{currentStreak} {currentStreak === 1 ? 'giorno di fila' : 'giorni di fila'}</span>
            </div>
          )}
        </div>
      </div>

      {/* Interactive Grid Container with smooth horizontal pan */}
      <div ref={containerRef} className="relative w-full overflow-x-auto pb-2 select-none">
        <div className="inline-block min-w-full">
          {/* Month Labels Header */}
          <div className="flex text-[10px] font-bold text-[var(--text-muted)] mb-1.5 pl-7">
            {monthLabels.map((m, idx) => (
              <span
                key={`${m.label}-${idx}`}
                style={{
                  position: 'relative',
                  left: `${m.colIndex * 13}px`,
                  marginRight: '18px',
                  width: '0px',
                  whiteSpace: 'nowrap',
                }}
              >
                {m.label}
              </span>
            ))}
          </div>

          {/* Grid Layout: Day labels on left + 53 columns */}
          <div className="flex items-start">
            {/* Day of week labels on left (Mon, Wed, Fri) */}
            <div className="flex flex-col justify-between h-[96px] text-[9.5px] font-bold text-[var(--text-muted)] pr-2 select-none">
              {DAY_LABELS.map((d) => (
                <span key={d.label} style={{ height: '11px', lineHeight: '11px' }}>
                  {d.label}
                </span>
              ))}
            </div>

            {/* Weeks columns */}
            <div className="flex gap-[3px]">
              {weeks.map((week, colIdx) => (
                <div key={colIdx} className="flex flex-col gap-[3px]">
                  {week.map((day) => {
                    const isSelected = selectedDay?.dateStr === day.dateStr;
                    const isHovered = hoveredDay?.dateStr === day.dateStr;

                    if (day.isFuture) {
                      return (
                        <div
                          key={day.dateStr}
                          className="w-[11px] h-[11px] rounded-[2.5px] opacity-0 pointer-events-none"
                        />
                      );
                    }

                    return (
                      <button
                        key={day.dateStr}
                        type="button"
                        onClick={() => handleClick(day)}
                        onMouseEnter={(e) => handleMouseEnter(day, e)}
                        onMouseLeave={handleMouseLeave}
                        className={`w-[11px] h-[11px] rounded-[2.5px] transition-all duration-150 cursor-pointer focus:outline-none ${
                          isSelected
                            ? 'ring-2 ring-indigo-500 scale-125 z-10'
                            : isHovered
                            ? 'scale-125 z-10'
                            : ''
                        }`}
                        style={{
                          backgroundColor: getCellBg(day.level),
                          border: day.level === 0 ? '1px solid var(--border-subtle)' : 'none',
                        }}
                        aria-label={`${formatDateFull(day.date)}: ${day.count} note`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Floating Tooltip for mouse hover on desktop */}
        {hoveredDay && tooltipPos && (
          <div
            className="absolute pointer-events-none z-30 transition-all duration-100 transform -translate-x-1/2 -translate-y-full"
            style={{ left: `${tooltipPos.x}px`, top: `${tooltipPos.y}px` }}
          >
            <div className="px-2.5 py-1.5 rounded-xl bg-neutral-900/95 dark:bg-neutral-800/95 text-white text-[11px] font-bold shadow-xl border border-white/10 backdrop-blur-md whitespace-nowrap">
              <div className="capitalize">{formatDateFull(hoveredDay.date)}</div>
              <div className="text-[10px] font-normal text-zinc-300 mt-0.5">
                {hoveredDay.count === 0
                  ? 'Nessun pensiero registrato'
                  : hoveredDay.count === 1
                  ? '1 pensiero registrato'
                  : `${hoveredDay.count} pensieri registrati`}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Legend & 4-intensity scale */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2 border-t border-[var(--border-subtle)] text-[11px] font-bold text-[var(--text-secondary)]">
        <span className="flex items-center space-x-1 text-[10.5px]">
          <Info className="w-3.5 h-3.5 text-indigo-400" />
          <span>Tocca o passa sopra a un giorno per visualizzare i dettagli</span>
        </span>

        {/* 4-intensity scale legend */}
        <div className="flex items-center space-x-1.5 self-end sm:self-auto">
          <span className="text-[10px] font-bold text-[var(--text-muted)]">Meno</span>
          <div className="flex items-center space-x-1">
            <span
              className="w-3 h-3 rounded-[2.5px] border border-[var(--border-subtle)]"
              style={{ backgroundColor: 'var(--heatmap-empty)' }}
              title="0 note"
            />
            <span
              className="w-3 h-3 rounded-[2.5px]"
              style={{ backgroundColor: 'var(--heatmap-l1)' }}
              title="1 nota"
            />
            <span
              className="w-3 h-3 rounded-[2.5px]"
              style={{ backgroundColor: 'var(--heatmap-l2)' }}
              title="2 note"
            />
            <span
              className="w-3 h-3 rounded-[2.5px]"
              style={{ backgroundColor: 'var(--heatmap-l3)' }}
              title="3 note"
            />
            <span
              className="w-3 h-3 rounded-[2.5px]"
              style={{ backgroundColor: 'var(--heatmap-l4)' }}
              title="4+ note"
            />
          </div>
          <span className="text-[10px] font-bold text-[var(--text-muted)]">Più</span>
        </div>
      </div>

      {/* Detailed Card for Selected or Hovered Day */}
      {activeInfoDay && (
        <div className="p-3.5 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border-solid)] space-y-2 animate-fade-in">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-[var(--text-primary)] capitalize">
              {formatDateFull(activeInfoDay.date)}
            </span>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-400">
              {activeInfoDay.count === 0
                ? 'Nessuna voce'
                : activeInfoDay.count === 1
                ? '1 voce registrata'
                : `${activeInfoDay.count} voci registrate`}
            </span>
          </div>

          {activeInfoDay.count > 0 ? (
            <div className="space-y-1.5 pt-1 text-[11px]">
              {/* Emotion tags */}
              {activeInfoDay.emotionTags.length > 0 && (
                <div className="flex items-center flex-wrap gap-1">
                  <span className="font-bold text-[var(--text-secondary)]">Emozioni:</span>
                  {activeInfoDay.emotionTags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Physical symptoms */}
              {activeInfoDay.symptomTags.length > 0 && (
                <div className="flex items-center flex-wrap gap-1">
                  <span className="font-bold text-[var(--text-secondary)]">Sintomi fisici:</span>
                  {activeInfoDay.symptomTags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {activeInfoDay.emotionTags.length === 0 && activeInfoDay.symptomTags.length === 0 && (
                <p className="text-[11px] font-medium text-[var(--text-secondary)] italic">
                  Nessun tag specifico associato alle voci di questa giornata.
                </p>
              )}
            </div>
          ) : (
            <p className="text-[11px] font-medium text-[var(--text-muted)] italic">
              Nessuna voce di diario o monitoraggio compilato in questa giornata.
            </p>
          )}
        </div>
      )}
    </div>
  );
};
