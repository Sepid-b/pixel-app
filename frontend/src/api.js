const API_URL = import.meta.env.VITE_API_URL;

async function apiCall(endpoint, options = {}) {
  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'API request failed');
    }

    return await response.json();
  } catch (error) {
    console.error(`API Error [${endpoint}]:`, error);
    throw error;
  }
}

export const api = {
  // Members
  getMembers: () => apiCall('/api/members'),
  identifyMember: (authId, email, name) => apiCall('/api/members/identify', {
    method: 'POST',
    body: JSON.stringify({ auth_id: authId, email, name })
  }),
  updateMemberVibe: (id, updates) => apiCall(`/api/members/${id}/vibe`, {
    method: 'PATCH',
    body: JSON.stringify(updates)
  }),

  // Projects
  getProjects: () => apiCall('/api/projects'),
  createProject: (project) => apiCall('/api/projects', {
    method: 'POST',
    body: JSON.stringify(project)
  }),
  updateProject: (id, updates) => apiCall(`/api/projects/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates)
  }),

  // Tasks
  getTasks: (filters = {}) => {
    const params = new URLSearchParams(filters);
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiCall(`/api/tasks${query}`);
  },
  createTask: (task) => apiCall('/api/tasks', {
    method: 'POST',
    body: JSON.stringify(task)
  }),
  updateTask: (id, updates) => apiCall(`/api/tasks/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates)
  }),
  deleteTask: (id) => apiCall(`/api/tasks/${id}`, {
    method: 'DELETE'
  }),
  moveTask: (id, status, position) => apiCall(`/api/tasks/${id}/move`, {
    method: 'PATCH',
    body: JSON.stringify({ status, position })
  }),

  // Comments
  getComments: (taskId) => apiCall(`/api/tasks/${taskId}/comments`),
  createComment: (taskId, content, memberId) => apiCall(`/api/tasks/${taskId}/comments`, {
    method: 'POST',
    body: JSON.stringify({ content, member_id: memberId })
  }),

  // Docs
  getDocs: (taskId) => apiCall(`/api/tasks/${taskId}/docs`),
  createDoc: (taskId, url, title, createdBy) => apiCall(`/api/tasks/${taskId}/docs`, {
    method: 'POST',
    body: JSON.stringify({ url, title, created_by: createdBy })
  }),
  deleteDoc: (id) => apiCall(`/api/docs/${id}`, {
    method: 'DELETE'
  }),

  // Tags
  getTags: () => apiCall('/api/tags'),
  createTag: (tag) => apiCall('/api/tags', {
    method: 'POST',
    body: JSON.stringify(tag)
  }),
  addTaskTag: (taskId, tagId) => apiCall(`/api/tasks/${taskId}/tags/${tagId}`, {
    method: 'POST'
  }),
  removeTaskTag: (taskId, tagId) => apiCall(`/api/tasks/${taskId}/tags/${tagId}`, {
    method: 'DELETE'
  }),

  // Standups
  getVibes: () => apiCall('/api/standups/vibes'),
  upsertStandup: (standup) => apiCall('/api/standups', {
    method: 'POST',
    body: JSON.stringify(standup)
  }),

  // Time tracking
  getTimeEntries: (startDate, endDate) => {
    const params = new URLSearchParams({ start_date: startDate, end_date: endDate });
    return apiCall(`/api/time-entries?${params.toString()}`);
  },
  createTimeEntry: (entry) => apiCall('/api/time-entries', {
    method: 'POST',
    body: JSON.stringify(entry)
  }),
  deleteTimeEntry: (id) => apiCall(`/api/time-entries/${id}`, {
    method: 'DELETE'
  })
};
