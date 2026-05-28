import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { convertFileSrc } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { open } from '@tauri-apps/plugin-dialog';
import { Settings, Moon, Sun, FolderOpen, Palette } from 'lucide-react';
import type { CategoryInfo, Entry } from './types';
import { sanitizeFileName } from './utils';
import { useTheme, THEMES } from './hooks/useTheme';
import CategoryTabs from './components/CategoryTabs';
import SearchBar from './components/SearchBar';
import CoverGrid from './components/CoverGrid';
import DetailModal from './components/DetailModal';
import SetupPage from './components/SetupPage';
import AddEntryModal from './components/AddEntryModal';

export default function App() {
  const [rootPath, setRootPath] = useState('');
  const [configLoaded, setConfigLoaded] = useState(false);
  const [categories, setCategories] = useState<CategoryInfo[]>([]);
  const [currentCategory, setCurrentCategory] = useState('');
  const [entries, setEntries] = useState<Entry[]>([]);
  const [search, setSearch] = useState('');
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const { dark, theme, toggle: toggleTheme, setThemeName } = useTheme();
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const themeMenuRef = useRef<HTMLDivElement>(null);
  const [coverVersions, setCoverVersions] = useState<Record<string, number>>({});

  // Auto-refresh on window focus
  useEffect(() => {
    const win = getCurrentWindow();
    const unlisten = win.listen('tauri://focus', () => {
      loadCategories();
      if (currentCategory) loadEntries();
    });
    return () => { unlisten.then((f) => f()); };
  }, [currentCategory, rootPath]);

  useEffect(() => {
    if (!showThemeMenu) return;
    function handleClick(e: MouseEvent) {
      if (themeMenuRef.current && !themeMenuRef.current.contains(e.target as Node)) {
        setShowThemeMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showThemeMenu]);

  useEffect(() => {
    invoke<string>('load_config')
      .then((configStr) => {
        const config = JSON.parse(configStr || '{}');
        if (config.rootPath) setRootPath(config.rootPath);
      })
      .catch(console.error)
      .finally(() => setConfigLoaded(true));
  }, []);

  useEffect(() => {
    if (!rootPath) return;
    invoke('init_library', { rootPath }).then(() => loadCategories()).catch(console.error);
  }, [rootPath]);

  async function loadCategories() {
    try {
      const data = await invoke<string>('load_categories', { rootPath });
      const cats: CategoryInfo[] = JSON.parse(data || '[]');
      setCategories(cats);
      if (cats.length > 0 && !currentCategory) setCurrentCategory(cats[0].name);
      else if (!cats.find((c) => c.name === currentCategory)) setCurrentCategory(cats[0]?.name || '');
    } catch (e) { console.error(e); }
  }

  useEffect(() => {
    if (!rootPath || !currentCategory) return;
    loadEntries();
    setSelectedEntry(null);
    setSearch('');
  }, [currentCategory, rootPath]);

  async function loadEntries() {
    try {
      const data = await invoke<string>('load_entries', { category: currentCategory, rootPath });
      const entries: Entry[] = JSON.parse(data || '[]');
      const noteFiles = entries.filter((e) => !e.hasNote).map((e) => e.noteFileName);
      if (noteFiles.length > 0) {
        try {
          const filledJson = await invoke<string>('check_notes', { category: currentCategory, rootPath, fileNames: noteFiles });
          const filled: string[] = JSON.parse(filledJson || '[]');
          const filledSet = new Set(filled);
          for (const e of entries) {
            if (!e.hasNote && filledSet.has(e.noteFileName)) e.hasNote = true;
          }
        } catch (_) { /* ignore, entries display fine without hasNote */ }
      }
      setEntries(entries);
    } catch (e) { console.error(e); setEntries([]); }
  }

  const saveEntriesWrapper = useCallback(async (newEntries: Entry[]) => {
    try { await invoke('save_entries', { category: currentCategory, rootPath, entries: JSON.stringify(newEntries, null, 2) }); }
    catch (e) { console.error(e); }
  }, [rootPath, currentCategory]);

  const filteredEntries = useMemo(() => {
    if (!search.trim()) return entries;
    const q = search.toLowerCase();
    return entries.filter((e) => e.title.toLowerCase().includes(q));
  }, [entries, search]);

  const getCoverUrl = useCallback((entryId: string, fileName: string) => {
    if (!fileName) return '';
    const v = coverVersions[entryId] || 0;
    return convertFileSrc(`${rootPath.replace(/\\/g, '/')}/${currentCategory}/covers/${fileName}`) + (v ? `?v=${v}` : '');
  }, [rootPath, currentCategory, coverVersions]);

  async function handleAddCategory(name: string) {
    try {
      const id = await invoke<string>('add_category', { rootPath, name });
      setCategories((prev) => [...prev, { id, name }]);
      setCurrentCategory(name);
    } catch (e) { console.error(e); }
  }

  async function handleRenameCategory(oldName: string, newName: string) {
    try {
      await invoke('rename_category', { rootPath, oldName, newName });
      setCategories((prev) => prev.map((c) => (c.name === oldName ? { ...c, name: newName } : c)));
      if (currentCategory === oldName) setCurrentCategory(newName);
    } catch (e) { console.error(e); }
  }

  async function handleReorderCategories(newCats: CategoryInfo[]) {
    setCategories(newCats);
    await invoke('save_categories', { rootPath, categories: JSON.stringify(newCats) }).catch(console.error);
  }

  async function handleDeleteCategory(name: string) {
    try {
      await invoke('delete_category', { rootPath, name });
      setCategories((prev) => {
        const remaining = prev.filter((c) => c.name !== name);
        if (currentCategory === name) setCurrentCategory(remaining[0]?.name || '');
        return remaining;
      });
    } catch (e) { console.error(e); }
  }

  function handleAddClick() { setShowAddForm(true); }

  async function handleAddSubmit(newEntry: { title: string; date: string; sourcePath: string }) {
    const id = crypto.randomUUID();
    const safeName = sanitizeFileName(newEntry.title);
    let coverFileName = '';
    if (newEntry.sourcePath) {
      coverFileName = await invoke<string>('copy_cover', { sourcePath: newEntry.sourcePath, category: currentCategory, rootPath, targetName: safeName }).catch(() => '');
    }
    const noteFileName = `${safeName}.md`;
    const entry: Entry = { id, title: newEntry.title, date: newEntry.date, coverFileName, noteFileName, createdAt: new Date().toISOString(), hasNote: false };
    const newEntries = [entry, ...entries];
    setEntries(newEntries);
    await saveEntriesWrapper(newEntries);
    await invoke('save_note', { category: currentCategory, rootPath, fileName: noteFileName, content: '' }).catch(console.error);
    setShowAddForm(false);
  }

  async function handleDelete(entry: Entry) {
    await invoke('delete_cover', { category: currentCategory, rootPath, fileName: entry.coverFileName }).catch(console.error);
    await invoke('delete_note', { category: currentCategory, rootPath, fileName: entry.noteFileName }).catch(console.error);
    const newEntries = entries.filter((e) => e.id !== entry.id);
    setEntries(newEntries);
    await saveEntriesWrapper(newEntries);
    if (selectedEntry?.id === entry.id) setSelectedEntry(null);
  }

  function handleReorder(startIndex: number, endIndex: number) {
    const newEntries = [...entries];
    const [moved] = newEntries.splice(startIndex, 1);
    newEntries.splice(endIndex, 0, moved);
    setEntries(newEntries);
    saveEntriesWrapper(newEntries);
  }

  function handleEntryUpdate(updatedEntry: Entry) {
    const oldEntry = entries.find((e) => e.id === updatedEntry.id);
    if (oldEntry && oldEntry.coverFileName !== updatedEntry.coverFileName) {
      setCoverVersions((prev) => ({ ...prev, [updatedEntry.id]: (prev[updatedEntry.id] || 0) + 1 }));
    }
    const newEntries = entries.map((e) => (e.id === updatedEntry.id ? updatedEntry : e));
    setEntries(newEntries);
    setSelectedEntry(updatedEntry);
    saveEntriesWrapper(newEntries);
  }

  function handleSetupComplete(newPath: string) { setRootPath(newPath); }

  async function handleChangeFolder() {
    const folder = await open({ directory: true, multiple: false, title: '选择新的数据存储文件夹' });
    if (folder) {
      const newPath = folder as string;
      await invoke('init_library', { rootPath: newPath });
      await invoke('save_config', { config: JSON.stringify({ rootPath: newPath }) });
      setRootPath(newPath);
    }
  }

  if (!configLoaded) {
    return <div className="h-screen w-screen flex items-center justify-center bg-app-bg"><p className="text-app-text-muted text-sm">加载中...</p></div>;
  }

  if (!rootPath) {
    return <SetupPage onComplete={handleSetupComplete} />;
  }

  return (
    <div className="h-screen w-screen flex bg-app-bg transition-colors">
      <CategoryTabs categories={categories} current={currentCategory} onChange={setCurrentCategory} onRename={handleRenameCategory} onDelete={handleDeleteCategory} onAdd={handleAddCategory} onReorder={handleReorderCategories} />
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center gap-4 px-5 py-3 border-b border-app-border">
          <div className="flex-1 max-w-sm"><SearchBar value={search} onChange={setSearch} /></div>
          <div className="relative" ref={themeMenuRef}>
            <button onClick={() => setShowThemeMenu(!showThemeMenu)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-app-hover transition-colors cursor-pointer shrink-0" title="主题">
              <Palette className="w-4 h-4 text-app-text-muted" />
            </button>
            {showThemeMenu && (
              <div className="absolute top-full right-0 mt-1 bg-app-bg border border-app-border rounded-lg shadow-lg z-50 py-1 min-w-[100px]">
                {THEMES.map((t) => (
                  <button key={t.key} onClick={() => { setThemeName(t.key); setShowThemeMenu(false); }} className={`w-full px-3 py-1.5 text-sm text-left transition-colors cursor-pointer ${theme === t.key ? 'bg-app-active text-app-active-text font-medium' : 'text-app-text hover:bg-app-hover'}`}>
                    {t.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button onClick={toggleTheme} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-app-hover transition-colors cursor-pointer shrink-0" title={dark ? '切换日间模式' : '切换夜间模式'}>
            {dark ? <Sun className="w-4 h-4 text-app-text-muted" /> : <Moon className="w-4 h-4 text-app-text-muted" />}
          </button>
          <button onClick={() => invoke('open_folder', { path: rootPath })} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-app-hover transition-colors cursor-pointer shrink-0" title="打开数据文件夹">
            <FolderOpen className="w-4 h-4 text-app-text-muted" />
          </button>
          <button onClick={handleChangeFolder} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-app-hover transition-colors cursor-pointer shrink-0" title="更改数据文件夹">
            <Settings className="w-4 h-4 text-app-text-muted" />
          </button>
        </div>
        <div className="flex-1 overflow-auto">
          {filteredEntries.length === 0 && search ? (
            <div className="flex items-center justify-center h-full text-app-text-muted text-sm">未找到匹配的作品</div>
          ) : (
            <CoverGrid entries={filteredEntries} getCoverUrl={getCoverUrl} onEntryClick={setSelectedEntry} onDelete={handleDelete} onReorder={handleReorder} onAdd={handleAddClick} />
          )}
        </div>
      </div>
      {selectedEntry && <DetailModal entry={selectedEntry} category={currentCategory} rootPath={rootPath} coverUrl={getCoverUrl(selectedEntry.id, selectedEntry.coverFileName)} onClose={() => setSelectedEntry(null)} onUpdate={handleEntryUpdate} />}
      {showAddForm && <AddEntryModal onSubmit={handleAddSubmit} onClose={() => setShowAddForm(false)} />}
    </div>
  );
}
