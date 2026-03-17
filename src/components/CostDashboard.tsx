import React from 'react';
import type { Conversation } from '../types';
import { X, Download, BarChart3, Database, HardDrive, Calculator } from 'lucide-react';
import { formatCost } from '../utils/tokenCounter';
import { MODEL_CONFIGS } from '../types';

interface CostDashboardProps {
  conversations: Conversation[];
  isOpen: boolean;
  onClose: () => void;
}

export const CostDashboard: React.FC<CostDashboardProps> = ({ conversations, isOpen, onClose }) => {
  if (!isOpen) return null;

  // Aggregate stats
  const totalCost = conversations.reduce((sum, c) => sum + c.totalCost, 0);
  const totalInputTokens = conversations.reduce((sum, c) => sum + c.totalInputTokens, 0);
  const totalOutputTokens = conversations.reduce((sum, c) => sum + c.totalOutputTokens, 0);
  
  const handleExportCSV = () => {
    let csv = 'Conversation ID,Title,Model,Date,Input Tokens,Output Tokens,Total Cost (USD)\n';
    
    conversations.forEach(c => {
      const date = new Date(c.createdAt).toISOString();
      // Escape commas in title
      const title = `"${c.title.replace(/"/g, '""')}"`;
      csv += `${c.id},${title},${c.model},${date},${c.totalInputTokens},${c.totalOutputTokens},${c.totalCost.toFixed(6)}\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `compra-ai-costs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-[100] flex animate-fade-in bg-black/40 backdrop-blur-sm">
      <div className="flex-1" onClick={onClose} />
      
      <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col animate-slide-in-right transform origin-right">
        {/* Header */}
        <div className="px-6 py-5 border-b border-[var(--border-light)] flex justify-between items-center bg-white">
          <div className="flex items-center gap-3">
            <div className="bg-[var(--compra-orange-light)] text-[var(--compra-orange)] p-2 rounded-lg">
              <BarChart3 size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[var(--text-primary)] leading-tight">Cost Analytics</h2>
              <p className="text-sm text-[var(--text-secondary)]">Session usage and cost estimates</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-200 text-gray-500 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30">
          
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-white p-5 rounded-xl border border-[var(--border-light)] shadow-sm relative overflow-hidden">
              <div className="absolute -right-4 -bottom-4 text-[var(--compra-orange-light)]">
                <Calculator size={80} strokeWidth={1} />
              </div>
              <p className="text-sm text-[var(--text-secondary)] font-medium mb-1 relative z-10">Total Session Cost</p>
              <h3 className="text-3xl font-bold text-[var(--compra-orange)] relative z-10">
                {formatCost(totalCost)}
              </h3>
            </div>
            
            <div className="bg-white p-5 rounded-xl border border-[var(--border-light)] shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <Database size={14} className="text-gray-400" />
                <p className="text-sm text-[var(--text-secondary)] font-medium">Input Tokens</p>
              </div>
              <h3 className="text-2xl font-bold text-gray-800">
                {totalInputTokens.toLocaleString()}
              </h3>
            </div>
            
            <div className="bg-white p-5 rounded-xl border border-[var(--border-light)] shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <HardDrive size={14} className="text-gray-400" />
                <p className="text-sm text-[var(--text-secondary)] font-medium">Output Tokens</p>
              </div>
              <h3 className="text-2xl font-bold text-gray-800">
                {totalOutputTokens.toLocaleString()}
              </h3>
            </div>
          </div>

          <div className="flex justify-between items-end mb-4 pr-1">
            <h3 className="text-base font-bold text-gray-800">Conversation Breakdown</h3>
            <button 
              onClick={handleExportCSV}
              disabled={conversations.length === 0}
              className="flex items-center gap-2 text-sm text-[var(--compra-orange)] hover:bg-[var(--compra-orange-light)] px-3 py-1.5 rounded-md transition-colors disabled:opacity-50"
            >
              <Download size={14} />
              Export CSV
            </button>
          </div>

          {/* Detailed Table */}
          <div className="bg-white border border-[var(--border-light)] rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-[#f4f1ec] text-gray-600 uppercase text-xs font-semibold border-b border-[var(--border-light)]">
                  <tr>
                    <th className="px-4 py-3 min-w-[200px]">Conversation</th>
                    <th className="px-4 py-3">Model</th>
                    <th className="px-4 py-3 text-right">Tokens</th>
                    <th className="px-4 py-3 text-right text-[var(--compra-orange)]">Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-light)]">
                  {conversations.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                        No conversations yet
                      </td>
                    </tr>
                  ) : (
                    conversations.map(conv => (
                      <tr key={conv.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-gray-900 max-w-[200px] truncate" title={conv.title}>
                          {conv.title}
                          <div className="text-[10px] text-gray-400 mt-0.5 font-normal">
                            {new Date(conv.updatedAt).toLocaleString()}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {MODEL_CONFIGS[conv.model].displayName}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-500 font-mono text-xs">
                          <div className="flex flex-col gap-0.5 items-end">
                            <span className="flex items-center gap-1.5" title="Input Tokens">
                              <Database size={10} className="text-gray-400" /> {conv.totalInputTokens.toLocaleString()}
                            </span>
                            <span className="flex items-center gap-1.5 text-gray-400" title="Output Tokens">
                              <HardDrive size={10} className="text-gray-300" /> {conv.totalOutputTokens.toLocaleString()}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-medium font-mono">
                          {formatCost(conv.totalCost)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          
          <div className="mt-8 bg-[#FAFAFA] border border-[var(--border-light)] p-4 rounded-xl text-sm text-gray-600 flex gap-3">
            <div className="mt-0.5 text-[var(--compra-orange)]">
              <Calculator size={16} />
            </div>
            <div>
              <p className="font-semibold mb-1 text-gray-800">How to estimate survey report costs:</p>
              <p className="mb-2">1. Upload your CSV data (input tokens)</p>
              <p className="mb-2">2. Ask for a specific summary format (output tokens)</p>
              <p>3. Check the calculated cost here to estimate full-scale production expenses.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
