import { Router, type IRouter } from "express";
import { createClient } from "@supabase/supabase-js";

const router: IRouter = Router();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const adminSupabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

router.post("/init-project-member", async (req, res) => {
  const { project_id, user_id } = req.body as { project_id?: string; user_id?: string };

  if (!project_id || !user_id) {
    res.status(400).json({ error: "project_id and user_id are required" });
    return;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing auth token" });
    return;
  }
  const userToken = authHeader.slice(7);

  const { data: userResult, error: userError } = await adminSupabase.auth.getUser(userToken);
  if (userError || !userResult.user) {
    res.status(401).json({ error: "Invalid auth token" });
    return;
  }

  if (userResult.user.id !== user_id) {
    res.status(403).json({ error: "user_id does not match authenticated user" });
    return;
  }

  const { data: project, error: projectError } = await adminSupabase
    .from("projects")
    .select("id, owner_id")
    .eq("id", project_id)
    .single();

  if (projectError || !project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  if (project.owner_id !== user_id) {
    res.status(403).json({ error: "Only the project owner can be initialized as owner member" });
    return;
  }

  const { error: memberError } = await adminSupabase
    .from("project_members")
    .upsert(
      { project_id, user_id, role: "owner" },
      { onConflict: "project_id,user_id" }
    );

  if (memberError) {
    res.status(500).json({ error: memberError.message });
    return;
  }

  res.json({ ok: true });
});

// Look up a project by invite code (service role bypasses projects_select_member RLS)
router.get("/project-by-invite/:code", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing auth token" });
    return;
  }
  const userToken = authHeader.slice(7);
  const { data: userResult, error: userError } = await adminSupabase.auth.getUser(userToken);
  if (userError || !userResult.user) {
    res.status(401).json({ error: "Invalid auth token" });
    return;
  }

  const { data: project, error } = await adminSupabase
    .from("projects")
    .select("id, name")
    .eq("invite_code", req.params.code.toLowerCase())
    .maybeSingle();

  if (error) { res.status(500).json({ error: error.message }); return; }
  if (!project) { res.status(404).json({ error: "Invalid invite code" }); return; }

  res.json({ project });
});

export default router;
