import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp } from 'tabler-icons-react';

const API_BASE = import.meta.env.VITE_API_URL || '';

export default function StandupView({ T, currentMember, members, currentWorkspace }) {
  const [activeTab, setActiveTab] = useState('today');
  const [todayData, setTodayData] = useState([]);
  const [myDraft, setMyDraft] = useState({ blockers: '', today: '', vibe: 3 });
  const [mySavedStandup, setMySavedStandup] = useState(null);
  const [isEditing, setIsEditing] = useState(true);
  const [historyPeriod, setHistoryPeriod] = useState('daily');
  const [historyData, setHistoryData] = useState([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [expandedDays, setExpandedDays] = useState([0]);
  const [selectedMember, setSelectedMember] = useState(null);

  useEffect(() => {
    loadTodayData();
  }, []);

  useEffect(() => {
    if (activeTab === 'history') {
      setHistoryPage(1);
      setHistoryData([]);
      loadHistory();
    }
  }, [historyPeriod, activeTab]);

  const loadTodayData = async () => {
    if (!currentWorkspace) return;
    try {
      const response = await fetch(`${API_BASE}/api/standup/today?workspace_id=${currentWorkspace.id}`);
      const data = await response.json();
      setTodayData(data);

      // Check if today's standup already exists for currentMember
      const myData = data.find(d => d.member?.id === currentMember?.id);
      if (myData?.standup) {
        setMySavedStandup(myData.standup);
        setIsEditing(false);
        setMyDraft({
          blockers: myData.standup.blockers || '',
          today: myData.standup.today || '',
          vibe: myData.standup.vibe || 3
        });
      } else {
        setMySavedStandup(null);
        setIsEditing(true);
      }
    } catch (error) {
      console.error('Failed to load today data:', error);
    }
  };

  const loadHistory = async () => {
    if (!currentWorkspace) return;
    console.log('Fetching history, period:', historyPeriod, 'page:', historyPage);
    setLoadingHistory(true);
    try {
      const res = await fetch(`${API_BASE}/api/standup/history?period=${historyPeriod}&page=${historyPage}&workspace_id=${currentWorkspace.id}`);
      console.log('History response status:', res.status);
      const data = await res.json();
      console.log('History data:', data);
      setHistoryData(data.data || []);
      setHasMore(data.hasMore || false);
    } catch (err) {
      console.error('History fetch error:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSaveStandup = async () => {
    if (!currentWorkspace) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/standup/today`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          member_id: currentMember.id,
          workspace_id: currentWorkspace.id,
          ...myDraft
        })
      });
      const savedStandup = await res.json();
      setMySavedStandup(savedStandup);
      setIsEditing(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      // Refetch today data to update submission pips
      await loadTodayData();
    } catch (error) {
      console.error('Failed to save standup:', error);
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  };

  const vibes = [
    { emoji: '😩', value: 1 },
    { emoji: '😔', value: 2 },
    { emoji: '😐', value: 3 },
    { emoji: '😊', value: 4 },
    { emoji: '🔥', value: 5 }
  ];

  const myData = todayData.find(d => d.member.id === currentMember.id);
  const teamData = todayData.filter(d => d.member.id !== currentMember.id);
  const submittedCount = todayData.filter(d => d.standup).length;

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
          <div style={{ fontSize: '15px', fontWeight: '500', color: T.text }}>Standup</div>
          <div style={{ fontSize: '11px', color: T.textTertiary, marginTop: '2px' }}>
            {formatDate(new Date().toISOString().split('T')[0])}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {members.map(member => {
            const hasSubmitted = todayData.find(d => d.member.id === member.id)?.standup;
            return (
              <div key={member.id} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <div style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: hasSubmitted ? '#2ecc71' : T.border
                }} />
                <span style={{ fontSize: '10px', color: T.textTertiary }}>{member.name}</span>
              </div>
            );
          })}
        </div>

        {activeTab === 'today' && (
          <button
            onClick={handleSaveStandup}
            disabled={saving}
            style={{
              padding: '6px 14px',
              background: T.primary,
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '12px',
              cursor: saving ? 'not-allowed' : 'pointer',
              fontWeight: '500'
            }}
          >
            {saving ? 'Saving...' : 'Save my standup'}
          </button>
        )}
      </div>

      {/* Tab Toggle */}
      <div style={{ padding: '16px 0 12px', display: 'flex', gap: '4px' }}>
        <button
          onClick={() => setActiveTab('today')}
          style={{
            padding: '4px 12px',
            background: activeTab === 'today' ? '#ffffff' : 'transparent',
            border: 'none',
            borderRadius: '4px',
            color: activeTab === 'today' ? '#7c6bf0' : T.text,
            fontSize: '13px',
            fontWeight: activeTab === 'today' ? '500' : '400',
            cursor: 'pointer'
          }}
        >
          Today
        </button>
        <button
          onClick={() => setActiveTab('history')}
          style={{
            padding: '4px 12px',
            background: activeTab === 'history' ? '#ffffff' : 'transparent',
            border: 'none',
            borderRadius: '4px',
            color: activeTab === 'history' ? '#7c6bf0' : T.text,
            fontSize: '13px',
            fontWeight: activeTab === 'history' ? '500' : '400',
            cursor: 'pointer'
          }}
        >
          History
        </button>
      </div>

      {/* Content */}
      <div style={{ padding: 0 }}>
        {activeTab === 'today' && (
          <>
            {/* My Standup Card */}
            <div style={{
              background: T.card,
              border: '0.5px solid #7c6bf0',
              borderRadius: '10px',
              padding: '16px',
              marginBottom: '14px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: currentMember.avatar_color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '14px',
                    fontWeight: '600'
                  }}>
                    {currentMember.name[0]}
                  </div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '500', color: T.text }}>My standup</div>
                    <div style={{ fontSize: '11px', color: T.textTertiary }}>
                      {mySavedStandup && !isEditing ? 'View or edit your standup' : 'Auto-filled from board · add blockers and note'}
                    </div>
                  </div>
                </div>
                {mySavedStandup && !isEditing && (
                  <button onClick={() => setIsEditing(true)} style={{
                    padding: '4px 12px',
                    fontSize: 11,
                    background: 'none',
                    border: `.5px solid ${T.border}`,
                    borderRadius: 6,
                    color: T.textSecondary,
                    cursor: 'pointer',
                    fontFamily: 'inherit'
                  }}>Edit</button>
                )}
              </div>

              {mySavedStandup && !isEditing ? (
                // SAVED VIEW
                <>
                  {saved && (
                    <div style={{ fontSize: 11, color: '#2ecc71', marginBottom: 12 }}>
                      Standup saved ✓
                    </div>
                  )}

                  {/* Three Column Grid - Read only */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px', marginBottom: '12px' }}>
                    <div>
                      <div style={{ fontSize: '9px', textTransform: 'uppercase', color: T.textTertiary, marginBottom: '6px' }}>
                        Working on today
                      </div>
                      {!myData || !myData.working_on || myData.working_on.length === 0 ? (
                        <div style={{ fontSize: '11px', color: T.textTertiary, fontStyle: 'italic' }}>
                          Nothing in progress
                        </div>
                      ) : (
                        myData.working_on.map(task => (
                          <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                            <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#7c6bf0' }} />
                            <span style={{ fontSize: '11px', color: T.textSecondary }}>{task.title}</span>
                          </div>
                        ))
                      )}
                    </div>

                    <div>
                      <div style={{ fontSize: '9px', textTransform: 'uppercase', color: T.textTertiary, marginBottom: '6px' }}>
                        Completed today
                      </div>
                      {!myData || !myData.completed_today || myData.completed_today.length === 0 ? (
                        <div style={{ fontSize: '11px', color: T.textTertiary, fontStyle: 'italic' }}>
                          Nothing completed yet
                        </div>
                      ) : (
                        myData.completed_today.map(task => (
                          <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                            <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#2ecc71' }} />
                            <span style={{ fontSize: '11px', color: T.textSecondary }}>{task.title}</span>
                          </div>
                        ))
                      )}
                    </div>

                    <div>
                      <div style={{ fontSize: '9px', textTransform: 'uppercase', color: T.textTertiary, marginBottom: '6px' }}>
                        Blockers
                      </div>
                      <div style={{ fontSize: '11px', color: mySavedStandup.blockers ? T.textSecondary : T.textTertiary, fontStyle: mySavedStandup.blockers ? 'normal' : 'italic' }}>
                        {mySavedStandup.blockers || 'No blockers'}
                      </div>
                    </div>
                  </div>

                  {/* Note */}
                  <div style={{ marginTop: 10 }}>
                    <div style={{ fontSize: '9px', textTransform: 'uppercase', color: T.textTertiary, marginBottom: '4px' }}>
                      Note to team
                    </div>
                    <div style={{ fontSize: '11px', color: mySavedStandup.today ? T.textSecondary : T.textTertiary, fontStyle: mySavedStandup.today ? 'normal' : 'italic' }}>
                      {mySavedStandup.today || '—'}
                    </div>
                  </div>
                </>
              ) : (
                // EDIT VIEW
                <>
                  {/* Three Column Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px', marginBottom: '12px' }}>
                    <div>
                      <div style={{ fontSize: '9px', textTransform: 'uppercase', color: T.textTertiary, marginBottom: '6px' }}>
                        Working on today
                      </div>
                      {!myData || !myData.working_on || myData.working_on.length === 0 ? (
                        <div style={{ fontSize: '11px', color: T.textTertiary, fontStyle: 'italic' }}>
                          Nothing in progress
                        </div>
                      ) : (
                        myData.working_on.map(task => (
                          <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                            <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#7c6bf0' }} />
                            <span style={{ fontSize: '11px', color: T.textSecondary }}>{task.title}</span>
                          </div>
                        ))
                      )}
                    </div>

                    <div>
                      <div style={{ fontSize: '9px', textTransform: 'uppercase', color: T.textTertiary, marginBottom: '6px' }}>
                        Completed today
                      </div>
                      {!myData || !myData.completed_today || myData.completed_today.length === 0 ? (
                        <div style={{ fontSize: '11px', color: T.textTertiary, fontStyle: 'italic' }}>
                          Nothing completed yet
                        </div>
                      ) : (
                        myData.completed_today.map(task => (
                          <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                            <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#2ecc71' }} />
                            <span style={{ fontSize: '11px', color: T.textSecondary }}>{task.title}</span>
                          </div>
                        ))
                      )}
                    </div>

                    <div>
                      <div style={{ fontSize: '9px', textTransform: 'uppercase', color: T.textTertiary, marginBottom: '6px' }}>
                        Blockers
                      </div>
                      <textarea
                        value={myDraft.blockers}
                        onChange={(e) => setMyDraft({ ...myDraft, blockers: e.target.value })}
                        placeholder="Any blockers?"
                        style={{
                          width: '100%',
                          background: T.surfaceHover,
                          border: `0.5px solid ${T.border}`,
                          borderRadius: '6px',
                          padding: '8px 10px',
                          fontSize: '11px',
                          color: T.textSecondary,
                          resize: 'none',
                          minHeight: '60px',
                          fontFamily: 'inherit',
                          outline: 'none'
                        }}
                      />
                    </div>
                  </div>

                  {/* Note Field */}
                  <div>
                    <div style={{ fontSize: '9px', textTransform: 'uppercase', color: T.textTertiary, marginBottom: '6px' }}>
                      Note to team
                    </div>
                    <textarea
                      value={myDraft.today}
                      onChange={(e) => setMyDraft({ ...myDraft, today: e.target.value })}
                      placeholder="Anything the team should know?"
                      style={{
                        width: '100%',
                        background: T.surfaceHover,
                        border: `0.5px solid ${T.border}`,
                        borderRadius: '6px',
                        padding: '8px 10px',
                        fontSize: '11px',
                        color: T.textSecondary,
                        resize: 'none',
                        minHeight: '44px',
                        fontFamily: 'inherit',
                        outline: 'none'
                      }}
                    />
                  </div>

                  {/* Save Row */}
                  <div style={{
                    marginTop: '12px',
                    paddingTop: '12px',
                    borderTop: `0.5px solid ${T.border}`,
                    display: 'flex',
                    justifyContent: 'flex-end',
                    alignItems: 'center',
                    gap: '10px'
                  }}>
                    {saved && (
                      <span style={{ fontSize: '11px', color: '#2ecc71' }}>Saved ✓</span>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Team Section */}
            <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '11px', fontWeight: '500', color: T.textTertiary }}>
                Team today
              </div>
              <div style={{ fontSize: '10px', color: T.textTertiary }}>
                {submittedCount} of {members.length} submitted
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
              {teamData.map(data => {
                const hasSubmitted = !!data.standup;
                return (
                  <div key={data.member.id} style={{
                    background: T.card,
                    border: `0.5px solid ${T.border}`,
                    borderRadius: '8px',
                    padding: '12px',
                    opacity: hasSubmitted ? 1 : 0.5
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                      <div style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '50%',
                        background: data.member.avatar_color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: '11px',
                        fontWeight: '600'
                      }}>
                        {data.member.name[0]}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '12px', fontWeight: '500', color: T.text }}>
                          {data.member.name}
                        </div>
                        {hasSubmitted && data.standup.vibe && (
                          <span style={{ fontSize: '14px' }}>
                            {vibes.find(v => v.value === data.standup.vibe)?.emoji}
                          </span>
                        )}
                      </div>
                      <span style={{
                        fontSize: '9px',
                        padding: '2px 6px',
                        borderRadius: '3px',
                        background: hasSubmitted ? '#2ecc71' : T.border,
                        color: hasSubmitted ? 'white' : T.textTertiary
                      }}>
                        {hasSubmitted ? 'submitted' : 'pending'}
                      </span>
                    </div>

                    {!hasSubmitted ? (
                      <div style={{ fontSize: '11px', color: T.textTertiary, fontStyle: 'italic' }}>
                        Not submitted yet
                      </div>
                    ) : (
                      <>
                        {data.working_on.length > 0 && (
                          <div style={{ marginBottom: '8px' }}>
                            <div style={{ fontSize: '9px', textTransform: 'uppercase', color: T.textTertiary, marginBottom: '4px' }}>
                              Working on
                            </div>
                            {data.working_on.map(task => (
                              <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' }}>
                                <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#7c6bf0' }} />
                                <span style={{ fontSize: '10px', color: T.textSecondary }}>{task.title}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {data.completed_today.length > 0 && (
                          <div style={{ marginBottom: '8px' }}>
                            <div style={{ fontSize: '9px', textTransform: 'uppercase', color: T.textTertiary, marginBottom: '4px' }}>
                              Completed
                            </div>
                            {data.completed_today.map(task => (
                              <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' }}>
                                <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#2ecc71' }} />
                                <span style={{ fontSize: '10px', color: T.textSecondary }}>{task.title}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {data.standup.blockers && (
                          <div style={{ marginBottom: '6px', padding: '6px 8px', background: 'rgba(231,76,60,0.1)', borderRadius: '4px' }}>
                            <div style={{ fontSize: '9px', color: '#e74c3c', marginBottom: '2px' }}>⚠ Blockers</div>
                            <div style={{ fontSize: '10px', color: '#e74c3c' }}>{data.standup.blockers}</div>
                          </div>
                        )}

                        {data.standup.today && (
                          <div style={{ fontSize: '10px', color: T.textTertiary, fontStyle: 'italic' }}>
                            {data.standup.today}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {activeTab === 'history' && (
          <>
            {/* History Controls */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ display: 'flex', gap: '4px' }}>
                {['daily', 'weekly', 'monthly'].map(period => (
                  <button
                    key={period}
                    onClick={() => setHistoryPeriod(period)}
                    style={{
                      padding: '4px 12px',
                      background: historyPeriod === period ? '#ffffff' : 'transparent',
                      border: 'none',
                      borderRadius: '4px',
                      color: historyPeriod === period ? '#7c6bf0' : T.text,
                      fontSize: '12px',
                      fontWeight: historyPeriod === period ? '500' : '400',
                      cursor: 'pointer',
                      textTransform: 'capitalize'
                    }}
                  >
                    {period}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '6px' }}>
                {members.map(member => (
                  <div
                    key={member.id}
                    onClick={() => setSelectedMember(selectedMember === member.id ? null : member.id)}
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
                      border: selectedMember === member.id ? '2px solid #7c6bf0' : '2px solid transparent'
                    }}
                  >
                    {member.name[0]}
                  </div>
                ))}
              </div>
            </div>

            {/* History List */}
            {loadingHistory && historyData.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: T.textTertiary, fontSize: '12px' }}>
                Loading history...
              </div>
            ) : historyData.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: T.textTertiary, fontSize: '12px' }}>
                No standup history yet. Save your first standup to see it here.
              </div>
            ) : (
              historyData.map((day, idx) => {
                const isExpanded = expandedDays.includes(idx);
                return (
                  <div key={day.date} style={{
                    background: T.card,
                    border: `0.5px solid ${T.border}`,
                    borderRadius: '8px',
                    marginBottom: '6px',
                    overflow: 'hidden'
                  }}>
                    <div
                      onClick={() => {
                        if (isExpanded) {
                          setExpandedDays(expandedDays.filter(i => i !== idx));
                        } else {
                          setExpandedDays([...expandedDays, idx]);
                        }
                      }}
                      style={{
                        padding: '10px 14px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}
                    >
                      <div style={{ fontSize: '12px', fontWeight: '500', color: T.text }}>
                        {formatDate(day.date)}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ fontSize: '10px', color: T.textTertiary }}>
                          {day.entries.length} submitted
                        </div>
                        {isExpanded ? <ChevronUp size={16} color={T.textTertiary} /> : <ChevronDown size={16} color={T.textTertiary} />}
                      </div>
                    </div>

                    {isExpanded && (
                      <div style={{
                        padding: '10px 14px',
                        borderTop: `0.5px solid ${T.border}`,
                        display: 'grid',
                        gridTemplateColumns: 'repeat(4, 1fr)',
                        gap: '12px'
                      }}>
                        {day.entries.map((entry, entryIdx) => (
                          <div key={entryIdx}>
                            <div style={{ fontSize: '10px', fontWeight: '500', color: T.textSecondary, marginBottom: '4px' }}>
                              {entry.member.name} {entry.standup.vibe && vibes.find(v => v.value === entry.standup.vibe)?.emoji}
                            </div>
                            {entry.standup.blockers && (
                              <div style={{ fontSize: '9px', color: '#e74c3c', marginBottom: '2px' }}>
                                ⚠ {entry.standup.blockers}
                              </div>
                            )}
                            {entry.standup.today && (
                              <div style={{ fontSize: '9px', color: T.textTertiary, fontStyle: 'italic' }}>
                                {entry.standup.today}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}

            {hasMore && (
              <button
                onClick={() => setHistoryPage(historyPage + 1)}
                style={{
                  width: '100%',
                  padding: '10px',
                  background: 'transparent',
                  border: `0.5px solid ${T.border}`,
                  borderRadius: '6px',
                  color: T.textSecondary,
                  fontSize: '12px',
                  cursor: 'pointer',
                  marginTop: '10px'
                }}
              >
                Load more
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
