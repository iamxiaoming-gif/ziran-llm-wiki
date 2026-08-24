# Ziran LLM Wiki

Build deep topic knowledge bases through conversational AI, based on Karpathy's LLM Wiki methodology. Like tending a digital garden, your wiki grows naturally through dialogue — and Feynman learning verifies that you actually understand what you know.

## Features

- **Conversational knowledge ingestion** — chat with AI to ingest raw materials and extract atomic knowledge points automatically
- **Structured knowledge base** — auto-creates topic directories with index pages, knowledge pages, organization profiles, and changelogs
- **Three core workflows** — Ingest (process raw materials), Query (search knowledge), Lint (quality check & maintenance)
- **Smart indexing** — automatically updates cross-references, keyword indexes, and relationship graphs when knowledge is created
- **Previewed batch ingestion** — scan multiple raw files, review the plan, then explicitly confirm execution; persisted batches recover after restart
- **Time-scoped batch planning** — ingest only files added or changed today / this week / this month, or cap a batch to the configured size (default 20), instead of re-planning the whole library
- **Content deduplication** — file fingerprints skip unchanged materials; "already ingested" history is tracked so you never process the same file twice
- **Open files from chat** — say "打开能力圈" and the matching knowledge page opens directly in Obsidian
- **Feynman learning coach** — explain a topic by voice or text and verify each claim against knowledge-base evidence
- **Pluggable transcription** — Groq, local Whisper, Cloudflare Workers AI, Google Speech-to-Text, or a custom OpenAI-compatible endpoint
- **Memory & context** — AI retains long-term memory, user preferences, and work logs across sessions
- **Conflict tracking** — detects and records knowledge conflicts instead of overwriting existing content
- **Multiple themes** — Dark Blue, Warm Light, Obsidian Red, Lavender, Forest Green
- **Privacy-aware** — raw materials are read-only, page content is append-only, and audio retention is off by default

## Screenshots

<!-- TODO: add real screenshots of the chat view, batch ingestion plan, and Feynman view -->

## Requirements

- Obsidian **v1.8.0+** (desktop)
- An **OpenAI-compatible** API (OpenAI, DeepSeek, SiliconFlow, Ollama, or any compatible endpoint)
- An API key for the provider you choose (the plugin itself is free and open source)

## Installation

### From GitHub Releases

1. Download `main.js`, `manifest.json`, and `styles.css` from the latest [release](https://github.com/iamxiaoming-gif/ziran-llm-wiki/releases).
2. Copy them to `<vault>/.obsidian/plugins/ziran-llm-wiki/`.
3. Enable **Ziran LLM Wiki** in Obsidian → Settings → Community plugins.

### With BRAT (for testing)

1. Install the BRAT plugin.
2. Add `iamxiaoming-gif/ziran-llm-wiki` to the beta plugin list.
3. Reload Obsidian.

## Getting Started

1. Open **Settings → Ziran LLM Wiki** and configure your model:
   - Provider (OpenAI compatible / DeepSeek / SiliconFlow / Ollama / ...)
   - API Base URL
   - API Key
   - Model name
2. Click the 💬 ribbon icon (or run the "打开 LLM Wiki 知识库助手" command) to open the assistant.
3. In the chat, say **"初始化知识库"** to create the knowledge base structure.
4. Put raw material files into `00-原始资料/` (grouped by category folders).
5. Say **"摄取今天新增的资料"** (ingest today's files), **"批量摄取"** (plan a batch), or **"查询知识"** (ask questions).

## Batch Ingestion

- Planning is **read-only**: review the plan (batch ID, pending / skipped / changed / failed counts) and confirm before anything is processed.
- A batch processes up to the configured number of files per run (default 20), then pauses; say "继续摄取" to continue.
- Say **"摄取今天 / 本周 / 本月的资料"** and the plan only includes files modified in that window.
- Completed files are tracked by content fingerprint in `<knowledge-base>/30-维护记录/摄取任务.json`; unchanged files are skipped automatically.

## Feynman Learning

1. Open the 🎓 Feynman view (ribbon icon or command).
2. Configure a transcription provider if you want voice explanations (Groq, local Whisper, Cloudflare Workers AI, Google Speech-to-Text, or a custom OpenAI-compatible endpoint).
3. Explain a topic aloud or in text; each claim is checked against knowledge-base evidence and you get a learning report.

## Safety Rules

The plugin enforces strict safety rules to protect your knowledge:

- **Read-only raw materials** — `00-原始资料/` is never modified, overwritten, or deleted
- **Atomic knowledge points** — each concept gets its own page
- **Append-only pages** — existing content can only be extended, never replaced
- **Conflict recording** — contradictions are logged, not silently resolved

## Development

```bash
npm install
npm run build   # outputs main.js
```

## License

MIT © iamxiaoming-gif
