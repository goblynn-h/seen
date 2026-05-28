import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';
import type { Entry } from '../types';
import CoverCard from './CoverCard';
import AddCoverButton from './AddCoverButton';

interface CoverGridProps { entries: Entry[]; getCoverUrl: (id: string, fileName: string) => string; onEntryClick: (e: Entry) => void; onDelete: (e: Entry) => void; onReorder: (s: number, e: number) => void; onAdd: () => void; }

export default function CoverGrid({ entries, getCoverUrl, onEntryClick, onDelete, onReorder, onAdd }: CoverGridProps) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const o = entries.findIndex((e) => e.id === active.id);
    const n = entries.findIndex((e) => e.id === over.id);
    if (o !== -1 && n !== -1) onReorder(o, n);
  }

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6">
        <p className="text-app-text-muted text-sm">还没有条目，点击下方按钮添加</p>
        <AddCoverButton onClick={onAdd} />
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={entries.map((e) => e.id)} strategy={rectSortingStrategy}>
        <div className="flex flex-wrap gap-4 p-4 content-start">
          <AddCoverButton onClick={onAdd} />
          {entries.map((entry) => (
            <CoverCard key={entry.id} entry={entry} coverUrl={getCoverUrl(entry.id, entry.coverFileName)} onClick={() => onEntryClick(entry)} onDelete={() => onDelete(entry)} hasNote={entry.hasNote} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
