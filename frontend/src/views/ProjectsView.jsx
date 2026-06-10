import React, { useState, useEffect } from 'react';
import { X, Plus } from 'tabler-icons-react';

const API_BASE = import.meta.env.VITE_API_URL || '';

const presetColors = ['#e84393', '#7c6bf0', '#2ecc71', '#f39c12', '#3498db', '#e74c3c', '#5DCAA5', '#f0997b'];

export default function ProjectsView({ T, currentMember, members, projects, setProjects }) {
  const [stats, setStats] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProject, setNewProject] = useState({
    name: '',
    color: '#7c6bf0',
    description: '',
    budget_hours: '',
    member_ids: [currentMember.id]
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadStats();
    loadProjects();
  }, [currentMember]);

  const loadStats = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/projects/stats?member_id=${currentMember.id}`);
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const loadProjects = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/projects?member_id=${currentMember.id}`);
      const data = await response.json();
      setProjects(data);
    } catch (error) {
      console.error('Failed to load projects:', error);
    }
  };

  const handleCreateProject = async () => {
    if (!newProject.name.trim()) return;

    setSaving(true);
    try {
      const response = await fetch(`${API_BASE}/api/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProject)
      });
      const created = await response.json();
      setProjects([...projects, created]);
      setShowNewProject(false);
      setNewProject({
        name: '',
        color: '#7c6bf0',
        description: '',
        budget_hours: '',
        member_ids: [currentMember.id]
      });
      await loadStats();
    } catch (error) {
      console.error('Failed to create project:', error);
    } finally {
      setSaving(false);
    }
  };

  const activeProjects = projects.filter(p => p.status === 'active');

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
          <div style={{ fontSize: '15px', fontWeight: '500', color: T.text }}>Projects</div>
          <div style={{ fontSize: '11px', color: T.textTertiary, marginTop: '2px' }}>
            {activeProjects.length} active · you're in {projects.length}
          </div>
        </div>

        <button
          onClick={() => setShowNewProject(true)}
          style={{
            padding: '6px 14px',
            background: T.primary,
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '12px',
            cursor: 'pointer',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
        >
          <Plus size={14} />
          New project
        </button>
      </div>

      {/* Stats Row */}
      {stats && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '8px',
          padding: '16px 20px 12px'
        }}>
          <div style={{
            background: T.card,
            border: `0.5px solid ${T.border}`,
            borderRadius: '8px',
            padding: '12px 14px'
          }}>
            <div style={{ fontSize: '22px', fontWeight: '500', color: T.text }}>
              {stats.active_projects}
            </div>
            <div style={{ fontSize: '10px', color: T.textTertiary, textTransform: 'uppercase' }}>
              Active projects
            </div>
          </div>

          <div style={{
            background: T.card,
            border: `0.5px solid ${T.border}`,
            borderRadius: '8px',
            padding: '12px 14px'
          }}>
            <div style={{ fontSize: '22px', fontWeight: '500', color: T.text }}>
              {stats.open_tasks}
            </div>
            <div style={{ fontSize: '10px', color: T.textTertiary, textTransform: 'uppercase' }}>
              Open tasks
            </div>
          </div>

          <div style={{
            background: T.card,
            border: `0.5px solid ${T.border}`,
            borderRadius: '8px',
            padding: '12px 14px'
          }}>
            <div style={{ fontSize: '22px', fontWeight: '500', color: T.text }}>
              {stats.hours_logged}h
            </div>
            <div style={{ fontSize: '10px', color: T.textTertiary, textTransform: 'uppercase' }}>
              Hours logged
            </div>
          </div>

          <div style={{
            background: T.card,
            border: `0.5px solid ${T.border}`,
            borderRadius: '8px',
            padding: '12px 14px'
          }}>
            <div style={{ fontSize: '22px', fontWeight: '500', color: T.text }}>
              {stats.due_this_week}
            </div>
            <div style={{ fontSize: '10px', color: T.textTertiary, textTransform: 'uppercase' }}>
              Due this week
            </div>
          </div>
        </div>
      )}

      {/* Projects Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '10px',
        padding: '0 20px 20px'
      }}>
        {projects.map(project => {
          const totalTasks = project.task_count || 0;
          const doneTasks = project.status_counts?.done || 0;
          const progress = totalTasks > 0 ? (doneTasks / totalTasks) * 100 : 0;

          const hoursUsed = project.total_hours_logged || 0;
          const hoursBudget = project.budget_hours || 0;
          const hoursPercent = hoursBudget > 0 ? (hoursUsed / hoursBudget) * 100 : 0;

          return (
            <div
              key={project.id}
              onClick={() => setSelectedProject(project)}
              style={{
                background: T.card,
                border: `0.5px solid ${T.border}`,
                borderRadius: '10px',
                overflow: 'hidden',
                cursor: 'pointer',
                transition: 'border-color 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = T.textTertiary}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = T.border}
            >
              <div style={{ height: '6px', background: project.color }} />

              <div style={{ padding: '14px 16px' }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '2px',
                      background: project.color
                    }} />
                    <div style={{ fontSize: '14px', fontWeight: '500', color: T.text }}>
                      {project.name}
                    </div>
                  </div>
                  <span style={{
                    fontSize: '9px',
                    padding: '2px 6px',
                    borderRadius: '3px',
                    background: project.status === 'active' ? '#2ecc71' : T.border,
                    color: 'white'
                  }}>
                    {project.status}
                  </span>
                </div>

                {/* Description */}
                {project.description && (
                  <div style={{
                    fontSize: '11px',
                    color: T.textTertiary,
                    marginBottom: '12px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical'
                  }}>
                    {project.description}
                  </div>
                )}

                {/* Progress */}
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '9px', color: T.textTertiary, textTransform: 'uppercase' }}>
                      Progress
                    </span>
                    <span style={{ fontSize: '9px', color: T.textTertiary }}>
                      {doneTasks}/{totalTasks} tasks done
                    </span>
                  </div>
                  <div style={{
                    height: '4px',
                    background: T.surfaceHover,
                    borderRadius: '2px',
                    overflow: 'hidden',
                    marginBottom: '6px'
                  }}>
                    <div style={{
                      width: `${progress}%`,
                      height: '100%',
                      background: project.color,
                      transition: 'width 0.3s'
                    }} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '4px', fontSize: '9px', color: T.textTertiary }}>
                    <div>To do: {project.status_counts?.todo || 0}</div>
                    <div>In prog: {project.status_counts?.['in-progress'] || 0}</div>
                    <div>Review: {project.status_counts?.['in-review'] || 0}</div>
                    <div>Blocked: {project.status_counts?.blocked || 0}</div>
                    <div>Done: {doneTasks}</div>
                  </div>
                </div>

                {/* Hours */}
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '9px', color: T.textTertiary, textTransform: 'uppercase' }}>
                      Hours used vs budget
                    </span>
                    {hoursBudget > 0 ? (
                      <span style={{
                        fontSize: '9px',
                        color: hoursPercent > 100 ? '#e74c3c' : hoursPercent > 80 ? '#f39c12' : T.textTertiary
                      }}>
                        {hoursUsed}h / {hoursBudget}h
                      </span>
                    ) : (
                      <span style={{ fontSize: '9px', color: T.textTertiary }}>
                        {hoursUsed}h / No budget
                      </span>
                    )}
                  </div>
                  {hoursBudget > 0 && (
                    <div style={{
                      height: '3px',
                      background: T.surfaceHover,
                      borderRadius: '2px',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        width: `${Math.min(hoursPercent, 100)}%`,
                        height: '100%',
                        background: hoursPercent > 100 ? '#e74c3c' : hoursPercent > 80 ? '#f39c12' : project.color,
                        transition: 'width 0.3s'
                      }} />
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex' }}>
                    {project.members?.slice(0, 4).map((member, idx) => (
                      <div
                        key={member.id}
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
                          marginLeft: idx > 0 ? '-6px' : 0,
                          border: `2px solid ${T.card}`
                        }}
                      >
                        {member.name[0]}
                      </div>
                    ))}
                    {project.members && project.members.length > 4 && (
                      <div style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        background: T.border,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: T.textTertiary,
                        fontSize: '9px',
                        marginLeft: '-6px',
                        border: `2px solid ${T.card}`
                      }}>
                        +{project.members.length - 4}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* New Project Card */}
        <div
          onClick={() => setShowNewProject(true)}
          style={{
            background: T.card,
            border: `1.5px dashed ${T.border}`,
            borderRadius: '10px',
            padding: '40px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            minHeight: '200px',
            transition: 'border-color 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.borderColor = T.primary}
          onMouseLeave={(e) => e.currentTarget.style.borderColor = T.border}
        >
          <Plus size={32} color={T.textTertiary} style={{ marginBottom: '8px' }} />
          <span style={{ fontSize: '13px', color: T.textSecondary }}>New project</span>
        </div>
      </div>

      {/* New Project Modal */}
      {showNewProject && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowNewProject(false);
          }}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.55)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <div style={{
            width: '480px',
            background: T.card,
            border: `0.5px solid ${T.border}`,
            borderRadius: '12px',
            overflow: 'hidden'
          }}>
            {/* Header */}
            <div style={{
              padding: '16px 20px',
              borderBottom: `0.5px solid ${T.border}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ fontSize: '15px', fontWeight: '500', color: T.text }}>
                New Project
              </div>
              <button
                onClick={() => setShowNewProject(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: T.textSecondary,
                  padding: '4px'
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: '20px' }}>
              {/* Name */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', marginBottom: '6px', color: T.text }}>
                  Name *
                </label>
                <input
                  type="text"
                  value={newProject.name}
                  onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                  placeholder="Project name"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: T.background,
                    border: `0.5px solid ${T.border}`,
                    borderRadius: '4px',
                    color: T.text,
                    fontSize: '13px',
                    outline: 'none'
                  }}
                />
              </div>

              {/* Color */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', marginBottom: '6px', color: T.text }}>
                  Color
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {presetColors.map(color => (
                    <div
                      key={color}
                      onClick={() => setNewProject({ ...newProject, color })}
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: color,
                        cursor: 'pointer',
                        border: newProject.color === color ? '3px solid white' : 'none',
                        boxShadow: newProject.color === color ? '0 0 0 1px rgba(0,0,0,0.1)' : 'none'
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Description */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', marginBottom: '6px', color: T.text }}>
                  Description
                </label>
                <textarea
                  value={newProject.description}
                  onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                  placeholder="What's this project about?"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: T.background,
                    border: `0.5px solid ${T.border}`,
                    borderRadius: '4px',
                    color: T.text,
                    fontSize: '13px',
                    outline: 'none',
                    resize: 'vertical',
                    minHeight: '80px',
                    fontFamily: 'inherit'
                  }}
                />
              </div>

              {/* Budget Hours */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', marginBottom: '6px', color: T.text }}>
                  Budget Hours
                </label>
                <input
                  type="number"
                  value={newProject.budget_hours}
                  onChange={(e) => setNewProject({ ...newProject, budget_hours: e.target.value })}
                  placeholder="Optional"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: T.background,
                    border: `0.5px solid ${T.border}`,
                    borderRadius: '4px',
                    color: T.text,
                    fontSize: '13px',
                    outline: 'none'
                  }}
                />
              </div>

              {/* Members */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', marginBottom: '6px', color: T.text }}>
                  Team Members
                </label>
                {members.map(member => {
                  const isChecked = newProject.member_ids.includes(member.id);
                  const isCurrentMember = member.id === currentMember.id;
                  return (
                    <label
                      key={member.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px',
                        cursor: isCurrentMember ? 'not-allowed' : 'pointer',
                        opacity: isCurrentMember ? 0.7 : 1
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        disabled={isCurrentMember}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setNewProject({
                              ...newProject,
                              member_ids: [...newProject.member_ids, member.id]
                            });
                          } else {
                            setNewProject({
                              ...newProject,
                              member_ids: newProject.member_ids.filter(id => id !== member.id)
                            });
                          }
                        }}
                        style={{ cursor: isCurrentMember ? 'not-allowed' : 'pointer' }}
                      />
                      <div style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        background: member.avatar_color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: '10px',
                        fontWeight: '600'
                      }}>
                        {member.name[0]}
                      </div>
                      <span style={{ fontSize: '12px', color: T.text }}>
                        {member.name} {isCurrentMember && '(you)'}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div style={{
              padding: '16px 20px',
              borderTop: `0.5px solid ${T.border}`,
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '8px'
            }}>
              <button
                onClick={() => setShowNewProject(false)}
                style={{
                  padding: '8px 16px',
                  background: 'transparent',
                  border: `0.5px solid ${T.border}`,
                  borderRadius: '4px',
                  color: T.text,
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateProject}
                disabled={!newProject.name.trim() || saving}
                style={{
                  padding: '8px 16px',
                  background: T.primary,
                  border: 'none',
                  borderRadius: '4px',
                  color: 'white',
                  fontSize: '12px',
                  cursor: newProject.name.trim() && !saving ? 'pointer' : 'not-allowed',
                  opacity: newProject.name.trim() && !saving ? 1 : 0.5
                }}
              >
                {saving ? 'Creating...' : 'Create Project'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
