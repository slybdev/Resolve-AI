import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  FileText, 
  Globe, 
  Folder, 
  MoreHorizontal, 
  Filter, 
  FolderPlus, 
  Check, 
  X, 
  ChevronDown, 
  ChevronRight,
  LayoutGrid,
  List,
  Database,
  BookOpen,
  Layers,
  Share2,
  FileCode,
  FileJson,
  Upload,
  Link as LinkIcon,
  ExternalLink
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface KnowledgeItem {
  id: string;
  title: string;
  type: 'folder' | 'public-article' | 'internal-article' | 'snippet' | 'pdf';
  source: string;
  count?: number;
  parentId?: string;
  usage: {
    aiAgent: boolean;
    aiCopilot: boolean;
    helpCenter: boolean;
  };
}

const knowledgeItems: KnowledgeItem[] = [
  {
    id: '1',
    title: 'Blog content',
    type: 'folder',
    source: 'Blog.paysphere.io',
    count: 1235,
    usage: { aiAgent: false, aiCopilot: false, helpCenter: false }
  },
  {
    id: '2',
    title: 'Cards',
    type: 'folder',
    source: 'Paysphere.io/cards',
    count: 8,
    usage: { aiAgent: false, aiCopilot: false, helpCenter: false }
  },
  {
    id: '3',
    title: 'Confluence docs',
    type: 'folder',
    source: 'Confluence',
    count: 376,
    usage: { aiAgent: false, aiCopilot: false, helpCenter: false }
  },
  {
    id: '4',
    title: 'Guru docs',
    type: 'folder',
    source: 'Guru',
    count: 1463,
    usage: { aiAgent: false, aiCopilot: false, helpCenter: false }
  },
  {
    id: '5',
    title: 'Notion docs',
    type: 'folder',
    source: 'Notion',
    count: 2550,
    usage: { aiAgent: false, aiCopilot: false, helpCenter: false }
  },
  {
    id: '6',
    title: 'Zendesk articles',
    type: 'folder',
    source: 'Zendesk',
    count: 56,
    usage: { aiAgent: false, aiCopilot: false, helpCenter: false }
  },
  {
    id: '7',
    title: 'Managing your money',
    type: 'public-article',
    source: 'Intercom',
    parentId: '1',
    usage: { aiAgent: true, aiCopilot: true, helpCenter: true }
  },
  {
    id: '8',
    title: 'Opening a business account',
    type: 'internal-article',
    source: 'Intercom',
    parentId: '1',
    usage: { aiAgent: false, aiCopilot: true, helpCenter: false }
  },
  {
    id: '9',
    title: 'Opening a personal or Joint account',
    type: 'snippet',
    source: 'Intercom',
    parentId: '2',
    usage: { aiAgent: true, aiCopilot: true, helpCenter: false }
  },
  {
    id: '10',
    title: 'Recovering your PIN',
    type: 'pdf',
    source: 'Intercom',
    parentId: '3',
    usage: { aiAgent: true, aiCopilot: true, helpCenter: true }
  },
  {
    id: '11',
    title: 'Signing up for a business account on the web',
    type: 'internal-article',
    source: 'Intercom',
    parentId: '4',
    usage: { aiAgent: false, aiCopilot: true, helpCenter: false }
  }
];

