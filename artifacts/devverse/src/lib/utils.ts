export function getLanguageFromName(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'html':
    case 'htm':
      return 'html';
    case 'css':
      return 'css';
    case 'js':
    case 'jsx':
      return 'javascript';
    case 'ts':
    case 'tsx':
      return 'typescript';
    case 'json':
      return 'json';
    case 'md':
      return 'markdown';
    default:
      return 'text';
  }
}

export function getLanguageColor(language: string): string {
  switch (language) {
    case 'html':
      return '#e34c26';
    case 'css':
      return '#563d7c';
    case 'javascript':
      return '#f1e05a';
    case 'typescript':
      return '#3178c6';
    case 'json':
      return '#292929';
    case 'markdown':
      return '#083fa1';
    default:
      return '#6b7280';
  }
}

export function formatRelativeTime(date: string | Date): string {
  const now = new Date();
  const d = new Date(date);
  const diff = now.getTime() - d.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString();
}

export function getInitials(name: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export function highlightMentions(content: string): { text: string; isMention: boolean }[] {
  const parts = content.split(/(@\w+)/g);
  return parts.map((text) => ({ text, isMention: text.startsWith('@') && text.length > 1 }));
}
