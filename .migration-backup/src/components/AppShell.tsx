import { useState, useEffect, ReactNode } from 'react';
import { useAuth } from '../lib/auth';
import { useTheme } from '../lib/theme';
import {
  Code2, LayoutDashboard, FolderGit2, CheckSquare, Bell, Search,
  Sun, Moon, LogOut, Menu, GraduationCap,
} from 'lucide-react';
import Avatar from './Avatar';

interface AppShellProps {
  currentView: string;
  onNavigate: (view: string) => void;
  children: ReactNode;
  notifications: number;
  onNotificationsClick: () => void;
}

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'projects', label: 'Projects', icon: FolderGit2 },
  { id: 'practice', label: 'Practice', icon: GraduationCap },
  { id: 'tasks', label: 'My Tasks', icon: CheckSquare },
];

export default function AppShell({ currentView, onNavigate, children, notifications, onNotificationsClick }: AppShellProps) {
  const { profile, user, signOut } = useAuth();
  const { theme, toggle } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    setSidebarOpen(false);
  }, [currentView]);

  return (
    <div className="h-screen flex bg-surface-light dark:bg-surface overflow-hidden">
      {/* Sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}
      <aside
        className={`fixed lg:static z-40 h-full w-64 bg-white dark:bg-surface-50 border-r border-gray-200 dark:border-surface-300 flex flex-col transition-transform duration-200 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex items-center gap-2.5 px-5 h-16 border-b border-gray-200 dark:border-surface-300">
          <div className="w-9 h-9 rounded-lg bg-primary-600 flex items-center justify-center text-white">
            <Code2 size={20} />
          </div>
          <span className="text-lg font-bold">DevVerse</span>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const active = currentView === item.id || (item.id === 'projects' && currentView.startsWith('project'));
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  active
                    ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-surface-100'
                }`}
              >
                <item.icon size={18} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="px-3 py-3 border-t border-gray-200 dark:border-surface-300">
          <div className="flex items-center gap-3 px-2 py-2">
            <Avatar name={profile?.display_name || user?.email || ''} color={profile?.avatar_color || '#6366f1'} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{profile?.display_name || 'User'}</p>
              <p className="text-xs text-gray-500 dark:text-gray-500 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={signOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-surface-100 transition-all"
          >
            <LogOut size={18} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-16 border-b border-gray-200 dark:border-surface-300 bg-white dark:bg-surface-50 flex items-center px-4 gap-4 shrink-0">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden btn-ghost p-2">
            <Menu size={20} />
          </button>

          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search projects, files, tasks..."
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-gray-100 dark:bg-surface-100 border-0 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="flex items-center gap-1">
            <button onClick={toggle} className="btn-ghost p-2" title="Toggle theme">
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button onClick={onNotificationsClick} className="btn-ghost p-2 relative" title="Notifications">
              <Bell size={18} />
              {notifications > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-error-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {notifications > 9 ? '9+' : notifications}
                </span>
              )}
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-hidden">{children}</main>
      </div>
    </div>
  );
}
