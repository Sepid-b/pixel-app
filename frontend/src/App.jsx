import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';
import { api } from './api';
import Login from './Login';
import BoardView from './views/BoardView';
import ListView from './views/ListView';
import StandupView from './views/StandupView';
import ProjectsView from './views/ProjectsView';
import TimeView from './views/TimeView';
import MembersView from './views/MembersView';
import { Sun, Moon, ChevronLeft, ChevronRight, Home, User, Calendar, Clock, Folder, FileText, Activity, Logout, Users } from 'tabler-icons-react';

const themes = {
  dark: {
    background: '#18181b',
    surface: '#232326',
    card: '#232326',
    surfaceHover: '#2a2a2e',
    border: '#3f3f46',
    text: '#fafafa',
    textSecondary: '#a1a1aa',
    textTertiary: '#71717a',
    primary: '#8b5cf6',
    primaryHover: '#7c3aed'
  },
  light: {
    background: '#ffffff',
    surface: '#f9fafb',
    card: '#f9fafb',
    surfaceHover: '#f3f4f6',
    border: '#e5e7eb',
    text: '#09090b',
    textSecondary: '#52525b',
    textTertiary: '#a1a1aa',
    primary: '#8b5cf6',
    primaryHover: '#7c3aed'
  }
};

export default function App() {
  const [session, setSession] = useState(null);
  const [currentMember, setCurrentMember] = useState(null);
  const [members, setMembers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [vibes, setVibes] = useState({}); // { member_id: vibe_number }
  const [myVibe, setMyVibe] = useState(3);
  const [vibePickerOpen, setVibePickerOpen] = useState(false);
  const [hoveredMember, setHoveredMember] = useState(null);
  const [memberTasks, setMemberTasks] = useState({});
  const [activeView, setActiveView] = useState('board');
  const [sidebarFilter, setSidebarFilter] = useState(null);
  const [theme, setTheme] = useState('dark');
  const leaveTimerRef = useRef(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', avatar_color: '' });
  const [filters, setFilters] = useState({
    member: null,
    project: null,
    priority: null,
    search: ''
  });
  const profileDropdownRef = useRef(null);

  const currentTheme = themes[theme];

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session?.user?.id && session?.user?.email) {
      identifyMember(session.user.id, session.user.email, session.user.user_metadata?.full_name);
      loadMembers().then(() => {
        fetchMemberTasks();
      });
      loadProjects();
      loadTasks();
      loadVibes();

      // Set up realtime subscription and return cleanup function
      const cleanup = setupRealtimeSubscription();
      return cleanup;
    }
  }, [session]);

  useEffect(() => {
    if (currentMember) {
      loadMyVibe();
    }
  }, [currentMember]);

  const identifyMember = async (authId, email, name) => {
    try {
      console.log('[DEBUG] App.jsx - identifyMember() called with:', { authId, email, name });
      const member = await api.identifyMember(authId, email, name);
      console.log('[DEBUG] App.jsx - identifyMember() received member:', member);
      setCurrentMember(member);
    } catch (error) {
      console.error('Failed to identify member:', error);
    }
  };

  const loadMembers = async () => {
    try {
      const data = await api.getMembers();
      setMembers(data);
    } catch (error) {
      console.error('Failed to load members:', error);
    }
  };

  const loadProjects = async () => {
    try {
      console.log('[DEBUG] App.jsx - loadProjects() called');
      const data = await api.getProjects();
      console.log('[DEBUG] App.jsx - loadProjects() received data:', data);
      setProjects(data);
    } catch (error) {
      console.error('Failed to load projects:', error);
    }
  };

  const loadTasks = async () => {
    try {
      const data = await api.getTasks();
      setTasks(data);
    } catch (error) {
      console.error('Failed to load tasks:', error);
    }
  };

  const loadVibes = async () => {
    try {
      const data = await api.getVibes();
      const vibeMap = {};
      data.forEach(d => {
        if (d.member_id && d.vibe) vibeMap[d.member_id] = d.vibe;
      });
      setVibes(vibeMap);
    } catch (error) {
      console.error('Failed to load vibes:', error);
    }
  };

  const loadMyVibe = async () => {
    if (!currentMember) return;
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/standup/today`);
      const data = await response.json();
      const myStandup = data.find(d => d.member?.id === currentMember.id);
      if (myStandup?.standup?.vibe) {
        setMyVibe(myStandup.standup.vibe);
      }
    } catch (error) {
      console.error('Failed to load my vibe:', error);
    }
  };

  const fetchMemberTasks = async () => {
    if (!members || members.length === 0) return;
    try {
      const taskMap = {};
      await Promise.all(members.map(async (m) => {
        const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/tasks?member_id=${m.id}`);
        const data = await res.json();
        taskMap[m.id] = Array.isArray(data) ? data : [];
      }));
      setMemberTasks(taskMap);
    } catch (error) {
      console.error('Failed to fetch member tasks:', error);
    }
  };

  const selectVibe = async (vibe) => {
    setMyVibe(vibe);
    setVibePickerOpen(false);
    try {
      await fetch(`${import.meta.env.VITE_API_URL || ''}/api/standup/today`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          member_id: currentMember.id,
          vibe,
          blockers: '',
          note: ''
        })
      });
      await loadVibes();
    } catch (error) {
      console.error('Failed to save vibe:', error);
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('tasks-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'px_tasks' }, () => {
        loadTasks();
        fetchMemberTasks();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'px_standups' }, () => {
        loadVibes();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setCurrentMember(null);
    setMembers([]);
    setProjects([]);
    setTasks([]);
    setProfileOpen(false);
  };

  const handleUpdateProfile = async () => {
    try {
      const updates = {
        name: editForm.name,
        avatar_color: editForm.avatar_color
      };

      const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/members/${currentMember.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        throw new Error('Failed to update profile');
      }

      const updated = await response.json();

      // Update current member
      setCurrentMember(updated);

      // Update in members array
      setMembers(members.map(m => m.id === updated.id ? updated : m));

      // Close dropdown and edit mode
      setProfileOpen(false);
      setEditMode(false);
    } catch (error) {
      console.error('Failed to update profile:', error);
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target)) {
        // Check if click is not on the profile trigger
        const profileTrigger = document.getElementById('profile-trigger');
        if (profileTrigger && !profileTrigger.contains(event.target)) {
          setProfileOpen(false);
          setEditMode(false);
        }
      }
    };

    if (profileOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [profileOpen]);

  // Close vibe picker on outside click
  useEffect(() => {
    if (!vibePickerOpen) return;
    const handler = (e) => {
      if (!e.target.closest('.vibe-strip-container')) {
        setTimeout(() => setVibePickerOpen(false), 150);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [vibePickerOpen]);

  if (!session) {
    return <Login onLogin={setSession} />;
  }

  if (!currentMember || !currentMember.name) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: currentTheme.background,
        color: currentTheme.text
      }}>
        Loading...
      </div>
    );
  }

  const VibeAvatar = ({ member, size = 28, vibe, onClick, onHover, onLeave }) => {
    const [showEmoji, setShowEmoji] = useState(false);
    const emojis = ['😩', '😔', '😐', '😊', '🔥'];
    const emoji = emojis[(vibe || 3) - 1];

    const handleMouseEnter = () => {
      if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);
      setShowEmoji(true);
      if (member.id !== currentMember?.id) {
        onHover && onHover(member);
      }
    };

    const handleMouseLeave = () => {
      setShowEmoji(false);
      leaveTimerRef.current = setTimeout(() => {
        onLeave && onLeave();
      }, 300);
    };

    return (
      <div
        onClick={onClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          position: 'relative',
          overflow: 'hidden',
          border: `2px solid ${currentTheme.surface}`,
          boxShadow: `0 0 0 1.5px ${currentTheme.surface}, 0 0 0 3px ${member.avatar_color}`,
          cursor: 'pointer',
          flexShrink: 0,
          transition: 'transform 0.15s',
          zIndex: 1
        }}
        onMouseOver={e => e.currentTarget.style.transform = 'scale(1.15)'}
        onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
      >
        {/* Letter face */}
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: member.avatar_color,
          fontSize: size * 0.38,
          fontWeight: 600,
          color: '#fff',
          transition: 'transform 0.3s ease, opacity 0.3s ease',
          transform: showEmoji ? 'translateY(-100%)' : 'translateY(0)',
          opacity: showEmoji ? 0 : 1,
          userSelect: 'none'
        }}>
          {member.name[0].toUpperCase()}
        </div>

        {/* Emoji face */}
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: member.avatar_color,
          fontSize: size * 0.55,
          transition: 'transform 0.3s ease, opacity 0.3s ease',
          transform: showEmoji ? 'translateY(0)' : 'translateY(100%)',
          opacity: showEmoji ? 1 : 0,
          userSelect: 'none'
        }}>
          {emoji}
        </div>
      </div>
    );
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: currentTheme.background,
      color: currentTheme.text
    }}>
      {/* Top Navigation */}
      <nav style={{
        height: '44px',
        background: currentTheme.surface,
        borderBottom: `0.5px solid ${currentTheme.border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '24px',
              height: '24px',
              background: currentTheme.primary,
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <div style={{
                width: '6px',
                height: '6px',
                background: 'white',
                borderRadius: '50%'
              }} />
            </div>
            <span style={{ fontSize: '14px', fontWeight: '600' }}>Pixel</span>
          </div>

          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              onClick={() => setActiveView('board')}
              style={{
                padding: '4px 12px',
                background: activeView === 'board' ? (theme === 'dark' ? '#ffffff' : '#f9fafb') : 'transparent',
                border: 'none',
                borderRadius: '4px',
                color: activeView === 'board' ? '#7c6bf0' : currentTheme.text,
                fontSize: '13px',
                fontWeight: activeView === 'board' ? '500' : '400',
                cursor: 'pointer'
              }}
            >
              Board
            </button>
            <button
              onClick={() => setActiveView('list')}
              style={{
                padding: '4px 12px',
                background: activeView === 'list' ? (theme === 'dark' ? '#ffffff' : '#f9fafb') : 'transparent',
                border: 'none',
                borderRadius: '4px',
                color: activeView === 'list' ? '#7c6bf0' : currentTheme.text,
                fontSize: '13px',
                fontWeight: activeView === 'list' ? '500' : '400',
                cursor: 'pointer'
              }}
            >
              List
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }} className="vibe-strip-container">

            {/* Overlapping avatar strip */}
            <div style={{ display: 'flex', alignItems: 'center' }}>
              {members.map((member, i) => (
                <div key={member.id} style={{ marginLeft: i === 0 ? 0 : -8, zIndex: members.length - i }}>
                  <VibeAvatar
                    member={member}
                    size={28}
                    vibe={vibes[member.id] || 3}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (member.id === currentMember?.id) {
                        setVibePickerOpen(v => !v);
                        setHoveredMember(null);
                      }
                    }}
                    onHover={(m) => {
                      if (m.id !== currentMember?.id) setHoveredMember(m);
                    }}
                    onLeave={() => setHoveredMember(null)}
                  />
                </div>
              ))}
            </div>

            {/* YOUR vibe picker — opens when you click your own avatar */}
            {vibePickerOpen && (
              <div
                onClick={(e) => e.stopPropagation()}
                style={{
                  position: 'absolute',
                  top: 38,
                  right: 0,
                  zIndex: 1000,
                  background: currentTheme.surface,
                  border: `.5px solid ${currentTheme.border}`,
                  borderRadius: 10,
                  padding: 16,
                  boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                  minWidth: 220
                }}>
                <div style={{ fontSize: 12, color: currentTheme.text, fontWeight: 500, marginBottom: 4 }}>
                  How are you feeling today?
                </div>
                <div style={{ fontSize: 11, color: currentTheme.textTertiary, marginBottom: 12 }}>
                  {['Drained', 'Tired', 'Neutral', 'Good', 'On fire 🔥'][(vibes[currentMember?.id] || 3) - 1]}
                </div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                  {['😩', '😔', '😐', '😊', '🔥'].map((emoji, i) => (
                    <div key={i} onClick={async (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const newVibe = i + 1;
                      console.log('Setting vibe to:', newVibe);

                      // Update state immediately
                      setVibes(prev => ({ ...prev, [currentMember.id]: newVibe }));
                      setVibePickerOpen(false);

                      // Save to backend
                      try {
                        const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/standup/today`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            member_id: currentMember.id,
                            vibe: newVibe
                          })
                        });
                        const data = await res.json();
                        console.log('Vibe saved:', data);
                        if (!res.ok) console.error('Vibe save failed:', data);
                      } catch (err) {
                        console.error('Vibe save error:', err);
                      }
                    }} style={{
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      background: (vibes[currentMember?.id] || 3) === i + 1
                        ? 'rgba(124,107,240,0.15)' : currentTheme.surfaceHover,
                      border: (vibes[currentMember?.id] || 3) === i + 1
                        ? '2px solid #7c6bf0' : `.5px solid ${currentTheme.border}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 22,
                      cursor: 'pointer',
                      transition: 'all 0.15s'
                    }}>{emoji}</div>
                  ))}
                </div>
              </div>
            )}

            {/* TEAMMATE popup — shows on hover of another member's avatar */}
            {hoveredMember && (
              <div
                onMouseEnter={() => { if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current); }}
                onMouseLeave={() => setHoveredMember(null)}
                style={{
                  position: 'absolute',
                  top: 38,
                  right: 0,
                  zIndex: 100,
                  background: currentTheme.surface,
                  border: `.5px solid ${currentTheme.border}`,
                  borderRadius: 10,
                  padding: 14,
                  boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                  minWidth: 200
                }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <div style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: hoveredMember.avatar_color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 13,
                    fontWeight: 600,
                    color: '#fff'
                  }}>{hoveredMember.name[0].toUpperCase()}</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: currentTheme.text }}>{hoveredMember.name}</div>
                    <div style={{ fontSize: 16 }}>
                      {['😩', '😔', '😐', '😊', '🔥'][(vibes[hoveredMember.id] || 3) - 1]}
                      <span style={{ fontSize: 11, color: currentTheme.textTertiary, marginLeft: 6 }}>
                        {['Drained', 'Tired', 'Neutral', 'Good', 'On fire 🔥'][(vibes[hoveredMember.id] || 3) - 1]}
                      </span>
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: 10, color: currentTheme.textTertiary, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 5 }}>
                  Working on
                </div>
                {(memberTasks[hoveredMember.id] || [])
                  .filter(t => t.status === 'in_progress')
                  .slice(0, 3)
                  .map(t => (
                    <div key={t.id} style={{
                      fontSize: 11,
                      color: currentTheme.textSecondary,
                      padding: '3px 0',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6
                    }}>
                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#7c6bf0', flexShrink: 0, display: 'inline-block' }}></span>
                      {t.title}
                    </div>
                  ))
                }
                {!(memberTasks[hoveredMember.id] || []).filter(t => t.status === 'in_progress').length && (
                  <div style={{ fontSize: 11, color: currentTheme.textTertiary, fontStyle: 'italic' }}>Nothing in progress</div>
                )}
              </div>
            )}

          </div>

          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            style={{
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: currentTheme.textSecondary
            }}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          <div
            id="profile-trigger"
            onClick={() => {
              setProfileOpen(!profileOpen);
              setEditMode(false);
              if (!profileOpen) {
                setEditForm({
                  name: currentMember.name,
                  avatar_color: currentMember.avatar_color
                });
              }
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              padding: '4px 8px',
              borderRadius: '6px',
              transition: 'background 0.15s',
              position: 'relative'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = currentTheme.surfaceHover}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: currentMember.avatar_color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '12px',
              fontWeight: '600'
            }}>
              {currentMember.name[0]}
            </div>
            <span style={{ fontSize: '13px' }}>{currentMember.name}</span>

            {/* Profile Dropdown */}
            {profileOpen && (
              <div
                ref={profileDropdownRef}
                onClick={(e) => e.stopPropagation()}
                style={{
                  position: 'absolute',
                  top: '48px',
                  right: '12px',
                  zIndex: 50,
                  background: currentTheme.card,
                  border: `0.5px solid ${currentTheme.border}`,
                  borderRadius: '10px',
                  minWidth: '200px',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.25)'
                }}
              >
                {!editMode ? (
                  <>
                    {/* Profile Info */}
                    <div style={{ padding: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '32px',
                          height: '32px',
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
                          <div style={{ fontSize: '13px', fontWeight: '500', color: currentTheme.text }}>
                            {currentMember.name}
                          </div>
                          <div style={{ fontSize: '10px', color: currentTheme.textTertiary, marginTop: '2px' }}>
                            {currentMember.email}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div style={{ height: '0.5px', background: currentTheme.border }} />

                    {/* Menu Items */}
                    <div
                      onClick={() => setEditMode(true)}
                      style={{
                        padding: '8px 12px',
                        fontSize: '11px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        color: currentTheme.text
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = currentTheme.surfaceHover}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <User size={14} />
                      Edit profile
                    </div>

                    <div
                      onClick={handleSignOut}
                      style={{
                        padding: '8px 12px',
                        fontSize: '11px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        color: '#e74c3c'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = currentTheme.surfaceHover}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <Logout size={14} />
                      Sign out
                    </div>
                  </>
                ) : (
                  <>
                    {/* Edit Profile Form */}
                    <div style={{ padding: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                        <button
                          onClick={() => setEditMode(false)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            color: currentTheme.textSecondary,
                            padding: '4px',
                            display: 'flex',
                            alignItems: 'center'
                          }}
                        >
                          <ChevronLeft size={16} />
                        </button>
                        <span style={{ fontSize: '13px', fontWeight: '500', color: currentTheme.text }}>
                          Edit profile
                        </span>
                      </div>

                      {/* Name Input */}
                      <div style={{ marginBottom: '12px' }}>
                        <label style={{ display: 'block', fontSize: '10px', fontWeight: '500', color: currentTheme.textTertiary, marginBottom: '4px' }}>
                          Name
                        </label>
                        <input
                          type="text"
                          value={editForm.name}
                          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '6px 8px',
                            background: currentTheme.background,
                            border: `0.5px solid ${currentTheme.border}`,
                            borderRadius: '4px',
                            color: currentTheme.text,
                            fontSize: '11px',
                            outline: 'none'
                          }}
                        />
                      </div>

                      {/* Avatar Color Picker */}
                      <div style={{ marginBottom: '12px' }}>
                        <label style={{ display: 'block', fontSize: '10px', fontWeight: '500', color: currentTheme.textTertiary, marginBottom: '6px' }}>
                          Avatar color
                        </label>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          {['#7c6bf0', '#d4b3f5', '#5DCAA5', '#f0997b', '#e84393', '#3498db', '#f39c12', '#2ecc71'].map(color => (
                            <div
                              key={color}
                              onClick={() => setEditForm({ ...editForm, avatar_color: color })}
                              style={{
                                width: '24px',
                                height: '24px',
                                borderRadius: '50%',
                                background: color,
                                cursor: 'pointer',
                                boxShadow: editForm.avatar_color === color
                                  ? `0 0 0 2px ${currentTheme.card}, 0 0 0 3.5px ${color}`
                                  : 'none',
                                transition: 'box-shadow 0.15s'
                              }}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Save Button */}
                      <button
                        onClick={handleUpdateProfile}
                        style={{
                          width: '100%',
                          padding: '8px',
                          background: currentTheme.primary,
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: '500',
                          cursor: 'pointer'
                        }}
                      >
                        Save
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </nav>

      <div style={{ display: 'flex', paddingTop: '44px' }}>
        {/* Sidebar */}
        <aside style={{
          width: sidebarCollapsed ? '40px' : '188px',
          background: currentTheme.surface,
          borderRight: `0.5px solid ${currentTheme.border}`,
          height: 'calc(100vh - 44px)',
          position: 'fixed',
          left: 0,
          top: '44px',
          transition: 'width 0.2s',
          overflow: 'hidden'
        }}>
          <div style={{ padding: '12px 8px' }}>
            {!sidebarCollapsed && (
              <>
                <SidebarItem
                  icon={<Home size={18} />}
                  label="Home"
                  theme={currentTheme}
                  active={activeView === 'board' && !sidebarFilter}
                  onClick={() => { setActiveView('board'); setSidebarFilter(null); }}
                />
                <SidebarItem
                  icon={<User size={18} />}
                  label="My tasks"
                  theme={currentTheme}
                  active={sidebarFilter === 'my-tasks'}
                  onClick={() => { setActiveView('board'); setSidebarFilter('my-tasks'); }}
                />
                <SidebarItem
                  icon={<Calendar size={18} />}
                  label="Due this week"
                  theme={currentTheme}
                  active={sidebarFilter === 'due-this-week'}
                  onClick={() => { setActiveView('board'); setSidebarFilter('due-this-week'); }}
                />
                <SidebarItem
                  icon={<Activity size={18} />}
                  label="Standup"
                  theme={currentTheme}
                  active={activeView === 'standup'}
                  onClick={() => setActiveView('standup')}
                />
                <SidebarItem
                  icon={<Clock size={18} />}
                  label="Time tracking"
                  theme={currentTheme}
                  active={activeView === 'time'}
                  onClick={() => setActiveView('time')}
                />
                <div style={{ height: '1px', background: currentTheme.border, margin: '8px 0' }} />
                <SidebarItem
                  icon={<Folder size={18} />}
                  label="Projects"
                  theme={currentTheme}
                  active={activeView === 'projects'}
                  onClick={() => setActiveView('projects')}
                />
                <SidebarItem
                  icon={<FileText size={18} />}
                  label="Docs"
                  theme={currentTheme}
                  active={activeView === 'docs'}
                  onClick={() => setActiveView('docs')}
                />
                <SidebarItem
                  icon={<Users size={18} />}
                  label="Team"
                  theme={currentTheme}
                  active={activeView === 'members'}
                  onClick={() => setActiveView('members')}
                />
                <SidebarItem
                  icon={<Activity size={18} />}
                  label="Activity"
                  theme={currentTheme}
                  active={activeView === 'activity'}
                  onClick={() => setActiveView('activity')}
                />
              </>
            )}
          </div>

          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            style={{
              position: 'absolute',
              bottom: '12px',
              left: sidebarCollapsed ? '8px' : '8px',
              width: sidebarCollapsed ? '24px' : '172px',
              height: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: currentTheme.surfaceHover,
              border: `0.5px solid ${currentTheme.border}`,
              borderRadius: '4px',
              cursor: 'pointer',
              color: currentTheme.textSecondary
            }}
          >
            {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </aside>

        {/* Main Content */}
        <main style={{
          marginLeft: sidebarCollapsed ? '40px' : '188px',
          width: `calc(100% - ${sidebarCollapsed ? '40px' : '188px'})`,
          minHeight: 'calc(100vh - 44px)',
          padding: '24px',
          transition: 'margin-left 0.2s, width 0.2s'
        }}>
          {activeView === 'board' && (
            <BoardView
              tasks={tasks}
              members={members}
              projects={projects}
              setProjects={setProjects}
              currentMember={currentMember}
              theme={currentTheme}
              filters={filters}
              setFilters={setFilters}
              sidebarFilter={sidebarFilter}
              setSidebarFilter={setSidebarFilter}
              onTasksChange={loadTasks}
            />
          )}
          {activeView === 'list' && (
            <ListView
              tasks={tasks}
              members={members}
              projects={projects}
              currentMember={currentMember}
              theme={currentTheme}
              filters={filters}
              setFilters={setFilters}
              onTasksChange={loadTasks}
            />
          )}
          {activeView === 'standup' && (
            <StandupView
              T={currentTheme}
              currentMember={currentMember}
              members={members}
            />
          )}
          {activeView === 'time' && (
            <TimeView
              T={currentTheme}
              currentMember={currentMember}
              members={members}
              projects={projects}
            />
          )}
          {activeView === 'projects' && (
            <ProjectsView
              T={currentTheme}
              currentMember={currentMember}
              members={members}
              projects={projects}
              setProjects={setProjects}
              onProjectsChange={loadProjects}
            />
          )}
          {activeView === 'members' && (
            <MembersView
              T={currentTheme}
              currentMember={currentMember}
              members={members}
              setMembers={setMembers}
            />
          )}
          {activeView === 'docs' && (
            <div style={{ padding: '40px', color: currentTheme.textSecondary, fontSize: '14px' }}>
              Docs — coming soon
            </div>
          )}
          {activeView === 'activity' && (
            <div style={{ padding: '40px', color: currentTheme.textSecondary, fontSize: '14px' }}>
              Activity — coming soon
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function SidebarItem({ icon, label, theme, active, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 12px',
        borderRadius: '4px',
        cursor: 'pointer',
        color: active ? '#7c6bf0' : theme.textSecondary,
        fontSize: '13px',
        marginBottom: '2px',
        transition: 'background 0.15s',
        background: active ? theme.surfaceHover : 'transparent',
        borderLeft: active ? '3px solid #7c6bf0' : '3px solid transparent',
        paddingLeft: active ? '9px' : '12px',
        fontWeight: active ? '500' : '400'
      }}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.background = theme.surfaceHover;
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.background = 'transparent';
      }}
    >
      {icon}
      <span>{label}</span>
    </div>
  );
}

