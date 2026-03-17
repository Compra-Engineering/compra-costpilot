const fs = require('fs');

const filesToUpdate = [
  { path: 'src/components/Sidebar.tsx', oldStr: "import { Conversation, ModelId } from '../types';", newStr: "import type { Conversation, ModelId } from '../types';" },
  { path: 'src/components/ChatView.tsx', oldStr: "import { Conversation, ModelId, FileAttachment } from '../types';", newStr: "import type { Conversation, ModelId, FileAttachment } from '../types';" },
  { path: 'src/components/CostDashboard.tsx', oldStr: "import { Conversation } from '../types';", newStr: "import type { Conversation } from '../types';" },
  { path: 'src/components/MessageBubble.tsx', oldStr: "import { Message, CostBreakdown } from '../types';", newStr: "import type { Message, CostBreakdown } from '../types';" },
  { path: 'src/components/MessageInput.tsx', oldStr: "import { FileAttachment } from '../types';", newStr: "import type { FileAttachment } from '../types';" },
  { path: 'src/components/ModelSelector.tsx', oldStr: "import { ModelId, MODEL_CONFIGS } from '../types';", newStr: "import { MODEL_CONFIGS } from '../types';\nimport type { ModelId } from '../types';" },
  { path: 'src/components/WelcomeScreen.tsx', oldStr: "import { ModelId } from '../types';", newStr: "import type { ModelId } from '../types';" },
  { path: 'src/hooks/useChat.ts', oldStr: "import { Message, FileAttachment } from '../types';", newStr: "import type { Message, FileAttachment } from '../types';" },
  { path: 'src/hooks/useConversations.ts', oldStr: "import { Conversation, Message, ModelId } from '../types';", newStr: "import { MODEL_CONFIGS } from '../types';\nimport type { Conversation, Message, ModelId } from '../types';" },
  { path: 'src/utils/claudeApi.ts', oldStr: "import { Message, ModelId, TokenUsage } from '../types';", newStr: "import type { Message, ModelId, TokenUsage } from '../types';" },
  { path: 'src/utils/fileParser.ts', oldStr: "import { FileAttachment } from '../types';", newStr: "import type { FileAttachment } from '../types';" },
  { path: 'src/utils/tokenCounter.ts', oldStr: "import { Message, ModelId } from '../types';", newStr: "import type { Message } from '../types';" }
];

filesToUpdate.forEach(({ path, oldStr, newStr }) => {
  if (fs.existsSync(path)) {
    let content = fs.readFileSync(path, 'utf8');
    content = content.replace(oldStr, newStr);
    fs.writeFileSync(path, content);
  } else {
    console.log(`File not found: ${path}`);
  }
});

// Fix other specific issues
let appTsx = fs.readFileSync('src/App.tsx', 'utf8');
appTsx = appTsx.replace("import React, { useState, useEffect } from 'react';", "import React, { useState } from 'react';");
appTsx = appTsx.replace("import { ModelId } from './types';", "import type { ModelId } from './types';");
fs.writeFileSync('src/App.tsx', appTsx);

let apiKeyModal = fs.readFileSync('src/components/ApiKeyModal.tsx', 'utf8');
apiKeyModal = apiKeyModal.replace("import { KeyRound, ExternalLink, ArrowRight, ShieldCheck, Loader2 } from 'lucide-react';", "import { KeyRound, ExternalLink, ShieldCheck, Loader2 } from 'lucide-react';");
fs.writeFileSync('src/components/ApiKeyModal.tsx', apiKeyModal);

let sidebar = fs.readFileSync('src/components/Sidebar.tsx', 'utf8');
sidebar = sidebar.replace("import { Plus, MessageSquare, Menu, LogOut, Calculator } from 'lucide-react';", "import { Plus, MessageSquare, Menu, LogOut, Calculator, BarChart3 } from 'lucide-react';");
sidebar = sidebar.replace("import type { Conversation, ModelId } from '../types';", "import type { Conversation } from '../types';");
fs.writeFileSync('src/components/Sidebar.tsx', sidebar);

let dashboard = fs.readFileSync('src/components/CostDashboard.tsx', 'utf8');
dashboard = dashboard.replace("import { X, ExternalLink, Download, BarChart3, Database, HardDrive, Calculator } from 'lucide-react';", "import { X, Download, BarChart3, Database, HardDrive, Calculator } from 'lucide-react';");
fs.writeFileSync('src/components/CostDashboard.tsx', dashboard);

let bubble = fs.readFileSync('src/components/MessageBubble.tsx', 'utf8');
bubble = bubble.replace("import { Bot, User, Copy, Check, DollarSign, Database, HardDrive, BarChart3, Info } from 'lucide-react';", "import { Bot, User, Copy, Check, DollarSign, Database, HardDrive, BarChart3 } from 'lucide-react';");
fs.writeFileSync('src/components/MessageBubble.tsx', bubble);

let conversationsTs = fs.readFileSync('src/hooks/useConversations.ts', 'utf8');
conversationsTs = conversationsTs.replace("import { MODEL_CONFIGS } from '../types';\n\nexport const useConversations", "export const useConversations"); // Remove duplicate import if any
// Fix the types error on line 86
conversationsTs = conversationsTs.replace("updatedMsg.cost = calculateMessageCost(", "updatedMsg.cost = { ...calculateMessageCost(\n            updates.usage.input_tokens || 0,\n            updates.usage.output_tokens || 0,\n            modelConfig.inputPricePerMillion,\n            modelConfig.outputPricePerMillion\n          ), model: conv.model }; //");
fs.writeFileSync('src/hooks/useConversations.ts', conversationsTs);

console.log("Imports fixed successfully!");
