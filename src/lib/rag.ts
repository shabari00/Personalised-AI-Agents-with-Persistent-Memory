/**
 * BM25 retrieval over agent session summaries.
 * No external deps — pure TypeScript.
 */

import { loadAllSessionChunks, type SessionChunk } from './vault';

// ---- Tokeniser ---------------------------------------------------------------

const STOPWORDS = new Set([
  'the','a','an','and','or','but','in','on','at','to','for','of','with','by',
  'from','as','is','was','are','were','be','been','have','has','had','do',
  'does','did','will','would','could','should','may','might','shall','can',
  'not','no','nor','so','yet','both','either','neither','each','few','more',
  'most','other','some','such','than','too','very','just','that','this',
  'these','those','i','you','he','she','it','we','they','what','which','who',
  'whom','my','your','his','her','its','our','their','about','also','only',
  'into','over','after','before','between','through','during','above','below',
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOPWORDS.has(t));
}

// ---- BM25 --------------------------------------------------------------------

const K1 = 1.5;
const B = 0.75;

interface ScoredDoc {
  chunk: SessionChunk;
  score: number;
}

function bm25Score(
  queryTokens: string[],
  docs: Array<{ chunk: SessionChunk; tokens: string[] }>,
): ScoredDoc[] {
  if (docs.length === 0 || queryTokens.length === 0) return [];

  const N = docs.length;
  const avgdl = docs.reduce((s, d) => s + d.tokens.length, 0) / N;

  // Document frequency per query term
  const df = new Map<string, number>();
  for (const term of queryTokens) {
    const count = docs.filter((d) => d.tokens.includes(term)).length;
    df.set(term, count);
  }

  // IDF (Robertson-Sparck Jones)
  const idf = (term: string) => {
    const n = df.get(term) ?? 0;
    return Math.log((N - n + 0.5) / (n + 0.5) + 1);
  };

  return docs
    .map(({ chunk, tokens }) => {
      const freq = new Map<string, number>();
      for (const t of tokens) freq.set(t, (freq.get(t) ?? 0) + 1);

      let score = 0;
      const dl = tokens.length;
      for (const term of queryTokens) {
        const tf = freq.get(term) ?? 0;
        if (tf === 0) continue;
        score += idf(term) * (tf * (K1 + 1)) / (tf + K1 * (1 - B + B * (dl / avgdl)));
      }
      return { chunk, score };
    })
    .sort((a, b) => b.score - a.score);
}

// ---- Public API --------------------------------------------------------------

export interface RagResult {
  sessionId: string;
  sessionNumber: number;
  date: string;
  relevantText: string;
  score: number;
}

/**
 * Retrieve the top-K most relevant session chunks for a given query.
 * Returns an empty array if there are no past sessions or the query scores 0.
 */
export async function retrieveContext(
  query: string,
  agentId: string,
  topK = 5,
): Promise<RagResult[]> {
  const chunks = await loadAllSessionChunks(agentId);
  if (chunks.length === 0) return [];

  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return [];

  const docs = chunks.map((chunk) => ({
    chunk,
    tokens: tokenize(chunk.summaryText),
  }));

  const scored = bm25Score(queryTokens, docs)
    .filter((d) => d.score > 0)
    .slice(0, topK);

  return scored.map(({ chunk, score }) => ({
    sessionId: chunk.sessionId,
    sessionNumber: chunk.sessionNumber,
    date: chunk.date,
    relevantText: chunk.summaryText,
    score,
  }));
}

/** Format RAG results as a context block to inject into the system prompt. */
export function formatRagContext(results: RagResult[]): string {
  if (results.length === 0) return '';
  const lines = results.map((r) => {
    const label = r.sessionNumber > 0
      ? `Session ${String(r.sessionNumber).padStart(3, '0')}${r.date ? ` · ${r.date}` : ''}`
      : r.date ?? r.sessionId;
    return `[${label}]: ${r.relevantText}`;
  });
  return lines.join('\n\n');
}
