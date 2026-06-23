import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

const API_BASE = import.meta.env.VITE_API_URL || '';

export default function WorkspaceFlow({ currentMember, onComplete, initialScreen }) {
  const [screen, setScreen] = useState(initialScreen || 'choose');
  const [workspaceName, setWorkspaceName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [foundWorkspace, setFoundWorkspace] = useState(null);
  const [lookupError, setLookupError] = useState('');
  const [loading, setLoading] = useState(false);

  // When initialScreen prop changes, update the screen
  useEffect(() => {
    if (initialScreen) {
      setScreen(initialScreen);
    }
  }, [initialScreen]);

  // Generate preview invite code as user types
  const previewInviteCode = () => {
    if (!workspaceName) return '';
    const words = workspaceName.split(' ').filter(w => w.length > 0);
    const initials = words.map(w => w[0].toUpperCase()).join('');
    return initials + '####';
  };

  // Auto-lookup workspace when invite code is entered
  useEffect(() => {
    if (inviteCode.length >= 6) {
      lookupWorkspace();
    } else {
      setFoundWorkspace(null);
      setLookupError('');
    }
  }, [inviteCode]);

  const lookupWorkspace = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/workspaces/by-code/${inviteCode.toUpperCase()}`);
      if (res.ok) {
        const data = await res.json();
        setFoundWorkspace(data);
        setLookupError('');
      } else if (inviteCode.length >= 7) {
        setFoundWorkspace(null);
        setLookupError('Invalid invite code');
      }
    } catch (err) {
      console.error('Lookup error:', err);
    }
  };

  const createWorkspace = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/workspaces`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: workspaceName, member_id: currentMember.id })
      });
      const data = await res.json();
      onComplete(data.workspace);
    } catch (err) {
      console.error('Create workspace error:', err);
      setLoading(false);
    }
  };

  const requestJoin = async () => {
    setLoading(true);
    try {
      await fetch(`${API_BASE}/api/workspaces/${foundWorkspace.id}/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ member_id: currentMember.id })
      });
      setScreen('pending');
      setLoading(false);
      subscribeToRequestUpdates();
    } catch (err) {
      console.error('Request join error:', err);
      setLoading(false);
    }
  };

  const subscribeToRequestUpdates = () => {
    supabase.channel('join_request')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'px_join_requests',
        filter: `member_id=eq.${currentMember.id}`
      }, (payload) => {
        if (payload.new.status === 'approved') {
          // Fetch the workspace and complete
          fetchWorkspaceAndComplete(payload.new.workspace_id);
        }
        if (payload.new.status === 'rejected') {
          setScreen('rejected');
        }
      })
      .subscribe();
  };

  const fetchWorkspaceAndComplete = async (workspaceId) => {
    try {
      const res = await fetch(`${API_BASE}/api/workspaces/member/${currentMember.id}`);
      const workspaces = await res.json();
      const workspace = workspaces.find(w => w.workspace.id === workspaceId);
      if (workspace) {
        onComplete(workspace.workspace);
      }
    } catch (err) {
      console.error('Fetch workspace error:', err);
    }
  };

  const currentTheme = {
    background: '#18181b',
    surface: '#27272a',
    border: '#3f3f46',
    text: '#fafafa',
    textSecondary: '#d4d4d8',
    textTertiary: '#a1a1aa',
    primary: '#7c6bf0'
  };

  if (screen === 'choose') {
    return (
      <div style={{ minHeight: '100vh', background: currentTheme.background, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div style={{ width: 60, height: 60, background: currentTheme.primary, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
          <div style={{ width: 12, height: 12, background: 'white', borderRadius: '50%' }} />
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 600, color: currentTheme.text, marginBottom: 8 }}>
          Welcome to Pixel 👋
        </h1>
        <p style={{ fontSize: 14, color: currentTheme.textTertiary, marginBottom: 40 }}>
          Get started below
        </p>
        <div style={{ display: 'flex', gap: 16, maxWidth: 600 }}>
          <div onClick={() => setScreen('create')} style={{
            flex: 1, background: currentTheme.surface, border: `.5px solid ${currentTheme.border}`,
            borderRadius: 12, padding: 32, cursor: 'pointer', transition: 'transform 0.2s',
            textAlign: 'center'
          }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
            <div style={{ fontSize: 32, marginBottom: 16 }}>🏗️</div>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: currentTheme.text, marginBottom: 8 }}>
              Create a workspace
            </h3>
            <p style={{ fontSize: 13, color: currentTheme.textTertiary }}>
              Start fresh for your team
            </p>
          </div>
          <div onClick={() => setScreen('join')} style={{
            flex: 1, background: currentTheme.surface, border: `.5px solid ${currentTheme.border}`,
            borderRadius: 12, padding: 32, cursor: 'pointer', transition: 'transform 0.2s',
            textAlign: 'center'
          }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
            <div style={{ fontSize: 32, marginBottom: 16 }}>🔗</div>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: currentTheme.text, marginBottom: 8 }}>
              Join a workspace
            </h3>
            <p style={{ fontSize: 13, color: currentTheme.textTertiary }}>
              Have an invite code? Join your team
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (screen === 'create') {
    return (
      <div style={{ minHeight: '100vh', background: currentTheme.background, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div style={{ maxWidth: 440, width: '100%' }}>
          <div onClick={() => setScreen('choose')} style={{ fontSize: 13, color: currentTheme.textTertiary, marginBottom: 24, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
            ← Back
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 600, color: currentTheme.text, marginBottom: 24 }}>
            Create your workspace
          </h2>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: currentTheme.textSecondary, marginBottom: 8 }}>
              Workspace name
            </label>
            <input
              type="text"
              value={workspaceName}
              onChange={e => setWorkspaceName(e.target.value)}
              placeholder="e.g. Acme Design Team"
              style={{
                width: '100%', padding: '10px 14px', background: currentTheme.surface,
                border: `.5px solid ${currentTheme.border}`, borderRadius: 8,
                color: currentTheme.text, fontSize: 14, outline: 'none'
              }}
            />
          </div>
          {workspaceName && (
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: currentTheme.textSecondary, marginBottom: 8 }}>
                Your team's invite code — share this to invite members
              </label>
              <div style={{
                padding: '10px 14px', background: currentTheme.primary + '15',
                border: `.5px solid ${currentTheme.primary}40`, borderRadius: 8,
                fontFamily: 'monospace', fontSize: 16, letterSpacing: 1.5,
                color: currentTheme.primary, textAlign: 'center'
              }}>
                {previewInviteCode()}
              </div>
            </div>
          )}
          <button
            onClick={createWorkspace}
            disabled={!workspaceName || loading}
            style={{
              width: '100%', padding: '12px 16px', background: currentTheme.primary,
              border: 'none', borderRadius: 8, color: 'white', fontSize: 14,
              fontWeight: 600, cursor: loading || !workspaceName ? 'not-allowed' : 'pointer',
              opacity: loading || !workspaceName ? 0.5 : 1
            }}
          >
            {loading ? 'Creating...' : 'Create workspace'}
          </button>
        </div>
      </div>
    );
  }

  if (screen === 'join') {
    return (
      <div style={{ minHeight: '100vh', background: currentTheme.background, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div style={{ maxWidth: 440, width: '100%' }}>
          <div onClick={() => setScreen('choose')} style={{ fontSize: 13, color: currentTheme.textTertiary, marginBottom: 24, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
            ← Back
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 600, color: currentTheme.text, marginBottom: 24 }}>
            Join a workspace
          </h2>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: currentTheme.textSecondary, marginBottom: 8 }}>
              Invite code
            </label>
            <input
              type="text"
              value={inviteCode}
              onChange={e => setInviteCode(e.target.value.toUpperCase())}
              placeholder="Enter invite code"
              style={{
                width: '100%', padding: '10px 14px', background: currentTheme.surface,
                border: `.5px solid ${currentTheme.border}`, borderRadius: 8,
                color: currentTheme.text, fontSize: 16, outline: 'none',
                fontFamily: 'monospace', letterSpacing: 1.5, textAlign: 'center',
                textTransform: 'uppercase'
              }}
            />
          </div>
          {foundWorkspace && (
            <div style={{
              padding: 16, background: '#22c55e15', border: '.5px solid #22c55e',
              borderRadius: 8, marginBottom: 20
            }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#22c55e', marginBottom: 4 }}>
                {foundWorkspace.name}
              </div>
              <div style={{ fontSize: 12, color: currentTheme.textTertiary }}>
                {foundWorkspace.member_count} members
              </div>
            </div>
          )}
          {lookupError && (
            <div style={{
              padding: 12, background: '#ef444415', border: '.5px solid #ef4444',
              borderRadius: 8, marginBottom: 20, fontSize: 13, color: '#ef4444'
            }}>
              {lookupError}
            </div>
          )}
          <button
            onClick={requestJoin}
            disabled={!foundWorkspace || loading}
            style={{
              width: '100%', padding: '12px 16px', background: currentTheme.primary,
              border: 'none', borderRadius: 8, color: 'white', fontSize: 14,
              fontWeight: 600, cursor: !foundWorkspace || loading ? 'not-allowed' : 'pointer',
              opacity: !foundWorkspace || loading ? 0.5 : 1
            }}
          >
            {loading ? 'Requesting...' : 'Request to join'}
          </button>
        </div>
      </div>
    );
  }

  if (screen === 'pending') {
    return (
      <div style={{ minHeight: '100vh', background: currentTheme.background, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div style={{ maxWidth: 440, width: '100%', textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 24 }}>⏰</div>
          <h2 style={{ fontSize: 20, fontWeight: 600, color: currentTheme.text, marginBottom: 12 }}>
            Request sent to {foundWorkspace?.name}
          </h2>
          <p style={{ fontSize: 14, color: currentTheme.textTertiary, marginBottom: 40 }}>
            You'll be notified when an admin approves your request. This page will update automatically.
          </p>
          <div style={{
            background: currentTheme.surface, border: `.5px solid ${currentTheme.border}`,
            borderRadius: 12, padding: 24, textAlign: 'left'
          }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: currentTheme.text, marginBottom: 16 }}>
              While you wait
            </h3>
            <ul style={{ fontSize: 13, color: currentTheme.textTertiary, lineHeight: 1.8, paddingLeft: 20 }}>
              <li>Learn about Pixel's features and how to use them</li>
              <li>Explore the keyboard shortcuts for faster workflows</li>
              <li>Read about best practices for project management</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  if (screen === 'rejected') {
    return (
      <div style={{ minHeight: '100vh', background: currentTheme.background, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div style={{ maxWidth: 440, width: '100%', textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 24 }}>❌</div>
          <h2 style={{ fontSize: 20, fontWeight: 600, color: currentTheme.text, marginBottom: 12 }}>
            Your request wasn't approved
          </h2>
          <p style={{ fontSize: 14, color: currentTheme.textTertiary, marginBottom: 40 }}>
            Contact your team admin to get access, or try a different invite code.
          </p>
          <button
            onClick={() => { setScreen('join'); setInviteCode(''); setFoundWorkspace(null); }}
            style={{
              padding: '12px 24px', background: currentTheme.primary,
              border: 'none', borderRadius: 8, color: 'white', fontSize: 14,
              fontWeight: 600, cursor: 'pointer'
            }}
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return null;
}
