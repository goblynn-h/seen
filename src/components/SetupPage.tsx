import { useState } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import { FolderOpen } from 'lucide-react';

export default function SetupPage({ onComplete }: { onComplete: (rootPath: string) => void }) {
  const [selectedPath, setSelectedPath] = useState('');
  const [initializing, setInitializing] = useState(false);
  const [error, setError] = useState('');

  async function handleSelectFolder() {
    const folder = await open({ directory: true, multiple: false, title: '选择数据存储文件夹' });
    if (folder) { setSelectedPath(folder as string); setError(''); }
  }

  async function handleConfirm() {
    if (!selectedPath) return;
    setInitializing(true); setError('');
    try { await invoke('init_library', { rootPath: selectedPath }); await invoke('save_config', { config: JSON.stringify({ rootPath: selectedPath }) }); onComplete(selectedPath); }
    catch (e) { setError(String(e)); } finally { setInitializing(false); }
  }

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-app-bg">
      <div className="bg-app-surface rounded-xl shadow-lg p-8 w-96 max-w-[90vw] transition-colors">
        <h1 className="text-xl font-bold text-app-text mb-1">欢迎使用看过</h1>
        <p className="text-sm text-app-text-secondary mb-6">请选择一个文件夹来存储你的媒体库数据。所有数据将保存在该文件夹中，方便备份和迁移。</p>
        <div className="flex gap-2 mb-4">
          <input type="text" value={selectedPath} readOnly placeholder="点击右侧按钮选择文件夹..." className="flex-1 px-3 py-2 text-sm border border-app-border rounded-lg bg-app-input text-app-text-secondary focus:outline-none" />
          <button onClick={handleSelectFolder} className="px-3 py-2 bg-app-surface-alt hover:bg-app-hover rounded-lg transition-colors cursor-pointer shrink-0"><FolderOpen className="w-4 h-4 text-app-text-secondary" /></button>
        </div>
        {error && <p className="text-xs text-red-500 mb-3">{error}</p>}
        <button onClick={handleConfirm} disabled={!selectedPath || initializing} className="w-full py-2.5 bg-app-active text-app-active-text rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer">
          {initializing ? '正在初始化...' : '开始使用'}
        </button>
      </div>
    </div>
  );
}
