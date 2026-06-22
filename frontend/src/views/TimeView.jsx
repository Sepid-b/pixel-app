import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, X } from 'tabler-icons-react';

const API_BASE = import.meta.env.VITE_API_URL || '';

function getMonday(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  return monday.toISOString().split('T')[0];
}

// Convert JavaScript getDay() (0=Sunday) to grid row index (0=Monday)
function getDayIndex(date) {
  const day = date.getDay();
  return day === 0 ? 6 : day - 1; // Sun=6, Mon=0, Tue=1, ..., Sat=5
}

const HeatmapGrid = ({ period, data, T, selectedDay, onDayClick, weekStart, hasNavigated }) => {
  const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  // Map data by date string
  const hoursMap = {};
  data.forEach(d => { hoursMap[d.date] = d.hours; });

  // Helper to check if date is in selected week
  const isInSelectedWeek = (dateStr) => {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    return dateStr >= weekStart && dateStr <= weekEnd.toISOString().split('T')[0];
  };

  // Daily view — special handling with stacked rectangles
  if (period === 'daily') {
    // Use weekStart from props to show the selected week
    const monday = new Date(weekStart);

    const past7 = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      const dayNum = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const hours = Math.min(hoursMap[dateStr] || 0, 8);
      const isWeekend = i >= 5;
      const isToday = dateStr === new Date().toISOString().split('T')[0];
      return { dateStr, dayName, dayNum, hours, isWeekend, isToday };
    });

    return (
      <div style={{ width: '100%' }}>
        <div style={{ display: 'flex', paddingLeft: 34, marginBottom: 8, gap: 6 }}>
          {past7.map((day, i) => (
            <div key={i} style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: 9, color: day.isToday ? '#7c6bf0' : T.textTertiary, fontWeight: day.isToday ? 600 : 400 }}>
                {day.dayName}
              </div>
              <div style={{ fontSize: 9, color: T.textTertiary }}>{day.dayNum}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 6, width: '100%', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3, width: 28, flexShrink: 0 }}>
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} style={{
                height: 14, fontSize: 9, color: T.textTertiary,
                display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 4
              }}>
                {8 - i}h
              </div>
            ))}
          </div>

          {past7.map((day, i) => (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
              <div style={{
                display: 'flex', flexDirection: 'column', gap: 3,
                width: '100%', opacity: day.isWeekend ? 0.45 : 1
              }}>
                {Array.from({ length: 8 }, (_, hourIdx) => {
                  const hourNum = 7 - hourIdx + 1;
                  const filled = hourNum <= day.hours;
                  const isSelected = selectedDay === day.dateStr;
                  return (
                    <div
                      key={hourIdx}
                      onClick={() => onDayClick(day.dateStr)}
                      title={`${day.dayNum}: ${filled ? `${hourNum}h logged` : `${hourNum}h — not logged`}`}
                      style={{
                        width: '100%', height: 14, borderRadius: 3,
                        background: filled ? '#7c6bf0' : T.bg3 || T.surfaceHover,
                        opacity: filled ? (0.4 + (hourNum / 8) * 0.6) : 1,
                        transition: 'all 0.15s',
                        cursor: 'pointer',
                        boxShadow: isSelected ? `0 0 0 2px ${T.bg2 || T.background}, 0 0 0 3px #7c6bf0` : 'none'
                      }}
                    />
                  );
                })}
              </div>
              {day.isToday && (
                <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#7c6bf0', marginTop: 1 }} />
              )}
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 12, height: 12, borderRadius: 2, background: T.bg3 || T.surfaceHover }} />
            <span style={{ fontSize: 9, color: T.textTertiary }}>0h (not logged)</span>
            <div style={{ width: 12, height: 12, borderRadius: 2, background: '#7c6bf0', marginLeft: 8 }} />
            <span style={{ fontSize: 9, color: T.textTertiary }}>hours logged</span>
            <span style={{ fontSize: 9, color: T.textTertiary, marginLeft: 8 }}>max 8h/day</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {(() => {
              const total = past7.reduce((s, d) => s + d.hours, 0);
              const best = past7.reduce((a, b) => b.hours > a.hours ? b : a, past7[0]);
              return (
                <>
                  <div style={{ fontSize: 10, color: T.textSecondary, background: T.surfaceHover, padding: '3px 10px', borderRadius: 10 }}>
                    This week: <strong style={{ color: T.text }}>{total.toFixed(1)}h</strong>
                  </div>
                  {best.hours > 0 && (
                    <div style={{ fontSize: 10, color: T.textSecondary, background: T.surfaceHover, padding: '3px 10px', borderRadius: 10 }}>
                      Best: <strong style={{ color: T.text }}>{best.dayName} · {best.hours}h</strong>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      </div>
    );
  }

  // Monthly and Annually views
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split('T')[0];

  // Helper to get Monday of a given date's week
  const getMondayOf = (date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const day = d.getDay(); // 0=Sun, 1=Mon...6=Sat
    const diff = day === 0 ? -6 : 1 - day; // how many days back to Monday
    d.setDate(d.getDate() + diff);
    return d;
  };

  let cols, monthLabels, cellHeight, cellWidth;

  if (period === 'monthly') {
    cellHeight = 22;
    cellWidth = 20;
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const firstMonday = getMondayOf(firstDay);
    const numWeeks = 5;

    cols = Array.from({ length: numWeeks }, (_, w) => ({
      cells: Array.from({ length: 7 }, (_, dayIndex) => {
        const cellDate = new Date(firstMonday);
        cellDate.setDate(firstMonday.getDate() + w * 7 + dayIndex);
        const isCurrentMonth = cellDate.getMonth() === today.getMonth();
        const dateStr = cellDate.toISOString().split('T')[0];
        const hours = isCurrentMonth ? (hoursMap[dateStr] || 0) : 0;
        const isWeekend = dayIndex >= 5;
        const isToday = dateStr === todayStr;
        return { dateStr, hours, isWeekend, isToday, isCurrentMonth };
      })
    }));

    monthLabels = [
      { label: 'Week 1', col: 0 },
      { label: 'Week 2', col: 1 },
      { label: 'Week 3', col: 2 },
      { label: 'Week 4', col: 3 },
      { label: 'Week 5', col: 4 }
    ];
  } else {
    // Annually view
    cellHeight = 14;
    cellWidth = 10;
    const jan1 = new Date(today.getFullYear(), 0, 1);
    const gridStart = getMondayOf(jan1);
    const numWeeks = 53;

    cols = Array.from({ length: numWeeks }, (_, w) => ({
      cells: Array.from({ length: 7 }, (_, dayIndex) => {
        const cellDate = new Date(gridStart);
        cellDate.setDate(gridStart.getDate() + w * 7 + dayIndex);
        const isCurrentYear = cellDate.getFullYear() === today.getFullYear();
        const dateStr = cellDate.toISOString().split('T')[0];
        const hours = isCurrentYear ? (hoursMap[dateStr] || 0) : 0;
        const isWeekend = dayIndex >= 5;
        const isToday = dateStr === todayStr;
        return { dateStr, hours, isWeekend, isToday, isCurrentYear };
      })
    }));

    // Generate month labels based on which column each month starts in
    monthLabels = [];
    let currentMonth = -1;
    cols.forEach((week, w) => {
      const firstDayOfWeek = week.cells[0]; // Monday of this week
      if (firstDayOfWeek.isCurrentYear) {
        const month = new Date(firstDayOfWeek.dateStr).getMonth();
        if (month !== currentMonth) {
          monthLabels.push({
            label: new Date(firstDayOfWeek.dateStr).toLocaleDateString('en-US', { month: 'short' }),
            col: w
          });
          currentMonth = month;
        }
      }
    });
  }

  const maxHours = Math.max(...Object.values(hoursMap), 8);

  const getColor = (hours, isWeekend) => {
    if (isWeekend && hours === 0) return T.bg3 || T.surfaceHover;
    if (hours === 0) return T.bg3 || T.surfaceHover;
    const intensity = hours / maxHours;
    if (intensity < 0.2) return 'rgba(124,107,240,0.18)';
    if (intensity < 0.4) return 'rgba(124,107,240,0.38)';
    if (intensity < 0.65) return 'rgba(124,107,240,0.62)';
    return '#7c6bf0';
  };

  const totalHours = Object.values(hoursMap).reduce((a, b) => a + b, 0);
  const bestEntry = Object.entries(hoursMap).sort((a, b) => b[1] - a[1])[0];

  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', paddingLeft: 30, marginBottom: 5, position: 'relative', height: 16 }}>
        {monthLabels.map((ml, i) => (
          <div key={i} style={{
            position: 'absolute',
            left: 30 + ml.col * (cellWidth + 2),
            fontSize: 9,
            color: T.textTertiary
          }}>
            {ml.label}
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', overflowY: 'visible' }}>
        <div style={{ display: 'flex', flexDirection: 'column', width: 24, flexShrink: 0, gap: 2, paddingTop: 1 }}>
          {dayLabels.map((d, i) => (
            <div key={d} style={{
              height: cellHeight, fontSize: 9, color: T.textTertiary,
              display: 'flex', alignItems: 'center', opacity: i >= 5 ? 0.5 : 1
            }}>{d}</div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 2, flex: 1 }}>
          {cols.map((col, wi) => (
            <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0, width: cellWidth }}>
              {col.cells.map((cell, di) => {
                const isSelected = selectedDay === cell.dateStr;
                const inSelectedWeek = isInSelectedWeek(cell.dateStr);
                const showWeekOutline = hasNavigated && inSelectedWeek;
                const isInPeriod = period === 'monthly' ? cell.isCurrentMonth : cell.isCurrentYear;

                return (
                  <div
                    key={di}
                    onClick={() => isInPeriod && cell.hours > 0 ? onDayClick(cell.dateStr) : null}
                    title={isInPeriod ? `${cell.dateStr}: ${cell.hours}h` : ''}
                    style={{
                      height: cellHeight,
                      borderRadius: 3,
                      background: !isInPeriod ? 'transparent' : getColor(cell.hours, cell.isWeekend),
                      opacity: !isInPeriod ? 0 : cell.isWeekend ? 0.35 : 1,
                      boxShadow: cell.isToday && isInPeriod ? '0 0 0 1.5px rgba(255,255,255,0.8)' : isSelected ? `0 0 0 2px ${T.bg2 || T.background}, 0 0 0 3px #7c6bf0` : 'none',
                      outline: showWeekOutline && isInPeriod ? '1.5px solid rgba(124,107,240,0.6)' : 'none',
                      outlineOffset: '1px',
                      cursor: isInPeriod && cell.hours > 0 ? 'pointer' : 'default',
                      transition: 'transform 0.1s',
                      flexShrink: 0
                    }}
                    onMouseEnter={e => isInPeriod && !isSelected && cell.hours > 0 && (e.currentTarget.style.transform = 'scale(1.15)')}
                    onMouseLeave={e => isInPeriod && !isSelected && (e.currentTarget.style.transform = 'scale(1)')}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 9, color: T.textTertiary }}>Less</span>
          {[T.bg3 || T.surfaceHover, 'rgba(124,107,240,0.18)', 'rgba(124,107,240,0.38)', 'rgba(124,107,240,0.62)', '#7c6bf0'].map((c, i) => (
            <div key={i} style={{ width: 12, height: 12, borderRadius: 2, background: c }} />
          ))}
          <span style={{ fontSize: 9, color: T.textTertiary }}>More</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {totalHours > 0 && (
            <div style={{ fontSize: 10, color: T.textSecondary, background: T.surfaceHover, padding: '3px 10px', borderRadius: 10 }}>
              Total: <strong style={{ color: T.text }}>{totalHours.toFixed(1)}h</strong>
            </div>
          )}
          {bestEntry && (
            <div style={{ fontSize: 10, color: T.textSecondary, background: T.surfaceHover, padding: '3px 10px', borderRadius: 10 }}>
              Best day: <strong style={{ color: T.text }}>{bestEntry[0]} · {bestEntry[1]}h</strong>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default function TimeView({ T, currentMember, members, projects, currentWorkspace }) {
  const logFormRef = useRef(null);
  const [weekStart, setWeekStart] = useState(getMonday(new Date()));
  const [timeData, setTimeData] = useState([]);
  const [projectBreakdown, setProjectBreakdown] = useState([]);
  const [stats, setStats] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);
  const [logType, setLogType] = useState('task');
  const [form, setForm] = useState({
    task_id: '',
    project_id: '',
    date: new Date().toISOString().split('T')[0],
    hours: '',
    notes: ''
  });
  const [tasks, setTasks] = useState([]);
  const [saving, setSaving] = useState(false);
  const [heatmapData, setHeatmapData] = useState([]);
  const [heatmapPeriod, setHeatmapPeriod] = useState('daily');
  const [selectedDayEntries, setSelectedDayEntries] = useState([]);
  const [hasNavigated, setHasNavigated] = useState(false);

  useEffect(() => {
    if (currentMember && currentWorkspace) {
      setSelectedMember(currentMember);
      loadTimeData();
      loadStats();
      loadTasks();
    }
  }, [weekStart, currentMember, currentWorkspace]);

  useEffect(() => {
    if (!selectedMember) return;
    loadHeatmap(selectedMember.id);
  }, [selectedMember]);

  // Update form date when weekStart changes
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    const weekEndStr = weekEnd.toISOString().split('T')[0];

    // If current week → use today, else use the Friday of that week
    const isCurrentWeek = today >= weekStart && today <= weekEndStr;
    if (isCurrentWeek) {
      setForm(prev => ({ ...prev, date: today }));
    } else {
      // Use Friday of the selected week
      const friday = new Date(weekStart);
      friday.setDate(friday.getDate() + 4);
      setForm(prev => ({ ...prev, date: friday.toISOString().split('T')[0] }));
    }
  }, [weekStart]);

  const loadTimeData = async () => {
    if (!currentWorkspace) return;
    try {
      const response = await fetch(`${API_BASE}/api/time?member_id=${currentMember.id}&week_start=${weekStart}&workspace_id=${currentWorkspace.id}`);
      const data = await response.json();
      console.log('Loaded time data:', data);
      setTimeData(data.time_data || []);
      setProjectBreakdown(data.project_breakdown || []);
    } catch (error) {
      console.error('Failed to load time data:', error);
    }
  };

  const loadStats = async () => {
    if (!currentWorkspace) return;
    try {
      const response = await fetch(`${API_BASE}/api/time/stats?member_id=${currentMember.id}&week_start=${weekStart}&workspace_id=${currentWorkspace.id}`);
      const data = await response.json();
      console.log('Loaded stats:', data);
      setStats(data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const loadHeatmap = async (memberId) => {
    if (!currentWorkspace) return;
    try {
      const response = await fetch(`${API_BASE}/api/time/heatmap?member_id=${memberId}&workspace_id=${currentWorkspace.id}`);
      const data = await response.json();
      console.log('Loaded heatmap:', data);
      setHeatmapData(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load heatmap:', error);
    }
  };

  const loadTasks = async () => {
    if (!currentWorkspace) return;
    try {
      const response = await fetch(`${API_BASE}/api/tasks?workspace_id=${currentWorkspace.id}`);
      const data = await response.json();
      const myTasks = data.filter(t => {
        const assignees = t.assignees || [];
        return assignees.some(a => a.id === currentMember.id);
      });
      setTasks(myTasks);
    } catch (error) {
      console.error('Failed to load tasks:', error);
    }
  };

  const handleLogTime = async () => {
    if (!form.hours) return;

    const payload = {
      member_id: currentMember.id,
      date: form.date,
      hours: parseFloat(form.hours),
      notes: form.notes || null,
      workspace_id: currentWorkspace?.id || null
    };

    if (logType === 'task') {
      if (!form.task_id) return;
      const task = tasks.find(t => t.id === form.task_id);
      payload.task_id = form.task_id;
      payload.project_id = task?.project_id || null;
    } else {
      if (!form.project_id) return;
      payload.project_id = form.project_id;
      payload.task_id = null;
    }

    setSaving(true);
    try {
      console.log('Saving time entry:', payload);
      const response = await fetch(`${API_BASE}/api/time`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to save: ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();
      console.log('Save result:', result);

      // Navigate to the week containing the logged date
      const loggedWeekStart = getMonday(new Date(form.date));
      if (loggedWeekStart !== weekStart) {
        setWeekStart(loggedWeekStart);
      }

      setForm({
        ...form,
        hours: '',
        notes: ''
      });

      // Reload all data
      await loadTimeData();
      await loadStats();

      // Reload heatmap for the current user (who just logged time)
      await loadHeatmap(currentMember.id);

      console.log('All data reloaded successfully');
    } catch (error) {
      console.error('Failed to log time:', error);
      alert('Failed to save hours: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEntry = async (entryId) => {
    try {
      await fetch(`${API_BASE}/api/time/${entryId}`, { method: 'DELETE' });
      await loadTimeData();
      await loadStats();
    } catch (error) {
      console.error('Failed to delete entry:', error);
    }
  };

  const navigateWeek = (direction) => {
    const current = new Date(weekStart);
    current.setDate(current.getDate() + (direction * 7));
    const newWeekStart = getMonday(current);

    // Don't go past current week
    const currentMonday = getMonday(new Date());
    if (direction > 0 && newWeekStart > currentMonday) {
      return;
    }

    setWeekStart(newWeekStart);

    // Update hasNavigated based on whether we're at current week
    setHasNavigated(newWeekStart !== currentMonday);
  };

  const formatWeekRange = () => {
    const start = new Date(weekStart);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  };

  const handleDayClick = async (dateStr) => {
    if (selectedDay === dateStr) {
      setSelectedDay(null);
      setSelectedDayEntries([]);
      return;
    }

    setSelectedDay(dateStr);

    // Fetch entries for this specific day
    try {
      const weekStart = getMonday(new Date(dateStr));
      const response = await fetch(`${API_BASE}/api/time?member_id=${selectedMember.id}&week_start=${weekStart}&workspace_id=${currentWorkspace.id}`);
      const data = await response.json();
      const entries = data.time_data
        ?.flatMap(m => m.entries || [])
        .filter(e => e.date === dateStr && e.member_id === selectedMember?.id) || [];
      setSelectedDayEntries(entries);
    } catch (error) {
      console.error('Failed to load day entries:', error);
      setSelectedDayEntries([]);
    }
  };

  const getDayTotal = (dateStr) => {
    return selectedDayEntries.reduce((sum, e) => sum + Number(e.hours), 0);
  };

  const getDayProjects = (dateStr) => {
    const grouped = {};
    selectedDayEntries.forEach(e => {
      const key = e.project_id || 'none';
      if (!grouped[key]) {
        grouped[key] = {
          project_id: e.project_id,
          name: e.project_name,
          color: e.project_color,
          hours: 0
        };
      }
      grouped[key].hours += Number(e.hours);
    });
    return Object.values(grouped);
  };

  const getDayEntries = (dateStr) => {
    return selectedDayEntries;
  };

  const currentWeek = getMonday(new Date());
  const isCurrentWeek = weekStart === currentWeek;

  const selectedMemberData = timeData.find(d => d.member?.id === selectedMember?.id);

  // Group entries by date
  const entriesByDate = {};
  selectedMemberData?.entries.forEach(entry => {
    if (!entriesByDate[entry.date]) {
      entriesByDate[entry.date] = [];
    }
    entriesByDate[entry.date].push(entry);
  });

  const sortedDates = Object.keys(entriesByDate).sort((a, b) => new Date(b) - new Date(a));

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 20px 24px' }}>
      {/* Page Header */}
      <div style={{
        padding: '16px 0',
        borderBottom: `0.5px solid ${T.border}`,
        background: T.card,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginLeft: -20,
        marginRight: -20,
        paddingLeft: 20,
        paddingRight: 20
      }}>
        <div>
          <div style={{ fontSize: '15px', fontWeight: '500', color: T.text }}>Time tracking</div>
          <div style={{ fontSize: '11px', color: T.textTertiary, marginTop: '2px' }}>
            Week of {formatWeekRange()}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => navigateWeek(-1)}
            style={{
              padding: '6px',
              background: 'transparent',
              border: `0.5px solid ${T.border}`,
              borderRadius: '4px',
              cursor: 'pointer',
              color: T.text,
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <ChevronLeft size={16} />
          </button>

          <span style={{ fontSize: '12px', color: T.text, minWidth: '100px', textAlign: 'center' }}>
            {formatWeekRange()}
          </span>

          <button
            onClick={() => navigateWeek(1)}
            disabled={isCurrentWeek}
            style={{
              padding: '6px',
              background: 'transparent',
              border: `0.5px solid ${T.border}`,
              borderRadius: '4px',
              cursor: isCurrentWeek ? 'not-allowed' : 'pointer',
              color: T.text,
              opacity: isCurrentWeek ? 0.5 : 1,
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <ChevronRight size={16} />
          </button>
        </div>

        <button
          onClick={() => {
            if (logFormRef.current) {
              logFormRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
              logFormRef.current.style.border = `0.5px solid #7c6bf0`;
              setTimeout(() => {
                if (logFormRef.current) {
                  logFormRef.current.style.border = `0.5px solid ${T.border}`;
                }
              }, 1500);
            }
          }}
          style={{
            padding: '6px 14px',
            background: T.primary,
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '12px',
            cursor: 'pointer',
            fontWeight: '500'
          }}
        >
          + Log hours
        </button>
      </div>

      {/* Activity Heatmap */}
      <div style={{ padding: '16px 0 0' }}>
        <div style={{
          background: T.card,
          border: `0.5px solid ${T.border}`,
          borderRadius: '10px',
          padding: '18px',
          marginBottom: '14px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ fontSize: '13px', fontWeight: '500', color: T.text }}>
                Activity overview — {selectedMember?.name}
              </div>
              <div style={{ display: 'flex', gap: '3px' }}>
                {members.map(m => (
                  <div
                    key={m.id}
                    onClick={() => setSelectedMember(m)}
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: m.avatar_color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '9px',
                      fontWeight: '600',
                      color: '#fff',
                      cursor: 'pointer',
                      boxShadow: selectedMember?.id === m.id
                        ? `0 0 0 1.5px ${T.card}, 0 0 0 3px #7c6bf0`
                        : 'none'
                    }}
                  >
                    {m.name[0]}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1px', background: T.surfaceHover, borderRadius: '6px', padding: '2px' }}>
              {['Daily', 'Monthly', 'Annually'].map(p => (
                <div
                  key={p}
                  onClick={() => setHeatmapPeriod(p.toLowerCase())}
                  style={{
                    padding: '4px 14px',
                    fontSize: '11px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    color: heatmapPeriod === p.toLowerCase() ? '#7c6bf0' : T.textSecondary,
                    fontWeight: heatmapPeriod === p.toLowerCase() ? '500' : '400',
                    background: heatmapPeriod === p.toLowerCase() ? T.card : 'none',
                    border: heatmapPeriod === p.toLowerCase() ? `0.5px solid ${T.border}` : 'none'
                  }}
                >
                  {p}
                </div>
              ))}
            </div>
          </div>

          <HeatmapGrid
            period={heatmapPeriod}
            data={heatmapData}
            T={T}
            selectedDay={selectedDay}
            onDayClick={handleDayClick}
            weekStart={weekStart}
            hasNavigated={hasNavigated}
          />
        </div>
      </div>

      {/* Day Detail with Entries (conditional) */}
      {selectedDay && (
        <div style={{ padding: 0 }}>
          <div style={{
            background: T.bg2 || T.background,
            border: `0.5px solid #7c6bf0`,
            borderRadius: 10,
            padding: 16,
            marginBottom: 14
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 500, color: T.text }}>
                  {new Date(selectedDay).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </div>
                <div style={{ fontSize: 11, color: T.textTertiary, marginTop: 2 }}>Time entries</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: '#7c6bf0' }}>
                  {getDayTotal(selectedDay)}h logged
                </div>
                <div
                  onClick={() => setSelectedDay(null)}
                  style={{
                    fontSize: 13,
                    color: T.textTertiary,
                    cursor: 'pointer',
                    padding: '2px 6px',
                    borderRadius: 4
                  }}
                >
                  ✕
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {getDayEntries(selectedDay).length === 0 ? (
                <div style={{ fontSize: 11, color: T.textTertiary, textAlign: 'center', padding: '12px 0' }}>
                  No hours logged on this day
                </div>
              ) : (
                getDayEntries(selectedDay).map(entry => (
                  <div
                    key={entry.id}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4,
                      padding: '10px 12px',
                      background: T.surfaceHover,
                      borderRadius: 6,
                      border: `0.5px solid ${T.border}`
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {entry.project_color && (
                        <div style={{
                          width: 8,
                          height: 8,
                          borderRadius: 2,
                          background: entry.project_color,
                          flexShrink: 0
                        }} />
                      )}
                      <span style={{ flex: 1, fontSize: 12, color: T.text, fontWeight: 500 }}>
                        {entry.task_title || entry.project_name || 'General'}
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#7c6bf0' }}>
                        {entry.hours}h
                      </span>
                    </div>
                    {entry.notes && (
                      <div style={{
                        fontSize: 11,
                        color: T.textSecondary,
                        fontStyle: 'italic',
                        paddingLeft: 16,
                        lineHeight: 1.4
                      }}>
                        "{entry.notes}"
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Two Column Layout */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 280px',
        gap: 12,
        padding: 0
      }}>
        {/* LEFT — My hours */}
        <div
          ref={logFormRef}
          style={{
            background: T.bg2 || T.card,
            border: `0.5px solid ${T.border}`,
            borderRadius: 10,
            padding: 16,
            transition: 'border 0.3s ease'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: T.text }}>My hours</div>
            <div style={{ fontSize: 14, fontWeight: 500, color: '#7c6bf0' }}>
              {selectedMemberData?.total_hours || 0}h
            </div>
          </div>

          {/* Log form */}
          <div style={{ marginBottom: 16, paddingBottom: 16, borderBottom: `0.5px solid ${T.border}` }}>
            <div style={{ display: 'flex', gap: 1, background: T.bg3 || T.surfaceHover, borderRadius: 6, padding: 2, alignSelf: 'flex-start', marginBottom: 14 }}>
              <button
                onClick={() => setLogType('task')}
                style={{
                  padding: '6px 16px',
                  background: logType === 'task' ? T.card : 'transparent',
                  border: logType === 'task' ? `0.5px solid ${T.border}` : 'none',
                  borderRadius: 4,
                  color: logType === 'task' ? '#7c6bf0' : T.textSecondary,
                  fontSize: 11,
                  fontWeight: logType === 'task' ? 500 : 400,
                  cursor: 'pointer'
                }}
              >
                Per task
              </button>
              <button
                onClick={() => setLogType('daily')}
                style={{
                  padding: '6px 16px',
                  background: logType === 'daily' ? T.card : 'transparent',
                  border: logType === 'daily' ? `0.5px solid ${T.border}` : 'none',
                  borderRadius: 4,
                  color: logType === 'daily' ? '#7c6bf0' : T.textSecondary,
                  fontSize: 11,
                  fontWeight: logType === 'daily' ? 500 : 400,
                  cursor: 'pointer'
                }}
              >
                Daily total
              </button>
            </div>

            {logType === 'task' ? (
              <>
                <div style={{ fontSize: 10, color: T.textTertiary, marginBottom: 4 }}>Task</div>
                <select
                  value={form.task_id}
                  onChange={(e) => setForm({ ...form, task_id: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    background: T.background,
                    border: `0.5px solid ${T.border}`,
                    borderRadius: 4,
                    color: T.text,
                    fontSize: 11,
                    marginBottom: 8,
                    outline: 'none'
                  }}
                >
                  <option value="">Select task...</option>
                  {tasks.map(task => (
                    <option key={task.id} value={task.id}>
                      {task.title}
                    </option>
                  ))}
                </select>
              </>
            ) : (
              <>
                <div style={{ fontSize: 10, color: T.textTertiary, marginBottom: 4 }}>Project</div>
                <select
                  value={form.project_id}
                  onChange={(e) => setForm({ ...form, project_id: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    background: T.background,
                    border: `0.5px solid ${T.border}`,
                    borderRadius: 4,
                    color: T.text,
                    fontSize: 11,
                    marginBottom: 8,
                    outline: 'none'
                  }}
                >
                  <option value="">Select project...</option>
                  {projects.map(project => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
              <input
                type="number"
                placeholder="Hours"
                value={form.hours}
                onChange={(e) => setForm({ ...form, hours: e.target.value })}
                style={{
                  padding: '8px 10px',
                  background: T.background,
                  border: `0.5px solid ${T.border}`,
                  borderRadius: 4,
                  color: T.text,
                  fontSize: 11,
                  outline: 'none'
                }}
              />
              <input
                type="date"
                value={form.date}
                min={weekStart}
                max={(() => {
                  const end = new Date(weekStart);
                  end.setDate(end.getDate() + 6);
                  return end.toISOString().split('T')[0];
                })()}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                onClick={(e) => {
                  try {
                    e.target.showPicker?.();
                  } catch (err) {
                    // Fallback for browsers that don't support showPicker
                  }
                }}
                style={{
                  padding: '8px 10px',
                  background: T.background,
                  border: `0.5px solid ${T.border}`,
                  borderRadius: 4,
                  color: T.text,
                  fontSize: 11,
                  outline: 'none',
                  cursor: 'pointer',
                  colorScheme: 'dark'
                }}
              />
            </div>

            <textarea
              placeholder="Note (optional)"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              style={{
                width: '100%',
                padding: '8px 10px',
                background: T.background,
                border: `0.5px solid ${T.border}`,
                borderRadius: 4,
                color: T.text,
                fontSize: 11,
                outline: 'none',
                resize: 'none',
                minHeight: 60,
                fontFamily: 'inherit',
                marginBottom: 8
              }}
            />

            <button
              onClick={handleLogTime}
              disabled={saving}
              style={{
                width: '100%',
                padding: 10,
                background: T.primary,
                color: 'white',
                border: 'none',
                borderRadius: 4,
                fontSize: 12,
                cursor: saving ? 'not-allowed' : 'pointer',
                fontWeight: 500
              }}
            >
              {saving ? 'Saving...' : 'Save hours'}
            </button>
          </div>

          {/* Entries */}
          {sortedDates.length === 0 ? (
            <div style={{ fontSize: 11, color: T.textTertiary, fontStyle: 'italic', padding: 20, textAlign: 'center' }}>
              No hours logged this week
            </div>
          ) : (
            sortedDates.map(date => {
              const entries = entriesByDate[date];
              const dayTotal = entries.reduce((sum, e) => sum + (e.hours || 0), 0);

              return (
                <div key={date} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 10, color: T.textTertiary }}>
                      {new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </span>
                    <span style={{ fontSize: 10, color: '#7c6bf0' }}>{dayTotal}h</span>
                  </div>

                  {entries.map(entry => (
                    <div
                      key={entry.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 7,
                        padding: '6px 8px',
                        background: T.surfaceHover,
                        borderRadius: 5,
                        marginBottom: 3,
                        position: 'relative'
                      }}
                      onMouseEnter={(e) => {
                        const deleteBtn = e.currentTarget.querySelector('.delete-btn');
                        if (deleteBtn) deleteBtn.style.opacity = '1';
                      }}
                      onMouseLeave={(e) => {
                        const deleteBtn = e.currentTarget.querySelector('.delete-btn');
                        if (deleteBtn) deleteBtn.style.opacity = '0';
                      }}
                    >
                      {entry.project_color && (
                        <div style={{
                          width: 6,
                          height: 6,
                          borderRadius: 2,
                          background: entry.project_color,
                          flexShrink: 0
                        }} />
                      )}
                      <span style={{ flex: 1, fontSize: 11, color: T.textSecondary }}>
                        {entry.task_title || entry.project_name || 'General'}
                      </span>
                      {entry.notes && (
                        <span style={{ fontSize: 10, color: T.textTertiary, fontStyle: 'italic', marginLeft: 'auto' }}>
                          {entry.notes}
                        </span>
                      )}
                      <span style={{ fontSize: 12, fontWeight: 500, color: T.text, marginLeft: 'auto' }}>
                        {entry.hours}h
                      </span>
                      <button
                        className="delete-btn"
                        onClick={() => handleDeleteEntry(entry.id)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          color: T.textTertiary,
                          padding: 2,
                          display: 'flex',
                          alignItems: 'center',
                          opacity: 0,
                          transition: 'opacity 0.2s'
                        }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              );
            })
          )}
        </div>

        {/* RIGHT — Team overview */}
        <div style={{
          background: T.bg2 || T.card,
          border: `0.5px solid ${T.border}`,
          borderRadius: 10,
          padding: 16
        }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: T.text, marginBottom: 12 }}>
            Team this week
          </div>

          {members.map(m => {
            const memberHours = stats.find(s => s.member?.id === m.id);
            const thisWeek = memberHours?.this_week_hours || 0;
            const lastWeek = memberHours?.last_week_hours || 0;
            const diff = thisWeek - lastWeek;
            return (
              <div
                key={m.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 0',
                  borderBottom: `0.5px solid ${T.border}`
                }}
              >
                <div style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: m.avatar_color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#fff',
                  flexShrink: 0
                }}>
                  {m.name[0]}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: T.text }}>{m.name}</div>
                  <div style={{
                    height: 4,
                    background: T.bg3 || T.surfaceHover,
                    borderRadius: 10,
                    marginTop: 5,
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      height: '100%',
                      borderRadius: 10,
                      background: m.avatar_color,
                      width: `${Math.min((thisWeek / 40) * 100, 100)}%`,
                      transition: 'width 0.5s'
                    }} />
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: T.text }}>{thisWeek}h</div>
                  <div style={{ fontSize: 10, color: diff > 0 ? '#2ecc71' : diff < 0 ? '#e74c3c' : T.textTertiary }}>
                    {diff > 0 ? `↑ ${diff}h vs last week` : diff < 0 ? `↓ ${Math.abs(diff)}h vs last week` : 'Same as last week'}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Hours by project */}
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 9, textTransform: 'uppercase', color: T.textTertiary, marginBottom: 10 }}>
              Hours by project this week
            </div>

            {projectBreakdown.length === 0 ? (
              <div style={{ fontSize: 11, color: T.textTertiary, fontStyle: 'italic', textAlign: 'center', padding: 12 }}>
                No hours logged yet
              </div>
            ) : (
              projectBreakdown.map(pb => {
                const totalHours = projectBreakdown.reduce((sum, p) => sum + p.total_hours, 0);
                const widthPercent = totalHours > 0 ? (pb.total_hours / totalHours) * 100 : 0;

                return (
                  <div key={pb.project_id} style={{ marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 10, color: T.textTertiary }}>{pb.project_name}</span>
                      <span style={{ fontSize: 10, color: T.textTertiary }}>{pb.total_hours}h</span>
                    </div>
                    <div style={{
                      height: 4,
                      background: T.surfaceHover,
                      borderRadius: 2,
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        width: `${widthPercent}%`,
                        height: '100%',
                        background: pb.project_color
                      }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
