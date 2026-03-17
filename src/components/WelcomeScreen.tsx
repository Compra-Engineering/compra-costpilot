import React from 'react';
import { Database, FileText, Calculator, ArrowUpRight } from 'lucide-react';
import type { ModelId } from '../types';

interface WelcomeScreenProps {
  onSelectModel: (model: ModelId) => void;
  selectedModel: ModelId;
  onSuggestionClick: (suggestion: string) => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onSuggestionClick }) => {
  const suggestions = [
    {
      icon: <Database size={18} />,
      color: '#059669',
      title: 'Analyze Survey Data',
      description: 'Upload a CSV and get cost estimates for trend analysis',
      prompt: 'I have survey data I need analyzed. Can you help me extract the top 3 trends?'
    },
    {
      icon: <FileText size={18} />,
      color: '#D97706',
      title: 'Draft a Report',
      description: 'Generate a summary report and see what it costs',
      prompt: 'Draft a 1-page executive summary based on user feedback about our new onboarding flow.'
    },
    {
      icon: <Calculator size={18} />,
      color: '#FE3C00',
      title: 'Estimate Usage',
      description: 'Calculate how much a Claude API call will cost',
      prompt: 'If I send a 50,000 word document and ask for a 500 word summary using Opus, how much will it cost?'
    }
  ];

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 overflow-y-auto">
      <div className="w-full max-w-[600px] flex flex-col items-center animate-slide-up">
        
        {/* Logo */}
        <div className="mb-10 text-center">
          <h1 className="text-[28px] font-semibold text-[var(--text-primary)] tracking-tight mb-2">
            CostPilot
          </h1>
          <p className="text-[var(--text-secondary)] text-[15px] leading-relaxed max-w-md">
            Test prompts, analyze data, and see exactly what Claude API calls cost — in real time.
          </p>
        </div>

        {/* Suggestion Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full">
          {suggestions.map((s, i) => (
            <button
              key={i}
              onClick={() => onSuggestionClick(s.prompt)}
              className="group text-left p-4 rounded-2xl border border-[var(--border-light)] bg-[var(--bg-primary)] hover:bg-white hover:shadow-md hover:border-[var(--border-medium)] transition-all duration-200 flex flex-col h-full relative cursor-pointer"
            >
              <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-3" style={{ background: `${s.color}10`, color: s.color }}>
                {s.icon}
              </div>
              <h3 className="text-[13.5px] font-semibold text-[var(--text-primary)] mb-1 flex items-center gap-1">
                {s.title}
                <ArrowUpRight size={12} className="opacity-0 group-hover:opacity-60 transition-opacity -translate-y-px" />
              </h3>
              <p className="text-[12.5px] text-[var(--text-secondary)] leading-relaxed flex-1">
                {s.description}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
