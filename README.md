# Agent Memory App

A Next.js web app where you can chat with 4 distinct AI agents. Each agent has
long-term memory stored as Markdown files in your Obsidian vault. When you start
a new session the agent loads its prior memory; when you end the session the
conversation is summarised and written back so the agent remembers it next time.

## Quick start

### 1. Install dependencies

```bash
npm install
```

### 2. Set environment variables

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:

```
ANTHROPIC_API_KEY=sk-ant-...
OBSIDIAN_VAULT_PATH=/Users/you/Documents/MyVault
```

> `OBSIDIAN_VAULT_PATH` can be any directory — it does not have to be an
> existing Obsidian vault. The app creates an `AgentMemory/` folder inside it on
> first run.

### 3. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## The 4 agents

| Tab | Role |
|-----|------|
| **Researcher** | Meticulous research assistant, cites sources, prefers primary data |
| **Writer** | Sharp editorial writer, favours concise vivid prose |
| **Coder** | Senior software engineer, gives working code not pseudo-code |
| **Planner** | Strategic planner, breaks goals into concrete next actions |

Edit system prompts and add new agents in [`src/agents.config.ts`](src/agents.config.ts).

---

## How memory works

```
<OBSIDIAN_VAULT_PATH>/AgentMemory/
  agent-1/
    summary.md        ← rolling summary of all sessions (auto-condensed at ~2 000 tokens)
    index.md          ← links to every session file
    sessions/
      2025-01-15-a1b2c3d4.md   ← one file per session (YAML frontmatter + transcript)
  agent-2/ … agent-4/ (same structure)
```

On **session start** the agent loads:
- `summary.md` (cumulative long-term memory)
- The last 3 session summaries from `index.md`

On **session end** (button click, tab switch, or page close):
1. Claude summarises the conversation into one paragraph + bullet facts.
2. A new session file is written to `sessions/`.
3. `index.md` gets a new link.
4. `summary.md` is updated (condensed by Claude if it exceeds ~2 000 tokens).

Vault writes are serialised per agent with an in-memory mutex so simultaneous
sessions for the same agent cannot corrupt each other.

---

## Commands

```bash
npm run dev      # development server on :3000
npm run build    # production build
npm run start    # serve production build
npm test         # run Vitest unit tests
```

---

## Project structure

```
src/
  agents.config.ts          ← agent definitions (edit here)
  lib/
    vault.ts                ← all Obsidian vault I/O
    llm.ts                  ← Anthropic SDK wrapper (chatStream, summarize)
    vault.test.ts           ← Vitest tests for vault.ts
  store/
    sessions.ts             ← in-memory active-session map
    locks.ts                ← per-agent mutex
  app/
    page.tsx                ← root page (server component)
    layout.tsx
    globals.css
    api/agents/[id]/
      sessions/route.ts              ← POST (create) + GET (list)
      sessions/[sid]/messages/route.ts   ← POST (stream chat)
      sessions/[sid]/end/route.ts        ← POST (end + save)
  components/
    AgentTabs.tsx           ← tab switcher
    ChatPanel.tsx           ← per-agent chat UI
```
