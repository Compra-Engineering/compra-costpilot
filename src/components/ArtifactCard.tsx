import React from 'react';
import { FileText, Code, Table, Globe } from 'lucide-react';
import type { Artifact } from '../utils/artifactParser';

interface ArtifactCardProps {
  artifact: Artifact;
  isActive: boolean;
  onClick: () => void;
}

const TYPE_CONFIG: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  document: { icon: FileText, label: 'Document', color: 'text-blue-600' },
  code: { icon: Code, label: 'Code', color: 'text-emerald-600' },
  csv: { icon: Table, label: 'CSV Data', color: 'text-amber-600' },
  html: { icon: Globe, label: 'HTML', color: 'text-purple-600' },
};

export const ArtifactCard: React.FC<ArtifactCardProps> = ({ artifact, isActive, onClick }) => {
  const config = TYPE_CONFIG[artifact.type] || TYPE_CONFIG.document;
  const Icon = config.icon;

  return (
    <button
      onClick={onClick}
      className={`w-full text-left my-3 p-3.5 rounded-xl border transition-all duration-150 cursor-pointer group
        ${isActive
          ? 'border-[var(--compra-orange)] bg-[var(--compra-orange-light)] shadow-sm'
          : 'border-[var(--border-light)] bg-[var(--bg-primary)] hover:border-[var(--border-medium)] hover:shadow-sm'
        }`}
    >
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
          isActive ? 'bg-[var(--compra-orange)] bg-opacity-10' : 'bg-white border border-[var(--border-light)]'
        }`}>
          <Icon size={18} className={config.color} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13.5px] font-medium text-[var(--text-primary)] truncate">
            {artifact.title}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[11px] text-[var(--text-tertiary)] font-medium uppercase tracking-wider">
              {config.label}
            </span>
            {artifact.language && (
              <>
                <span className="text-[var(--border-medium)]">&middot;</span>
                <span className="text-[11px] text-[var(--text-tertiary)] font-mono">
                  {artifact.language}
                </span>
              </>
            )}
          </div>
        </div>
        <svg
          className={`w-4 h-4 shrink-0 transition-transform ${isActive ? 'text-[var(--compra-orange)]' : 'text-[var(--text-tertiary)] group-hover:translate-x-0.5'}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </button>
  );
};
