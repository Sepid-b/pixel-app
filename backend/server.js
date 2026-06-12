require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize Supabase clients
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Admin client with service_role key (bypasses RLS)
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
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
    // Only return registered members (with user_id)
    const { data, error } = await supabaseAdmin
      .from('px_members')
      .select('*')
      .not('user_id', 'is', null)
      .order('name');

    if (error) throw error;
    res.json(data);
  } catch (error) {
    logError('GET /api/members', error);
    res.status(500).json({ error: error.message });
  }
});

// Create new member (used during signup, bypasses RLS)
app.post('/api/members/create', async (req, res) => {
  try {
    const { auth_id, name, email } = req.body;

    if (!auth_id || !name || !email) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    console.log('[DEBUG] Creating member with auth_id:', auth_id, 'email:', email);

    // Check if member already exists
    const { data: existing } = await supabaseAdmin
      .from('px_members')
      .select('*')
      .or(`user_id.eq.${auth_id},email.eq.${email.toLowerCase()}`)
      .maybeSingle();

    if (existing) {
      console.log('[DEBUG] Member already exists, linking if needed');
      // Link auth_id if missing
      if (!existing.user_id) {
        const { data: updated } = await supabaseAdmin
          .from('px_members')
          .update({ user_id: auth_id })
          .eq('id', existing.id)
          .select()
          .single();
        return res.json(updated);
      }
      return res.json(existing);
    }

    // Pick avatar color
    const colors = ['#7c6bf0', '#d4b3f5', '#5DCAA5', '#f0997b', '#e84393', '#3498db', '#f39c12', '#2ecc71'];
    const { data: existingMembers } = await supabaseAdmin
      .from('px_members')
      .select('avatar_color');

    const used = (existingMembers || []).map(m => m.avatar_color);
    const color = colors.find(c => !used.includes(c)) || colors[Math.floor(Math.random() * colors.length)];

    // Create new member using admin client (bypasses RLS)
    const { data: newMember, error } = await supabaseAdmin
      .from('px_members')
      .insert({
        user_id: auth_id,
        name: name.trim(),
        email: email.toLowerCase(),
        avatar_color: color,
        role: 'member'
      })
      .select()
      .single();

    if (error) throw error;

    console.log('[DEBUG] Created new member:', newMember);
    res.json(newMember);
  } catch (err) {
    console.error('[ERROR] Create member error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Identify member by user_id or email
app.post('/api/members/identify', async (req, res) => {
  try {
    const { auth_id, email, name } = req.body;
    const user_id = auth_id; // Support both names
    console.log('[DEBUG] Identifying member with user_id:', user_id, 'email:', email);

    // Check for valid inputs
    if (!user_id || user_id === 'undefined' || !email) {
      return res.status(400).json({ error: 'Missing required parameters: auth_id and email' });
    }

    // 1. Try to find member by user_id first
    let { data: member, error: authError } = await supabaseAdmin
      .from('px_members')
      .select('*')
      .eq('user_id', user_id)
      .maybeSingle();

    // 2. If not found, try by email
    if (!member && email) {
      console.log('[DEBUG] Not found by user_id, trying email...');
      const { data: emailMember, error: emailError } = await supabaseAdmin
        .from('px_members')
        .select('*')
        .eq('email', email.toLowerCase())
        .maybeSingle();

      // 3. If found by email but no user_id, link them
      if (emailMember) {
        console.log('[DEBUG] Found by email, linking user_id...');
        const { data: updated, error: updateError } = await supabaseAdmin
          .from('px_members')
          .update({ user_id })
          .eq('id', emailMember.id)
          .select()
          .single();

        if (updateError) throw updateError;
        member = updated;
      }
    }

    // 4. If still not found, create new member
    if (!member) {
      console.log('[DEBUG] Member not found, creating new...');
      const avatarColors = ['#7c6bf0', '#d4b3f5', '#5DCAA5', '#f0997b', '#e84393', '#3498db', '#f39c12', '#2ecc71'];

      const { data: existing } = await supabaseAdmin
        .from('px_members')
        .select('avatar_color');

      const usedColors = existing?.map(m => m.avatar_color) || [];
      const availableColor = avatarColors.find(c => !usedColors.includes(c)) || '#7c6bf0';

      const memberName = name || email.split('@')[0];

      const { data: newMember, error: createError } = await supabaseAdmin
        .from('px_members')
        .insert({
          user_id,
          name: memberName,
          email: email.toLowerCase(),
          avatar_color: availableColor,
          role: 'member'
        })
        .select()
        .single();

      if (createError) throw createError;
      member = newMember;
    }

    console.log('[DEBUG] Final member:', member);
    res.json(member);
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

    const { data, error } = await supabaseAdmin
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

// Update member profile
app.put('/api/members/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = nullifyEmptyStrings(req.body);

    console.log('[DEBUG] PUT /api/members/:id', { id, updates });

    const { data, error } = await supabaseAdmin
      .from('px_members')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    console.log('[DEBUG] Updated member:', data);
    res.json(data);
  } catch (error) {
    logError('PUT /api/members/:id', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== PROJECTS ENDPOINTS ====================

// List all projects with detailed stats
app.get('/api/projects', async (req, res) => {
  try {
    const { member_id } = req.query;
    console.log('[DEBUG] GET /api/projects - member_id:', member_id);

    let projectsQuery = supabaseAdmin
      .from('px_projects')
      .select('*')
      .order('name');

    // Filter by member if specified
    if (member_id) {
      const { data: memberProjects } = await supabaseAdmin
        .from('px_project_members')
        .select('project_id')
        .eq('member_id', member_id);

      console.log('[DEBUG] GET /api/projects - memberProjects:', memberProjects);
      const projectIds = memberProjects?.map(pm => pm.project_id) || [];
      console.log('[DEBUG] GET /api/projects - projectIds:', projectIds);

      if (projectIds.length > 0) {
        projectsQuery = projectsQuery.in('id', projectIds);
      } else {
        // No projects for this member
        console.log('[DEBUG] GET /api/projects - No projects found for member');
        return res.json([]);
      }
    }

    const { data: projects, error: projectsError } = await projectsQuery;
    console.log('[DEBUG] GET /api/projects - projects count:', projects?.length || 0);

    if (projectsError) throw projectsError;

    // Get detailed stats for each project
    const projectsWithStats = await Promise.all(
      projects.map(async (project) => {
        // Task counts by status
        const { data: tasks } = await supabase
          .from('px_tasks')
          .select('id, title, status, priority, due_date, assignee_id')
          .eq('project_id', project.id);

        const statusCounts = {
          todo: 0,
          'in-progress': 0,
          'in-review': 0,
          blocked: 0,
          done: 0
        };

        tasks?.forEach(task => {
          statusCounts[task.status] = (statusCounts[task.status] || 0) + 1;
        });

        // Total hours logged
        const { data: timeEntries } = await supabase
          .from('px_time_entries')
          .select('hours, member_id')
          .eq('project_id', project.id);

        const total_hours_logged = timeEntries?.reduce((sum, entry) => sum + (entry.hours || 0), 0) || 0;

        // Hours per member
        const hoursPerMember = {};
        timeEntries?.forEach(entry => {
          hoursPerMember[entry.member_id] = (hoursPerMember[entry.member_id] || 0) + (entry.hours || 0);
        });

        const hours_per_member = Object.entries(hoursPerMember).map(([member_id, hours]) => ({
          member_id,
          hours
        }));

        // Project members
        const { data: projectMembers } = await supabase
          .from('px_project_members')
          .select('member:px_members(id, name, avatar_color)')
          .eq('project_id', project.id);

        const members = projectMembers?.map(pm => pm.member) || [];

        // Open tasks
        const open_tasks = tasks?.filter(t => t.status !== 'done') || [];

        return {
          ...project,
          task_count: tasks?.length || 0,
          status_counts: statusCounts,
          total_hours_logged,
          hours_per_member,
          members,
          open_tasks
        };
      })
    );

    res.json(projectsWithStats);
  } catch (error) {
    logError('GET /api/projects', error);
    res.status(500).json({ error: error.message });
  }
});

// Get projects stats summary
app.get('/api/projects/stats', async (req, res) => {
  try {
    const { member_id } = req.query;

    // Get member's projects
    const { data: memberProjects } = await supabase
      .from('px_project_members')
      .select('project_id')
      .eq('member_id', member_id);

    const projectIds = memberProjects?.map(pm => pm.project_id) || [];

    // Active projects count
    const { count: active_projects } = await supabase
      .from('px_projects')
      .select('*', { count: 'exact', head: true })
      .in('id', projectIds)
      .eq('status', 'active');

    // Open tasks count
    const { count: open_tasks } = await supabase
      .from('px_tasks')
      .select('*', { count: 'exact', head: true })
      .in('project_id', projectIds)
      .neq('status', 'done');

    // Hours logged
    const { data: timeEntries } = await supabase
      .from('px_time_entries')
      .select('hours')
      .in('project_id', projectIds)
      .eq('member_id', member_id);

    const hours_logged = timeEntries?.reduce((sum, entry) => sum + (entry.hours || 0), 0) || 0;

    // Due this week
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sunday = new Date(today);
    sunday.setDate(today.getDate() + (7 - today.getDay()));

    const { count: due_this_week } = await supabase
      .from('px_tasks')
      .select('*', { count: 'exact', head: true })
      .in('project_id', projectIds)
      .gte('due_date', today.toISOString().split('T')[0])
      .lte('due_date', sunday.toISOString().split('T')[0]);

    res.json({
      active_projects: active_projects || 0,
      open_tasks: open_tasks || 0,
      hours_logged: Math.round(hours_logged * 10) / 10,
      due_this_week: due_this_week || 0
    });
  } catch (error) {
    logError('GET /api/projects/stats', error);
    res.status(500).json({ error: error.message });
  }
});

// Create project
app.post('/api/projects', async (req, res) => {
  try {
    const { name, color, description, member_ids } = req.body;

    const projectData = nullifyEmptyStrings({
      name,
      color,
      description,
      status: 'active'
    });

    const { data: project, error: projectError } = await supabaseAdmin
      .from('px_projects')
      .insert([projectData])
      .select()
      .single();

    if (projectError) throw projectError;

    // Insert project members
    if (member_ids && member_ids.length > 0) {
      const memberInserts = member_ids.map(member_id => ({
        project_id: project.id,
        member_id
      }));

      const { error: membersError } = await supabaseAdmin
        .from('px_project_members')
        .insert(memberInserts);

      if (membersError) throw membersError;
    }

    // Get full project with members
    const { data: members } = await supabase
      .from('px_project_members')
      .select('member:px_members(id, name, avatar_color)')
      .eq('project_id', project.id);

    res.json({
      ...project,
      members: members?.map(m => m.member) || []
    });
  } catch (error) {
    logError('POST /api/projects', error);
    res.status(500).json({ error: error.message });
  }
});

// Update project
app.put('/api/projects/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, color, description, member_ids } = req.body;

    const updates = nullifyEmptyStrings({
      name,
      color,
      description
    });

    const { data: project, error: projectError } = await supabaseAdmin
      .from('px_projects')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (projectError) throw projectError;

    // Update project members if provided
    if (member_ids) {
      // Delete existing members
      await supabaseAdmin
        .from('px_project_members')
        .delete()
        .eq('project_id', id);

      // Insert new members
      if (member_ids.length > 0) {
        const memberInserts = member_ids.map(member_id => ({
          project_id: id,
          member_id
        }));

        await supabaseAdmin
          .from('px_project_members')
          .insert(memberInserts);
      }
    }

    res.json(project);
  } catch (error) {
    logError('PUT /api/projects/:id', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete (archive) project
app.delete('/api/projects/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabaseAdmin
      .from('px_projects')
      .update({ status: 'archived' })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    logError('DELETE /api/projects/:id', error);
    res.status(500).json({ error: error.message });
  }
});

// Legacy update endpoint
app.patch('/api/projects/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = nullifyEmptyStrings(req.body);

    const { data, error } = await supabaseAdmin
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

    const { data, error} = await query;

    if (error) throw error;

    // Transform tags array and add counts
    const tasksWithCounts = await Promise.all(data.map(async (task) => {
      const { count: commentCount } = await supabase
        .from('px_task_comments')
        .select('*', { count: 'exact', head: true })
        .eq('task_id', task.id);

      const { count: docCount } = await supabase
        .from('px_docs')
        .select('*', { count: 'exact', head: true })
        .eq('task_id', task.id);

      return {
        ...task,
        tags: task.tags?.map(t => t.tag) || [],
        comment_count: commentCount || 0,
        doc_count: docCount || 0
      };
    }));

    res.json(tasksWithCounts);
  } catch (error) {
    logError('GET /api/tasks', error);
    res.status(500).json({ error: error.message });
  }
});

// Create task
app.post('/api/tasks', async (req, res) => {
  try {
    const taskData = nullifyEmptyStrings(req.body);

    const { data, error } = await supabaseAdmin
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

    // Get current task to check status change
    const { data: currentTask } = await supabaseAdmin
      .from('px_tasks')
      .select('status')
      .eq('id', id)
      .single();

    // Set completed_at when task is moved to done
    if (updates.status === 'done' && currentTask?.status !== 'done') {
      updates.completed_at = new Date().toISOString();
    }
    // Clear completed_at if moved back from done
    if (updates.status && updates.status !== 'done' && currentTask?.status === 'done') {
      updates.completed_at = null;
    }

    const { data, error } = await supabaseAdmin
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

    const { error } = await supabaseAdmin
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

    // Get current task to check status change
    const { data: currentTask } = await supabaseAdmin
      .from('px_tasks')
      .select('status')
      .eq('id', id)
      .single();

    const updates = {
      status,
      position,
      updated_at: new Date().toISOString()
    };

    // Set completed_at when task is moved to done
    if (status === 'done' && currentTask?.status !== 'done') {
      updates.completed_at = new Date().toISOString();
    }
    // Clear completed_at if moved back from done
    if (status !== 'done' && currentTask?.status === 'done') {
      updates.completed_at = null;
    }

    const { data, error } = await supabaseAdmin
      .from('px_tasks')
      .update(updates)
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

    const { data, error } = await supabaseAdmin
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

    const { data, error } = await supabaseAdmin
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

    const { error } = await supabaseAdmin
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
    console.log('[DEBUG] GET /api/tags - Reading tags');
    const { data, error } = await supabase
      .from('px_tags')
      .select('*')
      .order('name');

    if (error) throw error;
    console.log('[DEBUG] GET /api/tags - Found', data?.length || 0, 'tags');
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
    console.log('[DEBUG] POST /api/tags - Creating tag:', tagData);

    const { data, error } = await supabaseAdmin
      .from('px_tags')
      .insert([tagData])
      .select()
      .single();

    if (error) throw error;
    console.log('[DEBUG] POST /api/tags - Created tag:', data);
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
    console.log('[DEBUG] POST /api/tasks/:taskId/tags/:tagId - Adding tag', tagId, 'to task', taskId);

    const { data, error } = await supabaseAdmin
      .from('px_task_tags')
      .insert([{ task_id: taskId, tag_id: tagId }])
      .select()
      .single();

    if (error) throw error;
    console.log('[DEBUG] POST /api/tasks/:taskId/tags/:tagId - Added tag to task:', data);
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
    console.log('[DEBUG] DELETE /api/tasks/:taskId/tags/:tagId - Removing tag', tagId, 'from task', taskId);

    const { error } = await supabaseAdmin
      .from('px_task_tags')
      .delete()
      .eq('task_id', taskId)
      .eq('tag_id', tagId);

    if (error) throw error;
    console.log('[DEBUG] DELETE /api/tasks/:taskId/tags/:tagId - Removed tag from task');
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

    const { data, error } = await supabaseAdmin
      .from('px_standups')
      .select('member_id, vibe')
      .eq('date', today);

    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
  } catch (error) {
    logError('GET /api/standups/vibes', error);
    res.status(500).json({ error: error.message });
  }
});

// Get today's standup data for all members
app.get('/api/standup/today', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    // Get all members
    const { data: members, error: membersError } = await supabase
      .from('px_members')
      .select('*')
      .order('name');

    if (membersError) throw membersError;

    const result = await Promise.all(members.map(async (member) => {
      // Get standup for today
      const { data: standup } = await supabase
        .from('px_standups')
        .select('*')
        .eq('member_id', member.id)
        .eq('date', today)
        .single();

      // Get tasks in progress
      const { data: working_on } = await supabase
        .from('px_tasks')
        .select('id, title, status')
        .eq('status', 'in-progress')
        .eq('assignee_id', member.id);

      // Get tasks completed today
      const todayDate = new Date(today);
      const todayStart = new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate()).toISOString();
      const todayEnd = new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate(), 23, 59, 59).toISOString();

      const { data: completed_today } = await supabase
        .from('px_tasks')
        .select('id, title, status, completed_at')
        .eq('status', 'done')
        .eq('assignee_id', member.id)
        .gte('completed_at', todayStart)
        .lte('completed_at', todayEnd);

      return {
        member,
        standup: standup || null,
        working_on: working_on || [],
        completed_today: completed_today || []
      };
    }));

    res.json(result);
  } catch (error) {
    logError('GET /api/standup/today', error);
    res.status(500).json({ error: error.message });
  }
});

// Upsert today's standup
app.post('/api/standup/today', async (req, res) => {
  try {
    const { member_id, vibe, blockers, note } = req.body;
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabaseAdmin
      .from('px_standups')
      .upsert({
        member_id,
        date: today,
        vibe: vibe || 3,
        blockers: blockers || '',
        note: note || ''
      }, { onConflict: 'member_id,date' })
      .select()
      .single();

    if (error) {
      console.error('Standup upsert error:', error);
      return res.status(500).json({ error: error.message });
    }
    res.json(data);
  } catch (error) {
    logError('POST /api/standup/today', error);
    res.status(500).json({ error: error.message });
  }
});

// Helper for getting Monday of a week
const getWeekMonday = (dateStr) => {
  const d = new Date(dateStr);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split('T')[0];
};

// Get standup history
app.get('/api/standup/history', async (req, res) => {
  try {
    const { period = 'daily' } = req.query;
    console.log('History endpoint called, period:', period);

    // Get ALL standups with member info
    const { data: standups, error } = await supabaseAdmin
      .from('px_standups')
      .select(`
        id, member_id, date, blockers, note, vibe,
        px_members (id, name, avatar_color)
      `)
      .order('date', { ascending: false })
      .limit(100);

    console.log('Raw standups:', standups?.length, error);
    if (error) throw error;
    if (!standups || standups.length === 0) {
      return res.json({ data: [], hasMore: false });
    }

    // Group by date for daily view
    const grouped = {};
    standups.forEach(s => {
      const key = period === 'monthly' ? s.date.slice(0, 7)
                : period === 'weekly'  ? getWeekMonday(s.date)
                : s.date;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push({
        member: s.px_members,
        standup: s
      });
    });

    const sorted = Object.entries(grouped)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([key, entries]) => ({ date: key, entries }));

    console.log('Grouped history:', sorted.length, 'items');
    res.json({ data: sorted, hasMore: false });

  } catch (err) {
    console.error('History error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Upsert standup (legacy)
app.post('/api/standups', async (req, res) => {
  try {
    const standupData = nullifyEmptyStrings(req.body);

    const { data, error } = await supabaseAdmin
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

// Get time entries for a week
app.get('/api/time', async (req, res) => {
  try {
    const { member_id, week_start } = req.query;

    // Calculate week end (Sunday)
    const weekStartDate = new Date(week_start);
    const weekEndDate = new Date(weekStartDate);
    weekEndDate.setDate(weekStartDate.getDate() + 6);

    const weekStartStr = week_start;
    const weekEndStr = weekEndDate.toISOString().split('T')[0];

    // Get all members
    const { data: members } = await supabase
      .from('px_members')
      .select('*')
      .order('name');

    // Get time entries for the week
    const { data: entries } = await supabase
      .from('px_time_entries')
      .select(`
        *,
        task:px_tasks(id, title),
        project:px_projects(id, name, color)
      `)
      .gte('date', weekStartStr)
      .lte('date', weekEndStr)
      .order('date', { ascending: false });

    // Group by member
    const timeData = members.map(member => {
      const memberEntries = entries?.filter(e => e.member_id === member.id) || [];
      const total_hours = memberEntries.reduce((sum, e) => sum + (e.hours || 0), 0);

      return {
        member,
        total_hours: Math.round(total_hours * 10) / 10,
        entries: memberEntries.map(e => ({
          id: e.id,
          task_title: e.task?.title || null,
          project_name: e.project?.name || null,
          project_color: e.project?.color || null,
          date: e.date,
          hours: e.hours,
          note: e.note
        }))
      };
    });

    // Project breakdown
    const projectBreakdown = {};
    entries?.forEach(entry => {
      if (entry.project_id) {
        if (!projectBreakdown[entry.project_id]) {
          projectBreakdown[entry.project_id] = {
            project_id: entry.project_id,
            project_name: entry.project?.name || 'Unknown',
            project_color: entry.project?.color || '#6b7280',
            total_hours: 0
          };
        }
        projectBreakdown[entry.project_id].total_hours += entry.hours || 0;
      }
    });

    res.json({
      time_data: timeData,
      project_breakdown: Object.values(projectBreakdown)
    });
  } catch (error) {
    logError('GET /api/time', error);
    res.status(500).json({ error: error.message });
  }
});

// Get time stats for the week
app.get('/api/time/stats', async (req, res) => {
  try {
    const { member_id, week_start } = req.query;

    // This week dates
    const weekStartDate = new Date(week_start);
    const weekEndDate = new Date(weekStartDate);
    weekEndDate.setDate(weekStartDate.getDate() + 6);

    // Last week dates
    const lastWeekStartDate = new Date(weekStartDate);
    lastWeekStartDate.setDate(weekStartDate.getDate() - 7);
    const lastWeekEndDate = new Date(weekStartDate);
    lastWeekEndDate.setDate(weekStartDate.getDate() - 1);

    const weekStartStr = week_start;
    const weekEndStr = weekEndDate.toISOString().split('T')[0];
    const lastWeekStartStr = lastWeekStartDate.toISOString().split('T')[0];
    const lastWeekEndStr = lastWeekEndDate.toISOString().split('T')[0];

    // Get all members
    const { data: members } = await supabase
      .from('px_members')
      .select('*');

    const stats = await Promise.all(members.map(async (member) => {
      // This week hours
      const { data: thisWeekEntries } = await supabase
        .from('px_time_entries')
        .select('hours')
        .eq('member_id', member.id)
        .gte('date', weekStartStr)
        .lte('date', weekEndStr);

      const this_week_hours = thisWeekEntries?.reduce((sum, e) => sum + (e.hours || 0), 0) || 0;

      // Last week hours
      const { data: lastWeekEntries } = await supabase
        .from('px_time_entries')
        .select('hours')
        .eq('member_id', member.id)
        .gte('date', lastWeekStartStr)
        .lte('date', lastWeekEndStr);

      const last_week_hours = lastWeekEntries?.reduce((sum, e) => sum + (e.hours || 0), 0) || 0;

      return {
        member,
        this_week_hours: Math.round(this_week_hours * 10) / 10,
        last_week_hours: Math.round(last_week_hours * 10) / 10,
        diff: Math.round((this_week_hours - last_week_hours) * 10) / 10
      };
    }));

    res.json(stats);
  } catch (error) {
    logError('GET /api/time/stats', error);
    res.status(500).json({ error: error.message });
  }
});

// Create time entry
app.post('/api/time', async (req, res) => {
  try {
    const timeData = nullifyEmptyStrings(req.body);

    const { data: entry, error: entryError } = await supabaseAdmin
      .from('px_time_entries')
      .insert([timeData])
      .select()
      .single();

    if (entryError) throw entryError;

    // Get task and project info
    const { data: task } = await supabase
      .from('px_tasks')
      .select('id, title')
      .eq('id', entry.task_id)
      .single();

    const { data: project } = await supabase
      .from('px_projects')
      .select('id, name, color')
      .eq('id', entry.project_id)
      .single();

    res.json({
      ...entry,
      task_title: task?.title || null,
      project_name: project?.name || null,
      project_color: project?.color || null
    });
  } catch (error) {
    logError('POST /api/time', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete time entry
app.delete('/api/time/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabaseAdmin
      .from('px_time_entries')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    logError('DELETE /api/time/:id', error);
    res.status(500).json({ error: error.message });
  }
});

// Get heatmap data (past year)
app.get('/api/time/heatmap', async (req, res) => {
  try {
    const { member_id } = req.query;
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const fromDate = oneYearAgo.toISOString().split('T')[0];

    const { data, error } = await supabaseAdmin
      .from('px_time_entries')
      .select('date, hours')
      .eq('member_id', member_id)
      .gte('date', fromDate);

    if (error) return res.status(500).json({ error: error.message });

    // Group by date and sum hours
    const grouped = {};
    data.forEach(entry => {
      grouped[entry.date] = (grouped[entry.date] || 0) + Number(entry.hours);
    });

    const result = Object.entries(grouped).map(([date, hours]) => ({ date, hours }));
    res.json(result);
  } catch (error) {
    logError('GET /api/time/heatmap', error);
    res.status(500).json({ error: error.message });
  }
});

// Legacy endpoints
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

app.post('/api/time-entries', async (req, res) => {
  try {
    const timeData = nullifyEmptyStrings(req.body);

    const { data, error } = await supabaseAdmin
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

app.delete('/api/time-entries/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabaseAdmin
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
