import { useState } from 'react';
import { FileNode } from '../lib/supabase';
import { getLanguageColor } from '../lib/utils';
import { ChevronRight, ChevronDown, File, FilePlus, FolderPlus, Trash2, FileCode } from 'lucide-react';

interface FileTreeProps {
  files: FileNode[];
  activeFileId: string | null;
  onSelectFile: (file: FileNode) => void;
  onCreateFile: (name: string, isFolder: boolean, parentId?: string | null) => void;
  onDeleteFile: (file: FileNode) => void;
}

export default function FileTree({ files, activeFileId, onSelectFile, onCreateFile, onDeleteFile }: FileTreeProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState<{ parentId: string | null; isFolder: boolean } | null>(null);
  const [newName, setNewName] = useState('');

  const rootFiles = files.filter((f) => !f.parent_id);
  const folders = rootFiles.filter((f) => f.type === 'folder').sort((a, b) => a.name.localeCompare(b.name));
  const rootFileList = rootFiles.filter((f) => f.type === 'file').sort((a, b) => a.name.localeCompare(b.name));

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCreate = () => {
    if (newName.trim()) {
      onCreateFile(newName.trim(), creating?.isFolder || false, creating?.parentId);
    }
    setNewName('');
    setCreating(null);
  };

  const renderFile = (file: FileNode) => (
    <div
      key={file.id}
      className={`group flex items-center gap-1.5 px-2 py-1 rounded text-sm cursor-pointer transition-colors ${
        activeFileId === file.id
          ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
          : 'hover:bg-gray-100 dark:hover:bg-surface-100 text-gray-700 dark:text-gray-300'
      }`}
      onClick={() => onSelectFile(file)}
    >
      <FileCode size={14} style={{ color: getLanguageColor(file.language) }} className="shrink-0" />
      <span className="flex-1 truncate">{file.name}</span>
      <button
        onClick={(e) => { e.stopPropagation(); onDeleteFile(file); }}
        className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-error-500 transition-opacity"
      >
        <Trash2 size={12} />
      </button>
    </div>
  );

  const renderFolder = (folder: FileNode, depth: number = 0) => {
    const isExpanded = expanded.has(folder.id);
    const children = files.filter((f) => f.parent_id === folder.id);
    const childFolders = children.filter((f) => f.type === 'folder').sort((a, b) => a.name.localeCompare(b.name));
    const childFiles = children.filter((f) => f.type === 'file').sort((a, b) => a.name.localeCompare(b.name));

    return (
      <div key={folder.id}>
        <div
          className="group flex items-center gap-1 px-2 py-1 rounded text-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-surface-100 text-gray-700 dark:text-gray-300"
          onClick={() => toggle(folder.id)}
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
        >
          {isExpanded ? <ChevronDown size={14} className="shrink-0" /> : <ChevronRight size={14} className="shrink-0" />}
          <File size={14} className="text-primary-400 shrink-0" />
          <span className="flex-1 truncate">{folder.name}</span>
          <button
            onClick={(e) => { e.stopPropagation(); setCreating({ parentId: folder.id, isFolder: false }); }}
            className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-primary-500 transition-opacity"
          >
            <FilePlus size={12} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setCreating({ parentId: folder.id, isFolder: true }); }}
            className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-primary-500 transition-opacity"
          >
            <FolderPlus size={12} />
          </button>
        </div>
        {isExpanded && (
          <div>
            {creating?.parentId === folder.id && (
              <div className="flex items-center gap-1 px-2 py-1" style={{ paddingLeft: `${(depth + 1) * 12 + 8}px` }}>
                <input
                  autoFocus
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onBlur={handleCreate}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') { setCreating(null); setNewName(''); } }}
                  className="flex-1 text-xs px-1.5 py-0.5 rounded bg-white dark:bg-surface-200 border border-primary-400 outline-none"
                  placeholder={creating.isFolder ? 'folder name' : 'file name'}
                />
              </div>
            )}
            {childFolders.map((f) => renderFolder(f, depth + 1))}
            {childFiles.map((f) => (
              <div key={f.id} style={{ paddingLeft: `${(depth + 1) * 12}px` }}>
                {renderFile(f)}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="py-2">
      <div className="flex items-center justify-between px-3 py-1.5 mb-1">
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Files</span>
        <div className="flex gap-0.5">
          <button onClick={() => setCreating({ parentId: null, isFolder: false })} className="p-1 hover:bg-gray-100 dark:hover:bg-surface-100 rounded" title="New file">
            <FilePlus size={14} />
          </button>
          <button onClick={() => setCreating({ parentId: null, isFolder: true })} className="p-1 hover:bg-gray-100 dark:hover:bg-surface-100 rounded" title="New folder">
            <FolderPlus size={14} />
          </button>
        </div>
      </div>

      {creating?.parentId === null && (
        <div className="flex items-center gap-1 px-3 py-1">
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onBlur={handleCreate}
            onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') { setCreating(null); setNewName(''); } }}
            className="flex-1 text-xs px-1.5 py-0.5 rounded bg-white dark:bg-surface-200 border border-primary-400 outline-none"
            placeholder={creating.isFolder ? 'folder name' : 'file name'}
          />
        </div>
      )}

      <div className="space-y-0.5 px-1">
        {folders.map((f) => renderFolder(f))}
        {rootFileList.map((f) => renderFile(f))}
        {files.length === 0 && (
          <p className="text-xs text-gray-400 px-3 py-2">No files yet</p>
        )}
      </div>
    </div>
  );
}
