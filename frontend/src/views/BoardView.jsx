import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api';
import { supabase } from '../supabaseClient';
import { Plus, X, Search, CalendarEvent, Clock, MessageCircle, File, Tag, ChevronDown, Link, Upload, FileText, Download, Copy, Check } from 'tabler-icons-react';

const statuses = ['todo', 'in-progress', 'in-review', 'blocked', 'done'];
const statusLabels = {
  'todo': 'To do',
  'in-progress': 'In progress',
  'in-review': 'In review',
  'blocked': 'Blocked',
  'done': 'Done'
};

export default function BoardView({ tasks, members, projects, setProjects, currentMember, theme, filters, setFilters, sidebarFilter, setSidebarFilter, onTasksChange, currentWorkspace }) {
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [draggedTask, setDraggedTask] = useState(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);
  const [tags, setTags] = useState([]);
  const [copiedInvite, setCopiedInvite] = useState(false);

  useEffect(() => {
    if (currentWorkspace) {
      loadTags();
    }
  }, [currentWorkspace]);

  const loadTags = async () => {
    if (!currentWorkspace) return;
    try {
      const data = await api.getTags(currentWorkspace.id);
      setTags(data);
    } catch (error) {
      console.error('Failed to load tags:', error);
    }
  };

  const filteredTasks = tasks.filter(task => {
    // Sidebar filters
    if (sidebarFilter === 'my-tasks') {
      const isAssignedToMe = (task.assignees || []).some(a => a.id === currentMember.id);
      if (!isAssignedToMe) return false;
    }
    if (sidebarFilter === 'due-this-week') {
      if (!task.due_date) return false;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const sunday = new Date(today);
      sunday.setDate(today.getDate() + (7 - today.getDay()));
      const dueDate = new Date(task.due_date);
      if (dueDate < today || dueDate > sunday) return false;
    }

    // Toolbar filters
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

  const getTasksByStatus = (status) => {
    return filteredTasks.filter(task => task.status === status)
      .sort((a, b) => a.position - b.position);
  };

  const handleDragStart = (e, task) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, status) => {
    e.preventDefault();
    setDragOverColumn(status);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = async (e, newStatus) => {
    e.preventDefault();
    setDragOverColumn(null);

    if (!draggedTask) return;

    try {
      const tasksInColumn = filteredTasks.filter(t => t.status === newStatus);
      const newPosition = tasksInColumn.length;

      await api.moveTask(draggedTask.id, newStatus, newPosition);
      await onTasksChange();
    } catch (error) {
      console.error('Failed to move task:', error);
    }

    setDraggedTask(null);
  };

  const handleCopyInviteCode = () => {
    if (currentWorkspace?.invite_code) {
      navigator.clipboard.writeText(currentWorkspace.invite_code);
      setCopiedInvite(true);
      setTimeout(() => setCopiedInvite(false), 2000);
    }
  };

  return (
    <div>
      {/* Toolbar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '24px'
      }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <Dropdown
            label="Member"
            value={filters.member}
            onChange={(value) => setFilters({ ...filters, member: value })}
            options={[
              { value: null, label: 'All members' },
              ...members.map(m => ({ value: m.id, label: m.name }))
            ]}
            theme={theme}
          />

          <Dropdown
            label="Project"
            value={filters.project}
            onChange={(value) => setFilters({ ...filters, project: value })}
            options={[
              { value: null, label: 'All projects' },
              ...projects.map(p => ({ value: p.id, label: p.name }))
            ]}
            theme={theme}
          />

          <Dropdown
            label="Priority"
            value={filters.priority}
            onChange={(value) => setFilters({ ...filters, priority: value })}
            options={[
              { value: null, label: 'All priorities' },
              { value: 'low', label: 'Low' },
              { value: 'medium', label: 'Medium' },
              { value: 'high', label: 'High' }
            ]}
            theme={theme}
          />

          <div style={{ position: 'relative' }}>
            <Search size={16} style={{
              position: 'absolute',
              left: '10px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: theme.textTertiary
            }} />
            <input
              type="text"
              placeholder="Search tasks..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              style={{
                padding: '6px 12px 6px 32px',
                background: theme.surface,
                border: `0.5px solid ${theme.border}`,
                borderRadius: '4px',
                color: theme.text,
                fontSize: '13px',
                outline: 'none',
                width: '200px'
              }}
            />
          </div>
        </div>

        <button
          onClick={() => setShowNewTaskModal(true)}
          style={{
            padding: '6px 12px',
            background: theme.primary,
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '13px',
            fontWeight: '500',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
        >
          <Plus size={16} />
          New task
        </button>
      </div>

      {/* Sidebar Filter Indicator */}
      {sidebarFilter && (
        <div style={{
          padding: '8px 12px',
          background: theme.surface,
          border: `0.5px solid ${theme.border}`,
          borderRadius: '4px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '13px'
        }}>
          <span style={{ color: theme.textSecondary }}>
            Showing: <span style={{ color: theme.text, fontWeight: '500' }}>
              {sidebarFilter === 'my-tasks' ? 'My tasks' : 'Due this week'}
            </span>
          </span>
          <button
            onClick={() => setSidebarFilter(null)}
            style={{
              background: 'transparent',
              border: 'none',
              color: theme.primary,
              fontSize: '13px',
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            Clear
          </button>
        </div>
      )}

      {/* Welcome Card - Show when no tasks exist */}
      {filteredTasks.length === 0 && !sidebarFilter && !filters.member && !filters.project && !filters.priority && !filters.search && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '500px'
        }}>
          <div style={{
            maxWidth: '500px',
            background: theme.card,
            border: `.5px solid ${theme.border}`,
            borderRadius: '16px',
            padding: '40px',
            textAlign: 'center'
          }}>
            <div style={{
              width: 80,
              height: 80,
              background: theme.primary,
              borderRadius: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px',
              fontSize: '40px'
            }}>
              🎯
            </div>

            <h2 style={{
              fontSize: '24px',
              fontWeight: '600',
              color: theme.text,
              marginBottom: '8px'
            }}>
              Welcome to {currentWorkspace?.name || 'your workspace'}!
            </h2>

            <p style={{
              fontSize: '14px',
              color: theme.textSecondary,
              marginBottom: '32px'
            }}>
              Get started by creating your first task or inviting your team
            </p>

            {/* Getting Started Checklist */}
            <div style={{
              background: theme.surface,
              border: `.5px solid ${theme.border}`,
              borderRadius: '12px',
              padding: '24px',
              textAlign: 'left',
              marginBottom: '24px'
            }}>
              <h3 style={{
                fontSize: '14px',
                fontWeight: '600',
                color: theme.text,
                marginBottom: '16px'
              }}>
                Getting started
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    background: 'rgba(124,107,240,0.15)',
                    border: '2px solid #7c6bf0',
                    flexShrink: 0,
                    marginTop: '2px'
                  }}></div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: '500', color: theme.text, marginBottom: '2px' }}>
                      Create your first task
                    </div>
                    <div style={{ fontSize: '12px', color: theme.textSecondary }}>
                      Click "New task" to add work items to track
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    background: 'rgba(124,107,240,0.15)',
                    border: '2px solid #7c6bf0',
                    flexShrink: 0,
                    marginTop: '2px'
                  }}></div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: '500', color: theme.text, marginBottom: '2px' }}>
                      Invite your team
                    </div>
                    <div style={{ fontSize: '12px', color: theme.textSecondary }}>
                      Share your invite code to collaborate
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    background: 'rgba(124,107,240,0.15)',
                    border: '2px solid #7c6bf0',
                    flexShrink: 0,
                    marginTop: '2px'
                  }}></div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: '500', color: theme.text, marginBottom: '2px' }}>
                      Explore the features
                    </div>
                    <div style={{ fontSize: '12px', color: theme.textSecondary }}>
                      Check out Projects, Standup, and Time tracking
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Invite Code Section */}
            {currentWorkspace?.invite_code && (
              <div style={{
                background: theme.surface,
                border: `.5px solid ${theme.border}`,
                borderRadius: '12px',
                padding: '20px',
                marginBottom: '24px'
              }}>
                <div style={{
                  fontSize: '12px',
                  fontWeight: '600',
                  color: theme.textSecondary,
                  marginBottom: '8px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Your workspace invite code
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: theme.background,
                  border: `.5px solid ${theme.border}`,
                  borderRadius: '8px',
                  padding: '12px 16px'
                }}>
                  <code style={{
                    fontSize: '18px',
                    fontWeight: '600',
                    fontFamily: 'monospace',
                    letterSpacing: '2px',
                    color: theme.primary
                  }}>
                    {currentWorkspace.invite_code}
                  </code>
                  <button
                    onClick={handleCopyInviteCode}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      color: copiedInvite ? '#22c55e' : theme.textSecondary,
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      transition: 'color 0.15s'
                    }}
                  >
                    {copiedInvite ? <Check size={20} /> : <Copy size={20} />}
                  </button>
                </div>
              </div>
            )}

            {/* Create Task Button */}
            <button
              onClick={() => setShowNewTaskModal(true)}
              style={{
                width: '100%',
                padding: '12px 16px',
                background: theme.primary,
                border: 'none',
                borderRadius: '8px',
                color: 'white',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'background 0.15s'
              }}
              onMouseEnter={e => e.currentTarget.style.background = theme.primaryHover}
              onMouseLeave={e => e.currentTarget.style.background = theme.primary}
            >
              <Plus size={18} />
              Create your first task
            </button>
          </div>
        </div>
      )}

      {/* Board Columns */}
      {(filteredTasks.length > 0 || sidebarFilter || filters.member || filters.project || filters.priority || filters.search) && (
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(5, 1fr)',
        gap: '16px'
      }}>
        {statuses.map(status => (
          <div
            key={status}
            onDragOver={(e) => handleDragOver(e, status)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, status)}
            style={{
              background: dragOverColumn === status ? theme.surfaceHover : 'transparent',
              borderRadius: '8px',
              padding: '8px',
              minHeight: '500px',
              transition: 'background 0.15s'
            }}
          >
            <div style={{
              fontSize: '13px',
              fontWeight: '600',
              color: theme.textSecondary,
              marginBottom: '12px',
              padding: '0 4px'
            }}>
              {statusLabels[status]}
              <span style={{ marginLeft: '4px', color: theme.textTertiary }}>
                {getTasksByStatus(status).length}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {getTasksByStatus(status).map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  theme={theme}
                  onClick={() => setSelectedTask(task)}
                  onDragStart={handleDragStart}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
      )}

      {showNewTaskModal && (
        <NewTaskModal
          theme={theme}
          members={members}
          projects={projects}
          currentMember={currentMember}
          currentWorkspace={currentWorkspace}
          onClose={() => setShowNewTaskModal(false)}
          onSave={onTasksChange}
        />
      )}

      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          theme={theme}
          members={members}
          projects={projects}
          setProjects={setProjects}
          tags={tags}
          setTags={setTags}
          currentMember={currentMember}
          onClose={() => setSelectedTask(null)}
          onSave={onTasksChange}
        />
      )}
    </div>
  );
}

