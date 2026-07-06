import { Role } from '../lib/supabase';

const roleConfig: Record<Role, { label: string; color: string }> = {
  owner: { label: 'Owner', color: 'bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300' },
  admin: { label: 'Admin', color: 'bg-accent-100 text-accent-700 dark:bg-accent-900/40 dark:text-accent-300' },
  developer: { label: 'Developer', color: 'bg-success-100 text-success-700 dark:bg-success-900/40 dark:text-success-300' },
  viewer: { label: 'Viewer', color: 'bg-gray-100 text-gray-600 dark:bg-surface-200 dark:text-gray-400' },
};

export default function RoleBadge({ role }: { role: Role }) {
  const cfg = roleConfig[role];
  return <span className={`badge ${cfg.color}`}>{cfg.label}</span>;
}
