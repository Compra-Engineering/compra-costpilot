import { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { ChatView } from './components/ChatView';
import { CostDashboard } from './components/CostDashboard';
import { MultiModelPlayground } from './components/MultiModelPlayground';
import { CompressionPanel } from './components/CompressionPanel';
import { ApiKeyModal } from './components/ApiKeyModal';
import { ArtifactPanel } from './components/ArtifactPanel';
import { useConversations } from './hooks/useConversations';
import { useChat } from './hooks/useChat';
import { useCompression } from './hooks/useCompression';
import type { ModelId } from './types';
import type { Artifact } from './utils/artifactParser';
import { AlertCircle } from 'lucide-react';

export default function App() {
  const conversationHook = useConversations();
  const {
    apiKey,
    saveApiKey,
    sendMessage,
    isTyping,
    isThinking,
    error: chatError,
    setError: setChatError,
    thinkingEnabled,
    setThinkingEnabled
  } = useChat(conversationHook);

  const {
    isCompressing,
    compressionProgress,
    compressionError,
    showCompressionPanel,
    setShowCompressionPanel,
    compressContext,
    undoCompression,
  } = useCompression(conversationHook, apiKey);

  const [selectedModel, setSelectedModel] = useState<ModelId>('claude-haiku-4.5');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCostDashboardOpen, setIsCostDashboardOpen] = useState(false);
  const [isPlaygroundOpen, setIsPlaygroundOpen] = useState(false);
  const [showApiModal, setShowApiModal] = useState(!apiKey);
  const [activeArtifact, setActiveArtifact] = useState<Artifact | null>(null);

  const activeConversation = conversationHook.getActiveConversation();

  // Create conversation if starting a new one
  const handleSendMessage = (content: string, attachments: any[]) => {
    if (!activeConversation) {
      const newId = conversationHook.createConversation(selectedModel);
      sendMessage(content, attachments, { id: newId, model: selectedModel, messages: [] });
    } else {
      sendMessage(content, attachments);
    }
  };

  const handleNewChat = () => {
    conversationHook.setActiveId(null);
    setActiveArtifact(null);
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  };

  const handleToggleSidebar = () => {
    setIsSidebarOpen(prev => !prev);
  };

  const handleSelectConversation = (id: string) => {
    conversationHook.setActiveId(id);
    setActiveArtifact(null);
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  };

  const handleApiModalSave = async (key: string) => {
    saveApiKey(key);
    setShowApiModal(false);
    return true;
  };

  const handleClearApiKey = () => {
    localStorage.removeItem('compra-ai-api-key');
    saveApiKey('');
    setShowApiModal(true);
    setIsSidebarOpen(false);
  };

  const handleForkFromMessage = (messageIndex: number) => {
    if (!activeConversation) return;
    conversationHook.forkConversation(activeConversation.id, messageIndex);
    setActiveArtifact(null);
  };

  const handleToggleMessageContext = (messageId: string) => {
    if (!activeConversation) return;
    conversationHook.toggleMessageContext(activeConversation.id, messageId);
  };

  const handleOpenArtifact = (artifact: Artifact) => {
    setActiveArtifact(artifact);
  };

  const handleCloseArtifact = () => {
    setActiveArtifact(null);
  };

  const handleOpenCompressionPanel = () => {
    if (!isTyping) {
      setShowCompressionPanel(true);
    }
  };

  const handleCompressContext = (model: ModelId, keepRecent: number) => {
    if (activeConversation) {
      compressContext(activeConversation, model, keepRecent);
    }
  };

  const handleUndoCompression = () => {
    if (activeConversation) {
      undoCompression(activeConversation.id);
    }
  };

  return (
    <div className="flex h-screen w-full bg-[var(--bg-primary)] overflow-hidden">

      {showApiModal && (
        <ApiKeyModal onSave={handleApiModalSave} />
      )}

      <Sidebar
        conversations={conversationHook.conversations}
        activeId={conversationHook.activeId}
        onSelect={handleSelectConversation}
        onNew={handleNewChat}
        isOpen={isSidebarOpen}
        onToggle={handleToggleSidebar}
        onOpenCostDashboard={() => {
          setIsCostDashboardOpen(true);
          if (window.innerWidth < 768) setIsSidebarOpen(false);
        }}
        onOpenPlayground={() => {
          setIsPlaygroundOpen(true);
          if (window.innerWidth < 768) setIsSidebarOpen(false);
        }}
        onClearKey={handleClearApiKey}
      />

      <main className={`flex-1 flex flex-col h-full relative overflow-hidden transition-all duration-300 ${activeArtifact ? 'md:w-1/2 md:flex-none' : ''}`}>
        {/* Global Error Banner */}
        {chatError && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-slide-in-up w-max max-w-[90%]">
            <AlertCircle size={20} className="flex-shrink-0" />
            <div className="text-sm">
              <span className="font-semibold block mb-0.5">Error processing request</span>
              {chatError}
            </div>
            <button
              onClick={() => setChatError(null)}
              className="ml-4 text-red-400 hover:text-red-600"
            >
              Close
            </button>
          </div>
        )}

        <ChatView
          conversation={activeConversation}
          onSendMessage={handleSendMessage}
          selectedModel={selectedModel}
          onSelectModel={setSelectedModel}
          isTyping={isTyping}
          isThinking={isThinking}
          disabled={!apiKey}
          onToggleSidebar={handleToggleSidebar}
          onOpenArtifact={handleOpenArtifact}
          activeArtifactId={activeArtifact?.id ?? null}
          thinkingEnabled={thinkingEnabled}
          onToggleThinking={setThinkingEnabled}
          onForkFromMessage={handleForkFromMessage}
          onToggleMessageContext={handleToggleMessageContext}
          onOpenCompressionPanel={handleOpenCompressionPanel}
          onUndoCompression={handleUndoCompression}
        />
      </main>

      {activeArtifact && (
        <ArtifactPanel
          artifact={activeArtifact}
          onClose={handleCloseArtifact}
        />
      )}

      <CostDashboard
        conversations={conversationHook.conversations}
        isOpen={isCostDashboardOpen}
        onClose={() => setIsCostDashboardOpen(false)}
      />

      <MultiModelPlayground
        isOpen={isPlaygroundOpen}
        onClose={() => setIsPlaygroundOpen(false)}
        apiKey={apiKey}
      />

      {activeConversation && (
        <CompressionPanel
          conversation={activeConversation}
          isOpen={showCompressionPanel}
          onClose={() => setShowCompressionPanel(false)}
          onCompress={handleCompressContext}
          isCompressing={isCompressing}
          compressionProgress={compressionProgress}
          compressionError={compressionError}
        />
      )}
    </div>
  );
}
