
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Type definitions for database entities
export interface Project {
  id: string;
  name: string;
  description: string | null;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: 'todo' | 'in-progress' | 'review' | 'completed';
  priority: 'low' | 'medium' | 'high';
  due_date: string | null;
  project_id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
  project_id: string | null;
  created_by: string;
  created_at: string;
}

export interface TaskTag {
  id: string;
  task_id: string;
  tag_id: string;
  created_at: string;
}

export interface Team {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role: string;
  created_at: string;
}

export interface UserProfile {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  job_title: string | null;
  bio: string | null;
  created_at: string;
  updated_at: string;
}

export interface Comment {
  id: string;
  task_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

// Project operations
export const fetchProjects = async (): Promise<Project[]> => {
  try {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as Project[];
  } catch (error: any) {
    toast.error(`Error fetching projects: ${error.message}`);
    return [];
  }
};

export const createProject = async (project: Omit<Project, 'id' | 'created_at' | 'updated_at'>): Promise<Project | null> => {
  try {
    const { data, error } = await supabase
      .from('projects')
      .insert(project)
      .select()
      .single();

    if (error) throw error;
    toast.success('Project created successfully!');
    return data as Project;
  } catch (error: any) {
    toast.error(`Error creating project: ${error.message}`);
    return null;
  }
};

export const updateProject = async (id: string, updates: Partial<Project>): Promise<Project | null> => {
  try {
    const { data, error } = await supabase
      .from('projects')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    toast.success('Project updated successfully!');
    return data as Project;
  } catch (error: any) {
    toast.error(`Error updating project: ${error.message}`);
    return null;
  }
};

export const deleteProject = async (id: string): Promise<boolean> => {
  try {
    // First delete all tasks associated with the project
    const { error: tasksError } = await supabase
      .from('tasks')
      .delete()
      .eq('project_id', id);
    
    if (tasksError) throw tasksError;
    
    // Then delete the project
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id);

    if (error) throw error;
    toast.success('Project deleted successfully!');
    return true;
  } catch (error: any) {
    toast.error(`Error deleting project: ${error.message}`);
    return false;
  }
};

// Task operations
export const fetchTasks = async (projectId: string): Promise<Task[]> => {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as Task[];
  } catch (error: any) {
    toast.error(`Error fetching tasks: ${error.message}`);
    return [];
  }
};

export const createTask = async (task: Omit<Task, 'id' | 'created_at' | 'updated_at'>): Promise<Task | null> => {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .insert(task)
      .select()
      .single();

    if (error) throw error;
    toast.success('Task created successfully!');
    return data as Task;
  } catch (error: any) {
    toast.error(`Error creating task: ${error.message}`);
    return null;
  }
};

export const updateTask = async (id: string, updates: Partial<Task>): Promise<Task | null> => {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    toast.success('Task updated successfully!');
    return data as Task;
  } catch (error: any) {
    toast.error(`Error updating task: ${error.message}`);
    return null;
  }
};

export const updateTaskStatus = async (id: string, status: Task['status']): Promise<Task | null> => {
  return updateTask(id, { status });
};

export const deleteTask = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id);

    if (error) throw error;
    toast.success('Task deleted successfully!');
    return true;
  } catch (error: any) {
    toast.error(`Error deleting task: ${error.message}`);
    return false;
  }
};

// Team operations
export const fetchTeams = async (): Promise<Team[]> => {
  try {
    const { data, error } = await supabase
      .from('teams')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as Team[];
  } catch (error: any) {
    toast.error(`Error fetching teams: ${error.message}`);
    return [];
  }
};

export const createTeam = async (team: Omit<Team, 'id' | 'created_at' | 'updated_at'>): Promise<Team | null> => {
  try {
    const { data, error } = await supabase
      .from('teams')
      .insert(team)
      .select()
      .single();

    if (error) throw error;
    toast.success('Team created successfully!');
    return data as Team;
  } catch (error: any) {
    toast.error(`Error creating team: ${error.message}`);
    return null;
  }
};

