import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';
import { api } from './api';
import Login from './Login';
import BoardView from './views/BoardView';
import ListView from './views/ListView';
import { Sun, Moon, ChevronLeft, ChevronRight, Home, User, Calendar, Clock, Folder, FileText, Activity, Logout } from 'tabler-icons-react';

const themes = {
  dark: {
    background: '#18181b',
    surface: '#232326',
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
  const [theme, setTheme] = useState('dark');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [filters, setFilters] = useState({
    member: null,
    project: null,
    priority: null,
    search: ''
  });

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
      identifyMember(session.user.id);
      loadMembers();
      loadProjects();
      loadTasks();
      loadVibes();
      setupRealtimeSubscription();
    }
  }, [session]);

  const identifyMember = async (userId) => {
    try {
      const member = await api.identifyMember(userId);
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
  };

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
                background: activeView === 'board' ? currentTheme.surfaceHover : 'transparent',
                border: 'none',
                borderRadius: '4px',
                color: currentTheme.text,
                fontSize: '13px',
                cursor: 'pointer'
              }}
            >
              Board
            </button>
            <button
              onClick={() => setActiveView('list')}
              style={{
                padding: '4px 12px',
                background: activeView === 'list' ? currentTheme.surfaceHover : 'transparent',
                border: 'none',
                borderRadius: '4px',
                color: currentTheme.text,
                fontSize: '13px',
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

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
          </div>

          <button
            onClick={handleSignOut}
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
            <Logout size={18} />
          </button>
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
                <SidebarItem icon={<Home size={18} />} label="Home" theme={currentTheme} />
                <SidebarItem icon={<User size={18} />} label="My tasks" theme={currentTheme} />
                <SidebarItem icon={<Calendar size={18} />} label="Due this week" theme={currentTheme} />
                <SidebarItem icon={<Activity size={18} />} label="Standup" theme={currentTheme} />
                <SidebarItem icon={<Clock size={18} />} label="Time tracking" theme={currentTheme} />
                <div style={{ height: '1px', background: currentTheme.border, margin: '8px 0' }} />
                <SidebarItem icon={<Folder size={18} />} label="Projects" theme={currentTheme} />
                <SidebarItem icon={<FileText size={18} />} label="Docs" theme={currentTheme} />
                <SidebarItem icon={<Activity size={18} />} label="Activity" theme={currentTheme} />
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
        </main>
      </div>
    </div>
  );
}

function SidebarItem({ icon, label, theme }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '8px 12px',
      borderRadius: '4px',
      cursor: 'pointer',
      color: theme.textSecondary,
      fontSize: '13px',
      marginBottom: '2px',
      transition: 'background 0.15s'
    }}
    onMouseEnter={(e) => e.currentTarget.style.background = theme.surfaceHover}
    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
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
