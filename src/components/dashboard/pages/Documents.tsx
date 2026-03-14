import React, { useState } from 'react';
import { Upload, FileText, X, CheckCircle2, RefreshCw, MoreVertical } from 'lucide-react';
import { cn } from '@/src/lib/utils';

interface Document {
  id: string;
  name: string;
  status: 'indexed' | 'indexing' | 'error';
  chunks: number;
  size: string;
}

const initialDocuments: Document[] = [
  {
    id: '1',
    name: 'Terms_of_Service_2024.pdf',
    status: 'indexed',
    chunks: 124,
    size: '1.2 MB'
  },
  {
    id: '2',
    name: 'Privacy_Policy.docx',
    status: 'indexed',
    chunks: 85,
    size: '0.8 MB'
  },
  {
    id: '3',
    name: 'Product_Manual_v2.txt',
    status: 'indexing',
    chunks: 0,
    size: '0.4 MB'
  }
];

export const Documents = () => {
  const [documents, setDocuments] = useState(initialDocuments);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    // Handle file drop logic here
  };

  return (
    <div className="flex flex-col h-full w-full bg-background p-8 overflow-y-auto no-scrollbar">
      <div className="max-w-6xl w-full mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Documents</h1>
          <p className="text-muted-foreground">Upload and manage documents for AI knowledge.</p>
        </div>

        {/* Drag and Drop Uploader */}
        <div 
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            "border-2 border-dashed rounded-3xl p-12 flex flex-col items-center justify-center text-center transition-all duration-300",
            isDragging ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/50"
          )}
        >
          <div className="w-16 h-16 bg-accent/50 rounded-2xl flex items-center justify-center mb-4">
            <Upload className={cn("w-8 h-8 transition-colors", isDragging ? "text-primary" : "text-muted-foreground")} />
          </div>
          <h3 className="text-lg font-bold text-foreground mb-1">Click or drag files to upload</h3>
          <p className="text-sm text-muted-foreground mb-6">Support for PDF, DOCX, and TXT (Max 10MB)</p>
          <button className="px-6 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:opacity-90 transition-all btn-press shadow-lg shadow-primary/20">
            Select Files
          </button>
        </div>

        {/* Document List */}
        <div className="grid gap-4">
          <div className="flex items-center justify-between px-4">
            <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Uploaded Documents</h4>
            <span className="text-[10px] text-muted-foreground">{documents.length} Files Total</span>
          </div>

          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-accent/50">
                  <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">File Name</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Indexing Status</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Chunk Count</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Size</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest"></th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => (
                  <tr key={doc.id} className="border-b border-border hover:bg-accent transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <FileText className="w-4 h-4 text-primary" />
                        <span className="text-sm font-bold text-foreground">{doc.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className={cn(
                        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                        doc.status === 'indexed' ? "bg-green-500/10 text-green-500 border border-green-500/20" : 
                        doc.status === 'indexing' ? "bg-blue-500/10 text-blue-500 border border-blue-500/20" : 
                        "bg-red-500/10 text-red-500 border border-red-500/20"
                      )}>
                        {doc.status === 'indexing' && <RefreshCw className="w-3 h-3 animate-spin" />}
                        {doc.status}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{doc.chunks || '-'}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{doc.size}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="p-2 hover:bg-accent rounded-lg text-muted-foreground hover:text-foreground transition-colors btn-press">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                        <button className="p-2 hover:bg-red-500/10 rounded-lg text-muted-foreground hover:text-red-500 transition-colors btn-press">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