function ProjectDropdown({ value, onChange, projects, theme, onNewProject }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedProject = projects.find(p => p.id === value);

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          padding: '6px 10px',
          background: theme.background,
          border: `0.5px solid ${theme.border}`,
          borderRadius: '4px',
          color: theme.text,
          fontSize: '12px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          textAlign: 'left'
        }}
      >
        <span>{selectedProject ? selectedProject.name : 'None'}</span>
        <ChevronDown size={14} />
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 4px)',
          left: 0,
          right: 0,
          background: theme.surface,
          border: `0.5px solid ${theme.border}`,
          borderRadius: '6px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 1000,
          maxHeight: '250px',
          overflowY: 'auto'
        }}>
          <div
            onClick={() => {
              onChange('');
              setIsOpen(false);
            }}
            style={{
              padding: '8px 12px',
              fontSize: '12px',
              cursor: 'pointer',
              background: value === '' ? theme.surfaceHover : 'transparent',
              color: theme.text
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = theme.surfaceHover}
            onMouseLeave={(e) => {
              if (value !== '') {
                e.currentTarget.style.background = 'transparent';
              }
            }}
          >
            None
          </div>
          {projects.map(project => (
            <div
              key={project.id}
              onClick={() => {
                onChange(project.id);
                setIsOpen(false);
              }}
              style={{
                padding: '8px 12px',
                fontSize: '12px',
                cursor: 'pointer',
                background: value === project.id ? theme.surfaceHover : 'transparent',
                color: theme.text,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = theme.surfaceHover}
              onMouseLeave={(e) => {
                if (value !== project.id) {
                  e.currentTarget.style.background = 'transparent';
                }
              }}
            >
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '2px',
                background: project.color
              }} />
              {project.name}
            </div>
          ))}
          <div
            onClick={() => {
              setIsOpen(false);
              onNewProject();
            }}
            style={{
              padding: '8px 12px',
              fontSize: '12px',
              cursor: 'pointer',
              background: 'transparent',
              color: theme.primary,
              borderTop: `0.5px solid ${theme.border}`,
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = theme.surfaceHover}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            <Plus size={14} />
            New project
          </div>
        </div>
      )}
    </div>
  );
}

