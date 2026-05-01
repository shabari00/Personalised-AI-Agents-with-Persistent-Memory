import fs from 'fs/promises';
import path from 'path';
import matter from 'gray-matter';

function getVaultPath(): string {
  const vaultPath = process.env.OBSIDIAN_VAULT_PATH;
  if (!vaultPath) throw new Error('OBSIDIAN_VAULT_PATH env var is not set');
  return vaultPath;
}

function agentDir(agentId: string): string {
  return path.join(getVaultPath(), 'AgentMemory', agentId);
}

async function atomicWrite(filePath: string, content: string): Promise<void> {
  const tmp = `${filePath}.tmp`;
  await fs.writeFile(tmp, content, 'utf-8');
  await fs.rename(tmp, filePath);
}

export async function ensureAgentFolders(agentId: string): Promise<void> {
  const dir = agentDir(agentId);
  await fs.mkdir(path.join(dir, 'sessions'), { recursive: true });
  await fs.mkdir(path.join(dir, 'entities'), { recursive: true });

  const files: [string, string][] = [
    ['summary.md', ''],
    ['index.md', '# Session Index\n'],
    ['log.md', '# Session Log\n\n'],
  ];
  for (const [name, init] of files) {
    await fs.writeFile(path.join(dir, name), init, { flag: 'wx' }).catch(() => {});
  }
}

export interface AgentMemory {
  summary: string;
  recentSessionSummaries: string[];
  sessionCount: number;
}

export async function loadMemory(agentId: string): Promise<AgentMemory> {
  const dir = agentDir(agentId);

  const summary = await fs.readFile(path.join(dir, 'summary.md'), 'utf-8').catch(() => '');
  const indexContent = await fs.readFile(path.join(dir, 'index.md'), 'utf-8').catch(() => '');

  // Parse links: [Session NNN · date](sessions/file.md)  OR  [sessionId](sessions/file.md)
  const linkRegex = /\[[^\]]+\]\(sessions\/([^)]+)\)/g;
  const filenames: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = linkRegex.exec(indexContent)) !== null) {
    filenames.push(match[1]);
  }

  const last3 = filenames.slice(-3);
  const sessionCount = filenames.length;

  const recentRaw = await Promise.all(
    last3.map((filename) =>
      fs.readFile(path.join(dir, 'sessions', filename), 'utf-8').catch(() => null),
    ),
  );

  const recentSessionSummaries = recentRaw
    .filter((c): c is string => c !== null)
    .map((c) => {
      const parsed = matter(c);
      const summaryMatch = parsed.content.match(/## Summary\n([\s\S]*?)(?=\n##|$)/);
      return summaryMatch ? summaryMatch[1].trim() : '';
    })
    .filter(Boolean);

  return { summary, recentSessionSummaries, sessionCount };
}

export interface SessionFile {
  agentId: string;
  sessionId: string;
  sessionNumber: number;
  started: string;
  ended: string;
  messageCount: number;
  summary: string;
  bullets: string[];
  transcriptText: string;
}

export async function writeSession(agentId: string, session: SessionFile): Promise<string> {
  const dir = agentDir(agentId);
  const filename = `${session.sessionId}.md`;
  const filePath = path.join(dir, 'sessions', filename);

  const frontmatter = {
    agent: agentId,
    session_id: session.sessionId,
    session_number: session.sessionNumber,
    started: session.started,
    ended: session.ended,
    message_count: session.messageCount,
  };

  const bulletsSection =
    session.bullets.length > 0
      ? session.bullets.map((b) => `- ${b}`).join('\n')
      : '- (none)';

  const body = [
    '## Summary',
    session.summary,
    '',
    '## Key facts learned',
    bulletsSection,
    '',
    '## Full transcript',
    session.transcriptText,
  ].join('\n');

  await atomicWrite(filePath, matter.stringify(body, frontmatter));
  return filename;
}

export async function updateIndex(
  agentId: string,
  sessionId: string,
  filename: string,
  sessionNumber: number,
): Promise<void> {
  const indexPath = path.join(agentDir(agentId), 'index.md');
  const existing = await fs.readFile(indexPath, 'utf-8').catch(() => '# Session Index\n');
  const date = new Date().toISOString().split('T')[0];
  const label = `Session ${String(sessionNumber).padStart(3, '0')} · ${date}`;
  const line = `\n- [${label}](sessions/${filename})`;
  await atomicWrite(indexPath, existing + line);
}

