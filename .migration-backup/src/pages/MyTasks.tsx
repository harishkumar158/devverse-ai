import { useEffect, useState } from 'react';
import { useAuth } from '../lib/auth';
import { supabase, Task, Project } from '../lib/supabase';
import { CheckSquare, Circle, Loader, Clock, ArrowRight } from 'lucide-react';

interface MyTasksProps {
  onOpenProject: (projectId: string) => void;
}

export default function MyTasks({ onOpenProject }: MyTasksProps) {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<(Task & { project?: Project })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from('tasks')
        .select('*, project:projects(*)')
        .eq('assignee_id', user.id)
        .order('created_at', { ascending: false });
      setTasks(data || []);
      setLoading(false);
    })();
  }, [user]);

  const updateStatus = async (taskId: string, status: string) => {
    await supabase.from('tasks').update({ status, updated_at: new Date().toISOString() }).eq('id', taskId);
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: status as any } : t)));
  };

  const groups = {
    todo: tasks.filter((t) => t.status === 'todo'),
    in_progress: tasks.filter((t) => t.status === 'in_progress'),
    completed: tasks.filter((t) => t.status === 'completed'),
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader size={24} className="animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-1">My Tasks</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-8">Tasks assigned to you across all projects</p>

        {tasks.length === 0 ? (
          <div className="card p-12 text-center">
            <CheckSquare size={40} className="mx-auto text-gray-300 dark:text-surface-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No tasks assigned</h3>
            <p className="text-gray-500 dark:text-gray-400">You have no tasks assigned to you yet.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {([
              { id: 'todo' as const, label: 'To Do', icon: Circle, color: 'text-gray-400' },
              { id: 'in_progress' as const, label: 'In Progress', icon: Loader, color: 'text-warning-500' },
              { id: 'completed' as const, label: 'Completed', icon: CheckSquare, color: 'text-success-500' },
            ]).map((group) => (
              <div key={group.id}>
                <h2 className={`flex items-center gap-2 text-sm font-semibold mb-3 ${group.color}`}>
                  <group.icon size={16} /> {group.label} ({groups[group.id].length})
                </h2>
                <div className="space-y-2">
                  {groups[group.id].map((task) => (
                    <div key={task.id} className="card p-4 group flex items-center gap-3">
                      <button
                        onClick={() => {
                          const next = task.status === 'completed' ? 'todo' : 'completed';
                          updateStatus(task.id, next);
                        }}
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                          task.status === 'completed' ? 'bg-success-500 border-success-500' : 'border-gray-300 dark:border-surface-400 hover:border-primary-500'
                        }`}
                      >
                        {task.status === 'completed' && <CheckSquare size={12} className="text-white" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${task.status === 'completed' ? 'line-through text-gray-400' : ''}`}>{task.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {task.project && (
                            <button
                              onClick={() => onOpenProject(task.project_id)}
                              className="text-xs text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1"
                            >
                              {task.project.name} <ArrowRight size={10} />
                            </button>
                          )}
                          {task.deadline && (
                            <span className="text-xs text-gray-400 flex items-center gap-1">
                              <Clock size={11} /> {new Date(task.deadline).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className={`badge ${
                        task.priority === 'high' ? 'bg-error-100 text-error-700 dark:bg-error-900/30 dark:text-error-400'
                        : task.priority === 'medium' ? 'bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-400'
                        : 'bg-gray-100 text-gray-600 dark:bg-surface-200 dark:text-gray-400'
                      }`}>{task.priority}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
