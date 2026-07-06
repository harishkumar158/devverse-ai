import { useEffect, useState } from 'react';
import { useAuth } from '../lib/auth';
import { supabase, Project, ProjectMember, Task, Profile } from '../lib/supabase';
import { formatRelativeTime } from '../lib/utils';
import Avatar from '../components/Avatar';
import {
  FolderGit2, CheckSquare, Users, Activity, ArrowRight,
  Circle, Clock, CheckCircle2, Loader,
} from 'lucide-react';

interface DashboardProps {
  onNavigate: (view: string) => void;
  onOpenProject: (projectId: string) => void;
}

export default function Dashboard({ onNavigate, onOpenProject }: DashboardProps) {
  const { user, profile } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [members, setMembers] = useState<Record<string, ProjectMember[]>>({});
  const [tasks, setTasks] = useState<Task[]>([]);
  const [recentActivity, setRecentActivity] = useState<{ id: string; type: string; message: string; created_at: string; project_id: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: memberRows } = await supabase
        .from('project_members')
        .select('project_id')
        .eq('user_id', user.id);

      const projectIds = (memberRows || []).map((m) => m.project_id);
      if (projectIds.length === 0) {
        setLoading(false);
        return;
      }

      const { data: projectData } = await supabase
        .from('projects')
        .select('*')
        .in('id', projectIds)
        .order('updated_at', { ascending: false });
      setProjects(projectData || []);

      const { data: memberData } = await supabase
        .from('project_members')
        .select('*, profile:profiles(*)')
        .in('project_id', projectIds);
      const memberMap: Record<string, ProjectMember[]> = {};
      const profMap: Record<string, Profile> = {};
      (memberData || []).forEach((m: any) => {
        if (!memberMap[m.project_id]) memberMap[m.project_id] = [];
        memberMap[m.project_id].push(m);
        if (m.profile) profMap[m.user_id] = m.profile;
      });
      setMembers(memberMap);
      setProfiles(profMap);

      const { data: taskData } = await supabase
        .from('tasks')
        .select('*, assignee:profiles(*)')
        .in('project_id', projectIds)
        .order('created_at', { ascending: false })
        .limit(20);
      setTasks(taskData || []);

      const { data: msgData } = await supabase
        .from('messages')
        .select('id, project_id, content, created_at, user_id')
        .in('project_id', projectIds)
        .order('created_at', { ascending: false })
        .limit(10);

      const activity = (msgData || []).map((m: any) => ({
        id: m.id,
        type: 'message',
        message: `${profMap[m.user_id]?.display_name || 'Someone'} sent a message`,
        created_at: m.created_at,
        project_id: m.project_id,
      }));
      setRecentActivity(activity);

      setLoading(false);
    })();
  }, [user]);

  const myTasks = tasks.filter((t) => t.assignee_id === user?.id && t.status !== 'completed');
  const completedTasks = tasks.filter((t) => t.status === 'completed').length;
  const totalTasks = tasks.length;
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader size={24} className="animate-spin text-primary-500" />
      </div>
    );
  }

  const stats = [
    { label: 'Projects', value: projects.length, icon: FolderGit2, color: 'text-primary-600 bg-primary-50 dark:bg-primary-900/30' },
    { label: 'Active Tasks', value: myTasks.length, icon: CheckSquare, color: 'text-accent-600 bg-accent-50 dark:bg-accent-900/30' },
    { label: 'Team Members', value: Object.keys(profiles).length, icon: Users, color: 'text-success-600 bg-success-50 dark:bg-success-900/30' },
    { label: 'Completion', value: `${progress}%`, icon: Activity, color: 'text-warning-600 bg-warning-50 dark:bg-warning-900/30' },
  ];

  return (
    <div className="h-full overflow-y-auto p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-1">
            Welcome back, {profile?.display_name?.split(' ')[0] || 'Developer'}
          </h1>
          <p className="text-gray-500 dark:text-gray-400">Here's what's happening across your projects.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((stat, i) => (
            <div key={i} className="card p-5 animate-slide-up" style={{ animationDelay: `${i * 50}ms` }}>
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${stat.color}`}>
                <stat.icon size={20} />
              </div>
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Projects */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Recent Projects</h2>
              <button onClick={() => onNavigate('projects')} className="text-sm text-primary-600 dark:text-primary-400 font-medium flex items-center gap-1 hover:gap-2 transition-all">
                View all <ArrowRight size={14} />
              </button>
            </div>
            <div className="space-y-3">
              {projects.length === 0 ? (
                <div className="card p-8 text-center">
                  <FolderGit2 size={32} className="mx-auto text-gray-300 dark:text-surface-400 mb-3" />
                  <p className="text-gray-500 dark:text-gray-400 mb-4">No projects yet. Create one to get started.</p>
                  <button onClick={() => onNavigate('projects')} className="btn-primary">Create Project</button>
                </div>
              ) : (
                projects.slice(0, 4).map((project) => {
                  const projMembers = members[project.id] || [];
                  const projTasks = tasks.filter((t) => t.project_id === project.id);
                  const done = projTasks.filter((t) => t.status === 'completed').length;
                  const pct = projTasks.length > 0 ? Math.round((done / projTasks.length) * 100) : 0;
                  return (
                    <div
                      key={project.id}
                      onClick={() => onOpenProject(project.id)}
                      className="card p-4 hover:shadow-md transition-all cursor-pointer group"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-semibold group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">{project.name}</h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-1">{project.description || 'No description'}</p>
                        </div>
                        <span className="text-xs text-gray-400">{formatRelativeTime(project.updated_at)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex -space-x-2">
                          {projMembers.slice(0, 4).map((m) => (
                            <div key={m.user_id} className="ring-2 ring-white dark:ring-surface-50 rounded-full">
                              <Avatar name={m.profile?.display_name || ''} color={m.profile?.avatar_color || '#6366f1'} size="xs" />
                            </div>
                          ))}
                          {projMembers.length > 4 && (
                            <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-surface-200 ring-2 ring-white dark:ring-surface-50 flex items-center justify-center text-[10px] font-semibold">
                              +{projMembers.length - 4}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                          <div className="w-24 h-1.5 bg-gray-200 dark:bg-surface-200 rounded-full overflow-hidden">
                            <div className="h-full bg-primary-500 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <span>{pct}%</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* My Tasks + Activity */}
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold mb-4">My Tasks</h2>
              <div className="card p-4 space-y-2">
                {myTasks.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">No active tasks assigned to you.</p>
                ) : (
                  myTasks.slice(0, 5).map((task) => (
                    <div key={task.id} className="flex items-center gap-3 py-2 border-b border-gray-100 dark:border-surface-200 last:border-0">
                      {task.status === 'todo' ? (
                        <Circle size={16} className="text-gray-400 shrink-0" />
                      ) : (
                        <Loader size={16} className="text-warning-500 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{task.title}</p>
                        {task.deadline && (
                          <p className="text-xs text-gray-400 flex items-center gap-1">
                            <Clock size={11} /> {new Date(task.deadline).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <span className={`badge ${
                        task.priority === 'high' ? 'bg-error-100 text-error-700 dark:bg-error-900/30 dark:text-error-400'
                        : task.priority === 'medium' ? 'bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-400'
                        : 'bg-gray-100 text-gray-600 dark:bg-surface-200 dark:text-gray-400'
                      }`}>
                        {task.priority}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
              <div className="card p-4 space-y-3">
                {recentActivity.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">No recent activity.</p>
                ) : (
                  recentActivity.map((act) => {
                    const proj = projects.find((p) => p.id === act.project_id);
                    return (
                      <div key={act.id} className="flex items-start gap-3 text-sm">
                        <div className="w-7 h-7 rounded-full bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center shrink-0">
                          <CheckCircle2 size={14} className="text-primary-600 dark:text-primary-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-gray-700 dark:text-gray-300">{act.message}</p>
                          <p className="text-xs text-gray-400">{proj?.name} · {formatRelativeTime(act.created_at)}</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
