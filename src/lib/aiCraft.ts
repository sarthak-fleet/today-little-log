/**
 * AI-native engineering skill track. 12-week curriculum built around
 * shipping, not studying. Each week ships one artifact.
 */

export interface CraftSkill {
  id: string;
  area: 'foundation' | 'retrieval' | 'agents' | 'evals' | 'training' | 'protocols' | 'systems';
  name: string;
  artifact: string; // what "done" looks like
  hours: number;    // rough time to MVP
}

export const CRAFT_TRACK: CraftSkill[] = [
  { id: 'tok',      area: 'foundation', name: 'Token economics + prompt caching',   artifact: 'Notebook: measure cache hit, cost per request across 3 models', hours: 4 },
  { id: 'ctx',      area: 'foundation', name: 'Context window management',          artifact: 'Chat app that auto-summarises when approaching 80% tokens', hours: 6 },
  { id: 'tools',    area: 'foundation', name: 'Tool use / function calling',        artifact: 'Agent with 5 tools (calendar, email, search, calc, file)', hours: 8 },
  { id: 'embed',    area: 'retrieval',  name: 'Embeddings + similarity search',     artifact: 'Semantic search over your notes dir, < 200ms', hours: 6 },
  { id: 'rag-v1',   area: 'retrieval',  name: 'Vanilla RAG',                        artifact: 'Doc Q&A app: ingest → chunk → embed → retrieve → answer', hours: 8 },
  { id: 'rag-v2',   area: 'retrieval',  name: 'Advanced RAG (reranking, hybrid)',   artifact: 'v1 + BM25 hybrid + cross-encoder rerank + eval vs v1', hours: 10 },
  { id: 'react',    area: 'agents',     name: 'ReAct / plan-and-execute',           artifact: 'Agent that breaks a task into steps, executes tools, loops', hours: 10 },
  { id: 'multi',    area: 'agents',     name: 'Multi-agent + orchestration',        artifact: '2-agent system: planner + executor with handoff', hours: 12 },
  { id: 'mcp',      area: 'protocols',  name: 'Model Context Protocol server',      artifact: 'MCP server exposing 3 custom tools to Claude Code', hours: 8 },
  { id: 'evals',    area: 'evals',      name: 'Eval harnesses',                     artifact: 'Golden-dataset scorer for your RAG app, regression gate', hours: 10 },
  { id: 'finetune', area: 'training',   name: 'SFT / LoRA fine-tune',               artifact: 'Fine-tuned open model on domain task, beats base by X%', hours: 14 },
  { id: 'batch',    area: 'systems',    name: 'Batch processing + cost control',    artifact: 'Batch API pipeline: 1000 docs classified at 50% cost', hours: 6 },
  { id: 'stream',   area: 'systems',    name: 'Streaming + cancellation',           artifact: 'SSE endpoint with abort handling + backpressure', hours: 6 },
  { id: 'safety',   area: 'systems',    name: 'Safety + prompt injection',          artifact: 'Hardened agent: catches 8/10 jailbreak test cases', hours: 8 },
];

export const CRAFT_COMPLETE_KEY = 'tll:craft-completed';

export function readCompleted(): Record<string, string> {
  try {
    const raw = localStorage.getItem(CRAFT_COMPLETE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

export function markCompleted(id: string, evidenceUrl: string) {
  const cur = readCompleted();
  cur[id] = evidenceUrl || new Date().toISOString();
  try { localStorage.setItem(CRAFT_COMPLETE_KEY, JSON.stringify(cur)); } catch { /* ignore */ }
}

export function unmarkCompleted(id: string) {
  const cur = readCompleted();
  delete cur[id];
  try { localStorage.setItem(CRAFT_COMPLETE_KEY, JSON.stringify(cur)); } catch { /* ignore */ }
}
