import { useEffect, useState } from 'react';
import { useAuth } from '../lib/auth';
import { supabase, Project, ProjectMember, Role } from '../lib/supabase';
import { formatRelativeTime } from '../lib/utils';
import Avatar from '../components/Avatar';
import RoleBadge from '../components/RoleBadge';
import Modal from '../components/Modal';
import {
  Plus, FolderGit2, Copy, Check, Trash2, UserPlus,
  Mail, Loader, Settings, X,
} from 'lucide-react';

interface ProjectsProps {
  onOpenProject: (projectId: string) => void;
}

export default function Projects({ onOpenProject }: ProjectsProps) {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [manageProject, setManageProject] = useState<Project | null>(null);

  const loadProjects = async () => {
    if (!user) return;
    const { data: memberRows } = await supabase
      .from('project_members')
      .select('project_id')
      .eq('user_id', user.id);
    const projectIds = (memberRows || []).map((m) => m.project_id);
    if (projectIds.length === 0) {
      setProjects([]);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from('projects')
      .select('*')
      .in('id', projectIds)
      .order('updated_at', { ascending: false });
    setProjects(data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadProjects();
  }, [user]);

  return (
    <div className="h-full overflow-y-auto p-6 lg:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold mb-1">Projects</h1>
            <p className="text-gray-500 dark:text-gray-400">Manage your collaborative workspaces</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowJoin(true)} className="btn-secondary">
              <Mail size={16} /> Join
            </button>
            <button onClick={() => setShowCreate(true)} className="btn-primary">
              <Plus size={16} /> New Project
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader size={24} className="animate-spin text-primary-500" />
          </div>
        ) : projects.length === 0 ? (
          <div className="card p-12 text-center">
            <FolderGit2 size={40} className="mx-auto text-gray-300 dark:text-surface-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No projects yet</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">Create a new project or join one with an invite code.</p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => setShowJoin(true)} className="btn-secondary">Join with code</button>
              <button onClick={() => setShowCreate(true)} className="btn-primary">Create project</button>
            </div>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project, i) => (
              <div
                key={project.id}
                className="card p-5 hover:shadow-md transition-all cursor-pointer group animate-slide-up"
                style={{ animationDelay: `${i * 50}ms` }}
                onClick={() => onOpenProject(project.id)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center">
                    <FolderGit2 size={20} className="text-primary-600 dark:text-primary-400" />
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); setManageProject(project); }}
                    className="opacity-0 group-hover:opacity-100 btn-ghost p-1.5 transition-opacity"
                  >
                    <Settings size={16} />
                  </button>
                </div>
                <h3 className="font-semibold mb-1 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">{project.name}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-4">{project.description || 'No description'}</p>
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>Updated {formatRelativeTime(project.updated_at)}</span>
                  <span className="font-mono">{project.invite_code}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showCreate && <CreateProjectModal onClose={() => setShowCreate(false)} onCreated={(id) => { setShowCreate(false); onOpenProject(id); }} />}
      {showJoin && <JoinProjectModal onClose={() => setShowJoin(false)} onJoined={(id) => { setShowJoin(false); onOpenProject(id); }} />}
      {manageProject && <ManageProjectModal project={manageProject} onClose={() => setManageProject(null)} onDeleted={() => { setManageProject(null); loadProjects(); }} />}
    </div>
  );
}

function CreateProjectModal({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!user || !name.trim()) return;
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from('projects')
      .insert({ name: name.trim(), description: description.trim(), owner_id: user.id })
      .select()
      .single();
    if (error) { setError(error.message); setLoading(false); return; }

    // Create default files
    const projectId = data.id;
    await supabase.from('files').insert([
      { project_id: projectId, name: 'index.html', path: 'index.html', type: 'file', language: 'html', content: '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>My Project</title>\n  <link rel="stylesheet" href="style.css">\n</head>\n<body>\n  <div class="container">\n    <h1>Hello, DevVerse!</h1>\n    <p>Start coding together.</p>\n  </div>\n  <script src="script.js"></script>\n</body>\n</html>' },
      { project_id: projectId, name: 'style.css', path: 'style.css', type: 'file', language: 'css', content: '* { margin: 0; padding: 0; box-sizing: border-box; }\nbody { font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; background: linear-gradient(135deg, #667eea, #764ba2); color: white; }\n.container { text-align: center; padding: 2rem; }\nh1 { font-size: 2.5rem; margin-bottom: 0.5rem; }\np { opacity: 0.8; }' },
      { project_id: projectId, name: 'script.js', path: 'script.js', type: 'file', language: 'javascript', content: '// Your JavaScript here\nconsole.log("Hello from DevVerse!");' },
    ]);

    setLoading(false);
    onCreated(projectId);
  };

  return (
    <Modal open onClose={onClose} title="Create New Project">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1.5">Project name</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="My Awesome Project" autoFocus />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Description (optional)</label>
          <textarea className="input min-h-[80px]" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What is this project about?" />
        </div>
        {error && <p className="text-sm text-error-600 dark:text-error-400">{error}</p>}
        <div className="flex gap-3 justify-end">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={handleCreate} disabled={loading || !name.trim()} className="btn-primary">
            {loading ? <Loader size={16} className="animate-spin" /> : <Plus size={16} />} Create
          </button>
        </div>
      </div>
    </Modal>
  );
}

