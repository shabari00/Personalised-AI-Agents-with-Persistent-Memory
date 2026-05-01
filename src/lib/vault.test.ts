import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, readFile } from 'fs/promises';
import { tmpdir } from 'os';
import path from 'path';
import {
  ensureAgentFolders,
  loadMemory,
  writeSession,
  updateIndex,
  updateSummary,
  listSessions,
} from '@/lib/vault';

const AGENT_ID = 'agent-1';

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await mkdtemp(path.join(tmpdir(), 'vault-test-'));
  process.env.OBSIDIAN_VAULT_PATH = tmpDir;
});

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true });
  delete process.env.OBSIDIAN_VAULT_PATH;
});

describe('ensureAgentFolders', () => {
  it('creates sessions dir, summary.md, index.md and log.md', async () => {
    await ensureAgentFolders(AGENT_ID);

    const base = path.join(tmpDir, 'AgentMemory', AGENT_ID);
    const summary = await readFile(path.join(base, 'summary.md'), 'utf-8');
    const index = await readFile(path.join(base, 'index.md'), 'utf-8');
    const log = await readFile(path.join(base, 'log.md'), 'utf-8');

    expect(summary).toBe('');
    expect(index).toBe('# Session Index\n');
    expect(log).toContain('# Session Log');
  });

  it('is idempotent — does not overwrite existing files', async () => {
    await ensureAgentFolders(AGENT_ID);
    const summaryPath = path.join(tmpDir, 'AgentMemory', AGENT_ID, 'summary.md');
    await import('fs/promises').then((f) => f.writeFile(summaryPath, 'existing content'));

    await ensureAgentFolders(AGENT_ID);

    const summary = await readFile(summaryPath, 'utf-8');
    expect(summary).toBe('existing content');
  });
});

describe('loadMemory', () => {
  it('returns empty memory when no sessions exist', async () => {
    await ensureAgentFolders(AGENT_ID);
    const mem = await loadMemory(AGENT_ID);
    expect(mem.summary).toBe('');
    expect(mem.recentSessionSummaries).toEqual([]);
    expect(mem.sessionCount).toBe(0);
  });

  it('loads summary and recent sessions after writes', async () => {
    await ensureAgentFolders(AGENT_ID);
    await updateSummary(AGENT_ID, ['fact 1', 'fact 2']);

    const now = new Date().toISOString();
    const filename = await writeSession(AGENT_ID, {
      agentId: AGENT_ID,
      sessionId: 'test-session-001',
      sessionNumber: 1,
      started: now,
      ended: now,
      messageCount: 2,
      summary: 'A test summary',
      bullets: ['bullet 1'],
      transcriptText: '**User:** hello\n\n**Agent:** hi',
    });
    await updateIndex(AGENT_ID, 'test-session-001', filename, 1);

    const mem = await loadMemory(AGENT_ID);
    expect(mem.summary).toContain('fact 1');
    expect(mem.sessionCount).toBe(1);
    expect(mem.recentSessionSummaries[0]).toBe('A test summary');
  });
});

describe('writeSession', () => {
  it('creates a markdown file with frontmatter including session_number', async () => {
    await ensureAgentFolders(AGENT_ID);
    const now = new Date().toISOString();

    const filename = await writeSession(AGENT_ID, {
      agentId: AGENT_ID,
      sessionId: 'sess-abc',
      sessionNumber: 42,
      started: now,
      ended: now,
      messageCount: 3,
      summary: 'Short summary here',
      bullets: ['learned X', 'learned Y'],
      transcriptText: '**User:** test\n\n**Agent:** ok',
    });

    expect(filename).toBe('sess-abc.md');

    const content = await readFile(
      path.join(tmpDir, 'AgentMemory', AGENT_ID, 'sessions', filename),
      'utf-8',
    );
    expect(content).toContain('session_id: sess-abc');
    expect(content).toContain('session_number: 42');
    expect(content).toContain('Short summary here');
    expect(content).toContain('- learned X');
  });
});

describe('updateIndex', () => {
  it('appends a numbered link entry to index.md', async () => {
    await ensureAgentFolders(AGENT_ID);
    await updateIndex(AGENT_ID, 'sess-001', 'sess-001.md', 1);

    const index = await readFile(
      path.join(tmpDir, 'AgentMemory', AGENT_ID, 'index.md'),
      'utf-8',
    );
    expect(index).toContain('Session 001');
    expect(index).toContain('sess-001.md');
  });
});

describe('updateSummary', () => {
  it('appends bullets to summary.md', async () => {
    await ensureAgentFolders(AGENT_ID);
    await updateSummary(AGENT_ID, ['fact A', 'fact B']);

    const summary = await readFile(
      path.join(tmpDir, 'AgentMemory', AGENT_ID, 'summary.md'),
      'utf-8',
    );
    expect(summary).toContain('- fact A');
    expect(summary).toContain('- fact B');
  });

  it('condenses when summary exceeds threshold', async () => {
    await ensureAgentFolders(AGENT_ID);
    const longBullets = Array.from({ length: 200 }, (_, i) => `fact number ${i} with extra padding text to make it long`);
    const condenseFn = async (_text: string) => 'condensed';

    await updateSummary(AGENT_ID, longBullets, condenseFn);

    const summary = await readFile(
      path.join(tmpDir, 'AgentMemory', AGENT_ID, 'summary.md'),
      'utf-8',
    );
    expect(summary).toBe('condensed');
  });
});

describe('listSessions', () => {
  it('returns sessions in reverse chronological order', async () => {
    await ensureAgentFolders(AGENT_ID);
    await updateIndex(AGENT_ID, 'sess-001', 'sess-001.md', 1);
    await updateIndex(AGENT_ID, 'sess-002', 'sess-002.md', 2);
    await updateIndex(AGENT_ID, 'sess-003', 'sess-003.md', 3);

    const sessions = await listSessions(AGENT_ID);
    expect(sessions[0].sessionNumber).toBe(3);
    expect(sessions[1].sessionNumber).toBe(2);
    expect(sessions[2].sessionNumber).toBe(1);
  });

  it('returns empty array when no sessions exist', async () => {
    await ensureAgentFolders(AGENT_ID);
    const sessions = await listSessions(AGENT_ID);
    expect(sessions).toEqual([]);
  });
});
