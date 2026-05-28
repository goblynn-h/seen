import { useState } from 'react';
import { X, ImageUp } from 'lucide-react';
import { open } from '@tauri-apps/plugin-dialog';
import { convertFileSrc } from '@tauri-apps/api/core';

interface AddEntryModalProps { onSubmit: (entry: { title: string; date: string; sourcePath: string }) => void; onClose: () => void; }

export default function AddEntryModal({ onSubmit, onClose }: AddEntryModalProps) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [sourcePath, setSourcePath] = useState('');

  async function handlePickCover() {
    const selected = await open({ multiple: false, filters: [{ name: '图片文件', extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif'] }] });
    if (!selected) return;
    setSourcePath(selected as string);
  }

  function handleSubmit(e: React.FormEvent) { e.preventDefault(); if (!title.trim()) return; onSubmit({ title: title.trim(), date: date.trim(), sourcePath }); }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="bg-app-bg rounded-xl shadow-2xl p-6 w-[480px] max-w-[95vw] flex gap-5 transition-colors" onClick={(e) => e.stopPropagation()}>
        <div className="w-36 h-48 rounded-lg overflow-hidden bg-app-surface-alt shrink-0 relative cursor-pointer group" onClick={handlePickCover}>
          {sourcePath ? <img src={convertFileSrc(sourcePath)} alt="封面" className="w-full h-full object-cover" />
            : <div className="w-full h-full flex flex-col items-center justify-center text-app-text-muted"><ImageUp className="w-6 h-6 mb-1" /><span className="text-xs">点击选择封面</span></div>}
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><span className="text-white text-xs">{sourcePath ? '更换' : '选择'}封面</span></div>
        </div>
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-app-text">添加新作品</h2>
            <button onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-app-hover transition-colors cursor-pointer shrink-0"><X className="w-4 h-4 text-app-text-muted" /></button>
          </div>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 flex-1">
            <div><label className="text-xs text-app-text-muted mb-1 block">作品名称 *</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="请输入作品名称" autoFocus className="w-full px-3 py-2 text-sm border border-app-border rounded-lg bg-app-input text-app-text focus:outline-none focus:border-app-text-muted" /></div>
            <div><label className="text-xs text-app-text-muted mb-1 block">观看日期</label>
              <input type="text" value={date} onChange={(e) => setDate(e.target.value)} className="w-full px-3 py-2 text-sm border border-app-border rounded-lg bg-app-input text-app-text focus:outline-none focus:border-app-text-muted" /></div>
            <button type="submit" disabled={!title.trim()} className="w-full py-2.5 bg-app-active text-app-active-text rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer mt-auto">确认添加</button>
          </form>
        </div>
      </div>
    </div>
  );
}
