import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

export type Role = 'owner' | 'admin' | 'developer' | 'viewer';
export type TaskStatus = 'todo' | 'in_progress' | 'completed';
export type Priority = 'low' | 'medium' | 'high';

export interface Profile {
  id: string;
  display_name: string;
  avatar_color: string;
  bio: string;
  created_at: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  owner_id: string;
  invite_code: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  role: Role;
  created_at: string;
  profile?: Profile;
}

export interface FileNode {
  id: string;
  project_id: string;
  name: string;
  path: string;
  type: 'file' | 'folder';
  language: string;
  content: string;
  parent_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface FileVersion {
  id: string;
  file_id: string;
  project_id: string;
  content: string;
  created_by: string;
  created_at: string;
  message: string;
  author?: Profile;
}

export interface Task {
  id: string;
  project_id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: Priority;
  assignee_id: string | null;
  created_by: string;
  deadline: string | null;
  created_at: string;
  updated_at: string;
  assignee?: Profile;
}

export interface Message {
  id: string;
  project_id: string;
  user_id: string;
  content: string;
  created_at: string;
  author?: Profile;
}

export interface Comment {
  id: string;
  project_id: string;
  file_id: string;
  user_id: string;
  line: number;
  content: string;
  resolved: boolean;
  created_at: string;
  author?: Profile;
}

export interface Notification {
  id: string;
  user_id: string;
  project_id: string | null;
  type: string;
  message: string;
  read: boolean;
  created_at: string;
}

export interface Presence {
  id: string;
  project_id: string;
  user_id: string;
  cursor_line: number;
  cursor_col: number;
  active_file_id: string | null;
  last_seen: string;
  profile?: Profile;
}

export type PracticeCategory = 'html' | 'css' | 'javascript' | 'react' | 'nodejs' | 'fullstack';
export type PracticeDifficulty = 'beginner' | 'intermediate' | 'advanced';

export interface PracticeTemplate {
  id: string;
  title: string;
  description: string;
  category: PracticeCategory;
  difficulty: PracticeDifficulty;
  instructions: string;
  estimated_time: string;
  skills: string[];
  is_published: boolean;
  created_by: string | null;
  created_at: string;
}

export interface PracticeTemplateFile {
  id: string;
  template_id: string;
  name: string;
  path: string;
  language: string;
  content: string;
  sort_order: number;
}

export interface PracticeProject {
  id: string;
  template_id: string;
  project_id: string;
  started_by: string;
  mode: 'solo' | 'team';
  status: 'in_progress' | 'completed' | 'abandoned';
  started_at: string;
  completed_at: string | null;
  template?: PracticeTemplate;
  project?: Project;
}
