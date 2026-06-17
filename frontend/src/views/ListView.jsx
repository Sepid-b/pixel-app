import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { X } from 'tabler-icons-react';

const statuses = ['todo', 'in-progress', 'in-review', 'blocked', 'done'];
const statusLabels = {
  'todo': 'To do',
  'in-progress': 'In progress',
  'in-review': 'In review',
  'blocked': 'Blocked',
  'done': 'Done'
};

const statusColors = {
  'todo': '#71717a',
  'in-progress': '#3b82f6',
  'in-review': '#f59e0b',
  'blocked': '#ef4444',
  'done': '#22c55e'
};

export default function ListView({ tasks, members, projects, currentMember, theme, filters, setFilters, onTasksChange }) {
  const [selectedTask, setSelectedTask] = useState(null);

  const filteredTasks = tasks.filter(task => {
    if (filters.member) {
      const hasAssignee = (task.assignees || []).some(a => a.id === filters.member);
      if (!hasAssignee) return false;
    }
    if (filters.project && task.project_id !== filters.project) return false;
    if (filters.priority && task.priority !== filters.priority) return false;
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      return task.title.toLowerCase().includes(searchLower);
    }
    return true;
  });

  const handleStatusClick = async (task, e) => {
    e.stopPropagation();

    const currentIndex = statuses.indexOf(task.status);
    const nextIndex = (currentIndex + 1) % statuses.length;
    const nextStatus = statuses[nextIndex];

    try {
      await api.updateTask(task.id, { status: nextStatus });
      await onTasksChange();
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  return (
    <div>
      <h1 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '24px' }}>List View</h1>

      <div style={{
        background: theme.surface,
        border: `0.5px solid ${theme.border}`,
        borderRadius: '8px',
        overflow: 'hidden'
      }}>
        {/* Table Header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '100px 1fr 200px 150px 100px 120px',
          gap: '16px',
          padding: '12px 16px',
          background: theme.surfaceHover,
          borderBottom: `0.5px solid ${theme.border}`,
          fontSize: '12px',
          fontWeight: '600',
          color: theme.textSecondary
        }}>
          <div>Status</div>
          <div>Task</div>
          <div>Project</div>
          <div>Assignee</div>
          <div>Priority</div>
          <div>Due</div>
        </div>

        {/* Table Rows */}
        <div>
          {filteredTasks.length === 0 ? (
            <div style={{
              padding: '32px',
              textAlign: 'center',
              color: theme.textSecondary,
              fontSize: '14px'
            }}>
              No tasks found
            </div>
          ) : (
            filteredTasks.map(task => {
              const project = task.project;
              const assignees = task.assignees || [];
              const isDone = task.status === 'done';

              return (
                <div
                  key={task.id}
                  onClick={() => setSelectedTask(task)}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '100px 1fr 200px 150px 100px 120px',
                    gap: '16px',
                    padding: '12px 16px',
                    borderBottom: `0.5px solid ${theme.border}`,
                    cursor: 'pointer',
                    transition: 'background 0.15s',
                    textDecoration: isDone ? 'line-through' : 'none',
                    opacity: isDone ? 0.6 : 1
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = theme.surfaceHover}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  {/* Status */}
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div
                      onClick={(e) => handleStatusClick(task, e)}
                      style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        background: statusColors[task.status],
                        cursor: 'pointer',
                        transition: 'transform 0.15s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.2)'}
                      onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                      title={`Click to change status (currently: ${statusLabels[task.status]})`}
                    />
                  </div>

                  {/* Task */}
                  <div style={{
                    fontSize: '13px',
                    color: theme.text,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <span>{task.title}</span>
                    {task.tags && task.tags.length > 0 && (
                      <div style={{ display: 'flex', gap: '4px' }}>
                        {task.tags.slice(0, 2).map(tag => (
                          <span
                            key={tag.id}
                            style={{
                              padding: '2px 6px',
                              background: tag.color + '20',
                              color: tag.color,
                              fontSize: '10px',
                              borderRadius: '3px'
                            }}
                          >
                            {tag.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Project */}
                  <div style={{
                    fontSize: '13px',
                    color: theme.textSecondary,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    {project && (
                      <>
                        <div style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '2px',
                          background: project.color
                        }} />
                        <span>{project.name}</span>
                      </>
                    )}
                  </div>

                  {/* Assignees */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {assignees.slice(0, 2).map((assignee, i) => (
                      <div
                        key={assignee.id}
                        style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          background: assignee.avatar_color,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontSize: '11px',
                          fontWeight: '600',
                          marginLeft: i > 0 ? '-8px' : '0',
                          border: `1.5px solid ${theme.surface}`,
                          zIndex: 10 - i
                        }}
                        title={assignee.name}
                      >
                        {assignee.name[0]}
                      </div>
                    ))}
                    {assignees.length > 2 && (
                      <span style={{ fontSize: '11px', color: theme.textSecondary, marginLeft: '4px' }}>
                        +{assignees.length - 2}
                      </span>
                    )}
                  </div>

                  {/* Priority */}
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    {task.priority && (
                      <span style={{
                        padding: '3px 8px',
                        background: task.priority === 'high' ? '#dc262620' : task.priority === 'medium' ? '#f5900020' : '#22c55e20',
                        color: task.priority === 'high' ? '#dc2626' : task.priority === 'medium' ? '#f59009' : '#22c55e',
                        fontSize: '11px',
                        borderRadius: '4px',
                        fontWeight: '500',
                        textTransform: 'capitalize'
                      }}>
                        {task.priority}
                      </span>
                    )}
                  </div>

                  {/* Due date */}
                  <div style={{
                    fontSize: '13px',
                    color: theme.textSecondary,
                    display: 'flex',
                    alignItems: 'center'
                  }}>
                    {task.due_date && (
                      new Date(task.due_date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          theme={theme}
          members={members}
          projects={projects}
          currentMember={currentMember}
          onClose={() => setSelectedTask(null)}
          onSave={async () => {
            await onTasksChange();
            setSelectedTask(null);
          }}
        />
      )}
    </div>
  );
}

function TaskDetailModal({ task, theme, members, projects, currentMember, onClose, onSave }) {
  const [formData, setFormData] = useState({
    title: task.title || '',
    description: task.description || '',
    status: task.status || 'todo',
    priority: task.priority || '',
    project_id: task.project_id || '',
    due_date: task.due_date || '',
    hours: task.hours || ''
  });
  const [assignees, setAssignees] = useState([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadAssignees();
  }, [task.id]);

  const loadAssignees = async () => {
    try {
      const data = await api.getAssignees(task.id);
      setAssignees(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load assignees:', error);
    }
  };

  const addAssignee = async (memberId) => {
    try {
      const data = await api.addAssignee(task.id, memberId);
      setAssignees(prev => [...prev, data]);
    } catch (error) {
      console.error('Failed to add assignee:', error);
    }
  };

  const removeAssignee = async (memberId) => {
    try {
      await api.removeAssignee(task.id, memberId);
      setAssignees(prev => prev.filter(a => a.id !== memberId));
    } catch (error) {
      console.error('Failed to remove assignee:', error);
    }
  };

  const statuses = ['todo', 'in-progress', 'in-review', 'blocked', 'done'];
  const statusLabels = {
    'todo': 'To do',
    'in-progress': 'In progress',
    'in-review': 'In review',
    'blocked': 'Blocked',
    'done': 'Done'
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');

    try {
      await api.updateTask(task.id, formData);
      await onSave();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}
    onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: theme.surface,
          borderRadius: '8px',
          padding: '24px',
          width: '500px',
          maxHeight: '80vh',
          overflowY: 'auto'
        }}
      >
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px'
        }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>Edit Task</h2>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '6px' }}>
            Title
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            style={{
              width: '100%',
              padding: '8px 12px',
              background: theme.background,
              border: `0.5px solid ${theme.border}`,
              borderRadius: '4px',
              color: theme.text,
              fontSize: '13px',
              outline: 'none'
            }}
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '6px' }}>
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={3}
            style={{
              width: '100%',
              padding: '8px 12px',
              background: theme.background,
              border: `0.5px solid ${theme.border}`,
              borderRadius: '4px',
              color: theme.text,
              fontSize: '13px',
              outline: 'none',
              fontFamily: 'inherit',
              resize: 'vertical'
            }}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '6px' }}>
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              style={{
                width: '100%',
                padding: '8px 12px',
                background: theme.background,
                border: `0.5px solid ${theme.border}`,
                borderRadius: '4px',
                color: theme.text,
                fontSize: '13px',
                outline: 'none'
              }}
            >
              {statuses.map(status => (
                <option key={status} value={status}>{statusLabels[status]}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '6px' }}>
              Priority
            </label>
            <select
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              style={{
                width: '100%',
                padding: '8px 12px',
                background: theme.background,
                border: `0.5px solid ${theme.border}`,
                borderRadius: '4px',
                color: theme.text,
                fontSize: '13px',
                outline: 'none'
              }}
            >
              <option value="">None</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '6px' }}>
              Project
            </label>
            <select
              value={formData.project_id}
              onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
              style={{
                width: '100%',
                padding: '8px 12px',
                background: theme.background,
                border: `0.5px solid ${theme.border}`,
                borderRadius: '4px',
                color: theme.text,
                fontSize: '13px',
                outline: 'none'
              }}
            >
              <option value="">None</option>
              {projects.map(project => (
                <option key={project.id} value={project.id}>{project.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '6px' }}>
              Assignees
            </label>
            <div style={{display:'flex', flexWrap:'wrap', gap:4, marginBottom:6}}>
              {assignees.map(a => (
                <div key={a.id} style={{
                  display:'flex', alignItems:'center', gap:5,
                  padding:'3px 8px', borderRadius:20,
                  background: theme.surfaceHover,
                  border: `0.5px solid ${theme.border}`,
                  fontSize:11
                }}>
                  <div style={{
                    width:14, height:14, borderRadius:'50%',
                    background: a.avatar_color,
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:7, fontWeight:600, color:'#fff'
                  }}>{a.name[0].toUpperCase()}</div>
                  <span style={{color:theme.text}}>{a.name}</span>
                  <button type="button" onClick={() => removeAssignee(a.id)} style={{
                    background:'transparent', border:'none', cursor:'pointer',
                    padding:0, display:'flex', color:theme.textSecondary
                  }}>
                    <X size={12}/>
                  </button>
                </div>
              ))}
            </div>
            <select
              value=""
              onChange={async (e) => {
                if (!e.target.value) return;
                await addAssignee(e.target.value);
                e.target.value = '';
              }}
              style={{
                width: '100%',
                padding: '8px 12px',
                background: theme.background,
                border: `0.5px solid ${theme.border}`,
                borderRadius: '4px',
                color: theme.text,
                fontSize: '13px',
                outline: 'none'
              }}
            >
              <option value="">+ Add assignee</option>
              {members.filter(m => !assignees.find(a => a.id === m.id)).map(member => (
                <option key={member.id} value={member.id}>{member.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '6px' }}>
              Due date
            </label>
            <input
              type="date"
              value={formData.due_date}
              onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              style={{
                width: '100%',
                padding: '8px 12px',
                background: theme.background,
                border: `0.5px solid ${theme.border}`,
                borderRadius: '4px',
                color: theme.text,
                fontSize: '13px',
                outline: 'none'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '6px' }}>
              Hours
            </label>
            <input
              type="number"
              step="0.5"
              value={formData.hours}
              onChange={(e) => setFormData({ ...formData, hours: e.target.value })}
              style={{
                width: '100%',
                padding: '8px 12px',
                background: theme.background,
                border: `0.5px solid ${theme.border}`,
                borderRadius: '4px',
                color: theme.text,
                fontSize: '13px',
                outline: 'none'
              }}
            />
          </div>
        </div>

        {error && (
          <div style={{
            padding: '12px',
            background: '#7f1d1d',
            border: '0.5px solid #991b1b',
            borderRadius: '4px',
            color: '#fecaca',
            fontSize: '13px',
            marginBottom: '16px'
          }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 16px',
              background: 'transparent',
              border: `0.5px solid ${theme.border}`,
              borderRadius: '4px',
              color: theme.text,
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: '8px 16px',
              background: theme.primary,
              border: 'none',
              borderRadius: '4px',
              color: 'white',
              fontSize: '13px',
              fontWeight: '500',
              cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.7 : 1
            }}
          >
            {saving ? 'Saving...' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
