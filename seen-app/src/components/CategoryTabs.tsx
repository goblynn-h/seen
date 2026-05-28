import { useState } from 'react';
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { CategoryInfo } from '../types';

interface CategoryTabsProps {
  categories: CategoryInfo[];
  current: string;
  onChange: (name: string) => void;
  onRename: (oldName: string, newName: string) => void;
  onDelete: (name: string) => void;
  onAdd: (name: string) => void;
  onReorder: (cats: CategoryInfo[]) => void;
}

function SortableTab({ cat, current, isEditing, editValue, confirmDelete, onSelect, onStartEdit, onEditChange, onSubmitEdit, onCancelEdit, onStartDelete, onConfirmDelete, showDelete }: {
  cat: CategoryInfo; current: string; isEditing: boolean; editValue: string; confirmDelete: boolean;
  onSelect: () => void; onStartEdit: () => void; onEditChange: (v: string) => void; onSubmitEdit: () => void; onCancelEdit: () => void;
  onStartDelete: () => void; onConfirmDelete: () => void; showDelete: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: cat.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center group">
      {isEditing ? (
        <>
          <input value={editValue} onChange={(e) => onEditChange(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && onSubmitEdit()} className="flex-1 px-2 py-1.5 text-sm border border-app-border rounded bg-app-input text-app-text focus:outline-none min-w-0" autoFocus />
          <button onClick={onSubmitEdit} className="cursor-pointer ml-1 shrink-0"><Check className="w-3.5 h-3.5 text-green-600" /></button>
          <button onClick={onCancelEdit} className="cursor-pointer shrink-0"><X className="w-3.5 h-3.5 text-app-text-muted" /></button>
        </>
      ) : (
        <>
          <button {...attributes} {...listeners} onClick={onSelect} className={`flex-1 px-3 py-2.5 text-sm rounded-lg text-left transition-colors cursor-grab active:cursor-grabbing truncate min-w-0 ${current === cat.name ? 'bg-app-active text-app-active-text font-medium' : 'text-app-text-secondary hover:bg-app-hover'}`}>
            {cat.name}
          </button>
          <div className="flex gap-0.5 ml-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <button onClick={(e) => { e.stopPropagation(); onStartEdit(); }} className="w-5 h-5 rounded flex items-center justify-center hover:bg-app-hover cursor-pointer"><Pencil className="w-3 h-3 text-app-text-muted" /></button>
            {showDelete && (confirmDelete ? (
              <button onClick={(e) => { e.stopPropagation(); onConfirmDelete(); }} className="w-5 h-5 rounded flex items-center justify-center bg-red-500 cursor-pointer"><Trash2 className="w-3 h-3 text-white" /></button>
            ) : (
              <button onClick={(e) => { e.stopPropagation(); onStartDelete(); }} className="w-5 h-5 rounded flex items-center justify-center hover:bg-app-hover cursor-pointer"><Trash2 className="w-3 h-3 text-app-text-muted" /></button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function CategoryTabs({ categories, current, onChange, onRename, onDelete, onAdd, onReorder }: CategoryTabsProps) {
  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [adding, setAdding] = useState(false);
  const [addValue, setAddValue] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = categories.findIndex((c) => c.id === active.id);
    const newIndex = categories.findIndex((c) => c.id === over.id);
    if (oldIndex !== -1 && newIndex !== -1) {
      const newCats = [...categories];
      const [moved] = newCats.splice(oldIndex, 1);
      newCats.splice(newIndex, 0, moved);
      onReorder(newCats);
    }
  }

  function startEdit(cat: CategoryInfo) { setEditing(cat.name); setEditValue(cat.name); setConfirmDelete(null); }
  function submitEdit(oldName: string) { const t = editValue.trim(); if (t && t !== oldName) onRename(oldName, t); setEditing(null); }
  function submitAdd() { const t = addValue.trim(); if (t) onAdd(t); setAdding(false); setAddValue(''); }

  return (
    <nav className="flex flex-col gap-1 p-3 bg-app-surface border-r border-app-border h-full w-36 shrink-0">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={categories.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          {categories.map((cat) => (
            <SortableTab key={cat.id} cat={cat} current={current} isEditing={editing === cat.name} editValue={editValue} confirmDelete={confirmDelete === cat.name}
              onSelect={() => { onChange(cat.name); setConfirmDelete(null); }} onStartEdit={() => startEdit(cat)} onEditChange={setEditValue}
              onSubmitEdit={() => submitEdit(cat.name)} onCancelEdit={() => setEditing(null)}
              onStartDelete={() => setConfirmDelete(cat.name)} onConfirmDelete={() => { onDelete(cat.name); setConfirmDelete(null); }} showDelete={categories.length > 1} />
          ))}
        </SortableContext>
      </DndContext>
      {adding ? (
        <div className="flex items-center gap-1 mt-1">
          <input value={addValue} onChange={(e) => setAddValue(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submitAdd()} placeholder="新分类名" className="flex-1 px-2 py-1.5 text-sm border border-app-border rounded bg-app-input text-app-text focus:outline-none min-w-0" autoFocus />
          <button onClick={submitAdd} className="cursor-pointer"><Check className="w-3.5 h-3.5 text-green-600" /></button>
          <button onClick={() => { setAdding(false); setAddValue(''); }} className="cursor-pointer"><X className="w-3.5 h-3.5 text-app-text-muted" /></button>
        </div>
      ) : (
        <button onClick={() => setAdding(true)} className="flex items-center gap-1 px-3 py-2 mt-1 text-sm text-app-text-muted hover:bg-app-hover rounded-lg transition-colors cursor-pointer">
          <Plus className="w-3.5 h-3.5" />添加分类
        </button>
      )}
    </nav>
  );
}
