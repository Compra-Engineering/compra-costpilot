import type { FileAttachment } from '../types';

export const parseFile = async (file: File): Promise<FileAttachment> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const content = e.target?.result as string;
      resolve({
        id: crypto.randomUUID(),
        name: file.name,
        type: file.type || getExtensionType(file.name),
        size: file.size,
        content: content,
      });
    };
    
    reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));
    
    // Read as text for CSV, JSON, TXT
    reader.readAsText(file);
  });
};

const getExtensionType = (filename: string): string => {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'csv': return 'text/csv';
    case 'json': return 'application/json';
    case 'txt': return 'text/plain';
    case 'md': return 'text/markdown';
    case 'js':
    case 'ts':
    case 'jsx':
    case 'tsx':
    case 'css':
    case 'html': return 'text/plain';
    default: return 'application/octet-stream';
  }
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

export const formatFileAsContext = (attachment: FileAttachment): string => {
  return `\n\n--- FILE: ${attachment.name} ---\n\`\`\`${getFileLanguage(attachment.name)}\n${attachment.content}\n\`\`\`\n--- END OF FILE ---\n\n`;
};

const getFileLanguage = (filename: string): string => {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'csv': return 'csv';
    case 'json': return 'json';
    case 'js':
    case 'jsx': return 'javascript';
    case 'ts':
    case 'tsx': return 'typescript';
    case 'css': return 'css';
    case 'html': return 'html';
    case 'md': return 'markdown';
    default: return 'text';
  }
};
