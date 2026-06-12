import React, { useState, useEffect } from 'react';
import { Copy, Check } from 'tabler-icons-react';

const API_BASE = import.meta.env.VITE_API_URL || '';

export default function MembersView({ T, currentMember, members, setMembers }) {
  const [copied, setCopied] = useState(false);
  const [memberStats, setMemberStats] = useState({});

  useEffect(() => {
    loadMemberStats();
  }, [members]);

  const loadMemberStats = async () => {
    try {
      const stats = {};
      for (const member of members) {
        // Get tasks in progress
        const inProgressRes = await fetch(`${API_BASE}/api/tasks?assignee_id=${member.id}&status=in-progress`);
        const inProgressTasks = await inProgressRes.json();

        // Get tasks done this week
        const today = new Date();
        const monday = new Date(today);
        monday.setDate(today.getDate() - today.getDay() + 1);
        monday.setHours(0, 0, 0, 0);

        const doneRes = await fetch(`${API_BASE}/api/tasks?assignee_id=${member.id}&status=done`);
        const allDone = await doneRes.json();
        const doneThisWeek = allDone.filter(task => {
          if (!task.completed_at) return false;
          const completedDate = new Date(task.completed_at);
          return completedDate >= monday;
        });

        stats[member.id] = {
          inProgress: inProgressTasks.length,
          doneThisWeek: doneThisWeek.length
        };
      }
      setMemberStats(stats);
    } catch (error) {
      console.error('Failed to load member stats:', error);
    }
  };

  const handleCopyUrl = () => {
    const url = window.location.origin;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const vibes = {
    1: '😩',
    2: '😔',
    3: '😐',
    4: '😊',
    5: '🔥'
  };

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
          <div style={{ fontSize: '15px', fontWeight: '500', color: T.text }}>Team</div>
          <div style={{ fontSize: '11px', color: T.textTertiary, marginTop: '2px' }}>
            {members.length} members
          </div>
        </div>
      </div>

      {/* Members Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '10px',
        padding: '16px 20px'
      }}>
        {members.map(member => {
          const isCurrentUser = member.id === currentMember.id;
          const hasPendingSignup = !member.user_id;
          const stats = memberStats[member.id] || { inProgress: 0, doneThisWeek: 0 };

          return (
            <div
              key={member.id}
              style={{
                background: T.card,
                border: `0.5px solid ${T.border}`,
                borderRadius: '10px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center'
              }}
            >
              {/* Avatar */}
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: member.avatar_color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '18px',
                fontWeight: '600'
              }}>
                {member.name[0]}
              </div>

              {/* Name */}
              <div style={{
                fontSize: '14px',
                fontWeight: '500',
                color: T.text,
                marginTop: '8px',
                textAlign: 'center'
              }}>
                {member.name}
              </div>

              {/* Email */}
              {member.email && (
                <div style={{
                  fontSize: '11px',
                  color: T.textTertiary,
                  textAlign: 'center'
                }}>
                  {member.email}
                </div>
              )}

              {/* Badges */}
              <div style={{ marginTop: '6px', display: 'flex', gap: '6px' }}>
                {isCurrentUser && (
                  <span style={{
                    background: 'rgba(124,107,240,0.1)',
                    color: '#7c6bf0',
                    fontSize: '9px',
                    padding: '2px 8px',
                    borderRadius: '10px',
                    fontWeight: '500'
                  }}>
                    You
                  </span>
                )}
                {hasPendingSignup && (
                  <span style={{
                    background: 'rgba(243,156,18,0.1)',
                    color: '#f39c12',
                    fontSize: '9px',
                    padding: '2px 8px',
                    borderRadius: '10px',
                    fontWeight: '500'
                  }}>
                    Pending signup
                  </span>
                )}
              </div>

              {/* Vibe */}
              {member.vibe && (
                <div style={{
                  fontSize: '18px',
                  marginTop: '4px',
                  textAlign: 'center'
                }}>
                  {vibes[member.vibe]}
                </div>
              )}

              {/* Stats */}
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '16px',
                marginTop: '10px',
                paddingTop: '10px',
                borderTop: `0.5px solid ${T.border}`,
                width: '100%'
              }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '14px', fontWeight: '500', color: T.text }}>
                    {stats.inProgress}
                  </div>
                  <div style={{ fontSize: '10px', color: T.textTertiary }}>
                    in progress
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '14px', fontWeight: '500', color: T.text }}>
                    {stats.doneThisWeek}
                  </div>
                  <div style={{ fontSize: '10px', color: T.textTertiary }}>
                    done this week
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Invite Section */}
      <div style={{ padding: '0 20px 20px' }}>
        <div style={{
          background: T.card,
          border: `0.5px solid ${T.border}`,
          borderRadius: '10px',
          padding: '16px'
        }}>
          <div style={{
            fontSize: '13px',
            fontWeight: '500',
            color: T.text,
            marginBottom: '4px'
          }}>
            Invite teammates
          </div>
          <div style={{
            fontSize: '11px',
            color: T.textTertiary,
            marginBottom: '12px'
          }}>
            Share the app URL and ask them to sign up
          </div>

          {/* URL Box */}
          <div style={{
            background: T.surfaceHover,
            borderRadius: '6px',
            padding: '8px 12px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <code style={{
              fontSize: '11px',
              color: T.textSecondary,
              fontFamily: 'monospace'
            }}>
              {window.location.origin}
            </code>
            <button
              onClick={handleCopyUrl}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: copied ? '#2ecc71' : T.textSecondary,
                padding: '4px',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
