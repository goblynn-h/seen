import { Search } from 'lucide-react';

interface SearchBarProps { value: string; onChange: (value: string) => void; }

export default function SearchBar({ value, onChange }: SearchBarProps) {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-app-text-muted" />
      <input type="text" placeholder="搜索作品名称..." value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full pl-9 pr-4 py-2 text-sm bg-app-input border border-app-border rounded-lg focus:outline-none focus:border-app-text-muted transition-colors text-app-text placeholder:text-app-text-muted" />
    </div>
  );
}
