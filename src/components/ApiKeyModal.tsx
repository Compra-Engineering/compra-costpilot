import React, { useState } from 'react';
import { Loader2, KeyRound } from 'lucide-react';

interface ApiKeyModalProps {
  onSave: (key: string) => Promise<boolean>;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ onSave }) => {
  const [apiKey, setApiKey] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!apiKey.trim().startsWith('sk-ant-')) {
      setError('Key must start with "sk-ant-"');
      return;
    }

    setIsValidating(true);
    setError(null);

    try {
      const isValid = await onSave(apiKey.trim());
      if (!isValid) {
        setError('Invalid API key. Please try again.');
      }
    } catch {
      setError('Connection failed. Is the proxy running?');
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#f4f1ec]/80 backdrop-blur-sm">
      <div className="w-full max-w-[400px] bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-gray-100 p-8 sm:p-10 animate-fade-in flex flex-col items-center">
        
        <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-6 border border-gray-100 text-gray-700">
          <KeyRound size={20} strokeWidth={2} />
        </div>

        <div className="text-center mb-8 w-full">
          <h1 className="text-[22px] font-semibold text-gray-900 tracking-tight">
            Welcome to Compra
          </h1>
          <p className="text-gray-500 text-[14px] mt-2 leading-relaxed">
            Enter your Anthropic API key to continue.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col w-full">
          <div className="relative mb-6">
            <input
              type="password"
              value={apiKey}
              onChange={(e) => {
                setApiKey(e.target.value);
                if (error) setError(null);
              }}
              disabled={isValidating}
              placeholder="sk-ant-..."
              className={`
                w-full bg-[#fafafa] border ${error ? 'border-red-300 focus:border-red-400 focus:ring-red-100' : 'border-gray-200 focus:border-gray-400 hover:border-gray-300'}
                rounded-xl px-4 py-3 text-[14px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:bg-white focus:ring-4 focus:ring-gray-100 transition-all font-mono
              `}
              autoComplete="off"
              spellCheck={false}
            />
            {error && (
              <p className="absolute -bottom-6 left-1 text-red-500 text-[12px] font-medium">
                {error}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={!apiKey.trim() || isValidating}
            className="w-full bg-[#1a1a1a] hover:bg-[#333333] disabled:bg-gray-100 disabled:text-gray-400 text-white rounded-xl py-3 font-medium text-[14px] transition-all flex items-center justify-center gap-2"
          >
            {isValidating ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              'Save Key'
            )}
          </button>
        </form>

        <div className="mt-8 text-center space-y-1 w-full">
          <p className="text-[12px] text-gray-400">
            Stored securely on your device.
          </p>
          <a
            href="https://console.anthropic.com/settings/keys"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[12px] text-gray-500 hover:text-gray-900 transition-colors inline-block"
          >
            Get an API key
          </a>
        </div>

      </div>
    </div>
  );
};
