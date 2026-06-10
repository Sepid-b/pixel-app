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
  const [vibes, setVibes] = useState([]);
  const [activeView, setActiveView] = useState('board');
  const [sidebarFilter, setSidebarFilter] = useState(null);
  const [theme, setTheme] = useState('dark');
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
    if (session?.user) {
      identifyMember(session.user.id, session.user.email, session.user.user_metadata?.full_name);
      loadMembers();
      loadProjects();
      loadTasks();
      loadVibes();

      // Set up realtime subscription and return cleanup function
      const cleanup = setupRealtimeSubscription();
      return cleanup;
    }
  }, [session]);

  const identifyMember = async (authId, email, name) => {
    try {
      const member = await api.identifyMember(authId, email, name);
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
      const data = await api.getProjects();
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
      setVibes(data);
    } catch (error) {
      console.error('Failed to load vibes:', error);
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('tasks-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'px_tasks' }, () => {
        loadTasks();
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
        avatar_color: editForm.avatar_color,
      };

      const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/members/${currentMember.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

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

  if (!session) {
    return <Login onLogin={setSession} />;
  }

  if (!currentMember) {
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
          <VibeStrip vibes={vibes} members={members} />

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

function VibeStrip({ vibes, members }) {
  const [showEmoji, setShowEmoji] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setShowEmoji(prev => !prev);
    }, 4500);

    return () => clearInterval(interval);
  }, []);

  const vibeToEmoji = {
    1: '😩',
    2: '😔',
    3: '😐',
    4: '😊',
    5: '🔥'
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
      {vibes.map((vibe, index) => {
        const member = members.find(m => m.id === vibe.member_id);
        if (!member) return null;

        return (
          <div
            key={vibe.id}
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: member.avatar_color,
              border: `2px solid ${member.avatar_color}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '12px',
              fontWeight: '600',
              marginLeft: index > 0 ? '-8px' : '0',
              position: 'relative',
              zIndex: vibes.length - index,
              transition: 'all 0.3s'
            }}
          >
            {showEmoji ? vibeToEmoji[vibe.vibe] : member.name[0]}
          </div>
        );
      })}
    </div>
  );
}
