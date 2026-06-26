# Ziran LLM Wiki

Build deep topic knowledge bases through conversational AI, based on Karpathy's LLM Wiki methodology. Like tending a digital garden, your wiki grows naturally through dialogue.

基于 Karpathy LLM Wiki 方法论，通过对话驱动构建深度专题知识库。

## Features

- **Conversational knowledge ingestion** — chat with AI to ingest raw materials and extract atomic knowledge points automatically
- **Structured knowledge base** — auto-creates topic directories with index pages, knowledge pages, organization profiles, and changelogs
- **Three core workflows** — Ingest (process raw materials), Query (search knowledge), Lint (quality check & maintenance)
- **Smart indexing** — automatically updates cross-references and index pages when new knowledge is created
- **Memory & context** — AI retains long-term memory, user preferences, and work logs across sessions
- **Conflict tracking** — detects and records knowledge conflicts instead of overwriting existing content
- **Multiple themes** — Dark Blue, Warm Light, Obsidian Red, Lavender, Forest Green
- **Streaming output** — real-time AI response with tool call visualization
- **OpenAI compatible** — supports GPT-4o, DeepSeek, SiliconFlow, and any OpenAI-compatible API

## Quick Start

1. Configure your **API Key** and **API Base URL** in plugin settings
2. Click the 💬 ribbon icon or run "Open LLM Wiki" command
3. Try these commands in the chat:
   - **"初始化知识库"** — create a topic knowledge base directory structure
   - **"摄取资料"** — ingest raw material files into structured knowledge
   - **"查询知识"** — search your knowledge base
   - **"Lint 检查"** — run quality checks on your knowledge base
   - **"知识库状态"** — view knowledge base overview

## Safety Rules

The plugin enforces strict safety rules to protect your knowledge:
- **Read-only raw materials** — original files are never modified or deleted
- **Atomic knowledge points** — each concept gets its own page
- **No deletion** — existing content can only be appended, never overwritten or removed
- **Conflict recording** — contradictions are logged, not silently resolved

## Installation

### From Releases

1. Download `main.js`, `manifest.json`, `styles.css` from [Releases](https://github.com/iamxiaoming-gif/ziran-llm-wiki/releases)
2. Copy them to `<vault>/.obsidian/plugins/ziran-llm-wiki/`
3. Enable the plugin in Obsidian settings

### From source

```bash
npm install
npm run build
```

## Follow

关注微信公众号 **自然成长笔记**，获取更多关于知识管理的思考与实践。

## License

MIT