function JoinProjectModal({ onClose, onJoined }: { onClose: () => void; onJoined: (id: string) => void }) {
  const { user } = useAuth();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleJoin = async () => {
    if (!user || !code.trim()) return;
    setLoading(true);
    setError(null);
    const { data: project } = await supabase
      .from('projects')
      .select('id')
      .eq('invite_code', code.trim().toLowerCase())
      .maybeSingle();
    if (!project) { setError('Invalid invite code'); setLoading(false); return; }

    const { error: memberError } = await supabase
      .from('project_members')
      .insert({ project_id: project.id, user_id: user.id, role: 'developer' });
    if (memberError) {
      if (memberError.code === '23505') setError('You are already a member of this project');
      else setError(memberError.message);
      setLoading(false);
      return;
    }
    setLoading(false);
    onJoined(project.id);
  };

  return (
    <Modal open onClose={onClose} title="Join a Project">
      <div className="space-y-4">
        <p className="text-sm text-gray-500 dark:text-gray-400">Enter the invite code shared by your team member.</p>
        <div>
          <label className="block text-sm font-medium mb-1.5">Invite code</label>
          <input className="input font-mono uppercase" value={code} onChange={(e) => setCode(e.target.value)} placeholder="ABC12345" autoFocus />
        </div>
        {error && <p className="text-sm text-error-600 dark:text-error-400">{error}</p>}
        <div className="flex gap-3 justify-end">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={handleJoin} disabled={loading || !code.trim()} className="btn-primary">
            {loading ? <Loader size={16} className="animate-spin" /> : <Mail size={16} />} Join
          </button>
        </div>
      </div>
    </Modal>
  );
}

function ManageProjectModal({ project, onClose, onDeleted }: { project: Project; onClose: () => void; onDeleted: () => void }) {
  const { user } = useAuth();
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteError, setInviteError] = useState<string | null>(null);

  const loadMembers = async () => {
    const { data } = await supabase
      .from('project_members')
      .select('*, profile:profiles(*)')
      .eq('project_id', project.id);
    setMembers(data || []);
    setLoading(false);
  };

  useEffect(() => { loadMembers(); }, [project.id]);

  const myRole = members.find((m) => m.user_id === user?.id)?.role;
  const canManage = myRole === 'owner' || myRole === 'admin';

  const copyCode = () => {
    navigator.clipboard.writeText(project.invite_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const updateRole = async (memberId: string, role: Role) => {
    await supabase.from('project_members').update({ role }).eq('id', memberId);
    loadMembers();
  };

  const removeMember = async (memberId: string) => {
    await supabase.from('project_members').delete().eq('id', memberId);
    loadMembers();
  };

  const inviteByEmail = async () => {
    setInviteError(null);
    if (!inviteEmail.trim()) return;
    setInviteError('Share the invite code with your teammate instead. They can join from the Projects page.');
  };

  const deleteProject = async () => {
    if (!confirm(`Delete "${project.name}"? This cannot be undone.`)) return;
    await supabase.from('projects').delete().eq('id', project.id);
    onDeleted();
  };

  return (
    <Modal open onClose={onClose} title="Manage Project" size="lg">
      <div className="space-y-6">
        <div>
          <h3 className="text-sm font-medium mb-2">Project details</h3>
          <div className="card p-4 space-y-2">
            <div>
              <span className="text-xs text-gray-500">Name</span>
              <p className="font-medium">{project.name}</p>
            </div>
            <div>
              <span className="text-xs text-gray-500">Description</span>
              <p className="text-sm">{project.description || 'No description'}</p>
            </div>
            <div>
              <span className="text-xs text-gray-500">Invite code</span>
              <div className="flex items-center gap-2">
                <code className="text-sm font-mono px-2 py-1 bg-gray-100 dark:bg-surface-100 rounded">{project.invite_code}</code>
                <button onClick={copyCode} className="btn-ghost p-1.5">
                  {copied ? <Check size={14} className="text-success-500" /> : <Copy size={14} />}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium mb-2">Team members ({members.length})</h3>
          {loading ? (
            <div className="flex justify-center py-4"><Loader size={20} className="animate-spin" /></div>
          ) : (
            <div className="space-y-2">
              {members.map((m) => (
                <div key={m.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-surface-100">
                  <Avatar name={m.profile?.display_name || ''} color={m.profile?.avatar_color || '#6366f1'} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{m.profile?.display_name || 'Unknown'}</p>
                    {m.user_id === project.owner_id && <p className="text-xs text-gray-400">Project owner</p>}
                  </div>
                  {canManage && m.role !== 'owner' ? (
                    <>
                      <select
                        value={m.role}
                        onChange={(e) => updateRole(m.id, e.target.value as Role)}
                        className="text-xs rounded-md border border-gray-300 dark:border-surface-300 bg-white dark:bg-surface-100 px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary-500"
                      >
                        <option value="admin">Admin</option>
                        <option value="developer">Developer</option>
                        <option value="viewer">Viewer</option>
                      </select>
                      <button onClick={() => removeMember(m.id)} className="btn-ghost p-1.5 text-error-500 hover:bg-error-50 dark:hover:bg-error-900/20">
                        <X size={14} />
                      </button>
                    </>
                  ) : (
                    <RoleBadge role={m.role} />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {canManage && (
          <div>
            <h3 className="text-sm font-medium mb-2">Invite by email</h3>
            <div className="flex gap-2">
              <input className="input" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="teammate@example.com" />
              <button onClick={inviteByEmail} className="btn-secondary shrink-0"><UserPlus size={16} /> Invite</button>
            </div>
            {inviteError && <p className="text-xs text-error-500 mt-1">{inviteError}</p>}
          </div>
        )}

        {myRole === 'owner' && (
          <div className="pt-4 border-t border-gray-200 dark:border-surface-300">
            <button onClick={deleteProject} className="btn-danger">
              <Trash2 size={16} /> Delete project
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}
