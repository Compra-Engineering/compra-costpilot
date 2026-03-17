export type ArtifactType = 'code' | 'document' | 'csv' | 'html';

export interface Artifact {
  id: string;
  title: string;
  type: ArtifactType;
  language?: string;
  content: string;
}

export interface ParsedContent {
  segments: Array<
    | { type: 'text'; content: string }
    | { type: 'artifact'; artifact: Artifact }
  >;
  artifacts: Artifact[];
}

function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32-bit int
  }
  return 'art_' + Math.abs(hash).toString(36);
}

const ARTIFACT_REGEX =
  /<artifact\s+title="([^"]*?)"\s+type="([^"]*?)"(?:\s+language="([^"]*?)")?\s*>([\s\S]*?)<\/artifact>/g;

export function parseContent(content: string): ParsedContent {
  const segments: ParsedContent['segments'] = [];
  const artifacts: Artifact[] = [];

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  // Reset regex state
  ARTIFACT_REGEX.lastIndex = 0;

  while ((match = ARTIFACT_REGEX.exec(content)) !== null) {
    // Add text before this artifact
    if (match.index > lastIndex) {
      const text = content.slice(lastIndex, match.index).trim();
      if (text) {
        segments.push({ type: 'text', content: text });
      }
    }

    const artifactContent = match[4].trim();
    const artifact: Artifact = {
      id: hashString(artifactContent),
      title: match[1],
      type: match[2] as ArtifactType,
      language: match[3] || undefined,
      content: artifactContent,
    };

    artifacts.push(artifact);
    segments.push({ type: 'artifact', artifact });

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < content.length) {
    const text = content.slice(lastIndex).trim();
    if (text) {
      segments.push({ type: 'text', content: text });
    }
  }

  // If no artifacts found, return entire content as single text segment
  if (artifacts.length === 0) {
    segments.push({ type: 'text', content });
  }

  return { segments, artifacts };
}
