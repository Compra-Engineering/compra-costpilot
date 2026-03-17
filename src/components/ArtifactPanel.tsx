import React, { useState, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { X, Copy, Check, Download, FileText, Code, Table, Globe } from 'lucide-react';
import type { Artifact } from '../utils/artifactParser';
import { downloadArtifact } from '../utils/artifactDownload';

interface ArtifactPanelProps {
  artifact: Artifact;
  onClose: () => void;
}

const TYPE_CONFIG: Record<string, { icon: React.ElementType; label: string; color: string; bg: string }> = {
  document: { icon: FileText, label: 'Document', color: 'text-blue-600', bg: 'bg-blue-50' },
  code: { icon: Code, label: 'Code', color: 'text-emerald-600', bg: 'bg-emerald-50' },
  csv: { icon: Table, label: 'CSV Data', color: 'text-amber-600', bg: 'bg-amber-50' },
  html: { icon: Globe, label: 'HTML', color: 'text-purple-600', bg: 'bg-purple-50' },
};

function CsvTable({ content }: { content: string }) {
  const rows = useMemo(() => {
    return content
      .trim()
      .split('\n')
      .map(row => row.split(',').map(cell => cell.trim().replace(/^"|"$/g, '')));
  }, [content]);

  if (rows.length === 0) return null;

  const [header, ...body] = rows;

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr>
            {header.map((cell, i) => (
              <th key={i} className="text-left px-3 py-2.5 bg-[var(--bg-primary)] border border-[var(--border-light)] font-semibold text-[var(--text-primary)]">
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((row, ri) => (
            <tr key={ri} className="hover:bg-[var(--bg-primary)]/50">
              {row.map((cell, ci) => (
                <td key={ci} className="px-3 py-2 border border-[var(--border-light)] text-[var(--text-secondary)]">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export const ArtifactPanel: React.FC<ArtifactPanelProps> = ({ artifact, onClose }) => {
  const [copied, setCopied] = useState(false);
  const config = TYPE_CONFIG[artifact.type] || TYPE_CONFIG.document;
  const Icon = config.icon;

  const handleCopy = () => {
    navigator.clipboard.writeText(artifact.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    downloadArtifact(artifact);
  };

  const renderContent = () => {
    switch (artifact.type) {
      case 'code':
        return (
          <div className="markdown-content">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeHighlight]}
            >
              {`\`\`\`${artifact.language || ''}\n${artifact.content}\n\`\`\``}
            </ReactMarkdown>
          </div>
        );
      case 'document':
        return (
          <div className="markdown-content">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeHighlight]}
            >
              {artifact.content}
            </ReactMarkdown>
          </div>
        );
      case 'csv':
        return <CsvTable content={artifact.content} />;
      case 'html':
        return (
          <iframe
            srcDoc={artifact.content}
            sandbox="allow-scripts"
            className="w-full h-full min-h-[400px] border-0 rounded-lg bg-white"
            title={artifact.title}
          />
        );
      default:
        return (
          <pre className="whitespace-pre-wrap text-[13px] font-mono text-[var(--text-secondary)]">
            {artifact.content}
          </pre>
        );
    }
  };

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40 md:hidden"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed inset-0 z-50 md:static md:z-auto md:w-1/2 flex flex-col bg-white border-l border-[var(--border-light)] animate-slide-in-panel">
        {/* Header */}
        <div className="h-12 flex items-center justify-between px-4 border-b border-[var(--border-light)] shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`w-6 h-6 rounded flex items-center justify-center ${config.bg}`}>
              <Icon size={14} className={config.color} />
            </div>
            <h3 className="text-[13.5px] font-medium text-[var(--text-primary)] truncate">
              {artifact.title}
            </h3>
            <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-tertiary)] bg-[var(--bg-primary)] px-2 py-0.5 rounded-full shrink-0">
              {config.label}
              {artifact.language ? ` \u00b7 ${artifact.language}` : ''}
            </span>
          </div>
          <div className="flex items-center gap-1 shrink-0 ml-2">
            <button
              onClick={handleCopy}
              className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-primary)] transition-colors"
              title="Copy content"
            >
              {copied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
            </button>
            <button
              onClick={handleDownload}
              className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-primary)] transition-colors"
              title="Download"
            >
              <Download size={16} />
            </button>
            <div className="w-px h-5 bg-[var(--border-light)] mx-1" />
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-primary)] transition-colors"
              title="Close panel"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {renderContent()}
        </div>
      </div>
    </>
  );
};