// Team member operations
export const addTeamMember = async (teamMember: Omit<TeamMember, 'id' | 'created_at'>): Promise<TeamMember | null> => {
  try {
    const { data, error } = await supabase
      .from('team_members')
      .insert(teamMember)
      .select()
      .single();

    if (error) throw error;
    toast.success('Team member added successfully!');
    return data as TeamMember;
  } catch (error: any) {
    toast.error(`Error adding team member: ${error.message}`);
    return null;
  }
};

// User profile operations
export const fetchUserProfile = async (userId: string): Promise<UserProfile | null> => {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw error;
    return data as UserProfile;
  } catch (error: any) {
    console.error(`Error fetching user profile: ${error.message}`);
    return null;
  }
};

export const updateUserProfile = async (userId: string, updates: Partial<UserProfile>): Promise<UserProfile | null> => {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    toast.success('Profile updated successfully!');
    return data as UserProfile;
  } catch (error: any) {
    toast.error(`Error updating profile: ${error.message}`);
    return null;
  }
};

// Tag operations
export const fetchTags = async (projectId: string): Promise<Tag[]> => {
  try {
    const { data, error } = await supabase
      .from('tags')
      .select('*')
      .eq('project_id', projectId)
      .order('name', { ascending: true });

    if (error) throw error;
    return data as Tag[];
  } catch (error: any) {
    toast.error(`Error fetching tags: ${error.message}`);
    return [];
  }
};

export const createTag = async (tag: Omit<Tag, 'id' | 'created_at'>): Promise<Tag | null> => {
  try {
    const { data, error } = await supabase
      .from('tags')
      .insert(tag)
      .select()
      .single();

    if (error) throw error;
    toast.success('Tag created successfully!');
    return data as Tag;
  } catch (error: any) {
    toast.error(`Error creating tag: ${error.message}`);
    return null;
  }
};

// Task tag operations
export const addTagToTask = async (taskId: string, tagId: string): Promise<TaskTag | null> => {
  try {
    const { data, error } = await supabase
      .from('task_tags')
      .insert({ task_id: taskId, tag_id: tagId })
      .select()
      .single();

    if (error) throw error;
    return data as TaskTag;
  } catch (error: any) {
    toast.error(`Error adding tag to task: ${error.message}`);
    return null;
  }
};

export const removeTagFromTask = async (taskId: string, tagId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('task_tags')
      .delete()
      .match({ task_id: taskId, tag_id: tagId });

    if (error) throw error;
    return true;
  } catch (error: any) {
    toast.error(`Error removing tag from task: ${error.message}`);
    return false;
  }
};

// Comment operations
export const fetchComments = async (taskId: string): Promise<Comment[]> => {
  try {
    const { data, error } = await supabase
      .from('comments')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data as Comment[];
  } catch (error: any) {
    toast.error(`Error fetching comments: ${error.message}`);
    return [];
  }
};

export const createComment = async (comment: Omit<Comment, 'id' | 'created_at' | 'updated_at'>): Promise<Comment | null> => {
  try {
    const { data, error } = await supabase
      .from('comments')
      .insert(comment)
      .select()
      .single();

    if (error) throw error;
    return data as Comment;
  } catch (error: any) {
    toast.error(`Error creating comment: ${error.message}`);
    return null;
  }
};

// Project members operations
export const addProjectMember = async (projectId: string, userId: string, role: string = 'member'): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('project_members')
      .insert({ project_id: projectId, user_id: userId, role });

    if (error) throw error;
    toast.success('Member added to project successfully!');
    return true;
  } catch (error: any) {
    toast.error(`Error adding member to project: ${error.message}`);
    return false;
  }
};

export const fetchProjectMembers = async (projectId: string): Promise<any[]> => {
  try {
    const { data, error } = await supabase
      .from('project_members')
      .select(`
        id, role,
        user_id,
        user_profiles:user_id (id, username, full_name, avatar_url)
      `)
      .eq('project_id', projectId);

    if (error) throw error;
    return data;
  } catch (error: any) {
    toast.error(`Error fetching project members: ${error.message}`);
    return [];
  }
};
