import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
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
  ExternalLink,
  ArrowLeft,
  RefreshCw,
  Sparkles,
  Trash2,
  MoreVertical,
  CheckCircle2,
  CircleOff,
  AlertTriangle
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/src/components/ui/Toast';
import { DropdownMenu } from '@/src/components/ui/dropdown-menu';
import { api } from '@/src/lib/api';

interface KnowledgeDocument {
  id: string;
  title: string;
  type: string;
  status: string;
  source_id?: string;
  workspace_id: string;
  external_id: string;
  content_type: string;
  folder_ids: string[];
  created_at: string;
  updated_at: string;
}

interface KnowledgeFolder {
  id: string;
  name: string;
  parent_id?: string;
  workspace_id: string;
  created_at: string;
  updated_at: string;
}

export const KnowledgeBase = ({ workspaceId }: { workspaceId: string }) => {
  const { toast } = useToast();
  const [activeSubView, setActiveSubView] = useState<'sources' | 'content'>('content');
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('All types');
  const [sourceFilter, setSourceFilter] = useState<string>('All sources');
  
  const [isNewFolderModalOpen, setIsNewFolderModalOpen] = useState(false);
  const [isNewContentModalOpen, setIsNewContentModalOpen] = useState(false);
  const [isConnectSourceModalOpen, setIsConnectSourceModalOpen] = useState(false);
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [folders, setFolders] = useState<KnowledgeFolder[]>([]);
  const [sources, setSources] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const selectedSource = useMemo(() => sources.find(s => s.id === selectedSourceId), [sources, selectedSourceId]);
  
  const [selectedFolderIdForIngestion, setSelectedFolderIdForIngestion] = useState<string | null>(null);
  const [movingItemId, setMovingItemId] = useState<string | null>(null);
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [targetFolderId, setTargetFolderId] = useState<string>('');
  
  // Modal Form States
  const [newFolderName, setNewFolderName] = useState('');
  const [newContentTitle, setNewContentTitle] = useState('');
  const [newContentType, setNewContentType] = useState<'website' | 'file'>('website');
  // Connector Setup States
  const [selectedConnector, setSelectedConnector] = useState<any | null>(null);
  const [connectorForm, setConnectorForm] = useState<any>({});
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSemanticSearch, setIsSemanticSearch] = useState(false);
  const [semanticResults, setSemanticResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isContentExpanded, setIsContentExpanded] = useState(true);
  
  // Deletion Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; type: 'file' | 'folder' | 'source'; title: string } | null>(null);

  const resetConnectorModal = () => {
    setIsConnectSourceModalOpen(false);
    setSelectedConnector(null);
    setConnectorForm({});
    setIsConnecting(false);
    setSelectedFile(null);
  };

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const [sourcesRes, docsRes, foldersRes] = await Promise.all([
        api.knowledge.sources.list(workspaceId),
        api.knowledge.documents.list(workspaceId),
        api.knowledge.folders.list(workspaceId)
      ]);
      
      if (!silent) {
        console.log('[KnowledgeBase] Data refresh:', {
          sources: sourcesRes.map((s: any) => ({ name: s.name, status: s.status, sync: s.sync_status })),
          documents: docsRes.map((d: any) => ({ title: d.title, status: d.status }))
        });
      }

      setSources(sourcesRes);
      setDocuments(docsRes);
      setFolders(foldersRes);
    } catch (error) {
      console.error('Failed to fetch knowledge data:', error);
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Polling for processing items — use a ref to avoid re-creating the interval on every state change
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isProcessingRef = useRef(false);

  useEffect(() => {
    isProcessingRef.current = sources.some(s => s.sync_status === 'syncing') || 
      documents.some(d => d.status !== 'ready' && d.status !== 'failed');
  }, [sources, documents]);

  useEffect(() => {
    // Start a single long-lived polling interval
    pollingRef.current = setInterval(() => {
      if (isProcessingRef.current) {
        fetchData(true);
      }
    }, 5000);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [fetchData]);

  // Build a unified display list: folders + documents
  const displayItems = useMemo(() => {
    const folderItems = folders.map(f => ({
      ...f,
      id: f.id,
      title: f.name,
      type: 'folder' as const,
      source: 'System',
      status: 'ready',
      count: documents.filter(d => (d.folder_ids || []).includes(f.id)).length,
      folder_ids: [] as string[],
      parent_id: f.parent_id || null,
    }));
    const docItems = documents
      .map(d => ({
        ...d,
        id: d.id,
        title: d.title,
        type: d.type || 'file',
        source: sources.find(s => s.id === d.source_id)?.name || 'Upload',
        status: d.status,
        folder_ids: d.folder_ids || [],
        parent_id: null as string | null,
      }));
    return [...folderItems, ...docItems];
  }, [folders, documents, sources]);

  const filteredItems = useMemo(() => {
    return displayItems.filter(item => {
      const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = typeFilter === 'All types' || item.type === typeFilter;
      // For folder view: show root folders + unfiled docs when no folder selected
      // When a folder is selected, show its child folders + documents assigned to it
      if (selectedFolderId) {
        if (item.type === 'folder') return item.parent_id === selectedFolderId && matchesSearch && matchesType;
        return item.folder_ids.includes(selectedFolderId) && matchesSearch && matchesType;
      } else {
        if (item.type === 'folder') return !item.parent_id && matchesSearch && matchesType;
        return item.folder_ids.length === 0 && matchesSearch && matchesType;
      }
    });
  }, [displayItems, searchQuery, typeFilter, selectedFolderId]);

  const handleCreateFolder = async () => {
    if (!newFolderName) return;
    try {
      const newFolder = await api.knowledge.folders.create(workspaceId, {
        name: newFolderName,
        parent_id: selectedFolderId || undefined
      });
      setFolders([newFolder, ...folders]);
      setNewFolderName('');
      setIsNewFolderModalOpen(false);
    } catch (error) {
      console.error('Failed to create folder:', error);
    }
  };

  const handleCreateContent = async () => {
    // Content is created via file upload now, this is a placeholder
    setIsNewContentModalOpen(false);
  };

  const handleMoveItem = async (docId: string, folderId: string | null) => {
    try {
      if (folderId) {
        // Move into a specific folder
        await api.knowledge.folders.assignDocument(workspaceId, folderId, docId);
        setDocuments(documents.map(d => d.id === docId ? { 
          ...d, 
          folder_ids: Array.from(new Set([...(d.folder_ids || []), folderId])) 
        } : d));
        toast('Item Moved', 'Document has been added to the folder.', 'success');
      } else if (selectedFolderId) {
        // "Move to Root" means removing from the current folder we are viewing
        await api.knowledge.folders.removeDocument(workspaceId, selectedFolderId, docId);
        setDocuments(documents.map(d => d.id === docId ? { 
          ...d, 
          folder_ids: (d.folder_ids || []).filter(id => id !== selectedFolderId) 
        } : d));
        toast('Item Moved to Root', 'Document has been removed from the folder.', 'success');
      }
      setIsMoveModalOpen(false);
      setMovingItemId(null);
    } catch (error) {
      console.error('Failed to move document:', error);
      toast('Move Failed', (error as any).message, 'error');
    }
  };

  const handleSyncSource = async (sourceId: string) => {
    const source = sources.find(s => s.id === sourceId);
    try {
      if (source?.type === 'notion') {
        await api.knowledge.notion.sync(sourceId);
      } else {
        await api.knowledge.sources.update(workspaceId, sourceId, {
          status: 'syncing'
        });
      }
      setSources(sources.map(s => s.id === sourceId ? { ...s, status: 'syncing' } : s));
      
      // Poll for update
      const pollInterval = setInterval(async () => {
        try {
          const updated = await api.knowledge.sources.get(workspaceId, sourceId);
          if (updated.status !== 'syncing') {
            setSources(prev => prev.map(s => s.id === sourceId ? updated : s));
            clearInterval(pollInterval);
          }
        } catch (e) {
          console.error(e);
          clearInterval(pollInterval);
        }
      }, 5000);
    } catch (error) {
      console.error('Failed to sync source:', error);
    }
  };

  const handleDeleteSource = (sourceId: string) => {
    const source = sources.find(s => s.id === sourceId);
    setItemToDelete({
      id: sourceId,
      type: 'source',
      title: source?.name || 'this source'
    });
    setIsDeleteModalOpen(true);
  };

  const handleToggleUsage = async (item: any, usageType: 'agent' | 'copilot' | 'help_center') => {
    const field = `usage_${usageType}`;
    const newValue = !item[field];
    
    try {
      if (item.type === 'folder') {
        await api.knowledge.folders.update(workspaceId, item.id, { [field]: newValue });
        
        // Update documents that are in this folder locally
        setDocuments(documents.map(d => 
          (d.folder_ids || []).includes(item.id) ? { ...d, [field]: newValue } : d
        ));
        
        // Update folder locally
        setFolders(folders.map(f => f.id === item.id ? { ...f, [field]: newValue } : f));
      } else {
        await api.knowledge.documents.update(workspaceId, item.id, { [field]: newValue });
        
        // Update document locally
        setDocuments(documents.map(d => d.id === item.id ? { ...d, [field]: newValue } : d));
      }
      toast('Accessibility Updated', `Privacy settings for ${usageType.replace('_', ' ')} updated.`, 'success');
    } catch (error) {
      console.error('Failed to update usage:', error);
      toast('Update Failed', (error as any).message, 'error');
    }
  };


  const handleDeleteItem = (item: any) => {
    setItemToDelete({
      id: item.id,
      type: item.type === 'folder' ? 'folder' : 'file',
      title: item.title
    });
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    const { id, type } = itemToDelete;
    
    try {
      if (type === 'source') {
        await api.knowledge.sources.delete(workspaceId, id);
        setSources(sources.filter(s => s.id !== id));
        setSelectedSourceId(null);
      } else if (type === 'folder') {
        await api.knowledge.folders.delete(workspaceId, id);
        setFolders(folders.filter(f => f.id !== id));
      } else {
        await api.knowledge.documents.delete(workspaceId, id);
        setDocuments(documents.filter(d => d.id !== id));
      }
      toast('Item Deleted', `The ${type} has been removed successfully.`, 'success');
    } catch (error) {
      console.error('Failed to delete:', error);
      toast('Deletion Failed', (error as any).message, 'error');
    } finally {
      setIsDeleteModalOpen(false);
      setItemToDelete(null);
    }
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
                if (activeSubView === 'content' && !selectedFolderId) {
                  setIsContentExpanded(!isContentExpanded);
                } else {
                  setActiveSubView('content');
                  setSelectedFolderId(null);
                  setIsContentExpanded(true);
                }
              }}
              onDragOver={(e) => {
                if (selectedFolderId && draggedItemId) {
                  e.preventDefault();
                  e.currentTarget.classList.add('bg-primary/20', 'scale-[1.02]');
                }
              }}
              onDragLeave={(e) => {
                e.currentTarget.classList.remove('bg-primary/20', 'scale-[1.02]');
              }}
              onDrop={async (e) => {
                e.preventDefault();
                e.currentTarget.classList.remove('bg-primary/20', 'scale-[1.02]');
                const droppedId = e.dataTransfer.getData('text/plain');
                if (selectedFolderId && droppedId) {
                  await handleMoveItem(droppedId, null);
                }
                setDraggedItemId(null);
              }}
              className={cn(
                "flex items-center justify-between px-3 py-2 text-sm font-bold rounded-lg cursor-pointer transition-all duration-200",
                activeSubView === 'content' && !selectedFolderId ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
            >
              <div className="flex items-center gap-3">
                <Database className="w-4 h-4" />
                Content
              </div>
              <ChevronDown className={cn("w-3 h-3 transition-transform duration-200", !isContentExpanded && "-rotate-90")} />
            </div>
            
            <AnimatePresence>
              {isContentExpanded && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="ml-9 space-y-1 overflow-hidden"
                >
                  {displayItems.filter(item => {
                    if (item.type === 'folder') return !item.parent_id;
                    return item.folder_ids.length === 0;
                  }).map((item) => (
                    <div 
                      key={item.id} 
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', item.id);
                        setDraggedItemId(item.id);
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (item.type === 'folder') {
                          setActiveSubView('content');
                          setSelectedFolderId(item.id);
                        } else {
                          setActiveSubView('content');
                          setSelectedFolderId(null);
                        }
                      }}
                      onDragOver={(e) => {
                        if (item.type === 'folder' && draggedItemId !== item.id) {
                          e.preventDefault();
                          e.currentTarget.classList.add('bg-accent', 'scale-[1.02]');
                        }
                      }}
                      onDragLeave={(e) => {
                        e.currentTarget.classList.remove('bg-accent', 'scale-[1.02]');
                      }}
                      onDrop={async (e) => {
                        e.preventDefault();
                        e.currentTarget.classList.remove('bg-accent', 'scale-[1.02]');
                        const droppedId = e.dataTransfer.getData('text/plain');
                        if (item.type === 'folder' && droppedId !== item.id) {
                          await handleMoveItem(droppedId, item.id);
                        }
                        setDraggedItemId(null);
                      }}
                      className={cn(
                        "flex items-center gap-2.5 px-3 py-2 text-xs cursor-pointer transition-all truncate rounded-md font-extrabold",
                        selectedFolderId === item.id ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                      )}
                    >
                      {item.type === 'folder' ? (
                        <Folder className="w-3.5 h-3.5 text-yellow-500 shrink-0" />
                      ) : (
                        <FileText className="w-3.5 h-3.5 text-primary shrink-0" />
                      )}
                      <span className="truncate">{item.title}</span>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
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
                    onDragOver={(e) => {
                      if (selectedFolderId && draggedItemId) {
                        e.preventDefault();
                        e.currentTarget.classList.add('text-primary', 'scale-110');
                      }
                    }}
                    onDragLeave={(e) => {
                      e.currentTarget.classList.remove('text-primary', 'scale-110');
                    }}
                    onDrop={async (e) => {
                      e.preventDefault();
                      e.currentTarget.classList.remove('text-primary', 'scale-110');
                      const droppedId = e.dataTransfer.getData('text/plain');
                      if (selectedFolderId && droppedId) {
                        await handleMoveItem(droppedId, null);
                      }
                      setDraggedItemId(null);
                    }}
                    className={cn(
                      "text-sm font-bold transition-all duration-200",
                      selectedFolderId ? "text-muted-foreground hover:text-foreground" : "text-foreground"
                    )}
                  >
                    Content
                  </button>
                  {selectedFolderId && (
                    <>
                      <ChevronRight className="w-3 h-3 text-muted-foreground" />
                      <span className="text-sm font-bold text-foreground">
                        {folders.find(f => f.id === selectedFolderId)?.name}
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
                  placeholder={isSemanticSearch ? "Ask AI about your knowledge..." : "Search all"}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={async (e) => {
                    if (e.key === 'Enter' && isSemanticSearch && searchQuery) {
                      setIsSearching(true);
                      try {
                        const res = await api.knowledge.search.semantic(workspaceId, searchQuery);
                        setSemanticResults(res.results.map((r: any) => ({
                          id: r.document_id,
                          title: r.document_title,
                          content: r.content,
                          type: 'public-article', // Mapping chunk/doc to a viewable item
                          source: 'AI Search',
                          usage_agent: true, usage_copilot: true, usage_help_center: true
                        })));
                      } catch (err) {
                        console.error('Semantic search failed:', err);
                      } finally {
                        setIsSearching(false);
                      }
                    }
                  }}
                  className={cn(
                    "w-full pl-9 pr-12 py-2 bg-accent/50 border rounded-lg text-sm text-foreground focus:outline-none transition-all",
                    isSemanticSearch ? "border-primary/50 ring-1 ring-primary/20" : "border-border"
                  )}
                />
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => {
                    setIsSemanticSearch(!isSemanticSearch);
                    if (!isSemanticSearch) setSemanticResults([]);
                  }}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all border",
                    isSemanticSearch ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20" : "bg-accent/50 text-muted-foreground border-border hover:bg-accent"
                  )}
                >
                  <Sparkles className={cn("w-3.5 h-3.5", isSearching && "animate-pulse")} />
                  {isSemanticSearch ? "AI Search Active" : "Enable AI Search"}
                </button>
                <div className="w-px h-4 bg-border mx-2" />
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
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-xs font-bold text-muted-foreground">
                    {isSemanticSearch ? `${semanticResults.length} AI results` : `${filteredItems.length} items`}
                  </span>
                  {isSemanticSearch && (
                    <span className="text-[10px] font-bold text-primary flex items-center gap-1 bg-primary/10 px-2 py-1 rounded-full uppercase tracking-tighter">
                      <Sparkles className="w-3 h-3" />
                      Semantic Search Active
                    </span>
                  )}
                </div>
                
                {(isSemanticSearch ? semanticResults : filteredItems).length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center opacity-50">
                    <Database className="w-12 h-12 mb-4" />
                    <p className="text-sm">No results found.</p>
                  </div>
                ) : (
                  viewMode === 'list' ? (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                      <th className="pb-4 font-bold">Title</th>
                      <th className="pb-4 font-bold">Type</th>
                      <th className="pb-4 font-bold">Source</th>
                      <th className="pb-4 font-bold text-center">AI Agent</th>
                      <th className="pb-4 font-bold text-center">AI Copilot</th>
                      <th className="pb-4 font-bold text-center">Help Center</th>
                      <th className="pb-4 font-bold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {(isSemanticSearch ? semanticResults : filteredItems).map((item) => (
                      <tr 
                        key={item.id} 
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData('text/plain', item.id);
                          setDraggedItemId(item.id);
                        }}
                        onDragOver={(e) => {
                          if (item.type === 'folder' && draggedItemId !== item.id) {
                            e.preventDefault();
                            e.currentTarget.classList.add('bg-primary/10');
                          }
                        }}
                        onDragLeave={(e) => {
                          e.currentTarget.classList.remove('bg-primary/10');
                        }}
                        onDrop={async (e) => {
                          e.preventDefault();
                          e.currentTarget.classList.remove('bg-primary/10');
                          const droppedId = e.dataTransfer.getData('text/plain');
                          if (item.type === 'folder' && droppedId !== item.id) {
                            await handleMoveItem(droppedId, item.id);
                          }
                          setDraggedItemId(null);
                        }}
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
                        <td className="py-4 text-center">
                          {(item.type !== 'folder' || (item.type === 'folder' && Number(item.count) > 0)) && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleToggleUsage(item, 'agent'); }}
                              className={cn(
                                "p-1.5 rounded-full transition-colors",
                                item.usage_agent !== false ? "text-green-500 bg-green-500/10 hover:bg-green-500/20" : "text-muted-foreground bg-muted hover:bg-accent"
                              )}
                            >
                              {item.usage_agent !== false ? <CheckCircle2 className="w-4 h-4" /> : <CircleOff className="w-4 h-4" />}
                            </button>
                          )}
                        </td>
                        <td className="py-4 text-center">
                          {(item.type !== 'folder' || (item.type === 'folder' && Number(item.count) > 0)) && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleToggleUsage(item, 'copilot'); }}
                              className={cn(
                                "p-1.5 rounded-full transition-colors",
                                item.usage_copilot !== false ? "text-green-500 bg-green-500/10 hover:bg-green-500/20" : "text-muted-foreground bg-muted hover:bg-accent"
                              )}
                            >
                              {item.usage_copilot !== false ? <CheckCircle2 className="w-4 h-4" /> : <CircleOff className="w-4 h-4" />}
                            </button>
                          )}
                        </td>
                        <td className="py-4 text-center">
                          {(item.type !== 'folder' || (item.type === 'folder' && Number(item.count) > 0)) && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleToggleUsage(item, 'help_center'); }}
                              className={cn(
                                "p-1.5 rounded-full transition-colors",
                                item.usage_help_center !== false ? "text-green-500 bg-green-500/10 hover:bg-green-500/20" : "text-muted-foreground bg-muted hover:bg-accent"
                              )}
                            >
                              {item.usage_help_center !== false ? <CheckCircle2 className="w-4 h-4" /> : <CircleOff className="w-4 h-4" />}
                            </button>
                          )}
                        </td>
                        <td className="py-4 text-right">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteItem(item);
                            }}
                            className="p-1 px-2 rounded-md hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors text-[10px] font-bold uppercase tracking-wider border border-transparent hover:border-red-500/20"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {(isSemanticSearch ? semanticResults : filteredItems).map((item) => (
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
                        <div onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu 
                            showChevron={false}
                            align="right"
                            options={[
                              { label: 'Delete', Icon: <Trash2 className="w-4 h-4 text-red-500" />, onClick: () => handleDeleteItem(item) }
                            ]}
                            className="bg-transparent hover:bg-accent/50 p-1 border-none shadow-none w-auto"
                          >
                            <MoreVertical className="w-4 h-4 text-muted-foreground" />
                          </DropdownMenu>
                        </div>
                      </div>
                      <h4 className="text-sm font-bold text-foreground mb-1 truncate group-hover:text-primary transition-colors">{item.title}</h4>
                      <p className="text-[10px] text-muted-foreground mb-4">{item.source}</p>
                      <div className="flex items-center gap-2">
                        {item.type !== 'folder' && (
                          <div className={cn(
                            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-bold uppercase border",
                            item.status === 'ready' ? "bg-green-500/10 text-green-500 border-green-500/20" :
                            item.status === 'chunking' || item.status === 'vectorizing' || item.status === 'processing' ? "bg-primary/10 text-primary border-primary/20" :
                            "bg-red-500/10 text-red-500 border-red-500/20"
                          )}>
                            {item.status === 'ready' ? (
                              <Check className="w-2.5 h-2.5" />
                            ) : (item.status === 'chunking' || item.status === 'vectorizing' || item.status === 'processing') ? (
                              <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                            ) : null}
                            {item.status || 'pending'}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        </>
      ) : (
          <div className="flex-1 flex flex-col p-8 overflow-y-auto no-scrollbar">
            {!selectedSourceId ? (
              <>
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-xl font-bold text-foreground">Knowledge Sources</h2>
                    <p className="text-sm text-muted-foreground mt-1">Manage external data connectors and ingestion pipelines.</p>
                  </div>
                  <button 
                    onClick={() => setIsConnectSourceModalOpen(true)}
                    className="px-6 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:opacity-90 transition-all btn-press shadow-lg shadow-primary/20 flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Connect Source
                  </button>
                </div>

                {sources.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
                    <div className="w-16 h-16 rounded-full bg-accent flex items-center justify-center">
                      <Layers className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h2 className="text-lg font-bold text-foreground">No sources connected</h2>
                    <p className="text-sm text-muted-foreground max-w-sm">
                      Connect your external data sources like Notion, Zendesk, or Confluence to automatically sync knowledge to your AI agent.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {sources.map(source => (
                      <div 
                        key={source.id} 
                        onClick={() => setSelectedSourceId(source.id)}
                        className="p-6 bg-accent/30 border border-border rounded-2xl hover:border-primary/50 transition-all group cursor-pointer"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="w-12 h-12 rounded-xl bg-card border border-border flex items-center justify-center">
                            {source.type === 'notion' ? <Database className="w-6 h-6 text-blue-500" /> :
                             source.type === 'zendesk' ? <Share2 className="w-6 h-6 text-green-500" /> :
                             source.type === 'confluence' ? <BookOpen className="w-6 h-6 text-blue-600" /> :
                             <Globe className="w-6 h-6 text-muted-foreground" />}
                          </div>
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteSource(source.id);
                              }}
                              className="p-2 hover:bg-red-500/10 text-muted-foreground hover:text-red-500 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                            <div className={cn(
                              "px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5",
                              source.sync_status === 'syncing' ? "bg-primary/10 text-primary" : 
                              source.status === 'healthy' ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                            )}>
                              {source.sync_status === 'syncing' ? (
                                <>
                                  <RefreshCw className="w-3 h-3 animate-spin" />
                                  <span>{documents.find(d => d.source_id === source.id && d.status !== 'ready')?.status || 'Indexing'}</span>
                                </>
                              ) : (
                                <>
                                  {source.status === 'healthy' && <Check className="w-3 h-3" />}
                                  <span>{source.status}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <h3 className="font-bold text-foreground mb-1">{source.name}</h3>
                        <p className="text-xs text-muted-foreground mb-4 capitalize">{source.type} connector</p>
                        <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-widest pt-4 border-t border-border/50">
                          <span>{source.document_count} articles</span>
                          <span>Last sync: {source.last_sync_at ? new Date(source.last_sync_at).toLocaleDateString() : 'Never'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : selectedSource ? (
              <div className="flex-1 flex flex-col min-h-0">
                <div className="flex items-center gap-4 mb-8">
                  <button 
                    onClick={() => setSelectedSourceId(null)}
                    className="p-2 hover:bg-accent rounded-full transition-colors text-muted-foreground"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h2 className="text-2xl font-bold text-foreground">{selectedSource.name}</h2>
                      <div className="px-2 py-0.5 rounded-full bg-green-500/10 text-green-500 text-[10px] font-bold uppercase tracking-widest">
                        {selectedSource.status}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 capitalize">{selectedSource.type} Connector • {selectedSource.document_count} articles ingested</p>
                  </div>
                  <div className="flex gap-3">
                    <button 
                      onClick={() => handleSyncSource(selectedSource.id)}
                      disabled={selectedSource.status === 'syncing'}
                      className="px-6 py-2 bg-accent hover:bg-accent/80 text-foreground rounded-xl text-sm font-bold transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                      <RefreshCw className={cn("w-4 h-4", selectedSource.status === 'syncing' && "animate-spin")} />
                      {selectedSource.status === 'syncing' ? 'Syncing...' : 'Sync Now'}
                    </button>
                    <button 
                      onClick={() => handleDeleteSource(selectedSource.id)}
                      className="px-6 py-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-xl text-sm font-bold transition-all"
                    >
                      Disconnect
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-8 border-b border-border mb-8">
                  {['Overview', 'Configuration', 'AI Tuning', 'Security'].map(tab => (
                    <button 
                      key={tab}
                      className={cn(
                        "pb-4 text-sm font-bold transition-all relative",
                        tab === 'Overview' ? "text-primary" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {tab}
                      {tab === 'Overview' && (
                        <motion.div layoutId="source-tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                      )}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-3 gap-6">
                  <div className="col-span-2 space-y-6">
                    <div className="p-6 bg-accent/30 border border-border rounded-2xl">
                      <h3 className="text-sm font-bold text-foreground mb-4">Sync Statistics</h3>
                      <div className="grid grid-cols-3 gap-4">
                        {[
                          { label: 'Total Items', value: selectedSource.document_count },
                          { label: 'Successful', value: selectedSource.document_count, color: 'text-green-500' },
                          { label: 'Failed', value: 0, color: 'text-red-500' },
                        ].map((stat, i) => (
                          <div key={i} className="p-4 bg-card border border-border rounded-xl">
                            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">{stat.label}</div>
                            <div className={cn("text-xl font-bold", stat.color || "text-foreground")}>{stat.value}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="p-6 bg-accent/30 border border-border rounded-2xl">
                    <h3 className="text-sm font-bold text-foreground mb-4">Source Configuration</h3>
                    <pre className="p-4 bg-card border border-border rounded-xl text-xs font-mono text-foreground overflow-x-auto">
                      {JSON.stringify(selectedSource.config, null, 2)}
                    </pre>
                  </div>
                  </div>

                  <div className="space-y-6">
                    <div className="p-6 bg-accent/30 border border-border rounded-2xl">
                      <h3 className="text-sm font-bold text-foreground mb-4">AI Ingestion Rules</h3>
                      <div className="space-y-4">
                        <div>
                          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-2">Chunk Size (Tokens)</label>
                          <input type="number" defaultValue={500} className="w-full px-4 py-2 bg-card border border-border rounded-xl text-sm" />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-2">Overlap Strategy</label>
                          <select className="w-full px-4 py-2 bg-card border border-border rounded-xl text-sm appearance-none">
                            <option>10% Overlap</option>
                            <option>20% Overlap</option>
                            <option>None</option>
                          </select>
                        </div>
                        <button className="w-full py-2 bg-primary/10 text-primary text-xs font-bold rounded-xl hover:bg-primary/20 transition-all">
                          Update AI Rules
                        </button>
                      </div>
                    </div>

                    <div className="p-6 bg-accent/30 border border-border rounded-2xl">
                      <h3 className="text-sm font-bold text-foreground mb-4">Audit Logs</h3>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Source Created</span>
                          <span className="font-bold">2 days ago</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Manual Sync</span>
                          <span className="font-bold">1 hour ago</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
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
                      <option key={folder.id} value={folder.id}>{folder.name}</option>
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
        {isConnectSourceModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={resetConnectorModal}
              className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    {selectedConnector ? <selectedConnector.icon className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-foreground">
                      {selectedConnector ? `Connect ${selectedConnector.name}` : 'Connect Knowledge Source'}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {selectedConnector ? `Configure your ${selectedConnector.name} integration` : 'Select a connector to begin importing data'}
                    </p>
                  </div>
                </div>
                <button onClick={resetConnectorModal} className="p-2 hover:bg-accent rounded-full transition-colors text-muted-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-8 overflow-y-auto max-h-[60vh] no-scrollbar">
                {!selectedConnector ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {[
                      { id: 'website', name: 'Website Crawler', icon: Globe, color: 'text-blue-500', desc: 'Sync any public URL' },
                      { id: 'file', name: 'Local File', icon: FileText, color: 'text-orange-600', desc: 'Upload PDF, TXT, DOCX' },
                      { id: 'notion', name: 'Notion', icon: Database, color: 'text-zinc-800', desc: 'Sync workspace pages' },
                      { id: 'zendesk', name: 'Zendesk', icon: Share2, color: 'text-green-600', desc: 'Sync support articles' },
                      { id: 'confluence', name: 'Confluence', icon: BookOpen, color: 'text-blue-600', desc: 'Sync team docs' },
                      { id: 'guru', name: 'Guru', icon: Layers, color: 'text-orange-500', desc: 'Sync knowledge cards' },
                    ].map((connector) => (
                      <button 
                        key={connector.id}
                        onClick={() => setSelectedConnector(connector)}
                        className="flex flex-col items-center text-center p-6 bg-accent/20 border border-border rounded-2xl hover:border-primary/50 hover:bg-accent/40 transition-all group cursor-pointer"
                      >
                        <connector.icon className={cn("w-8 h-8 mb-4 transition-transform group-hover:scale-110", connector.color)} />
                        <span className="text-xs font-bold text-foreground mb-1">{connector.name}</span>
                        <span className="text-[10px] text-muted-foreground leading-tight">{connector.desc}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-6">
                    {selectedConnector.id === 'file' && (
                      <div className="space-y-4">
                        <div className="p-8 border-2 border-dashed border-border rounded-2xl flex flex-col items-center justify-center text-center hover:border-primary/50 transition-all cursor-pointer relative group">
                          <input 
                            type="file" 
                            accept=".pdf,.txt,.docx"
                            className="absolute inset-0 opacity-0 cursor-pointer"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                setSelectedFile(file);
                                if (!connectorForm.name) setConnectorForm({ ...connectorForm, name: file.name });
                              }
                            }}
                          />
                          {selectedFile ? (
                            <>
                              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-2">
                                <FileText className="w-6 h-6" />
                              </div>
                              <span className="text-sm font-bold text-foreground">{selectedFile.name}</span>
                              <span className="text-xs text-muted-foreground">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</span>
                            </>
                          ) : (
                            <>
                              <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center text-muted-foreground mb-2 group-hover:text-primary transition-colors">
                                <Upload className="w-6 h-6" />
                              </div>
                              <span className="text-sm font-bold text-foreground">Click or drag to upload</span>
                              <span className="text-xs text-muted-foreground">PDF, TXT, or DOCX up to 50MB</span>
                            </>
                          )}
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Destination Folder</label>
                          <select
                            value={selectedFolderIdForIngestion || ''}
                            onChange={(e) => setSelectedFolderIdForIngestion(e.target.value || null)}
                            className="w-full px-4 py-2 bg-accent/50 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer"
                          >
                            <option value="">Root / Unorganized</option>
                            {folders.map(folder => (
                              <option key={folder.id} value={folder.id}>{folder.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Knowledge Label</label>
                          <input 
                            type="text" 
                            placeholder="e.g. Q4 Financials"
                            value={connectorForm.name || ''}
                            onChange={(e) => setConnectorForm({ ...connectorForm, name: e.target.value })}
                            className="w-full px-4 py-2 bg-accent/50 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                          />
                        </div>
                      </div>
                    )}

                    {selectedConnector.id === 'website' && (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Source Name</label>
                          <input 
                            type="text" 
                            placeholder="Help Center"
                            value={connectorForm.name || ''}
                            onChange={(e) => setConnectorForm({ ...connectorForm, name: e.target.value })}
                            className="w-full px-4 py-2 bg-accent/50 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Base URL</label>
                          <input 
                            type="text" 
                            placeholder="https://docs.example.com"
                            value={connectorForm.url || ''}
                            onChange={(e) => setConnectorForm({ ...connectorForm, url: e.target.value })}
                            className="w-full px-4 py-2 bg-accent/50 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                          />
                        </div>
                      </div>
                    )}

                    {selectedConnector.id === 'notion' && (
                      <div className="space-y-4">
                         <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-xl flex items-start gap-4">
                           <Database className="w-5 h-5 text-orange-500 shrink-0 mt-1" />
                           <div>
                             <h4 className="text-sm font-bold text-orange-500">Notion Integration</h4>
                             <p className="text-xs text-muted-foreground">You'll be redirected to Notion to authorize ResolveAI to access your workspace and select specific databases.</p>
                           </div>
                         </div>
                         <div className="space-y-2">
                           <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Workspace Nickname</label>
                           <input 
                             type="text" 
                             placeholder="Internal Wiki"
                             value={connectorForm.name || ''}
                             onChange={(e) => setConnectorForm({ ...connectorForm, name: e.target.value })}
                             className="w-full px-4 py-2 bg-accent/50 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                           />
                         </div>
                      </div>
                    )}

                    {selectedConnector.id === 'zendesk' && (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Zendesk Subdomain</label>
                          <div className="relative">
                            <input 
                              type="text" 
                              placeholder="company"
                              value={connectorForm.subdomain || ''}
                              onChange={(e) => setConnectorForm({ ...connectorForm, subdomain: e.target.value })}
                              className="w-full px-4 py-2 bg-accent/50 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 pr-32"
                            />
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground italic">.zendesk.com</div>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Admin Email</label>
                          <input 
                            type="email" 
                            placeholder="admin@company.com"
                            value={connectorForm.email || ''}
                            onChange={(e) => setConnectorForm({ ...connectorForm, email: e.target.value })}
                            className="w-full px-4 py-2 bg-accent/50 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">API Token</label>
                          <input 
                            type="password" 
                            placeholder="••••••••••••••••"
                            value={connectorForm.token || ''}
                            onChange={(e) => setConnectorForm({ ...connectorForm, token: e.target.value })}
                            className="w-full px-4 py-2 bg-accent/50 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                          />
                        </div>
                      </div>
                    )}

                    {/* Default fallback for other connectors */}
                    {!['website', 'notion', 'zendesk', 'file'].includes(selectedConnector.id) && (
                      <div className="p-8 text-center space-y-4">
                        <selectedConnector.icon className={cn("w-12 h-12 mx-auto", selectedConnector.color)} />
                        <h4 className="text-sm font-bold text-foreground">Coming Soon</h4>
                        <p className="text-xs text-muted-foreground">The {selectedConnector.name} connector is currently in early access. Contact support to enable it for your workspace.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="p-6 bg-accent/30 border-t border-border flex justify-between items-center">
                {selectedConnector ? (
                  <button 
                    onClick={() => setSelectedConnector(null)}
                    className="text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Back to connectors
                  </button>
                ) : (
                  <div />
                )}
                
                <div className="flex gap-3">
                  <button 
                    onClick={resetConnectorModal}
                    className="px-6 py-2 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Cancel
                  </button>
                  {selectedConnector && ['website', 'notion', 'zendesk', 'file'].includes(selectedConnector.id) && (
                    <button 
                      onClick={async () => {
                        if (selectedConnector.id === 'notion') {
                          // Redirect to Notion OAuth
                          window.location.href = api.knowledge.notion.authorizeUrl(workspaceId);
                          return;
                        }
                        
                        setIsConnecting(true);
                        try {
                          const newSource = await api.knowledge.sources.create(workspaceId, {
                            name: connectorForm.name || selectedConnector.name,
                            type: selectedConnector.id,
                            config: connectorForm,
                            settings: {}
                          });
                          
                          setSources([newSource, ...sources]);
                          resetConnectorModal();
                          
                          if (selectedConnector.id === 'file' && selectedFile) {
                            toast('File Accepted', `${selectedFile.name} is being processed in the background.`, 'success');
                            
                            const uploadResult = await api.knowledge.sources.uploadFile(
                              workspaceId, 
                              newSource.id, 
                              selectedFile,
                              selectedFolderIdForIngestion || undefined
                            );
                            
                            // Immediately add the new document to local state so it shows up
                            if (uploadResult && uploadResult.id) {
                              setDocuments(prev => [{
                                id: uploadResult.id,
                                title: uploadResult.title || selectedFile.name,
                                status: 'pending',
                                type: 'file',
                                source_id: newSource.id,
                                folder_ids: selectedFolderIdForIngestion ? [selectedFolderIdForIngestion] : [],
                                created_at: new Date().toISOString(),
                              } as any, ...prev]);
                            }
                            
                            // Also do a full refresh to get exact server state
                            await fetchData(true);
                            setSelectedFolderIdForIngestion(null);
                          } else {
                            toast('Source Connected', `${newSource.name} has been linked successfully.`, 'success');
                          }
                        } catch (error) {
                          console.error('Failed to connect source:', error);
                          toast('Connection Failed', (error as any).message, 'error');
                        } finally {
                          setIsConnecting(false);
                        }
                      }}
                      disabled={isConnecting || (selectedConnector.id === 'file' && !selectedFile)}
                      className="px-6 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:opacity-90 transition-all shadow-lg shadow-primary/20 flex items-center gap-2 disabled:opacity-50"
                    >
                      {isConnecting ? 'Connecting...' : 
                       selectedConnector.id === 'file' ? 'Upload & Index' : 
                       `Connect ${selectedConnector.name}`}
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isMoveModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-border flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold">Move to Folder</h3>
                  <p className="text-xs text-muted-foreground">Select a destination for this item</p>
                </div>
                <button onClick={() => setIsMoveModalOpen(false)} className="p-2 hover:bg-accent rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="space-y-2">
                  <div className="space-y-1 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                    <button 
                      onClick={() => handleMoveItem(movingItemId!, null)}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-accent transition-all text-sm group"
                    >
                      <Database className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      <div className="flex flex-col items-start">
                        <span className="font-bold">Root Directory</span>
                        <span className="text-[10px] text-muted-foreground lowercase opacity-60">Unorganized items</span>
                      </div>
                    </button>
                    {folders.map(folder => (
                      <button 
                        key={folder.id}
                        disabled={folder.id === movingItemId}
                        onClick={() => handleMoveItem(movingItemId!, folder.id)}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-accent transition-all text-sm group disabled:opacity-30"
                      >
                        <Folder className="w-4 h-4 text-yellow-500 group-hover:scale-110 transition-transform" />
                        <div className="flex flex-col items-start">
                          <span className="font-bold">{folder.name}</span>
                          <span className="text-[10px] text-muted-foreground lowercase opacity-60">Folder</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="p-6 bg-accent/30 border-t border-border flex justify-end">
                <button 
                  onClick={() => setIsMoveModalOpen(false)}
                  className="px-6 py-2 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isDeleteModalOpen && itemToDelete && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-background/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-sm bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 text-center">
                <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 mx-auto mb-4">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">Confirm Deletion</h3>
                <p className="text-sm text-muted-foreground">
                  Are you sure you want to delete <span className="font-bold text-foreground">"{itemToDelete.title}"</span>? 
                  {itemToDelete.type === 'source' ? " This will disconnect the connector and remove all synced documents." : " This action cannot be undone."}
                </p>
              </div>
              <div className="p-6 bg-accent/30 flex gap-3">
                <button 
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="flex-1 py-2 text-sm font-bold bg-secondary hover:bg-secondary/80 text-foreground rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmDelete}
                  className="flex-1 py-2 text-sm font-bold bg-red-500 hover:bg-red-600 text-white rounded-xl transition-all shadow-lg shadow-red-500/20"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