export const KnowledgeBase = ({ workspaceId }: { workspaceId: string }) => {
  const [activeSubView, setActiveSubView] = useState<'sources' | 'content'>('content');
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('All types');
  const [sourceFilter, setSourceFilter] = useState<string>('All sources');
  
  const [isNewFolderModalOpen, setIsNewFolderModalOpen] = useState(false);
  const [isNewContentModalOpen, setIsNewContentModalOpen] = useState(false);
  
  const [items, setItems] = useState<KnowledgeItem[]>(knowledgeItems);
  
  // Modal Form States
  const [newFolderName, setNewFolderName] = useState('');
  const [newContentTitle, setNewContentTitle] = useState('');
  const [newContentType, setNewContentType] = useState<'website' | 'file'>('website');
  const [targetFolderId, setTargetFolderId] = useState('');

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           item.source.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = typeFilter === 'All types' || item.type === typeFilter;
      const matchesSource = sourceFilter === 'All sources' || item.source === sourceFilter;
      const matchesFolder = selectedFolderId ? item.parentId === selectedFolderId : !item.parentId;
      return matchesSearch && matchesType && matchesSource && matchesFolder;
    });
  }, [items, searchQuery, typeFilter, sourceFilter, selectedFolderId]);

  const folders = useMemo(() => items.filter(i => i.type === 'folder'), [items]);

  const handleCreateFolder = () => {
    if (!newFolderName) return;
    const newFolder: KnowledgeItem = {
      id: Date.now().toString(),
      title: newFolderName,
      type: 'folder',
      source: 'Manual',
      count: 0,
      parentId: selectedFolderId || undefined,
      usage: { aiAgent: false, aiCopilot: false, helpCenter: false }
    };
    setItems([newFolder, ...items]);
    setNewFolderName('');
    setIsNewFolderModalOpen(false);
  };

  const handleCreateContent = () => {
    if (!newContentTitle) return;
    const newContent: KnowledgeItem = {
      id: Date.now().toString(),
      title: newContentTitle,
      type: newContentType === 'website' ? 'public-article' : 'pdf',
      source: newContentType === 'website' ? 'Web' : 'Upload',
      parentId: targetFolderId || undefined,
      usage: { aiAgent: true, aiCopilot: true, helpCenter: false }
    };
    setItems([newContent, ...items]);
    setNewContentTitle('');
    setIsNewContentModalOpen(false);
  };

  return (
    <div className="flex h-full w-full bg-transparent overflow-hidden gap-2">
      {/* Left Sidebar - Knowledge Navigation */}
      <div className="w-64 border border-border bg-card flex flex-col shrink-0 rounded-2xl overflow-hidden">
        <div className="p-6">
          <h2 className="text-lg font-bold text-foreground">Knowledge</h2>
        </div>
        <div className="flex-1 overflow-y-auto px-3 space-y-1">
          <div 
            onClick={() => setActiveSubView('sources')}
            className={cn(
              "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg cursor-pointer transition-colors",
              activeSubView === 'sources' ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-accent"
            )}
          >
            <Layers className="w-4 h-4" />
            Sources
          </div>
          <div className="space-y-1">
            <div 
              onClick={() => {
                setActiveSubView('content');
                setSelectedFolderId(null);
              }}
              className={cn(
                "flex items-center justify-between px-3 py-2 text-sm font-bold rounded-lg cursor-pointer",
                activeSubView === 'content' && !selectedFolderId ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
            >
              <div className="flex items-center gap-3">
                <Database className="w-4 h-4" />
                Content
              </div>
              <ChevronDown className="w-3 h-3" />
            </div>
            <div className="ml-9 space-y-1">
              {folders.map((folder) => (
                <div 
                  key={folder.id} 
                  onClick={() => {
                    setActiveSubView('content');
                    setSelectedFolderId(folder.id);
                  }}
                  className={cn(
                    "px-3 py-1.5 text-xs cursor-pointer transition-colors truncate rounded-md",
                    selectedFolderId === folder.id ? "bg-accent text-foreground font-bold" : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                  )}
                >
                  {folder.title}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-card border border-border rounded-2xl overflow-hidden">
        {activeSubView === 'content' ? (
          <>
            {/* Header */}
            <div className="px-8 py-4 border-b border-border flex items-center justify-between bg-card shrink-0">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-muted-foreground" />
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => setSelectedFolderId(null)}
                    className={cn(
                      "text-sm font-bold transition-colors",
                      selectedFolderId ? "text-muted-foreground hover:text-foreground" : "text-foreground"
                    )}
                  >
                    Content
                  </button>
                  {selectedFolderId && (
                    <>
                      <ChevronRight className="w-3 h-3 text-muted-foreground" />
                      <span className="text-sm font-bold text-foreground">
                        {folders.find(f => f.id === selectedFolderId)?.title}
                      </span>
                    </>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setIsNewFolderModalOpen(true)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-accent hover:bg-accent/80 border border-border rounded-lg text-xs font-bold text-foreground transition-all btn-press"
                >
                  <FolderPlus className="w-3.5 h-3.5" />
                  New folder
                </button>
                <button 
                  onClick={() => {
                    setTargetFolderId(selectedFolderId || '');
                    setIsNewContentModalOpen(true);
                  }}
                  className="flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-bold hover:opacity-90 transition-all btn-press shadow-lg shadow-primary/20"
                >
                  <Plus className="w-3.5 h-3.5" />
                  New content
                </button>
              </div>
            </div>

            {/* Controls */}
            <div className="px-8 py-4 flex items-center justify-between gap-4 border-b border-border">
              <div className="flex-1 max-w-md relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input 
                  type="text" 
                  placeholder="Search all" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-accent/50 border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all"
                />
              </div>
              <div className="flex items-center gap-2">
                <select 
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="flex items-center gap-2 px-3 py-2 bg-accent/50 border border-border rounded-lg text-xs font-bold text-foreground hover:bg-accent transition-all focus:outline-none appearance-none cursor-pointer"
                >
                  <option>All types</option>
                  <option value="folder">Folders</option>
                  <option value="public-article">Public Articles</option>
                  <option value="internal-article">Internal Articles</option>
                  <option value="snippet">Snippets</option>
                  <option value="pdf">PDFs</option>
                </select>
                <select 
                  value={sourceFilter}
                  onChange={(e) => setSourceFilter(e.target.value)}
                  className="flex items-center gap-2 px-3 py-2 bg-accent/50 border border-border rounded-lg text-xs font-bold text-foreground hover:bg-accent transition-all focus:outline-none appearance-none cursor-pointer"
                >
                  <option>All sources</option>
                  <option>Intercom</option>
                  <option>Notion</option>
                  <option>Zendesk</option>
                  <option>Confluence</option>
                  <option>Guru</option>
                </select>
                <button className="flex items-center gap-2 px-3 py-2 bg-accent/50 border border-border rounded-lg text-xs font-bold text-foreground hover:bg-accent transition-all">
                  <Filter className="w-3.5 h-3.5" />
                  Filters
                </button>
                <div className="h-6 w-px bg-border mx-2" />
                <div className="flex bg-accent/50 border border-border rounded-lg p-1">
                  <button 
                    onClick={() => setViewMode('list')}
                    className={cn("p-1.5 rounded-md transition-all", viewMode === 'list' ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
                  >
                    <List className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    onClick={() => setViewMode('grid')}
                    className={cn("p-1.5 rounded-md transition-all", viewMode === 'grid' ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-auto no-scrollbar p-8">
              <div className="mb-4">
                <span className="text-xs font-bold text-muted-foreground">{filteredItems.length} items</span>
              </div>
              
              {viewMode === 'list' ? (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                      <th className="pb-4 font-bold">Title</th>
                      <th className="pb-4 font-bold">Type</th>
                      <th className="pb-4 font-bold">Source</th>
                      <th className="pb-4 font-bold text-center">AI Agent</th>
                      <th className="pb-4 font-bold text-center">AI Copilot</th>
                      <th className="pb-4 font-bold text-center">Help Center</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {filteredItems.map((item) => (
                      <tr 
                        key={item.id} 
                        className="group hover:bg-accent/30 transition-colors cursor-pointer"
                        onClick={() => {
                          if (item.type === 'folder') {
                            setSelectedFolderId(item.id);
                          }
                        }}
                      >
                        <td className="py-4 pr-4">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-8 h-8 rounded-lg flex items-center justify-center",
                              item.type === 'folder' ? "text-yellow-500 bg-yellow-500/10" : "text-blue-500 bg-blue-500/10"
                            )}>
                              {item.type === 'folder' ? <Folder className="w-4 h-4" /> : 
                               item.type === 'pdf' ? <FileText className="w-4 h-4" /> :
                               item.type === 'snippet' ? <FileCode className="w-4 h-4" /> :
                               <BookOpen className="w-4 h-4" />}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                                {item.title} {item.count && <span className="text-muted-foreground font-normal ml-1">({item.count.toLocaleString()})</span>}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 pr-4">
                          <span className={cn(
                            "px-2 py-0.5 rounded text-[10px] font-bold uppercase border",
                            item.type === 'folder' ? "bg-muted text-muted-foreground border-border" :
                            item.type === 'public-article' ? "bg-blue-500/10 text-blue-500 border-blue-500/20" :
                            item.type === 'internal-article' ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" :
                            "bg-purple-500/10 text-purple-500 border-purple-500/20"
                          )}>
                            {item.type.replace('-', ' ')}
                          </span>
                        </td>
                        <td className="py-4 pr-4">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Globe className="w-3 h-3" />
                            {item.source}
                          </div>
                        </td>
                        <td className="py-4 pr-4 text-center">
                          {item.type !== 'folder' && (
                            item.usage.aiAgent ? <Check className="w-4 h-4 text-green-500 mx-auto" /> : <X className="w-4 h-4 text-red-500/30 mx-auto" />
                          )}
                        </td>
                        <td className="py-4 pr-4 text-center">
                          {item.type !== 'folder' && (
                            item.usage.aiCopilot ? <Check className="w-4 h-4 text-green-500 mx-auto" /> : <X className="w-4 h-4 text-red-500/30 mx-auto" />
                          )}
                        </td>
                        <td className="py-4 text-center">
                          {item.type !== 'folder' && (
                            item.usage.helpCenter ? <Check className="w-4 h-4 text-green-500 mx-auto" /> : <X className="w-4 h-4 text-red-500/30 mx-auto" />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredItems.map((item) => (
                    <div 
                      key={item.id} 
                      onClick={() => {
                        if (item.type === 'folder') {
                          setSelectedFolderId(item.id);
                        }
                      }}
                      className="p-4 bg-card border border-border rounded-xl hover:shadow-lg transition-all group cursor-pointer"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center",
                          item.type === 'folder' ? "text-yellow-500 bg-yellow-500/10" : "text-blue-500 bg-blue-500/10"
                        )}>
                          {item.type === 'folder' ? <Folder className="w-5 h-5" /> : 
                           item.type === 'pdf' ? <FileText className="w-5 h-5" /> :
                           item.type === 'snippet' ? <FileCode className="w-5 h-5" /> :
                           <BookOpen className="w-5 h-5" />}
                        </div>
                        <button className="p-1 hover:bg-accent rounded-md text-muted-foreground opacity-0 group-hover:opacity-100 transition-all">
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </div>
                      <h4 className="text-sm font-bold text-foreground mb-1 truncate group-hover:text-primary transition-colors">{item.title}</h4>
                      <p className="text-[10px] text-muted-foreground mb-4">{item.source}</p>
                      <div className="flex items-center gap-2">
                        {item.usage.aiAgent && <div className="w-2 h-2 rounded-full bg-green-500" title="AI Agent" />}
                        {item.usage.aiCopilot && <div className="w-2 h-2 rounded-full bg-blue-500" title="AI Copilot" />}
                        {item.usage.helpCenter && <div className="w-2 h-2 rounded-full bg-purple-500" title="Help Center" />}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-accent flex items-center justify-center">
              <Layers className="w-8 h-8 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Knowledge Sources</h2>
            <p className="text-sm text-muted-foreground max-w-md">
              Connect your external data sources like Notion, Zendesk, or Confluence to automatically sync knowledge to your AI agent.
            </p>
            <button className="px-6 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:opacity-90 transition-all btn-press shadow-lg shadow-primary/20">
              Connect Source
            </button>
          </div>
        )}
      </div>
      {/* Modals */}
      <AnimatePresence>
        {isNewFolderModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsNewFolderModalOpen(false)}
              className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center text-yellow-500">
                    <FolderPlus className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-foreground">New Folder</h3>
                    <p className="text-xs text-muted-foreground">Organize your knowledge content</p>
                  </div>
                </div>
                <button onClick={() => setIsNewFolderModalOpen(false)} className="p-2 hover:bg-accent rounded-full transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Folder Name</label>
                  <input 
                    type="text" 
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder="e.g. Product Documentation"
                    className="w-full px-4 py-2 bg-accent/50 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-8">
                <button 
                  onClick={() => setIsNewFolderModalOpen(false)}
                  className="flex-1 py-2.5 bg-accent hover:bg-accent/80 text-foreground rounded-xl text-sm font-bold transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleCreateFolder}
                  className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:opacity-90 transition-all shadow-lg shadow-primary/20"
                >
                  Create Folder
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {isNewContentModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsNewContentModalOpen(false)}
              className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    <Plus className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-foreground">Add Content</h3>
                    <p className="text-xs text-muted-foreground">Choose how to add knowledge</p>
                  </div>
                </div>
                <button onClick={() => setIsNewContentModalOpen(false)} className="p-2 hover:bg-accent rounded-full transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <button 
                  onClick={() => setNewContentType('website')}
                  className={cn(
                    "flex flex-col items-center gap-3 p-4 rounded-2xl border transition-all text-center",
                    newContentType === 'website' ? "bg-primary/5 border-primary text-primary" : "bg-accent/50 border-border text-muted-foreground hover:border-primary/50"
                  )}
                >
                  <Globe className="w-6 h-6" />
                  <span className="text-xs font-bold">Website URL</span>
                </button>
                <button 
                  onClick={() => setNewContentType('file')}
                  className={cn(
                    "flex flex-col items-center gap-3 p-4 rounded-2xl border transition-all text-center",
                    newContentType === 'file' ? "bg-primary/5 border-primary text-primary" : "bg-accent/50 border-border text-muted-foreground hover:border-primary/50"
                  )}
                >
                  <Upload className="w-6 h-6" />
                  <span className="text-xs font-bold">Upload File</span>
                </button>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                    {newContentType === 'website' ? 'Website URL' : 'File Name'}
                  </label>
                  <div className="relative">
                    {newContentType === 'website' ? (
                      <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    ) : (
                      <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    )}
                    <input 
                      type="text" 
                      value={newContentTitle}
                      onChange={(e) => setNewContentTitle(e.target.value)}
                      placeholder={newContentType === 'website' ? "https://example.com/docs" : "Enter file name"}
                      className="w-full pl-10 pr-4 py-2 bg-accent/50 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Target Folder</label>
                  <select 
                    value={targetFolderId}
                    onChange={(e) => setTargetFolderId(e.target.value)}
                    className="w-full px-4 py-2 bg-accent/50 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none"
                  >
                    <option value="">Root Directory</option>
                    {folders.map(folder => (
                      <option key={folder.id} value={folder.id}>{folder.title}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-3 mt-8">
                <button 
                  onClick={() => setIsNewContentModalOpen(false)}
                  className="flex-1 py-2.5 bg-accent hover:bg-accent/80 text-foreground rounded-xl text-sm font-bold transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleCreateContent}
                  className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:opacity-90 transition-all shadow-lg shadow-primary/20"
                >
                  Add Knowledge
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
