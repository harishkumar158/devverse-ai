import { getInitials } from '../lib/utils';

interface AvatarProps {
  name: string;
  color: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  online?: boolean;
}

const sizeMap = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-14 h-14 text-lg',
};

const dotSize = {
  xs: 'w-1.5 h-1.5',
  sm: 'w-2 h-2',
  md: 'w-2.5 h-2.5',
  lg: 'w-3 h-3',
};

export default function Avatar({ name, color, size = 'md', online }: AvatarProps) {
  return (
    <div className="relative inline-flex shrink-0">
      <div
        className={`${sizeMap[size]} rounded-full flex items-center justify-center font-semibold text-white shrink-0`}
        style={{ backgroundColor: color }}
      >
        {getInitials(name)}
      </div>
      {online !== undefined && (
        <span
          className={`absolute bottom-0 right-0 ${dotSize[size]} rounded-full ring-2 ring-white dark:ring-surface-50 ${
            online ? 'bg-success-500' : 'bg-gray-400'
          }`}
        />
      )}
    </div>
  );
}
