/*
# DevVerse Schema - Policies and Triggers

Adds RLS policies and triggers to all tables created in create_devverse_tables.
All policies scope access to authenticated users who are members of the relevant project.
*/

-- PROFILES
DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;
CREATE POLICY "profiles_select_all" ON public.profiles FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- PROJECTS
DROP POLICY IF EXISTS "projects_select_member" ON public.projects;
CREATE POLICY "projects_select_member" ON public.projects FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = projects.id AND pm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "projects_insert_own" ON public.projects;
CREATE POLICY "projects_insert_own" ON public.projects FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "projects_update_member" ON public.projects;
CREATE POLICY "projects_update_member" ON public.projects FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = projects.id AND pm.user_id = auth.uid()
        AND pm.role IN ('owner', 'admin')
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = projects.id AND pm.user_id = auth.uid()
        AND pm.role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "projects_delete_owner" ON public.projects;
CREATE POLICY "projects_delete_owner" ON public.projects FOR DELETE
  TO authenticated USING (auth.uid() = owner_id);

-- PROJECT MEMBERS
DROP POLICY IF EXISTS "members_select_member" ON public.project_members;
CREATE POLICY "members_select_member" ON public.project_members FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = project_members.project_id AND pm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "members_insert_admin" ON public.project_members;
CREATE POLICY "members_insert_admin" ON public.project_members FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = project_members.project_id AND pm.user_id = auth.uid()
        AND pm.role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "members_update_admin" ON public.project_members;
CREATE POLICY "members_update_admin" ON public.project_members FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = project_members.project_id AND pm.user_id = auth.uid()
        AND pm.role IN ('owner', 'admin')
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = project_members.project_id AND pm.user_id = auth.uid()
        AND pm.role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "members_delete_admin" ON public.project_members;
CREATE POLICY "members_delete_admin" ON public.project_members FOR DELETE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = project_members.project_id AND pm.user_id = auth.uid()
        AND pm.role IN ('owner', 'admin')
    )
  );

-- FILES
DROP POLICY IF EXISTS "files_select_member" ON public.files;
CREATE POLICY "files_select_member" ON public.files FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = files.project_id AND pm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "files_insert_member" ON public.files;
CREATE POLICY "files_insert_member" ON public.files FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = files.project_id AND pm.user_id = auth.uid()
        AND pm.role IN ('owner', 'admin', 'developer')
    )
  );

DROP POLICY IF EXISTS "files_update_member" ON public.files;
CREATE POLICY "files_update_member" ON public.files FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = files.project_id AND pm.user_id = auth.uid()
        AND pm.role IN ('owner', 'admin', 'developer')
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = files.project_id AND pm.user_id = auth.uid()
        AND pm.role IN ('owner', 'admin', 'developer')
    )
  );

DROP POLICY IF EXISTS "files_delete_member" ON public.files;
CREATE POLICY "files_delete_member" ON public.files FOR DELETE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = files.project_id AND pm.user_id = auth.uid()
        AND pm.role IN ('owner', 'admin', 'developer')
    )
  );

-- FILE VERSIONS
DROP POLICY IF EXISTS "versions_select_member" ON public.file_versions;
CREATE POLICY "versions_select_member" ON public.file_versions FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = file_versions.project_id AND pm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "versions_insert_member" ON public.file_versions;
CREATE POLICY "versions_insert_member" ON public.file_versions FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = file_versions.project_id AND pm.user_id = auth.uid()
        AND pm.role IN ('owner', 'admin', 'developer')
    )
  );

-- TASKS
DROP POLICY IF EXISTS "tasks_select_member" ON public.tasks;
CREATE POLICY "tasks_select_member" ON public.tasks FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = tasks.project_id AND pm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "tasks_insert_member" ON public.tasks;
CREATE POLICY "tasks_insert_member" ON public.tasks FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = tasks.project_id AND pm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "tasks_update_member" ON public.tasks;
CREATE POLICY "tasks_update_member" ON public.tasks FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = tasks.project_id AND pm.user_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = tasks.project_id AND pm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "tasks_delete_member" ON public.tasks;
CREATE POLICY "tasks_delete_member" ON public.tasks FOR DELETE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = tasks.project_id AND pm.user_id = auth.uid()
        AND pm.role IN ('owner', 'admin')
    )
  );

-- MESSAGES
DROP POLICY IF EXISTS "messages_select_member" ON public.messages;
CREATE POLICY "messages_select_member" ON public.messages FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = messages.project_id AND pm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "messages_insert_member" ON public.messages;
CREATE POLICY "messages_insert_member" ON public.messages FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = messages.project_id AND pm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "messages_delete_own" ON public.messages;
CREATE POLICY "messages_delete_own" ON public.messages FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- COMMENTS
DROP POLICY IF EXISTS "comments_select_member" ON public.comments;
CREATE POLICY "comments_select_member" ON public.comments FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = comments.project_id AND pm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "comments_insert_member" ON public.comments;
CREATE POLICY "comments_insert_member" ON public.comments FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = comments.project_id AND pm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "comments_update_own" ON public.comments;
CREATE POLICY "comments_update_own" ON public.comments FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "comments_delete_own" ON public.comments;
CREATE POLICY "comments_delete_own" ON public.comments FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- NOTIFICATIONS
DROP POLICY IF EXISTS "notifications_select_own" ON public.notifications;
CREATE POLICY "notifications_select_own" ON public.notifications FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "notifications_insert_own" ON public.notifications;
CREATE POLICY "notifications_insert_own" ON public.notifications FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "notifications_update_own" ON public.notifications;
CREATE POLICY "notifications_update_own" ON public.notifications FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "notifications_delete_own" ON public.notifications;
CREATE POLICY "notifications_delete_own" ON public.notifications FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- PRESENCE
DROP POLICY IF EXISTS "presence_select_member" ON public.presence;
CREATE POLICY "presence_select_member" ON public.presence FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = presence.project_id AND pm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "presence_upsert_own" ON public.presence;
CREATE POLICY "presence_upsert_own" ON public.presence FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "presence_update_own" ON public.presence;
CREATE POLICY "presence_update_own" ON public.presence FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "presence_delete_own" ON public.presence;
CREATE POLICY "presence_delete_own" ON public.presence FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- TRIGGERS
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)))
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_new_project()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.project_members (project_id, user_id, role)
  VALUES (new.id, new.owner_id, 'owner')
  ON CONFLICT (project_id, user_id) DO NOTHING;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_project_created ON public.projects;
CREATE TRIGGER on_project_created
  AFTER INSERT ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_project();

CREATE OR REPLACE FUNCTION public.touch_project_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE public.projects SET updated_at = now() WHERE id = COALESCE(NEW.project_id, OLD.project_id);
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS on_file_change_touch_project ON public.files;
CREATE TRIGGER on_file_change_touch_project
  AFTER INSERT OR UPDATE OR DELETE ON public.files
  FOR EACH ROW EXECUTE FUNCTION public.touch_project_updated_at();
