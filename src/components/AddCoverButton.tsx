import { Plus } from 'lucide-react';

export default function AddCoverButton({ onClick }: { onClick: () => void }) {
  return (
    <div onClick={onClick} className="w-40 border-2 border-dashed border-app-border rounded-lg cursor-pointer hover:bg-app-hover transition-colors shrink-0 overflow-hidden">
      <div className="w-40 h-52 flex items-center justify-center">
        <Plus className="w-8 h-8 text-app-text-muted" />
      </div>
      <div className="p-2" />
    </div>
  );
}
