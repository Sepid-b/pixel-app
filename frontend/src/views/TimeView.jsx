import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, X } from 'tabler-icons-react';

const API_BASE = import.meta.env.VITE_API_URL || '';

function getMonday(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  return monday.toISOString().split('T')[0];
}

export default function TimeView({ T, currentMember, members, projects }) {
  const [weekStart, setWeekStart] = useState(getMonday(new Date()));
  const [timeData, setTimeData] = useState([]);
  const [projectBreakdown, setProjectBreakdown] = useState([]);
  const [stats, setStats] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [logType, setLogType] = useState('task');
  const [form, setForm] = useState({
    task_id: '',
    project_id: '',
    date: new Date().toISOString().split('T')[0],
    hours: '',
    note: ''
  });
  const [tasks, setTasks] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (currentMember) {
      setSelectedMember(currentMember);
      loadTimeData();
      loadStats();
      loadTasks();
    }
  }, [weekStart, currentMember]);

  const loadTimeData = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/time?member_id=${currentMember.id}&week_start=${weekStart}`);
      const data = await response.json();
      setTimeData(data.time_data || []);
      setProjectBreakdown(data.project_breakdown || []);
    } catch (error) {
      console.error('Failed to load time data:', error);
    }
  };

  const loadStats = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/time/stats?member_id=${currentMember.id}&week_start=${weekStart}`);
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const loadTasks = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/tasks`);
      const data = await response.json();
      const myTasks = data.filter(t => t.assignee_id === currentMember.id);
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
      note: form.note || null
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
      await fetch(`${API_BASE}/api/time`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      setForm({
        ...form,
        hours: '',
        note: ''
      });
      await loadTimeData();
      await loadStats();
    } catch (error) {
      console.error('Failed to log time:', error);
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
    setWeekStart(getMonday(current));
  };

  const formatWeekRange = () => {
    const start = new Date(weekStart);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  };

  const getDayData = (dayIndex) => {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + dayIndex);
    const dateStr = date.toISOString().split('T')[0];

    const memberData = timeData.find(d => d.member.id === selectedMember?.id);
    const entries = memberData?.entries.filter(e => e.date === dateStr) || [];
    const hours = entries.reduce((sum, e) => sum + (e.hours || 0), 0);

    return { date: dateStr, hours, entries };
  };

  const getMaxHours = () => {
    const memberData = timeData.find(d => d.member.id === selectedMember?.id);
    if (!memberData) return 8;

    const dailyHours = [];
    for (let i = 0; i < 7; i++) {
      const dayData = getDayData(i);
      dailyHours.push(dayData.hours);
    }

    return Math.max(...dailyHours, 8);
  };

  const currentWeek = getMonday(new Date());
  const isCurrentWeek = weekStart === currentWeek;

  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const maxHours = getMaxHours();

  const selectedMemberData = timeData.find(d => d.member.id === selectedMember?.id);
  const selectedMemberStats = stats.find(s => s.member.id === selectedMember?.id);

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
    <div style={{ padding: 0 }}>
      {/* Page Header */}
      <div style={{
        padding: '16px 20px',
        borderBottom: `0.5px solid ${T.border}`,
        background: T.card,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
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

      {/* Team Stats Row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '8px',
        padding: '16px 20px 12px'
      }}>
        {stats.map(stat => {
          const isSelected = selectedMember?.id === stat.member.id;
          return (
            <div
              key={stat.member.id}
              onClick={() => setSelectedMember(stat.member)}
              style={{
                background: T.card,
                border: `0.5px solid ${isSelected ? '#7c6bf0' : T.border}`,
                borderRadius: '8px',
                padding: '12px 14px',
                cursor: 'pointer',
                backgroundColor: isSelected ? 'rgba(124,107,240,0.04)' : T.card
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <div style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: stat.member.avatar_color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '10px',
                  fontWeight: '600'
                }}>
                  {stat.member.name[0]}
                </div>
                <span style={{ fontSize: '11px', color: T.text }}>{stat.member.name}</span>
              </div>

              <div style={{ fontSize: '22px', fontWeight: '500', color: T.text, marginBottom: '2px' }}>
                {stat.this_week_hours}h
              </div>
              <div style={{ fontSize: '9px', color: T.textTertiary, marginBottom: '6px', textTransform: 'uppercase' }}>
                this week
              </div>

              <div style={{
                height: '3px',
                background: T.surfaceHover,
                borderRadius: '2px',
                overflow: 'hidden',
                marginBottom: '6px'
              }}>
                <div style={{
                  width: `${Math.min((stat.this_week_hours / 40) * 100, 100)}%`,
                  height: '100%',
                  background: stat.member.avatar_color
                }} />
              </div>

              {stat.diff !== 0 && (
                <div style={{
                  fontSize: '10px',
                  color: stat.diff > 0 ? '#2ecc71' : '#e74c3c'
                }}>
                  {stat.diff > 0 ? '↑' : '↓'} {Math.abs(stat.diff)}h vs last week
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Main Layout */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 280px',
        gap: '12px',
        padding: '0 20px 20px'
      }}>
        {/* Left Column */}
        <div>
          {/* Weekly Chart */}
          <div style={{
            background: T.card,
            border: `0.5px solid ${T.border}`,
            borderRadius: '10px',
            padding: '16px',
            marginBottom: '12px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ fontSize: '13px', fontWeight: '500', color: T.text }}>
                Weekly hours — {selectedMember?.name}
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                {members.map(member => (
                  <div
                    key={member.id}
                    onClick={() => setSelectedMember(member)}
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: member.avatar_color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: '10px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      border: selectedMember?.id === member.id ? '2px solid #7c6bf0' : '2px solid transparent'
                    }}
                  >
                    {member.name[0]}
                  </div>
                ))}
              </div>
            </div>

            {/* Bar Chart */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', height: '110px' }}>
              {days.map((day, idx) => {
                const dayData = getDayData(idx);
                const heightPercent = maxHours > 0 ? (dayData.hours / maxHours) * 100 : 0;
                const isWeekend = idx >= 5;

                return (
                  <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
                    {dayData.hours > 0 && (
                      <div style={{
                        fontSize: '9px',
                        color: T.textTertiary,
                        marginBottom: '4px'
                      }}>
                        {dayData.hours}h
                      </div>
                    )}
                    <div style={{
                      width: '100%',
                      height: `${heightPercent}%`,
                      minHeight: dayData.hours > 0 ? '2px' : '0',
                      background: selectedMember?.avatar_color || T.primary,
                      borderRadius: '4px 4px 0 0',
                      opacity: isWeekend ? 0.5 : 1
                    }} />
                    <div style={{ fontSize: '9px', color: T.textTertiary, marginTop: '4px' }}>
                      {day}
                    </div>
                    <div style={{ fontSize: '9px', color: T.textTertiary }}>
                      {new Date(dayData.date).getDate()}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            {projectBreakdown.length > 0 && (
              <div style={{ marginTop: '16px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                {projectBreakdown.map(pb => (
                  <div key={pb.project_id} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <div style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: pb.project_color
                    }} />
                    <span style={{ fontSize: '10px', color: T.textTertiary }}>
                      {pb.project_name}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* This Week's Log */}
          <div style={{
            background: T.card,
            border: `0.5px solid ${T.border}`,
            borderRadius: '10px',
            padding: '16px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ fontSize: '13px', fontWeight: '500', color: T.text }}>
                This week's log
              </div>
              <div style={{ fontSize: '14px', fontWeight: '500', color: '#7c6bf0' }}>
                {selectedMemberData?.total_hours || 0}h
              </div>
            </div>

            {sortedDates.length === 0 ? (
              <div style={{ fontSize: '11px', color: T.textTertiary, fontStyle: 'italic', padding: '20px', textAlign: 'center' }}>
                No hours logged this week
              </div>
            ) : (
              sortedDates.map(date => {
                const entries = entriesByDate[date];
                const dayTotal = entries.reduce((sum, e) => sum + (e.hours || 0), 0);

                return (
                  <div key={date} style={{ marginBottom: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontSize: '10px', color: T.textTertiary }}>
                        {new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      </span>
                      <span style={{ fontSize: '10px', color: '#7c6bf0' }}>{dayTotal}h</span>
                    </div>

                    {entries.map(entry => (
                      <div
                        key={entry.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '7px',
                          padding: '6px 8px',
                          background: T.surfaceHover,
                          borderRadius: '5px',
                          marginBottom: '3px',
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
                            width: '6px',
                            height: '6px',
                            borderRadius: '2px',
                            background: entry.project_color,
                            flexShrink: 0
                          }} />
                        )}
                        <span style={{ flex: 1, fontSize: '11px', color: T.textSecondary }}>
                          {entry.task_title || entry.project_name || 'General'}
                        </span>
                        {entry.note && (
                          <span style={{ fontSize: '10px', color: T.textTertiary, fontStyle: 'italic', marginLeft: 'auto' }}>
                            {entry.note}
                          </span>
                        )}
                        <span style={{ fontSize: '12px', fontWeight: '500', color: T.text, marginLeft: 'auto' }}>
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
                            padding: '2px',
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
        </div>

        {/* Right Column */}
        <div>
          {/* Log Hours Card */}
          <div style={{
            background: T.card,
            border: `0.5px solid ${T.border}`,
            borderRadius: '10px',
            padding: '16px',
            marginBottom: '12px'
          }}>
            <div style={{ fontSize: '13px', fontWeight: '500', color: T.text, marginBottom: '12px' }}>
              Log hours
            </div>

            {/* Type Toggle */}
            <div style={{ display: 'flex', gap: '4px', marginBottom: '12px' }}>
              <button
                onClick={() => setLogType('task')}
                style={{
                  flex: 1,
                  padding: '6px',
                  background: logType === 'task' ? '#ffffff' : 'transparent',
                  border: 'none',
                  borderRadius: '4px',
                  color: logType === 'task' ? '#7c6bf0' : T.text,
                  fontSize: '11px',
                  fontWeight: logType === 'task' ? '500' : '400',
                  cursor: 'pointer'
                }}
              >
                Per task
              </button>
              <button
                onClick={() => setLogType('daily')}
                style={{
                  flex: 1,
                  padding: '6px',
                  background: logType === 'daily' ? '#ffffff' : 'transparent',
                  border: 'none',
                  borderRadius: '4px',
                  color: logType === 'daily' ? '#7c6bf0' : T.text,
                  fontSize: '11px',
                  fontWeight: logType === 'daily' ? '500' : '400',
                  cursor: 'pointer'
                }}
              >
                Daily total
              </button>
            </div>

            {/* Form */}
            {logType === 'task' ? (
              <>
                <select
                  value={form.task_id}
                  onChange={(e) => setForm({ ...form, task_id: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    background: T.background,
                    border: `0.5px solid ${T.border}`,
                    borderRadius: '4px',
                    color: T.text,
                    fontSize: '11px',
                    marginBottom: '8px',
                    outline: 'none'
                  }}
                >
                  <option value="">Select task...</option>
                  {tasks.map(task => (
                    <option key={task.id} value={task.id}>
                      {task.project?.name ? `[${task.project.name}] ` : ''}{task.title}
                    </option>
                  ))}
                </select>
              </>
            ) : (
              <>
                <select
                  value={form.project_id}
                  onChange={(e) => setForm({ ...form, project_id: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    background: T.background,
                    border: `0.5px solid ${T.border}`,
                    borderRadius: '4px',
                    color: T.text,
                    fontSize: '11px',
                    marginBottom: '8px',
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

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
              <input
                type="number"
                placeholder="Hours"
                value={form.hours}
                onChange={(e) => setForm({ ...form, hours: e.target.value })}
                style={{
                  padding: '8px 10px',
                  background: T.background,
                  border: `0.5px solid ${T.border}`,
                  borderRadius: '4px',
                  color: T.text,
                  fontSize: '11px',
                  outline: 'none'
                }}
              />
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                style={{
                  padding: '8px 10px',
                  background: T.background,
                  border: `0.5px solid ${T.border}`,
                  borderRadius: '4px',
                  color: T.text,
                  fontSize: '11px',
                  outline: 'none'
                }}
              />
            </div>

            <textarea
              placeholder="Note (optional)"
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              style={{
                width: '100%',
                padding: '8px 10px',
                background: T.background,
                border: `0.5px solid ${T.border}`,
                borderRadius: '4px',
                color: T.text,
                fontSize: '11px',
                outline: 'none',
                resize: 'none',
                minHeight: '60px',
                fontFamily: 'inherit',
                marginBottom: '8px'
              }}
            />

            <button
              onClick={handleLogTime}
              disabled={saving}
              style={{
                width: '100%',
                padding: '10px',
                background: T.primary,
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '12px',
                cursor: saving ? 'not-allowed' : 'pointer',
                fontWeight: '500'
              }}
            >
              {saving ? 'Saving...' : 'Save hours'}
            </button>
          </div>

          {/* Hours by Project */}
          <div style={{
            background: T.card,
            border: `0.5px solid ${T.border}`,
            borderRadius: '10px',
            padding: '16px'
          }}>
            <div style={{ fontSize: '9px', textTransform: 'uppercase', color: T.textTertiary, marginBottom: '10px' }}>
              Hours by project this week
            </div>

            {projectBreakdown.length === 0 ? (
              <div style={{ fontSize: '11px', color: T.textTertiary, fontStyle: 'italic', textAlign: 'center', padding: '12px' }}>
                No hours logged yet
              </div>
            ) : (
              projectBreakdown.map(pb => {
                const totalHours = projectBreakdown.reduce((sum, p) => sum + p.total_hours, 0);
                const widthPercent = totalHours > 0 ? (pb.total_hours / totalHours) * 100 : 0;

                return (
                  <div key={pb.project_id} style={{ marginBottom: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '10px', color: T.textTertiary }}>{pb.project_name}</span>
                      <span style={{ fontSize: '10px', color: T.textTertiary }}>{pb.total_hours}h</span>
                    </div>
                    <div style={{
                      height: '4px',
                      background: T.surfaceHover,
                      borderRadius: '2px',
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
