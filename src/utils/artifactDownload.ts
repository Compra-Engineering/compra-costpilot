import type { Artifact } from './artifactParser';

const LANGUAGE_EXTENSIONS: Record<string, string> = {
  python: '.py',
  javascript: '.js',
  typescript: '.ts',
  sql: '.sql',
  json: '.json',
  html: '.html',
  css: '.css',
  java: '.java',
  cpp: '.cpp',
  c: '.c',
  go: '.go',
  rust: '.rs',
  ruby: '.rb',
  php: '.php',
  swift: '.swift',
  kotlin: '.kt',
  yaml: '.yaml',
  yml: '.yml',
  xml: '.xml',
  bash: '.sh',
  shell: '.sh',
  sh: '.sh',
};

const TYPE_EXTENSIONS: Record<string, string> = {
  document: '.md',
  csv: '.csv',
  html: '.html',
  code: '.txt',
};

function getExtension(artifact: Artifact): string {
  if (artifact.type === 'code' && artifact.language) {
    return LANGUAGE_EXTENSIONS[artifact.language.toLowerCase()] || '.txt';
  }
  return TYPE_EXTENSIONS[artifact.type] || '.txt';
}

function getMimeType(artifact: Artifact): string {
  switch (artifact.type) {
    case 'csv': return 'text/csv';
    case 'html': return 'text/html';
    case 'document': return 'text/markdown';
    default: return 'text/plain';
  }
}

function sanitizeFilename(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 60);
}

export function downloadArtifact(artifact: Artifact): void {
  const extension = getExtension(artifact);
  const filename = sanitizeFilename(artifact.title) + extension;
  const mimeType = getMimeType(artifact);

  const blob = new Blob([artifact.content], { type: mimeType });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