export async function updateLog(
  agentId: string,
  sessionNumber: number,
  started: string,
  messageCount: number,
  summary: string,
): Promise<void> {
  const logPath = path.join(agentDir(agentId), 'log.md');
  const existing = await fs.readFile(logPath, 'utf-8').catch(() => '# Session Log\n\n');
  const date = new Date(started).toISOString().split('T')[0];
  const entry = [
    `## Session ${String(sessionNumber).padStart(3, '0')} · ${date}`,
    `Started: ${started}`,
    `Messages: ${messageCount}`,
    '',
    summary,
    '',
    '---',
    '',
  ].join('\n');
  await atomicWrite(logPath, existing + entry);
}

export async function updateSummary(
  agentId: string,
  newBullets: string[],
  condenseFn?: (text: string) => Promise<string>,
): Promise<void> {
  const summaryPath = path.join(agentDir(agentId), 'summary.md');
  const existing = await fs.readFile(summaryPath, 'utf-8').catch(() => '');
  const bulletsText = newBullets.map((b) => `- ${b}`).join('\n');
  const updated = existing.trim() ? `${existing.trim()}\n${bulletsText}` : bulletsText;

  if (updated.length > 6000 && condenseFn) {
    const condensed = await condenseFn(updated);
    await atomicWrite(summaryPath, condensed);
  } else {
    await atomicWrite(summaryPath, updated);
  }
}

export async function writeEntities(
  agentId: string,
  sessionId: string,
  entities: string,
): Promise<void> {
  const date = new Date().toISOString().split('T')[0];
  const filePath = path.join(agentDir(agentId), 'entities', `${sessionId}.md`);
  await atomicWrite(filePath, `# Entities · ${date}\n\n${entities}`);
}

export interface SessionListItem {
  sessionId: string;
  sessionNumber?: number;
  filename: string;
  date?: string;
}

export async function listSessions(agentId: string): Promise<SessionListItem[]> {
  const indexPath = path.join(agentDir(agentId), 'index.md');
  const indexContent = await fs.readFile(indexPath, 'utf-8').catch(() => '');

  // New format: [Session NNN · YYYY-MM-DD](sessions/file.md)
  // Old format: [sessionId](sessions/file.md)
  const linkRegex = /\[([^\]]+)\]\(sessions\/([^)]+)\)/g;
  const sessions: SessionListItem[] = [];
  let match: RegExpExecArray | null;

  while ((match = linkRegex.exec(indexContent)) !== null) {
    const label = match[1];
    const filename = match[2];

    // Parse "Session 042 · 2026-04-27" format
    const numbered = label.match(/^Session (\d+) · (\d{4}-\d{2}-\d{2})$/);
    if (numbered) {
      sessions.push({
        sessionId: filename.replace('.md', ''),
        sessionNumber: parseInt(numbered[1], 10),
        filename,
        date: numbered[2],
      });
    } else {
      // Legacy format: label is the session ID
      sessions.push({ sessionId: label, filename });
    }
  }

  return sessions.reverse();
}

// ---------------------------------------------------------------------------
// RAG helpers — used by src/lib/rag.ts
// ---------------------------------------------------------------------------

export interface SessionChunk {
  sessionId: string;
  sessionNumber: number;
  date: string;
  /** Summary + key-facts section — the most signal-dense part */
  summaryText: string;
}

export async function loadAllSessionChunks(agentId: string): Promise<SessionChunk[]> {
  const dir = agentDir(agentId);
  let files: string[] = [];
  try {
    files = await fs.readdir(path.join(dir, 'sessions'));
  } catch {
    return [];
  }

  const chunks = await Promise.all(
    files
      .filter((f) => f.endsWith('.md'))
      .map(async (filename): Promise<SessionChunk | null> => {
        try {
          const raw = await fs.readFile(path.join(dir, 'sessions', filename), 'utf-8');
          const parsed = matter(raw);
          const num = typeof parsed.data.session_number === 'number'
            ? parsed.data.session_number
            : 0;
          const date = typeof parsed.data.started === 'string'
            ? parsed.data.started.split('T')[0]
            : '';

          // Extract Summary + Key facts sections (most relevant for RAG)
          const summaryMatch = parsed.content.match(/## Summary\n([\s\S]*?)(?=\n##|$)/);
          const factsMatch = parsed.content.match(/## Key facts learned\n([\s\S]*?)(?=\n##|$)/);
          const summaryText = [
            summaryMatch?.[1]?.trim() ?? '',
            factsMatch?.[1]?.trim() ?? '',
          ]
            .filter(Boolean)
            .join('\n');

          if (!summaryText) return null;
          return {
            sessionId: filename.replace('.md', ''),
            sessionNumber: num,
            date,
            summaryText,
          };
        } catch {
          return null;
        }
      }),
  );

  return chunks.filter((c): c is SessionChunk => c !== null);
}
