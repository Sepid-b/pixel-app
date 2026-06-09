require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Middleware
app.use(cors());
app.use(express.json());

// Helper function to convert empty strings to null
function nullifyEmptyStrings(obj) {
  if (!obj || typeof obj !== 'object') return obj;

  const result = Array.isArray(obj) ? [] : {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === '') {
      result[key] = null;
    } else if (typeof value === 'object' && value !== null) {
      result[key] = nullifyEmptyStrings(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

// Error logging helper
function logError(endpoint, error) {
  console.error(`[ERROR] ${endpoint}:`, {
    message: error.message,
    details: error.details || error,
    stack: error.stack
  });
}

// ==================== MEMBERS ENDPOINTS ====================

// List all members
app.get('/api/members', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('px_members')
      .select('*')
      .order('name');

    if (error) throw error;
    res.json(data);
  } catch (error) {
    logError('GET /api/members', error);
    res.status(500).json({ error: error.message });
  }
});

// Identify member by user_id
app.post('/api/members/identify', async (req, res) => {
  try {
    const { user_id } = req.body;

    const { data, error } = await supabase
      .from('px_members')
      .select('*')
      .eq('user_id', user_id)
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    logError('POST /api/members/identify', error);
    res.status(500).json({ error: error.message });
  }
});

// Update member vibe
app.patch('/api/members/:id/vibe', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = nullifyEmptyStrings(req.body);

    const { data, error } = await supabase
      .from('px_members')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    logError('PATCH /api/members/:id/vibe', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== PROJECTS ENDPOINTS ====================

// List all projects with stats
app.get('/api/projects', async (req, res) => {
  try {
    const { data: projects, error: projectsError } = await supabase
      .from('px_projects')
      .select('*')
      .order('name');

    if (projectsError) throw projectsError;

    // Get task counts for each project
    const projectsWithStats = await Promise.all(
      projects.map(async (project) => {
        const { count, error: countError } = await supabase
          .from('px_tasks')
          .select('*', { count: 'exact', head: true })
          .eq('project_id', project.id);

        if (countError) {
          logError('GET /api/projects - count tasks', countError);
          return { ...project, task_count: 0 };
        }

        return { ...project, task_count: count || 0 };
      })
    );

    res.json(projectsWithStats);
  } catch (error) {
    logError('GET /api/projects', error);
    res.status(500).json({ error: error.message });
  }
});

// Create project
app.post('/api/projects', async (req, res) => {
  try {
    const projectData = nullifyEmptyStrings(req.body);

    const { data, error } = await supabase
      .from('px_projects')
      .insert([projectData])
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    logError('POST /api/projects', error);
    res.status(500).json({ error: error.message });
  }
});

// Update project
app.patch('/api/projects/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = nullifyEmptyStrings(req.body);

    const { data, error } = await supabase
      .from('px_projects')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    logError('PATCH /api/projects/:id', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== TASKS ENDPOINTS ====================

// List tasks with filters
app.get('/api/tasks', async (req, res) => {
  try {
    let query = supabase
      .from('px_tasks')
      .select(`
        *,
        project:px_projects(id, name, color),
        assignee:px_members!assignee_id(id, name, avatar_color),
        tags:px_task_tags(tag:px_tags(*))
      `)
      .order('position');

    // Apply filters from query params
    if (req.query.status) {
      query = query.eq('status', req.query.status);
    }
    if (req.query.assignee_id) {
      query = query.eq('assignee_id', req.query.assignee_id);
    }
    if (req.query.project_id) {
      query = query.eq('project_id', req.query.project_id);
    }
    if (req.query.priority) {
      query = query.eq('priority', req.query.priority);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Transform tags array
    const tasksWithTags = data.map(task => ({
      ...task,
      tags: task.tags?.map(t => t.tag) || []
    }));

    res.json(tasksWithTags);
  } catch (error) {
    logError('GET /api/tasks', error);
    res.status(500).json({ error: error.message });
  }
});

// Create task
app.post('/api/tasks', async (req, res) => {
  try {
    const taskData = nullifyEmptyStrings(req.body);

    const { data, error } = await supabase
      .from('px_tasks')
      .insert([taskData])
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    logError('POST /api/tasks', error);
    res.status(500).json({ error: error.message });
  }
});

// Update task
app.patch('/api/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = nullifyEmptyStrings(req.body);

    const { data, error } = await supabase
      .from('px_tasks')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    logError('PATCH /api/tasks/:id', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete task
app.delete('/api/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('px_tasks')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    logError('DELETE /api/tasks/:id', error);
    res.status(500).json({ error: error.message });
  }
});

// Move task (drag and drop)
app.patch('/api/tasks/:id/move', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, position } = req.body;

    const { data, error } = await supabase
      .from('px_tasks')
      .update({
        status,
        position,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    logError('PATCH /api/tasks/:id/move', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== COMMENTS ENDPOINTS ====================

// List comments for a task
app.get('/api/tasks/:taskId/comments', async (req, res) => {
  try {
    const { taskId } = req.params;

    const { data, error } = await supabase
      .from('px_task_comments')
      .select(`
        *,
        member:px_members(id, name, avatar_color)
      `)
      .eq('task_id', taskId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    logError('GET /api/tasks/:taskId/comments', error);
    res.status(500).json({ error: error.message });
  }
});

// Create comment
app.post('/api/tasks/:taskId/comments', async (req, res) => {
  try {
    const { taskId } = req.params;
    const commentData = nullifyEmptyStrings({
      ...req.body,
      task_id: taskId
    });

    const { data, error } = await supabase
      .from('px_task_comments')
      .insert([commentData])
      .select(`
        *,
        member:px_members(id, name, avatar_color)
      `)
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    logError('POST /api/tasks/:taskId/comments', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== DOCS ENDPOINTS ====================

// List docs for a task
app.get('/api/tasks/:taskId/docs', async (req, res) => {
  try {
    const { taskId } = req.params;

    const { data, error } = await supabase
      .from('px_docs')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    logError('GET /api/tasks/:taskId/docs', error);
    res.status(500).json({ error: error.message });
  }
});

// Create doc
app.post('/api/tasks/:taskId/docs', async (req, res) => {
  try {
    const { taskId } = req.params;
    const docData = nullifyEmptyStrings({
      ...req.body,
      task_id: taskId
    });

    const { data, error } = await supabase
      .from('px_docs')
      .insert([docData])
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    logError('POST /api/tasks/:taskId/docs', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete doc
app.delete('/api/docs/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('px_docs')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    logError('DELETE /api/docs/:id', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== TAGS ENDPOINTS ====================

// List all tags
app.get('/api/tags', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('px_tags')
      .select('*')
      .order('name');

    if (error) throw error;
    res.json(data);
  } catch (error) {
    logError('GET /api/tags', error);
    res.status(500).json({ error: error.message });
  }
});

// Create tag
app.post('/api/tags', async (req, res) => {
  try {
    const tagData = nullifyEmptyStrings(req.body);

    const { data, error } = await supabase
      .from('px_tags')
      .insert([tagData])
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    logError('POST /api/tags', error);
    res.status(500).json({ error: error.message });
  }
});

// Add tag to task
app.post('/api/tasks/:taskId/tags/:tagId', async (req, res) => {
  try {
    const { taskId, tagId } = req.params;

    const { data, error } = await supabase
      .from('px_task_tags')
      .insert([{ task_id: taskId, tag_id: tagId }])
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    logError('POST /api/tasks/:taskId/tags/:tagId', error);
    res.status(500).json({ error: error.message });
  }
});

// Remove tag from task
app.delete('/api/tasks/:taskId/tags/:tagId', async (req, res) => {
  try {
    const { taskId, tagId } = req.params;

    const { error } = await supabase
      .from('px_task_tags')
      .delete()
      .eq('task_id', taskId)
      .eq('tag_id', tagId);

    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    logError('DELETE /api/tasks/:taskId/tags/:tagId', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== STANDUPS ENDPOINTS ====================

// Get today's vibe summary
app.get('/api/standups/vibes', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('px_standups')
      .select(`
        *,
        member:px_members(id, name, avatar_color)
      `)
      .eq('date', today);

    if (error) throw error;
    res.json(data);
  } catch (error) {
    logError('GET /api/standups/vibes', error);
    res.status(500).json({ error: error.message });
  }
});

// Upsert standup
app.post('/api/standups', async (req, res) => {
  try {
    const standupData = nullifyEmptyStrings(req.body);

    const { data, error } = await supabase
      .from('px_standups')
      .upsert([standupData], {
        onConflict: 'member_id,date',
        ignoreDuplicates: false
      })
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    logError('POST /api/standups', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== TIME TRACKING ENDPOINTS ====================

// List time entries by week
app.get('/api/time-entries', async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    let query = supabase
      .from('px_time_entries')
      .select(`
        *,
        task:px_tasks(id, title),
        member:px_members(id, name, avatar_color)
      `)
      .order('date', { ascending: false });

    if (start_date) {
      query = query.gte('date', start_date);
    }
    if (end_date) {
      query = query.lte('date', end_date);
    }

    const { data, error } = await query;

    if (error) throw error;
    res.json(data);
  } catch (error) {
    logError('GET /api/time-entries', error);
    res.status(500).json({ error: error.message });
  }
});

// Create time entry
app.post('/api/time-entries', async (req, res) => {
  try {
    const timeData = nullifyEmptyStrings(req.body);

    const { data, error } = await supabase
      .from('px_time_entries')
      .insert([timeData])
      .select(`
        *,
        task:px_tasks(id, title),
        member:px_members(id, name, avatar_color)
      `)
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    logError('POST /api/time-entries', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete time entry
app.delete('/api/time-entries/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('px_time_entries')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    logError('DELETE /api/time-entries/:id', error);
    res.status(500).json({ error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`✓ Backend server running on http://localhost:${PORT}`);
  console.log(`✓ Connected to Supabase: ${process.env.SUPABASE_URL}`);
});
