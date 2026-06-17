import React, { useState, useEffect } from 'react';
import { X } from 'tabler-icons-react';

const API_BASE = import.meta.env.VITE_API_URL || '';

export default function WorkspaceSettings({ T, currentWorkspace, currentMember, members, myRole, onClose, setCurrentWorkspace, setMyWorkspaces }) {
  const [editName, setEditName] = useState(currentWorkspace.name);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [workspaceMembers, setWorkspaceMembers] = useState([]);

  useEffect(() => {
    if (myRole === 'admin') {
      fetchPendingRequests();
    }
    fetchWorkspaceMembers();
  }, []);

  const fetchPendingRequests = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/workspaces/${currentWorkspace.id}/requests`);
      const data = await res.json();
      setPendingRequests(data.filter(r => r.status === 'pending'));
    } catch (error) {
      console.error('Failed to fetch pending requests:', error);
    }
  };

  const fetchWorkspaceMembers = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/workspaces/${currentWorkspace.id}/members`);
      const data = await res.json();
      setWorkspaceMembers(data);
    } catch (error) {
      console.error('Failed to fetch workspace members:', error);
    }
  };

  const saveName = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/workspaces/${currentWorkspace.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName })
      });
      const data = await res.json();
      setCurrentWorkspace(data);
      setSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error('Failed to save workspace name:', error);
      setSaving(false);
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(currentWorkspace.invite_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const regenerateCode = async () => {
    if (!window.confirm('This will invalidate the current invite code. Continue?')) return;
    try {
      const res = await fetch(`${API_BASE}/api/workspaces/${currentWorkspace.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ regenerate_invite_code: true })
      });
      const data = await res.json();
      setCurrentWorkspace(data);
    } catch (error) {
      console.error('Failed to regenerate invite code:', error);
    }
  };

  const approveRequest = async (requestId) => {
    try {
      await fetch(`${API_BASE}/api/workspaces/${currentWorkspace.id}/requests/${requestId}/approve`, {
        method: 'POST'
      });
      fetchPendingRequests();
      fetchWorkspaceMembers();
    } catch (error) {
      console.error('Failed to approve request:', error);
    }
  };

  const rejectRequest = async (requestId) => {
    try {
      await fetch(`${API_BASE}/api/workspaces/${currentWorkspace.id}/requests/${requestId}/reject`, {
        method: 'POST'
      });
      fetchPendingRequests();
    } catch (error) {
      console.error('Failed to reject request:', error);
    }
  };

  const toggleRole = async (memberId, currentRole) => {
    const newRole = currentRole === 'admin' ? 'member' : 'admin';
    try {
      await fetch(`${API_BASE}/api/workspaces/${currentWorkspace.id}/members/${memberId}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole })
      });
      fetchWorkspaceMembers();
    } catch (error) {
      console.error('Failed to toggle role:', error);
    }
  };

  const removeMember = async (memberId) => {
    if (!window.confirm('Remove this member from the workspace?')) return;
    try {
      await fetch(`${API_BASE}/api/workspaces/${currentWorkspace.id}/members/${memberId}`, {
        method: 'DELETE'
      });
      fetchWorkspaceMembers();
    } catch (error) {
      console.error('Failed to remove member:', error);
    }
  };

  const leaveWorkspace = async () => {
    if (!window.confirm('Are you sure you want to leave this workspace?')) return;
    try {
      await fetch(`${API_BASE}/api/workspaces/${currentWorkspace.id}/members/${currentMember.id}`, {
        method: 'DELETE'
      });
      // Remove from myWorkspaces and close settings
      setMyWorkspaces(prev => prev.filter(ws => ws.workspace.id !== currentWorkspace.id));
      setCurrentWorkspace(null);
      onClose();
    } catch (error) {
      console.error('Failed to leave workspace:', error);
    }
  };

  const deleteWorkspace = async () => {
    const confirmed = window.prompt('Type the workspace name to confirm deletion:');
    if (confirmed !== currentWorkspace.name) return;
    try {
      await fetch(`${API_BASE}/api/workspaces/${currentWorkspace.id}`, {
        method: 'DELETE'
      });
      setMyWorkspaces(prev => prev.filter(ws => ws.workspace.id !== currentWorkspace.id));
      setCurrentWorkspace(null);
      onClose();
    } catch (error) {
      console.error('Failed to delete workspace:', error);
    }
  };

  return (
    <div style={{ padding: 0, minHeight: 'calc(100vh - 44px)' }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px',
        borderBottom: `0.5px solid ${T.border}`,
        background: T.card,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <div style={{ fontSize: '15px', fontWeight: '500', color: T.text }}>Workspace settings</div>
          <div style={{ fontSize: '11px', color: T.textTertiary, marginTop: '2px' }}>
            {currentWorkspace.name}
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            width: '28px',
            height: '28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: T.textSecondary,
            borderRadius: '4px'
          }}
        >
          <X size={18} />
        </button>
      </div>

      {/* Body */}
      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '20px' }}>

        {/* Section 1 - General */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{
            fontSize: '9px',
            textTransform: 'uppercase',
            color: T.textTertiary,
            letterSpacing: '0.5px',
            fontWeight: '500',
            marginBottom: '12px'
          }}>
            General
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={{
              display: 'block',
              fontSize: '11px',
              fontWeight: '500',
              color: T.textSecondary,
              marginBottom: '6px'
            }}>
              Workspace name
            </label>

            {myRole === 'admin' ? (
              <>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    background: T.surface,
                    border: `.5px solid ${T.border}`,
                    borderRadius: '6px',
                    color: T.text,
                    fontSize: '13px',
                    outline: 'none',
                    fontFamily: 'inherit'
                  }}
                />
                <button
                  onClick={saveName}
                  disabled={saving || editName === currentWorkspace.name}
                  style={{
                    marginTop: '8px',
                    padding: '8px 16px',
                    background: saved ? '#2ecc71' : '#7c6bf0',
                    border: 'none',
                    borderRadius: '6px',
                    color: '#fff',
                    fontSize: '12px',
                    fontWeight: '500',
                    cursor: saving || editName === currentWorkspace.name ? 'not-allowed' : 'pointer',
                    opacity: saving || editName === currentWorkspace.name ? 0.5 : 1,
                    fontFamily: 'inherit'
                  }}
                >
                  {saving ? 'Saving...' : saved ? 'Saved!' : 'Save changes'}
                </button>
              </>
            ) : (
              <div style={{
                padding: '10px 14px',
                background: T.surface,
                border: `.5px solid ${T.border}`,
                borderRadius: '6px',
                color: T.text,
                fontSize: '13px'
              }}>
                {currentWorkspace.name}
              </div>
            )}
          </div>
        </div>

        {/* Section 2 - Invite code */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{
            fontSize: '9px',
            textTransform: 'uppercase',
            color: T.textTertiary,
            letterSpacing: '0.5px',
            fontWeight: '500',
            marginBottom: '8px'
          }}>
            Invite code
          </div>

          <div style={{ fontSize: '11px', color: T.textTertiary, marginBottom: '10px' }}>
            Share this code with people you want to invite. They'll send a join request which you can approve.
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <div style={{
              flex: 1,
              background: T.surface,
              border: `.5px solid ${T.border}`,
              borderRadius: '6px',
              padding: '10px 14px',
              fontFamily: 'monospace',
              fontSize: '16px',
              letterSpacing: '3px',
              color: '#7c6bf0',
              fontWeight: '600'
            }}>
              {currentWorkspace.invite_code}
            </div>
            <button
              onClick={copyCode}
              style={{
                padding: '8px 14px',
                fontSize: '11px',
                background: T.surface,
                border: `.5px solid ${T.border}`,
                borderRadius: '6px',
                color: copied ? '#2ecc71' : T.textSecondary,
                cursor: 'pointer',
                fontFamily: 'inherit'
              }}
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
            {myRole === 'admin' && (
              <button
                onClick={regenerateCode}
                style={{
                  padding: '8px 14px',
                  fontSize: '11px',
                  background: T.surface,
                  border: `.5px solid ${T.border}`,
                  borderRadius: '6px',
                  color: T.textSecondary,
                  cursor: 'pointer',
                  fontFamily: 'inherit'
                }}
              >
                Regenerate
              </button>
            )}
          </div>

          {myRole === 'admin' && (
            <div style={{ fontSize: '10px', color: '#f39c12', marginTop: '6px' }}>
              ⚠ Regenerating will invalidate the current code — existing pending requests still work
            </div>
          )}
        </div>

        {/* Section 3 - Members */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '12px'
          }}>
            <div style={{
              fontSize: '9px',
              textTransform: 'uppercase',
              color: T.textTertiary,
              letterSpacing: '0.5px',
              fontWeight: '500'
            }}>
              Members
            </div>
            <div style={{ fontSize: '11px', color: T.textTertiary }}>
              {members.length} {members.length === 1 ? 'member' : 'members'}
            </div>
          </div>

          {/* Pending requests */}
          {myRole === 'admin' && pendingRequests.length > 0 && (
            <div style={{
              background: 'rgba(243,156,18,0.04)',
              border: '.5px solid rgba(243,156,18,0.2)',
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '14px'
            }}>
              <div style={{
                fontSize: '10px',
                color: '#f39c12',
                textTransform: 'uppercase',
                letterSpacing: '.5px',
                fontWeight: '500',
                marginBottom: '8px'
              }}>
                Pending requests ({pendingRequests.length})
              </div>
              {pendingRequests.map((req, idx) => (
                <div
                  key={req.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 0',
                    borderBottom: idx < pendingRequests.length - 1 ? '.5px solid rgba(243,156,18,0.15)' : 'none'
                  }}
                >
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: '#f39c12',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: '600',
                    color: '#fff'
                  }}>
                    {req.member?.name[0]}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '12px', fontWeight: '500', color: T.text }}>
                      {req.member?.name}
                    </div>
                    <div style={{ fontSize: '10px', color: T.textTertiary }}>
                      {req.member?.email}
                    </div>
                  </div>
                  <button
                    onClick={() => approveRequest(req.id)}
                    style={{
                      padding: '5px 12px',
                      fontSize: '11px',
                      background: '#7c6bf0',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '5px',
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      marginRight: '4px'
                    }}
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => rejectRequest(req.id)}
                    style={{
                      padding: '5px 12px',
                      fontSize: '11px',
                      background: 'none',
                      border: '.5px solid #e74c3c',
                      color: '#e74c3c',
                      borderRadius: '5px',
                      cursor: 'pointer',
                      fontFamily: 'inherit'
                    }}
                  >
                    Reject
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Members list */}
          <div>
            {members.map((m, idx) => {
              const isCurrentUser = m.id === currentMember.id;
              const memberRole = workspaceMembers.find(wm => wm.member_id === m.id)?.role || 'member';

              return (
                <div
                  key={m.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 0',
                    borderBottom: idx < members.length - 1 ? `.5px solid ${T.border}` : 'none'
                  }}
                >
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: m.avatar_color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '13px',
                    fontWeight: '600',
                    color: '#fff',
                    flexShrink: 0
                  }}>
                    {m.name[0].toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '12px', fontWeight: '500', color: T.text }}>
                      {m.name} {isCurrentUser && <span style={{ fontSize: '10px', color: T.textTertiary }}>(you)</span>}
                    </div>
                    {myRole === 'admin' && (
                      <div style={{ fontSize: '10px', color: T.textTertiary }}>
                        {m.email}
                      </div>
                    )}
                  </div>
                  <span style={{
                    fontSize: '9px',
                    padding: '2px 8px',
                    borderRadius: '8px',
                    fontWeight: '500',
                    background: memberRole === 'admin' ? 'rgba(124,107,240,.12)' : T.surface,
                    color: memberRole === 'admin' ? '#7c6bf0' : T.textTertiary
                  }}>
                    {memberRole}
                  </span>
                  {myRole === 'admin' && !isCurrentUser && (
                    <div style={{ display: 'flex', gap: '5px' }}>
                      <button
                        onClick={() => toggleRole(m.id, memberRole)}
                        style={{
                          padding: '4px 10px',
                          fontSize: '10px',
                          background: T.surface,
                          border: `.5px solid ${T.border}`,
                          borderRadius: '5px',
                          color: T.textSecondary,
                          cursor: 'pointer',
                          fontFamily: 'inherit'
                        }}
                      >
                        {memberRole === 'admin' ? 'Demote' : 'Promote'}
                      </button>
                      <button
                        onClick={() => removeMember(m.id)}
                        style={{
                          padding: '4px 10px',
                          fontSize: '10px',
                          background: 'none',
                          border: '.5px solid #e74c3c',
                          borderRadius: '5px',
                          color: '#e74c3c',
                          cursor: 'pointer',
                          fontFamily: 'inherit'
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Section 4 - Danger zone */}
        <div>
          <div style={{
            fontSize: '9px',
            textTransform: 'uppercase',
            color: '#e74c3c',
            letterSpacing: '0.5px',
            fontWeight: '500',
            marginBottom: '12px'
          }}>
            Danger zone
          </div>

          {/* Leave workspace */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px',
            background: 'rgba(231,76,60,0.04)',
            border: '.5px solid rgba(231,76,60,0.2)',
            borderRadius: '8px',
            marginBottom: '8px'
          }}>
            <div>
              <div style={{ fontSize: '12px', fontWeight: '500', color: '#e74c3c' }}>
                Leave workspace
              </div>
              <div style={{ fontSize: '11px', color: T.textTertiary, marginTop: '2px' }}>
                You will lose access to all data in this workspace
              </div>
            </div>
            <button
              onClick={leaveWorkspace}
              style={{
                padding: '6px 14px',
                fontSize: '11px',
                background: 'none',
                border: '.5px solid #e74c3c',
                borderRadius: '5px',
                color: '#e74c3c',
                cursor: 'pointer',
                fontFamily: 'inherit'
              }}
            >
              Leave
            </button>
          </div>

          {/* Delete workspace (admin only) */}
          {myRole === 'admin' && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px',
              background: 'rgba(231,76,60,0.04)',
              border: '.5px solid rgba(231,76,60,0.2)',
              borderRadius: '8px'
            }}>
              <div>
                <div style={{ fontSize: '12px', fontWeight: '500', color: '#e74c3c' }}>
                  Delete workspace
                </div>
                <div style={{ fontSize: '11px', color: T.textTertiary, marginTop: '2px' }}>
                  Permanently delete this workspace and all its data. Cannot be undone.
                </div>
              </div>
              <button
                onClick={deleteWorkspace}
                style={{
                  padding: '6px 14px',
                  fontSize: '11px',
                  background: '#e74c3c',
                  border: 'none',
                  borderRadius: '5px',
                  color: '#fff',
                  cursor: 'pointer',
                  fontFamily: 'inherit'
                }}
              >
                Delete
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
