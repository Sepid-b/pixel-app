import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api';
import { Plus, X, Search, CalendarEvent, Clock, MessageCircle, File, Tag, ChevronDown } from 'tabler-icons-react';

const statuses = ['todo', 'in-progress', 'in-review', 'blocked', 'done'];
const statusLabels = {
  'todo': 'To do',
  'in-progress': 'In progress',
  'in-review': 'In review',
  'blocked': 'Blocked',
  'done': 'Done'
};

export default function BoardView({ tasks, members, projects, currentMember, theme, filters, setFilters, onTasksChange }) {
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [draggedTask, setDraggedTask] = useState(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);
  const [tags, setTags] = useState([]);

  useEffect(() => {
    loadTags();
  }, []);

  const loadTags = async () => {
    try {
      const data = await api.getTags();
      setTags(data);
    } catch (error) {
      console.error('Failed to load tags:', error);
    }
  };

  const filteredTasks = tasks.filter(task => {
    if (filters.member && task.assignee_id !== filters.member) return false;
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

      {/* Board Columns */}
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

      {showNewTaskModal && (
        <NewTaskModal
          theme={theme}
          members={members}
          projects={projects}
          currentMember={currentMember}
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
          tags={tags}
          currentMember={currentMember}
          onClose={() => setSelectedTask(null)}
          onSave={onTasksChange}
        />
      )}
    </div>
  );
}

function TaskCard({ task, theme, onClick, onDragStart }) {
  const project = task.project;
  const assignee = task.assignee;

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, task)}
      onClick={onClick}
      style={{
        background: theme.surface,
        border: `0.5px solid ${theme.border}`,
        borderLeft: project ? `3px solid ${project.color}` : `3px solid ${theme.border}`,
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
      <div style={{ fontSize: '13px', fontWeight: '500', marginBottom: '8px', color: theme.text }}>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
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
        </div>

        {assignee && (
          <div style={{
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            background: assignee.avatar_color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '10px',
            fontWeight: '600'
          }}>
            {assignee.name[0]}
          </div>
        )}
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

function NewTaskModal({ theme, members, projects, currentMember, onClose, onSave }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'todo',
    priority: '',
    project_id: '',
    assignee_id: '',
    due_date: '',
    hours: '',
    created_by: currentMember.id
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
                {projects.map(project => (
                  <option key={project.id} value={project.id}>{project.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '6px' }}>
                Assignee
              </label>
              <select
                value={formData.assignee_id}
                onChange={(e) => setFormData({ ...formData, assignee_id: e.target.value })}
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
                {members.map(member => (
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

function TaskDetailModal({ task, theme, members, projects, tags, currentMember, onClose, onSave }) {
  const [formData, setFormData] = useState({
    title: task.title || '',
    description: task.description || '',
    status: task.status || 'todo',
    priority: task.priority || '',
    project_id: task.project_id || '',
    assignee_id: task.assignee_id || '',
    due_date: task.due_date || '',
    hours: task.hours || ''
  });
  const [comments, setComments] = useState([]);
  const [docs, setDocs] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [newDocUrl, setNewDocUrl] = useState('');
  const [newDocTitle, setNewDocTitle] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadComments();
    loadDocs();
  }, [task.id]);

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
    const hasTag = task.tags?.some(t => t.id === tagId);
    try {
      if (hasTag) {
        await api.removeTaskTag(task.id, tagId);
      } else {
        await api.addTaskTag(task.id, tagId);
      }
      await onSave();
    } catch (error) {
      console.error('Failed to toggle tag:', error);
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
              Docs
            </label>
            {docs.map(doc => (
              <div key={doc.id} style={{
                padding: '8px',
                background: theme.background,
                border: `0.5px solid ${theme.border}`,
                borderRadius: '4px',
                marginBottom: '6px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <a
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: theme.primary, fontSize: '13px', textDecoration: 'none' }}
                >
                  {doc.title || doc.url}
                </a>
                <button
                  onClick={() => handleDeleteDoc(doc.id)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: theme.textTertiary,
                    padding: '4px'
                  }}
                >
                  <X size={14} />
                </button>
              </div>
            ))}
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
              <input
                type="text"
                placeholder="URL"
                value={newDocUrl}
                onChange={(e) => setNewDocUrl(e.target.value)}
                style={{
                  flex: 1,
                  padding: '6px 10px',
                  background: theme.background,
                  border: `0.5px solid ${theme.border}`,
                  borderRadius: '4px',
                  color: theme.text,
                  fontSize: '12px',
                  outline: 'none'
                }}
              />
              <input
                type="text"
                placeholder="Title (optional)"
                value={newDocTitle}
                onChange={(e) => setNewDocTitle(e.target.value)}
                style={{
                  flex: 1,
                  padding: '6px 10px',
                  background: theme.background,
                  border: `0.5px solid ${theme.border}`,
                  borderRadius: '4px',
                  color: theme.text,
                  fontSize: '12px',
                  outline: 'none'
                }}
              />
              <button
                onClick={handleAddDoc}
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
                Add
              </button>
            </div>
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
                    {comment.content}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                placeholder="Add a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddComment()}
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
            <select
              value={formData.project_id}
              onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
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
              {projects.map(project => (
                <option key={project.id} value={project.id}>{project.name}</option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px', color: theme.textSecondary }}>
              Assignee
            </label>
            <select
              value={formData.assignee_id}
              onChange={(e) => setFormData({ ...formData, assignee_id: e.target.value })}
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
              {members.map(member => (
                <option key={member.id} value={member.id}>{member.name}</option>
              ))}
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
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              {tags.map(tag => {
                const isActive = task.tags?.some(t => t.id === tag.id);
                return (
                  <button
                    key={tag.id}
                    onClick={() => handleToggleTag(tag.id)}
                    style={{
                      padding: '4px 8px',
                      background: isActive ? tag.color + '30' : theme.background,
                      border: `0.5px solid ${isActive ? tag.color : theme.border}`,
                      borderRadius: '4px',
                      color: isActive ? tag.color : theme.text,
                      fontSize: '11px',
                      cursor: 'pointer'
                    }}
                  >
                    {tag.name}
                  </button>
                );
              })}
            </div>
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
    </div>
  );
}