function TaskCard({ task, theme, onClick, onDragStart }) {
  const project = task.project;
  const assignees = task.assignees || [];

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, task)}
      onClick={onClick}
      style={{
        background: theme.surface,
        border: `0.5px solid ${theme.border}`,
        borderLeft: `3px solid ${project?.color || '#3f3f46'}`,
        borderRadius: '6px',
        padding: '12px',
        cursor: 'pointer',
        transition: 'all 0.15s'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {project && (
        <div style={{ fontSize: '9px', color: theme.textTertiary, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {project.name}
        </div>
      )}
      <div style={{ fontSize: '13px', fontWeight: '500', marginBottom: '8px', color: theme.text, display: 'flex', alignItems: 'center', gap: '6px' }}>
        {task.priority && (
          <div style={{
            width: '5px',
            height: '5px',
            borderRadius: '50%',
            background: task.priority === 'high' ? '#e74c3c' : task.priority === 'medium' ? '#f39c12' : '#2ecc71',
            flexShrink: 0
          }} />
        )}
        {task.title}
      </div>

      {task.tags && task.tags.length > 0 && (
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '8px' }}>
          {task.tags.map(tag => (
            <span
              key={tag.id}
              style={{
                padding: '2px 6px',
                background: tag.color + '20',
                color: tag.color,
                fontSize: '11px',
                borderRadius: '3px'
              }}
            >
              {tag.name}
            </span>
          ))}
        </div>
      )}

      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '12px',
        color: theme.textTertiary
      }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {task.priority && (
            <span style={{
              padding: '2px 6px',
              background: task.priority === 'high' ? '#dc262620' : task.priority === 'medium' ? '#f5900020' : '#22c55e20',
              color: task.priority === 'high' ? '#dc2626' : task.priority === 'medium' ? '#f59009' : '#22c55e',
              fontSize: '10px',
              borderRadius: '3px',
              fontWeight: '500'
            }}>
              {task.priority}
            </span>
          )}
          {task.due_date && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '2px',
              color: new Date(task.due_date) < new Date() ? '#ef4444' : theme.textTertiary,
              fontSize: '9px'
            }}>
              <CalendarEvent size={12} />
              {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </div>
          )}
          {task.hours && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
              <Clock size={12} />
              {task.hours}h
            </div>
          )}
          {task.comment_count > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '2px', fontSize: '10px' }}>
              <MessageCircle size={12} />
              {task.comment_count}
            </div>
          )}
          {task.doc_count > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '2px', fontSize: '10px' }}>
              <File size={12} />
              {task.doc_count}
            </div>
          )}
        </div>

        {/* Assignees */}
        <div style={{display:'flex', alignItems:'center', marginLeft:'auto'}}>
          {assignees.slice(0, 3).map((assignee, i) => (
            <div key={assignee.id} style={{
              width:18, height:18, borderRadius:'50%',
              background: assignee.avatar_color,
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:7, fontWeight:600, color:'#fff',
              marginLeft: i === 0 ? 0 : -4,
              border:`1.5px solid ${theme.surface}`,
              zIndex: 10 - i
            }}>{assignee.name[0].toUpperCase()}</div>
          ))}
          {assignees.length > 3 && (
            <div style={{
              width:18, height:18, borderRadius:'50%',
              background: theme.textTertiary,
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:7, fontWeight:600, color:'#fff',
              marginLeft: -4,
              border:`1.5px solid ${theme.surface}`,
              zIndex: 5
            }}>+{assignees.length - 3}</div>
          )}
        </div>
      </div>
    </div>
  );
}

