import React from 'react';
import type { Conversation } from '../types';
import { Plus, MessageSquare, X, LogOut, BarChart3, FlaskConical } from 'lucide-react';
import { formatCost } from '../utils/tokenCounter';

interface SidebarProps {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  isOpen: boolean;
  onToggle: () => void;
  onOpenCostDashboard: () => void;
  onOpenPlayground: () => void;
  onClearKey: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  conversations, activeId, onSelect, onNew,
  isOpen, onToggle, onOpenCostDashboard, onOpenPlayground, onClearKey
}) => {
  const today = new Date().setHours(0,0,0,0);
  const yesterday = today - 86400000;

  const grouped = conversations.reduce((acc, conv) => {
    const date = new Date(conv.updatedAt).setHours(0,0,0,0);
    if (date === today) acc.today.push(conv);
    else if (date === yesterday) acc.yesterday.push(conv);
    else acc.older.push(conv);
    return acc;
  }, { today: [] as Conversation[], yesterday: [] as Conversation[], older: [] as Conversation[] });

  const renderGroup = (label: string, items: Conversation[]) => {
    if (items.length === 0) return null;
    return (
      <div className="mb-2">
        <p className="px-3 py-1.5 text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-widest">{label}</p>
        {items.map(conv => (
          <button
            key={conv.id}
            onClick={() => onSelect(conv.id)}
            className={`
              w-full text-left px-3 py-2 rounded-lg flex items-center gap-2.5 transition-all group text-[13.5px] mb-0.5
              ${conv.id === activeId
                ? 'bg-white text-[var(--text-primary)] shadow-sm font-medium'
                : 'text-[var(--text-secondary)] hover:bg-white/60 hover:text-[var(--text-primary)]'
              }
            `}
          >
            <MessageSquare size={14} className={conv.id === activeId ? 'text-[var(--compra-orange)] shrink-0' : 'text-[var(--text-tertiary)] shrink-0'} />
            <span className="truncate flex-1">{conv.title}</span>
            {conv.totalCost > 0 && (
              <span className={`text-[10px] font-mono shrink-0 ${conv.id === activeId ? 'text-[var(--compra-orange)]' : 'text-[var(--text-tertiary)]'}`}>
                {formatCost(conv.totalCost)}
              </span>
            )}
          </button>
        ))}
      </div>
    );
  };

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black/20 z-40 md:hidden animate-fade-in" onClick={onToggle} />
      )}

      <aside className={`
        fixed md:static inset-y-0 left-0 z-50
        flex flex-col w-[var(--sidebar-width)] h-full
        bg-[var(--bg-sidebar)] border-r border-[var(--border-light)] transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Logo + Close */}
        <div className="p-4 pb-2 flex items-center justify-between">
          <span className="font-semibold text-[15px] text-[var(--text-primary)] tracking-tight">CostPilot</span>
          <button onClick={onToggle} className="p-1.5 md:hidden text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-white/60 rounded-lg transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* New Chat */}
        <div className="px-3 pb-3">
          <button
            onClick={onNew}
            className="w-full flex items-center gap-2 bg-white px-3.5 py-2 rounded-lg text-[13.5px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] shadow-sm hover:shadow transition-all border border-[var(--border-light)]"
          >
            <Plus size={15} />
            New chat
          </button>
        </div>

        {/* Conversations */}
        <div className="flex-1 overflow-y-auto px-2 pb-3">
          {conversations.length === 0 ? (
            <div className="text-center text-[13px] text-[var(--text-tertiary)] mt-16 px-6 leading-relaxed">
              No conversations yet.<br />Start a new chat to begin.
            </div>
          ) : (
            <>
              {renderGroup('Today', grouped.today)}
              {renderGroup('Yesterday', grouped.yesterday)}
              {renderGroup('Previous', grouped.older)}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-2 space-y-0.5">
          <button onClick={onOpenCostDashboard}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] text-[var(--text-secondary)] hover:bg-white/60 hover:text-[var(--text-primary)] transition-colors"
          >
            <BarChart3 size={15} /> Cost Dashboard
          </button>
          <button onClick={onOpenPlayground}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] text-[var(--text-secondary)] hover:bg-white/60 hover:text-[var(--text-primary)] transition-colors"
          >
            <FlaskConical size={15} /> Playground
          </button>
          <button onClick={onClearKey}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] text-[var(--text-secondary)] hover:bg-white/60 hover:text-[var(--text-primary)] transition-colors"
          >
            <LogOut size={15} /> Clear API Key
          </button>
        </div>
      </aside>
    </>
  );
};
