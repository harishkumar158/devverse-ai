import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './lib/auth';
import { ThemeProvider } from './lib/theme';
import { supabase } from './lib/supabase';
import AuthPage from './pages/AuthPage';
import AppShell from './components/AppShell';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import MyTasks from './pages/MyTasks';
import Workspace from './pages/Workspace';
import Practice from './pages/Practice';
import NotificationsPanel from './components/NotificationsPanel';
import { Loader } from 'lucide-react';

function AppContent() {
  const { user, loading } = useAuth();
  const [view, setView] = useState('dashboard');
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [, setManageProjectId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('read', false);
      setUnreadCount(count || 0);
    })();

    const channel = supabase
      .channel('notifications-global')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        () => setUnreadCount((c) => c + 1)
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const navigate = (v: string) => {
    setView(v);
    setActiveProjectId(null);
  };

  const openProject = (id: string) => {
    setActiveProjectId(id);
    setView('project');
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-surface-light dark:bg-surface">
        <Loader size={28} className="animate-spin text-primary-500" />
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  return (
    <>
      <AppShell
        currentView={view}
        onNavigate={navigate}
        notifications={unreadCount}
        onNotificationsClick={() => setShowNotifications(!showNotifications)}
      >
        {view === 'dashboard' && <Dashboard onNavigate={navigate} onOpenProject={openProject} />}
        {view === 'projects' && <Projects onOpenProject={openProject} />}
        {view === 'practice' && <Practice onOpenProject={openProject} />}
        {view === 'tasks' && <MyTasks onOpenProject={openProject} />}
        {view === 'project' && activeProjectId && (
          <Workspace
            projectId={activeProjectId}
            onBack={() => navigate('projects')}
            onOpenManage={() => setManageProjectId(activeProjectId)}
          />
        )}
      </AppShell>
      <NotificationsPanel open={showNotifications} onClose={() => setShowNotifications(false)} />
    </>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}
