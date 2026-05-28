import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { Entry } from '../types';

interface CoverCardProps { entry: Entry; coverUrl: string; onClick: () => void; onDelete: () => void; isDragging?: boolean; hasNote?: boolean; }

export default function CoverCard({ entry, coverUrl, onClick, onDelete, isDragging, hasNote }: CoverCardProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [imgError, setImgError] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging: isSortableDragging } = useSortable({ id: entry.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isSortableDragging ? 0.5 : 1 };
  const dragging = isDragging || isSortableDragging;

  return (
    <div ref={setNodeRef} style={style} onMouseLeave={() => setConfirmDelete(false)}
      className={`relative group rounded-lg bg-app-bg border border-app-border overflow-hidden shrink-0 w-40 ${dragging ? 'z-50 shadow-xl scale-105' : 'shadow-sm hover:shadow-md'} transition-shadow`}>
      <div className="w-40 h-52 cursor-pointer overflow-hidden" onClick={onClick}>
        {coverUrl && !imgError ? (
          <img src={coverUrl} alt={entry.title} className="w-full h-full object-cover" onError={() => setImgError(true)} />
        ) : (
          <div className="w-full h-full bg-app-surface-alt flex items-center justify-center p-3">
            <p className="text-base font-medium text-app-text-muted text-center leading-snug" style={{ writingMode: 'vertical-rl', letterSpacing: '0.25em' }}>{entry.title}</p>
          </div>
        )}
      </div>
      {!dragging && (
        <button onClick={(e) => { e.stopPropagation(); if (confirmDelete) { onDelete(); setConfirmDelete(false); } else { setConfirmDelete(true); } }}
          className={`absolute top-1.5 right-1.5 w-7 h-7 rounded-full flex items-center justify-center transition-all cursor-pointer ${confirmDelete ? 'bg-red-500 text-white opacity-100' : 'bg-black/40 text-white opacity-0 group-hover:opacity-100 hover:bg-red-500'}`}
          title={confirmDelete ? '确认删除' : '删除'}>
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
      {!dragging && (
        <div {...attributes} {...listeners} className="absolute bottom-1.5 right-1.5 w-6 h-6 rounded flex items-center justify-center bg-black/30 text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing">
          <GripVertical className="w-3.5 h-3.5" />
        </div>
      )}
      <div className="p-2 text-center">
        <p className="text-sm font-medium text-app-text truncate">{entry.title}</p>
        <p className="text-xs text-app-text-muted mt-0.5 truncate">{entry.date}</p>
      </div>
      {hasNote && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-amber-400 rounded-full" title="已记录笔记" />}
    </div>
  );
}
