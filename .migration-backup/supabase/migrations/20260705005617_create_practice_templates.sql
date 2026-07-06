/*
# Practice Templates and Practice Projects

## Purpose
Adds a practice project system so members can learn by building pre-built sample
projects. A user can start a practice project solo or invite 1-2 teammates to
help. Practice templates are pre-defined by admins and contain starter files,
instructions, and difficulty levels.

## New Tables

### practice_templates
- `id` (uuid, PK) — template identifier
- `title` (text) — name of the practice project (e.g. "Todo App")
- `description` (text) — what the project teaches
- `category` (text) — one of: html, css, javascript, react, nodejs, fullstack
- `difficulty` (text) — one of: beginner, intermediate, advanced
- `instructions` (text) — step-by-step guide for the learner
- `estimated_time` (text) — e.g. "30 min", "2 hours"
- `skills` (text[]) — skills practiced (e.g. ["Flexbox", "DOM"])
- `is_published` (boolean) — only published templates show to users
- `created_by` (uuid) — admin who created the template
- `created_at` (timestamptz)

### practice_template_files
- `id` (uuid, PK)
- `template_id` (uuid, FK) — references practice_templates
- `name` (text) — file name (e.g. "index.html")
- `path` (text) — file path
- `language` (text) — html, css, javascript, etc.
- `content` (text) — starter code content
- `sort_order` (int) — display order

### practice_projects
- `id` (uuid, PK) — the practice project instance
- `template_id` (uuid, FK) — which template this practice is based on
- `project_id` (uuid, FK) — the actual project created for this practice
- `started_by` (uuid) — user who started the practice
- `mode` (text) — 'solo' or 'team'
- `status` (text) — 'in_progress', 'completed', 'abandoned'
- `started_at` (timestamptz)
- `completed_at` (timestamptz)

## Security
- practice_templates: all authenticated users can SELECT published templates
- practice_template_files: all authenticated users can SELECT files for published templates
- practice_projects: authenticated users can SELECT/INSERT their own practice projects
- practice_projects UPDATE: only the starter can mark complete/abandoned

## Notes
1. Practice projects reuse the existing `projects` and `files` tables — when a
   user starts practice, we create a real project, copy template files into it,
   and record the link in `practice_projects`.
2. The existing `handle_new_project` trigger auto-adds the starter as owner.
3. Team mode: the starter shares the invite code with 1-2 teammates who join as
   developers.
*/

-- Practice templates table
CREATE TABLE IF NOT EXISTS public.practice_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'html' CHECK (category IN ('html', 'css', 'javascript', 'react', 'nodejs', 'fullstack')),
  difficulty text NOT NULL DEFAULT 'beginner' CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  instructions text NOT NULL DEFAULT '',
  estimated_time text NOT NULL DEFAULT '30 min',
  skills text[] NOT NULL DEFAULT '{}',
  is_published boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Practice template files table
CREATE TABLE IF NOT EXISTS public.practice_template_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.practice_templates(id) ON DELETE CASCADE,
  name text NOT NULL,
  path text NOT NULL,
  language text NOT NULL DEFAULT '',
  content text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0
);

-- Practice projects table (links a practice attempt to a real project)
CREATE TABLE IF NOT EXISTS public.practice_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.practice_templates(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  started_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  mode text NOT NULL DEFAULT 'solo' CHECK (mode IN ('solo', 'team')),
  status text NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned')),
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

-- Enable RLS
ALTER TABLE public.practice_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practice_template_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practice_projects ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_practice_templates_published ON public.practice_templates(is_published);
CREATE INDEX IF NOT EXISTS idx_practice_template_files_template ON public.practice_template_files(template_id);
CREATE INDEX IF NOT EXISTS idx_practice_projects_user ON public.practice_projects(started_by);
CREATE INDEX IF NOT EXISTS idx_practice_projects_project ON public.practice_projects(project_id);

-- POLICIES: practice_templates (published templates visible to all authenticated)
DROP POLICY IF EXISTS "practice_templates_select" ON public.practice_templates;
CREATE POLICY "practice_templates_select" ON public.practice_templates FOR SELECT
  TO authenticated USING (is_published = true);

DROP POLICY IF EXISTS "practice_templates_insert" ON public.practice_templates;
CREATE POLICY "practice_templates_insert" ON public.practice_templates FOR INSERT
  TO authenticated WITH CHECK (true);

-- POLICIES: practice_template_files (visible if template is published)
DROP POLICY IF EXISTS "practice_template_files_select" ON public.practice_template_files;
CREATE POLICY "practice_template_files_select" ON public.practice_template_files FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.practice_templates t
      WHERE t.id = practice_template_files.template_id AND t.is_published = true
    )
  );

-- POLICIES: practice_projects (users see their own practice projects)
DROP POLICY IF EXISTS "practice_projects_select_own" ON public.practice_projects;
CREATE POLICY "practice_projects_select_own" ON public.practice_projects FOR SELECT
  TO authenticated USING (
    started_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = practice_projects.project_id AND pm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "practice_projects_insert_own" ON public.practice_projects;
CREATE POLICY "practice_projects_insert_own" ON public.practice_projects FOR INSERT
  TO authenticated WITH CHECK (started_by = auth.uid());

DROP POLICY IF EXISTS "practice_projects_update_own" ON public.practice_projects;
CREATE POLICY "practice_projects_update_own" ON public.practice_projects FOR UPDATE
  TO authenticated USING (started_by = auth.uid()) WITH CHECK (started_by = auth.uid());

DROP POLICY IF EXISTS "practice_projects_delete_own" ON public.practice_projects;
CREATE POLICY "practice_projects_delete_own" ON public.practice_projects FOR DELETE
  TO authenticated USING (started_by = auth.uid());