function Dropdown({ label, value, onChange, options, theme }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          padding: '6px 12px',
          background: theme.surface,
          border: `0.5px solid ${theme.border}`,
          borderRadius: '4px',
          color: theme.text,
          fontSize: '13px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          minWidth: '120px'
        }}
      >
        <span style={{ flex: 1, textAlign: 'left' }}>{selectedOption?.label || label}</span>
        <ChevronDown size={14} />
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 4px)',
          left: 0,
          background: theme.surface,
          border: `0.5px solid ${theme.border}`,
          borderRadius: '6px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          minWidth: '180px',
          zIndex: 1000,
          maxHeight: '300px',
          overflowY: 'auto'
        }}>
          {options.map(option => (
            <div
              key={String(option.value)}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              style={{
                padding: '8px 12px',
                fontSize: '13px',
                cursor: 'pointer',
                background: value === option.value ? theme.surfaceHover : 'transparent',
                color: theme.text
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = theme.surfaceHover}
              onMouseLeave={(e) => {
                if (value !== option.value) {
                  e.currentTarget.style.background = 'transparent';
                }
              }}
            >
              {option.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function NewTaskModal({ theme, members, projects, currentMember, currentWorkspace, onClose, onSave }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'todo',
    priority: '',
    project_id: '',
    assignees: [],
    due_date: '',
    hours: '',
    created_by: currentMember.id,
    workspace_id: currentWorkspace?.id
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setError('Title is required');
      return;
    }

    setSaving(true);
    setError('');

    try {
      await api.createTask(formData);
      await onSave();
      onClose();
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
          <h2 style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>New Task</h2>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: theme.textSecondary,
              padding: '4px'
            }}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '6px' }}>
              Title *
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
                {projects && projects.length > 0 ? (
                  projects.map(project => (
                    <option key={project.id} value={project.id}>{project.name}</option>
                  ))
                ) : (
                  <option disabled>No projects yet — create one in Projects</option>
                )}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '6px' }}>
                Assignees
              </label>
              <div style={{display:'flex', flexWrap:'wrap', gap:4, marginBottom:6}}>
                {formData.assignees.map(memberId => {
                  const member = members.find(m => m.id === memberId);
                  return member ? (
                    <div key={member.id} style={{
                      display:'flex', alignItems:'center', gap:5,
                      padding:'3px 8px', borderRadius:20,
                      background: theme.surfaceHover,
                      border: `0.5px solid ${theme.border}`,
                      fontSize:11
                    }}>
                      <div style={{
                        width:14, height:14, borderRadius:'50%',
                        background: member.avatar_color,
                        display:'flex', alignItems:'center', justifyContent:'center',
                        fontSize:7, fontWeight:600, color:'#fff'
                      }}>{member.name[0].toUpperCase()}</div>
                      <span style={{color:theme.text}}>{member.name}</span>
                      <button type="button" onClick={() => {
                        setFormData({...formData, assignees: formData.assignees.filter(id => id !== memberId)});
                      }} style={{
                        background:'transparent', border:'none', cursor:'pointer',
                        padding:0, display:'flex', color:theme.textSecondary
                      }}>
                        <X size={12}/>
                      </button>
                    </div>
                  ) : null;
                })}
              </div>
              <select
                value=""
                onChange={(e) => {
                  if (e.target.value && !formData.assignees.includes(e.target.value)) {
                    setFormData({...formData, assignees: [...formData.assignees, e.target.value]});
                  }
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
                {members.filter(m => !formData.assignees.includes(m.id)).map(member => (
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
              type="submit"
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
              {saving ? 'Creating...' : 'Create task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TaskDetailModal({ task, theme, members, projects, setProjects, tags, setTags, currentMember, onClose, onSave }) {
  const [formData, setFormData] = useState({
    title: task.title || '',
    description: task.description || '',
    status: task.status || 'todo',
    priority: task.priority || '',
    project_id: task.project_id || '',
    due_date: task.due_date || '',
    hours: task.hours || ''
  });
  const [comments, setComments] = useState([]);
  const [docs, setDocs] = useState([]);
  const [assignees, setAssignees] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [newDocUrl, setNewDocUrl] = useState('');
  const [newDocTitle, setNewDocTitle] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [docMode, setDocMode] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  // Fix 2: New project modal state
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [newProjectForm, setNewProjectForm] = useState({ name: '', color: '#7c6bf0' });
  const [projectError, setProjectError] = useState('');
  const [savingProject, setSavingProject] = useState(false);

  // Fix 3: @mention state
  const [showMentions, setShowMentions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [mentionIndex, setMentionIndex] = useState(0);
  const commentInputRef = useRef(null);

  // Fix 4: New tag state
  const [showNewTag, setShowNewTag] = useState(false);
  const [newTagForm, setNewTagForm] = useState({ name: '', color: '#a259ff' });
  const [tagError, setTagError] = useState('');
  const [savingTag, setSavingTag] = useState(false);

  // Local state for instant UI updates
  const [localTaskTags, setLocalTaskTags] = useState(task.tags || []);

  useEffect(() => {
    loadComments();
    loadDocs();
    loadAssignees();
  }, [task.id]);

  // Sync localTaskTags when task.tags changes from parent
  useEffect(() => {
    setLocalTaskTags(task.tags || []);
  }, [task.tags]);

  const loadComments = async () => {
    try {
      const data = await api.getComments(task.id);
      setComments(data);
    } catch (error) {
      console.error('Failed to load comments:', error);
    }
  };

  const loadDocs = async () => {
    try {
      const data = await api.getDocs(task.id);
      setDocs(data);
    } catch (error) {
      console.error('Failed to load docs:', error);
    }
  };

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

  const handleSave = async () => {
    setSaving(true);
    setError('');

    try {
      await api.updateTask(task.id, formData);
      await onSave();
      onClose();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    try {
      await api.createComment(task.id, newComment, currentMember.id);
      setNewComment('');
      await loadComments();
    } catch (error) {
      console.error('Failed to add comment:', error);
    }
  };

  const handleAddDoc = async () => {
    if (!newDocUrl.trim()) return;

    try {
      await api.createDoc(task.id, newDocUrl, newDocTitle, currentMember.id);
      setNewDocUrl('');
      setNewDocTitle('');
      await loadDocs();
    } catch (error) {
      console.error('Failed to add doc:', error);
    }
  };

  const handleDeleteDoc = async (docId) => {
    try {
      await api.deleteDoc(docId);
      await loadDocs();
    } catch (error) {
      console.error('Failed to delete doc:', error);
    }
  };

  const handleToggleTag = async (tagId) => {
    const hasTag = localTaskTags.some(t => t.id === tagId);
    const tagToToggle = tags.find(t => t.id === tagId);

    // Optimistic update - update UI immediately
    if (hasTag) {
      setLocalTaskTags(localTaskTags.filter(t => t.id !== tagId));
    } else {
      setLocalTaskTags([...localTaskTags, tagToToggle]);
    }

    // Make API call in background
    try {
      if (hasTag) {
        await api.removeTaskTag(task.id, tagId);
      } else {
        await api.addTaskTag(task.id, tagId);
      }
      await onSave();
    } catch (error) {
      console.error('Failed to toggle tag:', error);

      // Don't revert on duplicate key error (tag already exists)
      const isDuplicateError = error.message?.includes('duplicate key') || error.message?.includes('already exists');

      if (!isDuplicateError) {
        // Only revert on real errors, not duplicate key
        if (hasTag) {
          setLocalTaskTags([...localTaskTags, tagToToggle]);
        } else {
          setLocalTaskTags(localTaskTags.filter(t => t.id !== tagId));
        }
      } else {
        // Duplicate error when adding means it's already there, so keep it in applied
        // Duplicate error when removing is rare but reload to sync
        await onSave();
      }
    }
  };

  // Fix 2: Create new project
  const handleCreateProject = async () => {
    if (!newProjectForm.name.trim()) {
      setProjectError('Project name is required');
      return;
    }

    setSavingProject(true);
    setProjectError('');

    try {
      const newProject = await api.createProject(newProjectForm);
      setProjects([...projects, newProject]);
      setFormData({ ...formData, project_id: newProject.id });
      setShowNewProjectModal(false);
      setNewProjectForm({ name: '', color: '#7c6bf0' });
    } catch (err) {
      setProjectError(err.message);
    } finally {
      setSavingProject(false);
    }
  };

  // Fix 3: Handle @mention in comment input
  const handleCommentChange = (e) => {
    const value = e.target.value;
    setNewComment(value);

    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = value.slice(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtIndex !== -1 && lastAtIndex === textBeforeCursor.length - 1) {
      // Just typed @
      setShowMentions(true);
      setMentionSearch('');
      setMentionIndex(0);
    } else if (lastAtIndex !== -1) {
      const afterAt = textBeforeCursor.slice(lastAtIndex + 1);
      if (!afterAt.includes(' ')) {
        // Still typing a mention
        setShowMentions(true);
        setMentionSearch(afterAt.toLowerCase());
        setMentionIndex(0);
      } else {
        setShowMentions(false);
      }
    } else {
      setShowMentions(false);
    }
  };

  const handleMentionSelect = (member) => {
    const cursorPos = commentInputRef.current.selectionStart;
    const textBeforeCursor = newComment.slice(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    const beforeMention = newComment.slice(0, lastAtIndex);
    const afterCursor = newComment.slice(cursorPos);

    const newText = beforeMention + '@' + member.name + ' ' + afterCursor;
    setNewComment(newText);
    setShowMentions(false);
    setMentionSearch('');

    setTimeout(() => {
      commentInputRef.current?.focus();
    }, 0);
  };

  const handleMentionKeyDown = (e) => {
    if (!showMentions) return;

    const filteredMembers = members.filter(m =>
      m.name.toLowerCase().includes(mentionSearch)
    );

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setMentionIndex((prev) => (prev + 1) % filteredMembers.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setMentionIndex((prev) => (prev - 1 + filteredMembers.length) % filteredMembers.length);
    } else if (e.key === 'Enter' && filteredMembers.length > 0) {
      e.preventDefault();
      handleMentionSelect(filteredMembers[mentionIndex]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setShowMentions(false);
    }
  };

  // Fix 4: Create new tag
  const handleCreateTag = async () => {
    if (!newTagForm.name.trim()) {
      setTagError('Tag name is required');
      return;
    }

    setSavingTag(true);
    setTagError('');

    let newTag = null;
    try {
      newTag = await api.createTag(newTagForm);
      setTags([...tags, newTag]);

      // Optimistically add to localTaskTags immediately
      setLocalTaskTags([...localTaskTags, newTag]);

      await api.addTaskTag(task.id, newTag.id);
      await onSave();
      setShowNewTag(false);
      setNewTagForm({ name: '', color: '#a259ff' });
    } catch (err) {
      setTagError(err.message);
      // Revert optimistic update on error (if tag was created)
      if (newTag) {
        setLocalTaskTags(localTaskTags.filter(t => t.id !== newTag.id));
      }
    } finally {
      setSavingTag(false);
    }
  };

  // Helper to render comment with @mentions highlighted
  const renderCommentWithMentions = (text) => {
    const parts = text.split(/(@\w+)/g);
    return parts.map((part, i) => {
      if (part.startsWith('@')) {
        return (
          <span key={i} style={{ color: '#7c6bf0', fontWeight: '500' }}>
            {part}
          </span>
        );
      }
      return part;
    });
  };

  const getIconForUrl = (url) => {
    const lower = url.toLowerCase();
    if (lower.includes('figma.com')) return { icon: '🎨', color: '#a259ff' };
    if (lower.includes('docs.google.com') || lower.includes('drive.google.com')) return { icon: '📄', color: '#4285f4' };
    if (lower.includes('github.com')) return { icon: '🔗', color: '#333' };
    if (lower.includes('notion.so')) return { icon: '📝', color: '#000' };
    if (lower.includes('dropbox.com')) return { icon: '📦', color: '#0061ff' };
    if (lower.match(/\.(jpg|jpeg|png|gif|svg|webp)$/i)) return { icon: '🖼️', color: '#10b981' };
    if (lower.match(/\.(pdf)$/i)) return { icon: '📕', color: '#ef4444' };
    return { icon: '🔗', color: theme.primary };
  };

  const getIconForFile = (filename) => {
    const lower = filename.toLowerCase();
    if (lower.match(/\.(jpg|jpeg|png|gif|svg|webp)$/i)) return { icon: '🖼️', color: '#10b981' };
    if (lower.match(/\.(pdf)$/i)) return { icon: '📕', color: '#ef4444' };
    if (lower.match(/\.(doc|docx)$/i)) return { icon: '📘', color: '#2b579a' };
    if (lower.match(/\.(xls|xlsx)$/i)) return { icon: '📗', color: '#217346' };
    if (lower.match(/\.(ppt|pptx)$/i)) return { icon: '📙', color: '#d24726' };
    if (lower.match(/\.(zip|rar|7z|tar|gz)$/i)) return { icon: '📦', color: '#f59e0b' };
    if (lower.match(/\.(txt|md|csv)$/i)) return { icon: '📄', color: '#6b7280' };
    return { icon: '📎', color: theme.textSecondary };
  };

  const handleFileUpload = async (file) => {
    if (!file) return;

    setUploadError('');
    setUploadProgress(0);

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      setUploadError('File size exceeds 10MB limit');
      return;
    }

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${task.id}_${Date.now()}.${fileExt}`;
      const filePath = `attachments/${fileName}`;

      const { data, error } = await supabase.storage
        .from('px-attachments')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('px-attachments')
        .getPublicUrl(filePath);

      await api.createDoc(task.id, publicUrl, file.name, currentMember.id);
      setDocMode(null);
      setUploadProgress(0);
      await loadDocs();
    } catch (error) {
      console.error('Failed to upload file:', error);
      setUploadError(error.message || 'Failed to upload file');
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleAddLinkSubmit = async () => {
    if (!newDocUrl.trim()) {
      setUploadError('URL is required');
      return;
    }

    try {
      setUploadError('');
      await api.createDoc(task.id, newDocUrl, newDocTitle || null, currentMember.id);
      setNewDocUrl('');
      setNewDocTitle('');
      setDocMode(null);
      await loadDocs();
    } catch (error) {
      console.error('Failed to add link:', error);
      setUploadError(error.message || 'Failed to add link');
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
          width: '800px',
          maxHeight: '80vh',
          overflowY: 'auto',
          display: 'grid',
          gridTemplateColumns: '1fr 300px',
          gap: '24px'
        }}
      >
        {/* Left side - Description, Docs, Comments */}
        <div>
          <div style={{ marginBottom: '16px' }}>
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
                fontSize: '16px',
                fontWeight: '600',
                outline: 'none'
              }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '8px' }}>
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
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

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '8px' }}>
              Docs & Files
            </label>

            {/* Display existing docs */}
            {docs.map(doc => {
              const isFile = doc.url.includes('supabase.co/storage');
              const iconData = isFile ? getIconForFile(doc.title || doc.url) : getIconForUrl(doc.url);

              return (
                <div key={doc.id} style={{
                  padding: '8px 10px',
                  background: theme.background,
                  border: `0.5px solid ${theme.border}`,
                  borderRadius: '4px',
                  marginBottom: '6px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: '16px', flexShrink: 0 }}>{iconData.icon}</span>
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={doc.title || doc.url}
                      style={{
                        color: theme.text,
                        fontSize: '11px',
                        fontWeight: '500',
                        textDecoration: 'none',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        maxWidth: '160px'
                      }}
                    >
                      {doc.title || doc.url}
                    </a>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                    {isFile && (
                      <a
                        href={doc.url}
                        download
                        style={{
                          color: theme.textSecondary,
                          padding: '4px',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                      >
                        <Download size={14} />
                      </a>
                    )}
                    <button
                      onClick={() => handleDeleteDoc(doc.id)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        color: theme.textTertiary,
                        padding: '4px',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Mode selection buttons */}
            {!docMode && (
              <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                <button
                  onClick={() => setDocMode('link')}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    background: theme.background,
                    border: `0.5px solid ${theme.border}`,
                    borderRadius: '4px',
                    color: theme.text,
                    fontSize: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  <Link size={14} />
                  Add link
                </button>
                <button
                  onClick={() => setDocMode('file')}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    background: theme.background,
                    border: `0.5px solid ${theme.border}`,
                    borderRadius: '4px',
                    color: theme.text,
                    fontSize: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  <Upload size={14} />
                  Attach file
                </button>
              </div>
            )}

            {/* Link form */}
            {docMode === 'link' && (
              <div style={{ marginTop: '8px', padding: '12px', background: theme.background, border: `0.5px solid ${theme.border}`, borderRadius: '4px' }}>
                <div style={{ marginBottom: '8px' }}>
                  <input
                    type="text"
                    placeholder="https://..."
                    value={newDocUrl}
                    onChange={(e) => setNewDocUrl(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      background: theme.card,
                      border: `0.5px solid ${theme.border}`,
                      borderRadius: '4px',
                      color: theme.text,
                      fontSize: '12px',
                      outline: 'none',
                      marginBottom: '6px'
                    }}
                  />
                  <input
                    type="text"
                    placeholder="Title (optional)"
                    value={newDocTitle}
                    onChange={(e) => setNewDocTitle(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      background: theme.card,
                      border: `0.5px solid ${theme.border}`,
                      borderRadius: '4px',
                      color: theme.text,
                      fontSize: '12px',
                      outline: 'none'
                    }}
                  />
                </div>
                {uploadError && (
                  <div style={{ color: '#ef4444', fontSize: '11px', marginBottom: '8px' }}>
                    {uploadError}
                  </div>
                )}
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    onClick={handleAddLinkSubmit}
                    style={{
                      padding: '6px 12px',
                      background: theme.primary,
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '12px',
                      cursor: 'pointer'
                    }}
                  >
                    Add link
                  </button>
                  <button
                    onClick={() => {
                      setDocMode(null);
                      setNewDocUrl('');
                      setNewDocTitle('');
                      setUploadError('');
                    }}
                    style={{
                      padding: '6px 12px',
                      background: 'transparent',
                      color: theme.textSecondary,
                      border: `0.5px solid ${theme.border}`,
                      borderRadius: '4px',
                      fontSize: '12px',
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* File upload zone */}
            {docMode === 'file' && (
              <div style={{ marginTop: '8px' }}>
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    padding: '32px 20px',
                    background: isDragging ? theme.card : theme.background,
                    border: `1.5px dashed ${isDragging ? theme.primary : theme.border}`,
                    borderRadius: '4px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <Upload size={24} style={{ color: theme.textSecondary, marginBottom: '8px' }} />
                  <div style={{ fontSize: '13px', color: theme.text, marginBottom: '4px' }}>
                    Drag and drop a file here, or click to browse
                  </div>
                  <div style={{ fontSize: '11px', color: theme.textSecondary }}>
                    Max file size: 10MB
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={(e) => handleFileUpload(e.target.files[0])}
                    style={{ display: 'none' }}
                  />
                </div>
                {uploadProgress > 0 && uploadProgress < 100 && (
                  <div style={{ marginTop: '8px' }}>
                    <div style={{
                      height: '4px',
                      background: theme.border,
                      borderRadius: '2px',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        width: `${uploadProgress}%`,
                        height: '100%',
                        background: theme.primary,
                        transition: 'width 0.3s'
                      }} />
                    </div>
                  </div>
                )}
                {uploadError && (
                  <div style={{ color: '#ef4444', fontSize: '11px', marginTop: '8px' }}>
                    {uploadError}
                  </div>
                )}
                <button
                  onClick={() => {
                    setDocMode(null);
                    setUploadError('');
                    setUploadProgress(0);
                  }}
                  style={{
                    marginTop: '8px',
                    padding: '6px 12px',
                    background: 'transparent',
                    color: theme.textSecondary,
                    border: `0.5px solid ${theme.border}`,
                    borderRadius: '4px',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '8px' }}>
              Comments
            </label>
            <div style={{ marginBottom: '12px' }}>
              {comments.map(comment => (
                <div key={comment.id} style={{
                  padding: '10px',
                  background: theme.background,
                  border: `0.5px solid ${theme.border}`,
                  borderRadius: '4px',
                  marginBottom: '8px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                    <div style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      background: comment.member.avatar_color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: '10px',
                      fontWeight: '600'
                    }}>
                      {comment.member.name[0]}
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: '500' }}>{comment.member.name}</span>
                    <span style={{ fontSize: '11px', color: theme.textTertiary }}>
                      {new Date(comment.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div style={{ fontSize: '13px', color: theme.text, marginLeft: '26px' }}>
                    {renderCommentWithMentions(comment.content)}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ position: 'relative' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  ref={commentInputRef}
                  type="text"
                  placeholder="Add a comment... (use @ to mention)"
                  value={newComment}
                  onChange={handleCommentChange}
                  onKeyDown={handleMentionKeyDown}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !showMentions) {
                      handleAddComment();
                    }
                  }}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    background: theme.background,
                    border: `0.5px solid ${theme.border}`,
                    borderRadius: '4px',
                    color: theme.text,
                    fontSize: '13px',
                    outline: 'none'
                  }}
                />
                <button
                  onClick={handleAddComment}
                  style={{
                    padding: '8px 16px',
                    background: theme.primary,
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '13px',
                    cursor: 'pointer'
                  }}
                >
                  Send
                </button>
              </div>

              {/* Mention dropdown */}
              {showMentions && (
                <div style={{
                  position: 'absolute',
                  bottom: 'calc(100% + 4px)',
                  left: 0,
                  background: theme.surface,
                  border: `0.5px solid ${theme.border}`,
                  borderRadius: '6px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  minWidth: '200px',
                  maxHeight: '200px',
                  overflowY: 'auto',
                  zIndex: 1001
                }}>
                  {members
                    .filter(m => m.name.toLowerCase().includes(mentionSearch))
                    .map((member, idx) => (
                      <div
                        key={member.id}
                        onClick={() => handleMentionSelect(member)}
                        style={{
                          padding: '8px 12px',
                          fontSize: '13px',
                          cursor: 'pointer',
                          background: idx === mentionIndex ? theme.surfaceHover : 'transparent',
                          color: theme.text,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}
                        onMouseEnter={() => setMentionIndex(idx)}
                      >
                        <div style={{
                          width: '20px',
                          height: '20px',
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
                        {member.name}
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right side - Metadata */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: theme.textSecondary,
                padding: '4px'
              }}
            >
              <X size={20} />
            </button>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px', color: theme.textSecondary }}>
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              style={{
                width: '100%',
                padding: '6px 10px',
                background: theme.background,
                border: `0.5px solid ${theme.border}`,
                borderRadius: '4px',
                color: theme.text,
                fontSize: '12px',
                outline: 'none'
              }}
            >
              {statuses.map(status => (
                <option key={status} value={status}>{statusLabels[status]}</option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px', color: theme.textSecondary }}>
              Priority
            </label>
            <select
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              style={{
                width: '100%',
                padding: '6px 10px',
                background: theme.background,
                border: `0.5px solid ${theme.border}`,
                borderRadius: '4px',
                color: theme.text,
                fontSize: '12px',
                outline: 'none'
              }}
            >
              <option value="">None</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px', color: theme.textSecondary }}>
              Project
            </label>
            <ProjectDropdown
              value={formData.project_id}
              onChange={(value) => setFormData({ ...formData, project_id: value })}
              projects={projects}
              theme={theme}
              onNewProject={() => setShowNewProjectModal(true)}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px', color: theme.textSecondary }}>
              Assignees
            </label>
            <div style={{display:'flex', flexWrap:'wrap', gap:4, marginBottom:6}}>
              {assignees.map(a => (
                <div key={a.id} style={{
                  display:'flex', alignItems:'center', gap:5,
                  padding:'3px 8px', borderRadius:20,
                  background:theme.background, border:`.5px solid ${theme.border}`,
                  fontSize:11, color:theme.textSecondary
                }}>
                  <div style={{
                    width:16, height:16, borderRadius:'50%',
                    background:a.avatar_color,
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:7, fontWeight:600, color:'#fff'
                  }}>{a.name[0].toUpperCase()}</div>
                  {a.name}
                  <span
                    onClick={() => removeAssignee(a.id)}
                    style={{fontSize:10, color:theme.textTertiary, cursor:'pointer', marginLeft:2}}
                  >✕</span>
                </div>
              ))}
            </div>
            <select
              onChange={async (e) => {
                if (!e.target.value) return;
                await addAssignee(e.target.value);
                e.target.value = '';
              }}
              style={{
                width:'100%', background:theme.background, border:`.5px solid ${theme.border}`,
                borderRadius:4, padding:'6px 10px', fontSize:12,
                color:theme.text, fontFamily:'inherit', cursor:'pointer', outline:'none'
              }}
            >
              <option value="">+ Add assignee</option>
              {members
                .filter(m => !assignees.find(a => a.id === m.id))
                .map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))
              }
            </select>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px', color: theme.textSecondary }}>
              Due date
            </label>
            <input
              type="date"
              value={formData.due_date}
              onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              style={{
                width: '100%',
                padding: '6px 10px',
                background: theme.background,
                border: `0.5px solid ${theme.border}`,
                borderRadius: '4px',
                color: theme.text,
                fontSize: '12px',
                outline: 'none'
              }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px', color: theme.textSecondary }}>
              Hours
            </label>
            <input
              type="number"
              step="0.5"
              value={formData.hours}
              onChange={(e) => setFormData({ ...formData, hours: e.target.value })}
              style={{
                width: '100%',
                padding: '6px 10px',
                background: theme.background,
                border: `0.5px solid ${theme.border}`,
                borderRadius: '4px',
                color: theme.text,
                fontSize: '12px',
                outline: 'none'
              }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px', color: theme.textSecondary }}>
              Tags
            </label>

            {/* First row: Applied tags */}
            <div style={{
              display: 'flex',
              gap: '4px',
              flexWrap: 'wrap',
              minHeight: '28px',
              marginBottom: '6px'
            }}>
              {localTaskTags.length > 0 ? (
                localTaskTags.map(tag => (
                  <button
                    key={tag.id}
                    onClick={() => handleToggleTag(tag.id)}
                    style={{
                      padding: '4px 8px',
                      background: tag.color + '30',
                      border: `0.5px solid ${tag.color}`,
                      borderRadius: '4px',
                      color: tag.color,
                      fontSize: '11px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      transform: 'scale(1)',
                      fontWeight: '500'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'scale(1.05)';
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    {tag.name}
                  </button>
                ))
              ) : (
                <div style={{
                  fontSize: '11px',
                  color: theme.textSecondary,
                  fontStyle: 'italic',
                  padding: '4px 0'
                }}>
                  No tags applied
                </div>
              )}
            </div>

            {/* Second row: Unapplied tags + New tag button */}
            <div style={{
              display: 'flex',
              gap: '4px',
              flexWrap: 'wrap',
              minHeight: '28px'
            }}>
              {tags.filter(tag => !localTaskTags.some(t => t.id === tag.id)).map(tag => (
                <div
                  key={tag.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '4px 8px',
                    borderRadius: 4,
                    cursor: 'pointer',
                    position: 'relative',
                    background: theme.background,
                    border: `0.5px solid ${theme.border}`,
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = theme.surfaceHover;
                    const delBtn = e.currentTarget.querySelector('.tag-del');
                    if (delBtn) delBtn.style.opacity = '1';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = theme.background;
                    const delBtn = e.currentTarget.querySelector('.tag-del');
                    if (delBtn) delBtn.style.opacity = '0';
                  }}
                >
                  <div
                    onClick={() => handleToggleTag(tag.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      flex: 1
                    }}
                  >
                    <div style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: tag.color,
                      flexShrink: 0
                    }} />
                    <span style={{
                      fontSize: 11,
                      color: theme.textSecondary
                    }}>
                      {tag.name}
                    </span>
                  </div>
                  <div
                    className="tag-del"
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (!window.confirm(`Delete tag "${tag.name}"? It will be removed from all tasks.`)) return;
                      try {
                        await fetch(`${import.meta.env.VITE_API_URL || ''}/api/tags/${tag.id}`, {
                          method: 'DELETE'
                        });
                        setTags(prev => prev.filter(t => t.id !== tag.id));
                      } catch (error) {
                        console.error('Failed to delete tag:', error);
                      }
                    }}
                    style={{
                      opacity: 0,
                      transition: 'opacity 0.15s',
                      fontSize: 12,
                      color: '#e74c3c',
                      cursor: 'pointer',
                      padding: '2px 4px',
                      borderRadius: 4,
                      flexShrink: 0,
                      fontWeight: 'bold'
                    }}
                  >
                    ✕
                  </div>
                </div>
              ))}

              {/* New tag button */}
              {!showNewTag && (
                <button
                  onClick={() => setShowNewTag(true)}
                  style={{
                    padding: '4px 8px',
                    background: theme.background,
                    border: `0.5px dashed ${theme.border}`,
                    borderRadius: '4px',
                    color: theme.textSecondary,
                    fontSize: '11px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = theme.primary;
                    e.currentTarget.style.borderColor = theme.primary;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = theme.textSecondary;
                    e.currentTarget.style.borderColor = theme.border;
                  }}
                >
                  + New tag
                </button>
              )}
            </div>

            {/* Create tag form */}
            {showNewTag && (
              <div style={{
                marginTop: '8px',
                padding: '12px',
                background: theme.background,
                border: `0.5px solid ${theme.border}`,
                borderRadius: '4px'
              }}>
                <div style={{ marginBottom: '8px' }}>
                  <input
                    type="text"
                    placeholder="Tag name"
                    value={newTagForm.name}
                    onChange={(e) => setNewTagForm({ ...newTagForm, name: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      background: theme.card || theme.surface,
                      border: `0.5px solid ${theme.border}`,
                      borderRadius: '4px',
                      color: theme.text,
                      fontSize: '12px',
                      outline: 'none',
                      marginBottom: '8px'
                    }}
                  />
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '8px' }}>
                    {['#a259ff', '#f0b95a', '#e74c3c', '#2ecc71', '#5dade2', '#7c6bf0', '#e84393', '#f39c12'].map(color => (
                      <button
                        key={color}
                        onClick={() => setNewTagForm({ ...newTagForm, color })}
                        style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          background: color,
                          border: newTagForm.color === color ? '2px solid white' : `0.5px solid ${theme.border}`,
                          outline: newTagForm.color === color ? `2px solid ${color}` : 'none',
                          cursor: 'pointer',
                          transition: 'all 0.15s'
                        }}
                      />
                    ))}
                  </div>
                </div>
                {tagError && (
                  <div style={{ color: '#ef4444', fontSize: '11px', marginBottom: '8px' }}>
                    {tagError}
                  </div>
                )}
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    onClick={handleCreateTag}
                    disabled={savingTag}
                    style={{
                      padding: '6px 12px',
                      background: theme.primary,
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '12px',
                      cursor: savingTag ? 'not-allowed' : 'pointer',
                      opacity: savingTag ? 0.7 : 1
                    }}
                  >
                    {savingTag ? 'Creating...' : 'Create tag'}
                  </button>
                  <button
                    onClick={() => {
                      setShowNewTag(false);
                      setNewTagForm({ name: '', color: '#a259ff' });
                      setTagError('');
                    }}
                    style={{
                      padding: '6px 12px',
                      background: 'transparent',
                      color: theme.textSecondary,
                      border: `0.5px solid ${theme.border}`,
                      borderRadius: '4px',
                      fontSize: '12px',
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {error && (
            <div style={{
              padding: '10px',
              background: '#7f1d1d',
              border: '0.5px solid #991b1b',
              borderRadius: '4px',
              color: '#fecaca',
              fontSize: '12px',
              marginBottom: '16px'
            }}>
              {error}
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              width: '100%',
              padding: '8px',
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

      {/* New Project Modal */}
      {showNewProjectModal && (
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
          zIndex: 1001
        }}
        onClick={() => setShowNewProjectModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: theme.surface,
              borderRadius: '8px',
              padding: '24px',
              width: '400px',
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
              <h3 style={{ fontSize: '16px', fontWeight: '600', margin: 0 }}>New Project</h3>
              <button
                onClick={() => setShowNewProjectModal(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: theme.textSecondary,
                  padding: '4px'
                }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '6px' }}>
                Project name *
              </label>
              <input
                type="text"
                value={newProjectForm.name}
                onChange={(e) => setNewProjectForm({ ...newProjectForm, name: e.target.value })}
                placeholder="e.g. Website Redesign"
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

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '6px' }}>
                Color
              </label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {['#7c6bf0', '#a259ff', '#f0b95a', '#e74c3c', '#2ecc71', '#5dade2', '#e84393', '#f39c12'].map(color => (
                  <button
                    key={color}
                    onClick={() => setNewProjectForm({ ...newProjectForm, color })}
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '6px',
                      background: color,
                      border: newProjectForm.color === color ? '2px solid white' : `0.5px solid ${theme.border}`,
                      outline: newProjectForm.color === color ? `2px solid ${color}` : 'none',
                      cursor: 'pointer',
                      transition: 'all 0.15s'
                    }}
                  />
                ))}
              </div>
            </div>

            {projectError && (
              <div style={{
                padding: '12px',
                background: '#7f1d1d',
                border: '0.5px solid #991b1b',
                borderRadius: '4px',
                color: '#fecaca',
                fontSize: '13px',
                marginBottom: '16px'
              }}>
                {projectError}
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowNewProjectModal(false);
                  setNewProjectForm({ name: '', color: '#7c6bf0' });
                  setProjectError('');
                }}
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
                onClick={handleCreateProject}
                disabled={savingProject}
                style={{
                  padding: '8px 16px',
                  background: theme.primary,
                  border: 'none',
                  borderRadius: '4px',
                  color: 'white',
                  fontSize: '13px',
                  fontWeight: '500',
                  cursor: savingProject ? 'not-allowed' : 'pointer',
                  opacity: savingProject ? 0.7 : 1
                }}
              >
                {savingProject ? 'Creating...' : 'Create project'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
