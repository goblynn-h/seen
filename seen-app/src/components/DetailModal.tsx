import { useState, useEffect, useCallback } from 'react';
import MDEditor from '@uiw/react-md-editor';
import { X, Eye, Edit3, ImageUp } from 'lucide-react';
import { open } from '@tauri-apps/plugin-dialog';
import type { Entry } from '../types';
import { sanitizeFileName } from '../utils';
import { useDebounce } from '../hooks/useDebounce';
import { invoke, convertFileSrc } from '@tauri-apps/api/core';

interface DetailModalProps { entry: Entry; category: string; rootPath: string; coverUrl: string; onClose: () => void; onUpdate: (entry: Entry) => void; }

export default function DetailModal({ entry, category, rootPath, coverUrl, onClose, onUpdate }: DetailModalProps) {
  const [title, setTitle] = useState(entry.title);
  const [date, setDate] = useState(entry.date);
  const [noteContent, setNoteContent] = useState('');
  const [savedNoteContent, setSavedNoteContent] = useState('');
  const [isLoading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | null>(null);
  const [previewMode, setPreviewMode] = useState<'edit' | 'preview'>('preview');
  const [imgError, setImgError] = useState(false);
  const notesBasePath = rootPath.replace(/\\/g, '/') + '/' + category + '/notes';

  function resolveImagePaths(md: string): string {
    return md.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_m, alt, src) => {
      if (/^(https?:\/\/|asset:|data:)/.test(src)) return _m;
      return `![${alt}](${convertFileSrc(notesBasePath + '/' + src)})`;
    });
  }

  const displayContent = previewMode === 'preview' ? resolveImagePaths(noteContent) : noteContent;
  const debouncedNote = useDebounce(noteContent, 1000);

  useEffect(() => {
    invoke<string>('load_note', { category, rootPath, fileName: entry.noteFileName })
      .then((content) => {
        setNoteContent(content);
        setSavedNoteContent(content);
        setPreviewMode(content ? 'preview' : 'edit');
        if (content && !entry.hasNote) {
          onUpdate({ ...entry, hasNote: true });
        }
      })
      .catch(console.error).finally(() => setLoading(false));
  }, [entry.id, entry.noteFileName, category, rootPath]);

  useEffect(() => {
    if (debouncedNote === savedNoteContent) return;
    setSaveStatus('saving');
    invoke('save_note', { category, rootPath, fileName: entry.noteFileName, content: debouncedNote })
      .then(() => { setSavedNoteContent(debouncedNote); setSaveStatus('saved'); setTimeout(() => setSaveStatus(null), 2000); })
      .catch(console.error);
  }, [debouncedNote, savedNoteContent, category, rootPath, entry.noteFileName]);

  const handleMetaChange = useCallback((field: 'title' | 'date', value: string) => {
    if (field === 'title') setTitle(value); else setDate(value);
    onUpdate({ ...entry, [field]: value });
  }, [entry, onUpdate]);

  async function handleClose() {
    if (noteContent !== savedNoteContent) {
      try { await invoke('save_note', { category, rootPath, fileName: entry.noteFileName, content: noteContent }); } catch (e) { console.error(e); }
    }

    const newSafeName = sanitizeFileName(title);
    const newNoteFileName = `${newSafeName}.md`;
    const hasNote = noteContent.trim().length > 0;

    if (newNoteFileName !== entry.noteFileName || hasNote !== (entry.hasNote ?? false)) {
      try {
        let updated = { ...entry, hasNote };
        if (newNoteFileName !== entry.noteFileName) {
          updated.noteFileName = newNoteFileName;
          if (entry.coverFileName) {
            const ext = entry.coverFileName.split('.').pop() || 'jpg';
            const newCoverFileName = `${newSafeName}.${ext}`;
            await invoke('rename_cover', { category, rootPath, oldName: entry.coverFileName, newName: newCoverFileName });
            updated.coverFileName = newCoverFileName;
          }
          await invoke('rename_note', { category, rootPath, oldName: entry.noteFileName, newName: newNoteFileName });
        }
        onUpdate(updated);
      } catch (e) { console.error(e); }
    }

    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={handleClose}>
      <div className="bg-app-bg rounded-xl shadow-2xl flex overflow-hidden transition-colors" style={{ width: '900px', maxWidth: '95vw', height: '650px', maxHeight: '90vh' }} onClick={(e) => e.stopPropagation()}>
        <div className="w-72 shrink-0 bg-app-surface flex flex-col p-5 gap-4">
          <div className="w-full aspect-[3/4] rounded-lg overflow-hidden bg-app-surface-alt relative group cursor-pointer"
            onClick={async () => {
              const selected = await open({ multiple: false, filters: [{ name: '图片文件', extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif'] }] });
              if (!selected) return;
              try {
                if (entry.coverFileName) await invoke('delete_cover', { category, rootPath, fileName: entry.coverFileName });
                const safeName = sanitizeFileName(title);
                const newFileName = await invoke<string>('copy_cover', { sourcePath: selected as string, category, rootPath, targetName: safeName });
                onUpdate({ ...entry, coverFileName: newFileName });
              } catch (e) { console.error(e); }
            }}>
            {coverUrl && !imgError ? <img src={coverUrl} alt={title} className="w-full h-full object-cover" onError={() => setImgError(true)} />
              : <div className="w-full h-full flex items-center justify-center p-4"><p className="text-2xl font-medium text-app-text-muted text-center" style={{ writingMode: 'vertical-rl', letterSpacing: '0.25em' }}>{title}</p></div>}
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><ImageUp className="w-6 h-6 text-white" /></div>
          </div>
          <div><label className="text-xs text-app-text-muted mb-1 block">作品名称</label>
            <input type="text" value={title} onChange={(e) => handleMetaChange('title', e.target.value)} className="w-full px-3 py-2 text-sm border border-app-border rounded-lg bg-app-input text-app-text focus:outline-none focus:border-app-text-muted" /></div>
          <div><label className="text-xs text-app-text-muted mb-1 block">观看日期</label>
            <input type="text" value={date} onChange={(e) => handleMetaChange('date', e.target.value)} className="w-full px-3 py-2 text-sm border border-app-border rounded-lg bg-app-input text-app-text focus:outline-none focus:border-app-text-muted" /></div>
        </div>
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex items-center justify-between px-5 py-3">
            <div className="flex items-center gap-2">
              <button onClick={() => setPreviewMode('edit')} className={`px-3 py-1.5 text-xs rounded-md transition-colors cursor-pointer ${previewMode === 'edit' ? 'bg-app-active text-app-active-text' : 'text-app-text-secondary hover:bg-app-hover'}`}><Edit3 className="w-3.5 h-3.5 inline mr-1" />编辑</button>
              <button onClick={() => setPreviewMode('preview')} className={`px-3 py-1.5 text-xs rounded-md transition-colors cursor-pointer ${previewMode === 'preview' ? 'bg-app-active text-app-active-text' : 'text-app-text-secondary hover:bg-app-hover'}`}><Eye className="w-3.5 h-3.5 inline mr-1" />预览</button>
            </div>
            <div className="flex items-center gap-3">
              {saveStatus && <span className="text-xs text-app-text-muted">{saveStatus === 'saving' ? '保存中...' : '已保存'}</span>}
              <button onClick={handleClose} className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-app-hover transition-colors cursor-pointer"><X className="w-4 h-4 text-app-text-muted" /></button>
            </div>
          </div>
          <div className="flex-1 overflow-hidden">
            {isLoading ? <div className="flex items-center justify-center h-full text-app-text-muted text-sm">加载中...</div> : (
              <div className={`h-full overflow-auto ${previewMode === 'preview' ? 'p-10' : ''}`}>
                <MDEditor
                  value={displayContent}
                  onChange={(val) => setNoteContent(val || '')}
                  preview={previewMode}
                  height="100%"
                  visibleDragbar={false}
                  hideToolbar={previewMode === 'preview'}
                  {...({ 'data-color-mode': document.documentElement.classList.contains('dark') ? 'dark' : 'light' } as Record<string, string>)}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
