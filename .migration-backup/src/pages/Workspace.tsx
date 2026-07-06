import { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '../lib/auth';
import { supabase, Project, FileNode, ProjectMember, Presence, Message, Task, TaskStatus, FileVersion } from '../lib/supabase';
import { getLanguageFromName, formatRelativeTime, highlightMentions } from '../lib/utils';
import CodeEditor from '../components/CodeEditor';
import FileTree from '../components/FileTree';
import Preview from '../components/Preview';
import Avatar from '../components/Avatar';
import RoleBadge from '../components/RoleBadge';
import Modal from '../components/Modal';
import {
  ArrowLeft, History, MessageSquare, CheckSquare,
  Users, Plus, Trash2, Clock, Send,
  Code2, Eye, GitBranch, Loader, Check, Circle,
} from 'lucide-react';

interface WorkspaceProps {
  projectId: string;
  onBack: () => void;
  onOpenManage: () => void;
}

type Tab = 'editor' | 'tasks' | 'chat' | 'history';

export default function Workspace({ projectId, onBack, onOpenManage }: WorkspaceProps) {
  const { user } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [files, setFiles] = useState<FileNode[]>([]);
  const [activeFile, setActiveFile] = useState<FileNode | null>(null);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [presence, setPresence] = useState<Presence[]>([]);
  const [tab, setTab] = useState<Tab>('editor');
  const [showPreview, setShowPreview] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(true);
  const [loading, setLoading] = useState(true);
  const [myRole, setMyRole] = useState<string>('viewer');
  const [showMembers, setShowMembers] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const presenceTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load project data
  useEffect(() => {
    (async () => {
      const { data: proj } = await supabase.from('projects').select('*').eq('id', projectId).maybeSingle();
      setProject(proj);

      const { data: fileData } = await supabase.from('files').select('*').eq('project_id', projectId).order('name');
      setFiles(fileData || []);
      if (fileData && fileData.length > 0) {
        const html = fileData.find((f) => f.language === 'html');
        setActiveFile(html || fileData[0]);
      }

      const { data: memberData } = await supabase
        .from('project_members')
        .select('*, profile:profiles(*)')
        .eq('project_id', projectId);
      setMembers(memberData || []);
      const myMember = (memberData || []).find((m) => m.user_id === user?.id);
      setMyRole(myMember?.role || 'viewer');

      setLoading(false);
    })();
  }, [projectId, user]);

  // Real-time subscriptions
  useEffect(() => {
    if (!projectId) return;

    const filesChannel = supabase
      .channel(`files-${projectId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'files', filter: `project_id=eq.${projectId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setFiles((prev) => [...prev, payload.new as FileNode]);
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as FileNode;
            setFiles((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
            setActiveFile((prev) => (prev?.id === updated.id ? updated : prev));
          } else if (payload.eventType === 'DELETE') {
            const deleted = payload.old as FileNode;
            setFiles((prev) => prev.filter((f) => f.id !== deleted.id));
            setActiveFile((prev) => (prev?.id === deleted.id ? null : prev));
          }
        }
      )
      .subscribe();

    const presenceChannel = supabase
      .channel(`presence-${projectId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'presence', filter: `project_id=eq.${projectId}` },
        async () => {
          const { data } = await supabase
            .from('presence')
            .select('*, profile:profiles(*)')
            .eq('project_id', projectId);
          setPresence(data || []);
        }
      )
      .subscribe();

    // Load initial presence
    (async () => {
      const { data } = await supabase
        .from('presence')
        .select('*, profile:profiles(*)')
        .eq('project_id', projectId);
      setPresence(data || []);
    })();

    return () => {
      supabase.removeChannel(filesChannel);
      supabase.removeChannel(presenceChannel);
    };
  }, [projectId]);

  // Upsert my presence
  const updatePresence = useCallback(async (cursorLine?: number, cursorCol?: number, fileId?: string) => {
    if (!user || !projectId) return;
    const payload: any = {
      project_id: projectId,
      user_id: user.id,
      last_seen: new Date().toISOString(),
    };
    if (cursorLine !== undefined) payload.cursor_line = cursorLine;
    if (cursorCol !== undefined) payload.cursor_col = cursorCol;
    if (fileId !== undefined) payload.active_file_id = fileId;

    const { data: existing } = await supabase
      .from('presence')
      .select('id')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (existing) {
      await supabase.from('presence').update(payload).eq('id', existing.id);
    } else {
      await supabase.from('presence').insert(payload);
    }
  }, [user, projectId]);

  // Heartbeat presence
  useEffect(() => {
    if (!user || !projectId) return;
    updatePresence();
    presenceTimer.current = setInterval(() => updatePresence(), 15000);
    return () => {
      if (presenceTimer.current) clearInterval(presenceTimer.current);
      // Mark offline
      supabase.from('presence').delete().eq('project_id', projectId).eq('user_id', user.id);
    };
  }, [user, projectId, updatePresence]);

  // Auto-save
  const handleContentChange = (content: string) => {
    if (!activeFile) return;
    setSaved(false);
    setActiveFile({ ...activeFile, content });
    setFiles((prev) => prev.map((f) => (f.id === activeFile.id ? { ...f, content } : f)));

    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSaving(true);
      await supabase.from('files').update({ content, updated_at: new Date().toISOString() }).eq('id', activeFile.id);
      // Create version snapshot
      await supabase.from('file_versions').insert({
        file_id: activeFile.id,
        project_id: activeFile.project_id,
        content,
        created_by: user?.id,
        message: 'Auto-save',
      });
      setSaving(false);
      setSaved(true);
    }, 2000);
  };

  const handleCursorChange = (line: number, col: number) => {
    if (activeFile) updatePresence(line, col, activeFile.id);
  };

  const handleCreateFile = async (name: string, isFolder: boolean, parentId?: string | null) => {
    const lang = isFolder ? '' : getLanguageFromName(name);
    const path = name;
    const { data } = await supabase.from('files').insert({
      project_id: projectId,
      name,
      path,
      type: isFolder ? 'folder' : 'file',
      language: lang,
      content: '',
      parent_id: parentId || null,
      created_by: user?.id,
    }).select().single();
    if (data && !isFolder) setActiveFile(data);
  };

  const handleDeleteFile = async (file: FileNode) => {
    if (!confirm(`Delete ${file.name}?`)) return;
    await supabase.from('files').delete().eq('id', file.id);
    if (activeFile?.id === file.id) setActiveFile(null);
  };

  const canEdit = myRole === 'owner' || myRole === 'admin' || myRole === 'developer';

  // Remote cursors for active file
  const remoteCursors = presence
    .filter((p) => p.user_id !== user?.id && p.active_file_id === activeFile?.id)
    .map((p) => ({
      line: p.cursor_line,
      col: p.cursor_col,
      color: p.profile?.avatar_color || '#6366f1',
      name: p.profile?.display_name || 'User',
    }));

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader size={24} className="animate-spin text-primary-500" />
      </div>
    );
  }

  const onlineMembers = presence.map((p) => p.user_id);

  return (
    <div className="h-full flex flex-col bg-surface-light dark:bg-surface">
      {/* Top bar */}
      <div className="h-12 border-b border-gray-200 dark:border-surface-300 bg-white dark:bg-surface-50 flex items-center px-3 gap-3 shrink-0">
        <button onClick={onBack} className="btn-ghost p-1.5">
          <ArrowLeft size={18} />
        </button>
        <div className="flex items-center gap-2">
          <Code2 size={18} className="text-primary-500" />
          <span className="font-semibold text-sm">{project?.name}</span>
        </div>

        {/* Save status */}
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          {saving ? (
            <><Loader size={12} className="animate-spin" /> Saving...</>
          ) : saved ? (
            <><Check size={12} className="text-success-500" /> Saved</>
          ) : (
            <><Circle size={8} className="text-warning-500 fill-warning-500" /> Unsaved</>
          )}
        </div>

        <div className="flex-1" />

        {/* Online members */}
        <div className="flex items-center gap-1">
          <div className="flex -space-x-2">
            {members.slice(0, 5).map((m) => (
              <div key={m.user_id} className="ring-2 ring-white dark:ring-surface-50 rounded-full" title={m.profile?.display_name}>
                <Avatar
                  name={m.profile?.display_name || ''}
                  color={m.profile?.avatar_color || '#6366f1'}
                  size="xs"
                  online={onlineMembers.includes(m.user_id)}
                />
              </div>
            ))}
          </div>
          <button onClick={() => setShowMembers(true)} className="btn-ghost p-1.5" title="Team members">
            <Users size={16} />
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="h-10 border-b border-gray-200 dark:border-surface-300 bg-white dark:bg-surface-50 flex items-center px-2 gap-1 shrink-0">
        {([
          { id: 'editor' as Tab, label: 'Editor', icon: Code2 },
          { id: 'tasks' as Tab, label: 'Tasks', icon: CheckSquare },
          { id: 'chat' as Tab, label: 'Chat', icon: MessageSquare },
          { id: 'history' as Tab, label: 'History', icon: History },
        ]).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === t.id
                ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-surface-100'
            }`}
          >
            <t.icon size={15} />
            {t.label}
          </button>
        ))}
        <div className="flex-1" />
        {tab === 'editor' && (
          <button
            onClick={() => setShowPreview(!showPreview)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              showPreview ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-surface-100'
            }`}
          >
            <Eye size={15} /> Preview
          </button>
        )}
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-hidden">
        {tab === 'editor' && (
          <div className="h-full flex">
            {/* File tree */}
            <div className="w-56 border-r border-gray-200 dark:border-surface-300 bg-white dark:bg-surface-50 overflow-y-auto shrink-0">
              <FileTree
                files={files}
                activeFileId={activeFile?.id || null}
                onSelectFile={setActiveFile}
                onCreateFile={handleCreateFile}
                onDeleteFile={handleDeleteFile}
              />
            </div>

            {/* Editor + Preview */}
            <div className="flex-1 flex min-w-0">
              {activeFile ? (
                <div className={`flex-1 flex ${showPreview ? 'flex-1' : 'flex-1'}`}>
                  <div className="flex-1 flex flex-col min-w-0">
                    <div className="h-9 border-b border-gray-200 dark:border-surface-300 bg-white dark:bg-surface-50 flex items-center px-3 gap-2 shrink-0">
                      <FileIcon language={activeFile.language} />
                      <span className="text-sm font-medium">{activeFile.name}</span>
                      {remoteCursors.length > 0 && (
                        <div className="flex items-center gap-1 ml-auto">
                          {remoteCursors.slice(0, 3).map((c, i) => (
                            <div key={i} className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white" style={{ backgroundColor: c.color }}>
                              {c.name.slice(0, 2).toUpperCase()}
                            </div>
                          ))}
                          <span className="text-xs text-gray-400">editing</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <CodeEditor
                        value={activeFile.content}
                        language={activeFile.language}
                        onChange={handleContentChange}
                        onCursorChange={handleCursorChange}
                        readOnly={!canEdit}
                        remoteCursors={remoteCursors}
                      />
                    </div>
                  </div>
                  {showPreview && (
                    <div className="flex-1 border-l border-gray-200 dark:border-surface-300">
                      <Preview files={files} />
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-gray-400">
                  <div className="text-center">
                    <Code2 size={40} className="mx-auto mb-3 opacity-40" />
                    <p>Select a file to start editing</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'tasks' && <TasksPanel projectId={projectId} members={members} canEdit={canEdit} />}
        {tab === 'chat' && <ChatPanel projectId={projectId} members={members} />}
        {tab === 'history' && <HistoryPanel projectId={projectId} files={files} />}
      </div>

      {showMembers && <MembersModal members={members} onlineMembers={onlineMembers} onClose={() => setShowMembers(false)} onManage={onOpenManage} />}
    </div>
  );
}

function FileIcon({ language }: { language: string }) {
  const colors: Record<string, string> = {
    html: '#e34c26',
    css: '#563d7c',
    javascript: '#f1e05a',
    typescript: '#3178c6',
    json: '#292929',
  };
  return <Code2 size={14} style={{ color: colors[language] || '#6b7280' }} />;
}

// ============================================================================
// TASKS PANEL
// ============================================================================
function TasksPanel({ projectId, members, canEdit }: { projectId: string; members: ProjectMember[]; canEdit: boolean }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newPriority, setNewPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [newAssignee, setNewAssignee] = useState('');
  const [newDeadline, setNewDeadline] = useState('');

  const loadTasks = async () => {
    const { data } = await supabase
      .from('tasks')
      .select('*, assignee:profiles(*)')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });
    setTasks(data || []);
  };

  useEffect(() => {
    loadTasks();
    const channel = supabase
      .channel(`tasks-${projectId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `project_id=eq.${projectId}` }, () => loadTasks())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [projectId]);

  const createTask = async () => {
    if (!newTitle.trim()) return;
    await supabase.from('tasks').insert({
      project_id: projectId,
      title: newTitle.trim(),
      priority: newPriority,
      assignee_id: newAssignee || null,
      deadline: newDeadline || null,
    });
    setNewTitle(''); setNewPriority('medium'); setNewAssignee(''); setNewDeadline('');
    setShowCreate(false);
  };

  const updateStatus = async (taskId: string, status: TaskStatus) => {
    await supabase.from('tasks').update({ status, updated_at: new Date().toISOString() }).eq('id', taskId);
  };

  const deleteTask = async (taskId: string) => {
    await supabase.from('tasks').delete().eq('id', taskId);
  };

  const columns: { id: TaskStatus; label: string; color: string }[] = [
    { id: 'todo', label: 'To Do', color: 'text-gray-500' },
    { id: 'in_progress', label: 'In Progress', color: 'text-warning-500' },
    { id: 'completed', label: 'Completed', color: 'text-success-500' },
  ];

  return (
    <div className="h-full flex flex-col bg-surface-light dark:bg-surface">
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-surface-300">
        <h2 className="font-semibold">Task Board</h2>
        {canEdit && (
          <button onClick={() => setShowCreate(true)} className="btn-primary text-sm">
            <Plus size={15} /> New Task
          </button>
        )}
      </div>
      <div className="flex-1 overflow-x-auto p-4">
        <div className="flex gap-4 min-w-max h-full">
          {columns.map((col) => {
            const colTasks = tasks.filter((t) => t.status === col.id);
            return (
              <div key={col.id} className="w-72 shrink-0">
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-sm font-semibold ${col.color}`}>{col.label}</span>
                  <span className="text-xs text-gray-400 bg-gray-100 dark:bg-surface-100 px-2 py-0.5 rounded-full">{colTasks.length}</span>
                </div>
                <div className="space-y-2">
                  {colTasks.map((task) => (
                    <div key={task.id} className="card p-3 group">
                      <div className="flex items-start justify-between mb-2">
                        <p className="text-sm font-medium flex-1">{task.title}</p>
                        {canEdit && (
                          <button onClick={() => deleteTask(task.id)} className="opacity-0 group-hover:opacity-100 p-0.5 text-error-500 hover:bg-error-50 dark:hover:bg-error-900/20 rounded transition-opacity">
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                      {task.description && <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 line-clamp-2">{task.description}</p>}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {task.assignee && <Avatar name={task.assignee.display_name} color={task.assignee.avatar_color} size="xs" />}
                          <span className={`badge ${
                            task.priority === 'high' ? 'bg-error-100 text-error-700 dark:bg-error-900/30 dark:text-error-400'
                            : task.priority === 'medium' ? 'bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-400'
                            : 'bg-gray-100 text-gray-600 dark:bg-surface-200 dark:text-gray-400'
                          }`}>{task.priority}</span>
                        </div>
                        {task.deadline && (
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <Clock size={11} /> {new Date(task.deadline).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                          </span>
                        )}
                      </div>
                      {canEdit && (
                        <select
                          value={task.status}
                          onChange={(e) => updateStatus(task.id, e.target.value as TaskStatus)}
                          className="mt-2 w-full text-xs rounded border border-gray-200 dark:border-surface-300 bg-white dark:bg-surface-100 px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary-500"
                        >
                          <option value="todo">To Do</option>
                          <option value="in_progress">In Progress</option>
                          <option value="completed">Completed</option>
                        </select>
                      )}
                    </div>
                  ))}
                  {colTasks.length === 0 && (
                    <div className="text-center py-8 text-xs text-gray-400 border-2 border-dashed border-gray-200 dark:border-surface-300 rounded-lg">
                      No tasks
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {showCreate && (
        <Modal open onClose={() => setShowCreate(false)} title="New Task">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Title</label>
              <input className="input" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Task title" autoFocus />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1.5">Priority</label>
                <select className="input" value={newPriority} onChange={(e) => setNewPriority(e.target.value as any)}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Deadline</label>
                <input type="date" className="input" value={newDeadline} onChange={(e) => setNewDeadline(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Assignee</label>
              <select className="input" value={newAssignee} onChange={(e) => setNewAssignee(e.target.value)}>
                <option value="">Unassigned</option>
                {members.map((m) => (
                  <option key={m.user_id} value={m.user_id}>{m.profile?.display_name}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowCreate(false)} className="btn-secondary">Cancel</button>
              <button onClick={createTask} disabled={!newTitle.trim()} className="btn-primary"><Plus size={16} /> Create</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ============================================================================
// CHAT PANEL
// ============================================================================
function ChatPanel({ projectId, members }: { projectId: string; members: ProjectMember[] }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadMessages = async () => {
    const { data } = await supabase
      .from('messages')
      .select('*, author:profiles(*)')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true })
      .limit(100);
    setMessages(data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadMessages();
    const channel = supabase
      .channel(`messages-${projectId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `project_id=eq.${projectId}` },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [projectId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const send = async () => {
    if (!input.trim() || !user) return;
    const content = input.trim();
    setInput('');
    await supabase.from('messages').insert({
      project_id: projectId,
      user_id: user.id,
      content,
    });
  };

  const memberMap = new Map(members.map((m) => [m.user_id, m.profile]));

  return (
    <div className="h-full flex flex-col bg-surface-light dark:bg-surface">
      <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
        {loading ? (
          <div className="flex justify-center py-8"><Loader size={20} className="animate-spin text-primary-500" /></div>
        ) : messages.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <MessageSquare size={32} className="mx-auto mb-2 opacity-40" />
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const author = msg.author || memberMap.get(msg.user_id);
            const isMe = msg.user_id === user?.id;
            return (
              <div key={msg.id} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : ''}`}>
                <Avatar name={author?.display_name || ''} color={author?.avatar_color || '#6366f1'} size="sm" />
                <div className={`max-w-[70%] ${isMe ? 'items-end' : ''} flex flex-col`}>
                  <div className={`flex items-center gap-2 mb-0.5 ${isMe ? 'flex-row-reverse' : ''}`}>
                    <span className="text-xs font-medium">{isMe ? 'You' : author?.display_name || 'Unknown'}</span>
                    <span className="text-xs text-gray-400">{formatRelativeTime(msg.created_at)}</span>
                  </div>
                  <div className={`rounded-lg px-3 py-2 text-sm ${
                    isMe ? 'bg-primary-600 text-white' : 'bg-white dark:bg-surface-100 border border-gray-200 dark:border-surface-300'
                  }`}>
                    {highlightMentions(msg.content).map((part, i) => (
                      <span key={i} className={part.isMention ? 'font-semibold text-accent-300' : ''}>{part.text}</span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
      <div className="p-3 border-t border-gray-200 dark:border-surface-300 bg-white dark:bg-surface-50">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Type a message... use @ to mention"
            className="input flex-1"
          />
          <button onClick={send} disabled={!input.trim()} className="btn-primary shrink-0">
            <Send size={16} />
          </button>
        </div>
        <div className="flex gap-1 mt-2 flex-wrap">
          {members.slice(0, 6).map((m) => (
            <button
              key={m.user_id}
              onClick={() => setInput((prev) => prev + `@${m.profile?.display_name?.replace(/\s/g, '') || 'user'} `)}
              className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-surface-100 text-gray-500 hover:bg-gray-200 dark:hover:bg-surface-200 transition-colors"
            >
              @{m.profile?.display_name?.replace(/\s/g, '') || 'user'}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// HISTORY PANEL
// ============================================================================
function HistoryPanel({ projectId, files }: { projectId: string; files: FileNode[] }) {
  const [versions, setVersions] = useState<FileVersion[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewing, setViewing] = useState<FileVersion | null>(null);

  const loadVersions = async (fileId?: string) => {
    let query = supabase
      .from('file_versions')
      .select('*, author:profiles(*)')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(50);
    if (fileId) query = query.eq('file_id', fileId);
    const { data } = await query;
    setVersions(data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadVersions(selectedFile || undefined);
  }, [projectId, selectedFile]);

  const restore = async (version: FileVersion) => {
    if (!confirm('Restore this version? Current content will be overwritten.')) return;
    await supabase.from('files').update({ content: version.content, updated_at: new Date().toISOString() }).eq('id', version.file_id);
    alert('Version restored!');
  };

  return (
    <div className="h-full flex flex-col bg-surface-light dark:bg-surface">
      <div className="flex items-center gap-3 p-4 border-b border-gray-200 dark:border-surface-300">
        <h2 className="font-semibold">Version History</h2>
        <select
          value={selectedFile || ''}
          onChange={(e) => setSelectedFile(e.target.value || null)}
          className="text-sm rounded-lg border border-gray-300 dark:border-surface-300 bg-white dark:bg-surface-100 px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary-500"
        >
          <option value="">All files</option>
          {files.filter((f) => f.type === 'file').map((f) => (
            <option key={f.id} value={f.id}>{f.name}</option>
          ))}
        </select>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex justify-center py-8"><Loader size={20} className="animate-spin text-primary-500" /></div>
        ) : versions.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <History size={32} className="mx-auto mb-2 opacity-40" />
            <p>No version history yet. Start editing to create snapshots.</p>
          </div>
        ) : (
          <div className="space-y-2 max-w-2xl">
            {versions.map((v) => {
              const file = files.find((f) => f.id === v.file_id);
              return (
                <div key={v.id} className="card p-3 flex items-center gap-3 group">
                  <div className="w-8 h-8 rounded-lg bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center shrink-0">
                    <GitBranch size={15} className="text-primary-600 dark:text-primary-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{file?.name || 'Unknown file'}</p>
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <Avatar name={v.author?.display_name || ''} color={v.author?.avatar_color || '#6366f1'} size="xs" />
                      <span>{v.author?.display_name || 'Unknown'}</span>
                      <span>·</span>
                      <span>{formatRelativeTime(v.created_at)}</span>
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => setViewing(v)} className="btn-ghost p-1.5 text-sm" title="View">
                      <Eye size={15} />
                    </button>
                    <button onClick={() => restore(v)} className="btn-ghost p-1.5 text-sm text-primary-600 dark:text-primary-400" title="Restore">
                      <History size={15} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {viewing && (
        <Modal open onClose={() => setViewing(null)} title={`Version - ${files.find((f) => f.id === viewing.file_id)?.name || ''}`} size="lg">
          <pre className="text-xs font-mono p-4 bg-gray-50 dark:bg-surface-100 rounded-lg overflow-auto max-h-[60vh] whitespace-pre-wrap">{viewing.content}</pre>
        </Modal>
      )}
    </div>
  );
}

// ============================================================================
// MEMBERS MODAL
// ============================================================================
function MembersModal({ members, onlineMembers, onClose, onManage }: {
  members: ProjectMember[];
  onlineMembers: string[];
  onClose: () => void;
  onManage: () => void;
}) {
  return (
    <Modal open onClose={onClose} title="Team Members" size="md">
      <div className="space-y-2">
        {members.map((m) => (
          <div key={m.user_id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-surface-100">
            <Avatar name={m.profile?.display_name || ''} color={m.profile?.avatar_color || '#6366f1'} size="md" online={onlineMembers.includes(m.user_id)} />
            <div className="flex-1 min-w-0">
              <p className="font-medium">{m.profile?.display_name || 'Unknown'}</p>
              <p className="text-xs text-gray-400">{onlineMembers.includes(m.user_id) ? 'Online now' : 'Offline'}</p>
            </div>
            <RoleBadge role={m.role} />
          </div>
        ))}
      </div>
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-surface-300">
        <button onClick={() => { onClose(); onManage(); }} className="btn-secondary w-full">
          <Users size={16} /> Manage members
        </button>
      </div>
    </Modal>
  );
}
