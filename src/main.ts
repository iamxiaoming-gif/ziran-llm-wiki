import { Plugin, ItemView } from "obsidian";
import { LLMWikiSettingTab, DEFAULT_SETTINGS, THEME_CLASS_NAMES, type LLMWikiSettings, ensureSettings } from "./settings";
import { AgentCore } from "./agent/core";
import { ToolRegistry } from "./agent/tools";
import type { AgentFactory } from "./services/BackgroundIngestionService";
import { ChatView, VIEW_TYPE_CHAT } from "./chat/ChatView";
import { MemoryService } from "./services/MemoryService";
import { ContextManager } from "./services/ContextManager";
import { HistorySanitizer } from "./services/HistorySanitizer";
import { TranscriptionService } from "./feynman/TranscriptionService";
import { KnowledgeEvidenceService } from "./feynman/KnowledgeEvidenceService";
import { FeynmanEvaluationService } from "./feynman/FeynmanEvaluationService";
import { FeynmanSessionService } from "./feynman/FeynmanSessionService";
import { FeynmanView, VIEW_TYPE_FEYNMAN } from "./feynman/FeynmanView";
import { BackgroundIngestionService, type BackgroundIngestionSnapshot } from "./services/BackgroundIngestionService";
import { IngestionBatchService } from "./services/IngestionBatchService";
import { buildSystemPrompt } from "./agent/prompts";

export { ensureSettings } from "./settings";

export default class LLMWikiPlugin extends Plugin {
	settings!: LLMWikiSettings;
	agentCore!: AgentCore;
	toolRegistry!: ToolRegistry;
	memoryService!: MemoryService;
	contextManager!: ContextManager;
	historySanitizer!: HistorySanitizer;
	transcriptionService!: TranscriptionService;
	knowledgeEvidenceService!: KnowledgeEvidenceService;
	feynmanEvaluationService!: FeynmanEvaluationService;
	feynmanSessionService!: FeynmanSessionService;
	backgroundIngestionService!: BackgroundIngestionService;
	ingestionService!: IngestionBatchService;
	private batchStatusBarEl: HTMLElement | null = null;
	private unsubscribeBatchStatus: (() => void) | null = null;
	private currentSystemPrompt = "";

	async onload() {
		await this.loadSettings();

		this.ingestionService = new IngestionBatchService(this.app, this.settings);
		this.toolRegistry = new ToolRegistry(this.app, this.settings, this.ingestionService);
		this.memoryService = new MemoryService(this.app, this.settings);
		this.contextManager = new ContextManager();
		this.historySanitizer = new HistorySanitizer();
		this.transcriptionService = new TranscriptionService(this.settings);
		this.knowledgeEvidenceService = new KnowledgeEvidenceService(this.app, this.settings);
		this.feynmanEvaluationService = new FeynmanEvaluationService(this.settings);
		this.feynmanSessionService = new FeynmanSessionService(this.app, this.settings);
		this.addSettingTab(new LLMWikiSettingTab(this.app, this));

		await this.initAgent();

		const agentFactory: AgentFactory = (registry) => {
			const agent = new AgentCore(this.settings, registry, this.contextManager);
			agent.init(this.currentSystemPrompt);
			return agent;
		};
		this.backgroundIngestionService = new BackgroundIngestionService(this.app, this.settings, this.toolRegistry, agentFactory, this.ingestionService);
		this.toolRegistry.setBackgroundIngestionService(this.backgroundIngestionService);
		// 后台批次状态改为异步恢复，不再阻塞 Obsidian 启动
		void this.backgroundIngestionService.init().catch((error: unknown) => {
			console.error("恢复摄取批次状态失败:", error);
		});

		this.registerView(VIEW_TYPE_CHAT, (leaf) => new ChatView(leaf, this));
		this.registerView(VIEW_TYPE_FEYNMAN, (leaf) => new FeynmanView(leaf, this));

		this.addCommand({
			id: "open-llm-wiki-chat",
			name: "打开 LLM Wiki 知识库助手",
			callback: () => this.activateChatView(),
		});
		this.addCommand({
			id: "open-feynman-learning",
			name: "打开费曼学习教练",
			callback: () => this.activateFeynmanView(),
		});

		this.addRibbonIcon("message-square", "LLM Wiki 知识库助手", () => {
			void this.activateChatView();
		});
		this.addRibbonIcon("brain", "费曼学习教练", () => {
			void this.activateFeynmanView();
		});

		this.initBatchStatusBar();

		this.applyTheme();

		this.app.workspace.onLayoutReady(() => {
			void this.activateChatView();
		});
	}

	onunload() {
		this.unsubscribeBatchStatus?.();
		this.unsubscribeBatchStatus = null;
	}

	private initBatchStatusBar(): void {
		this.batchStatusBarEl = this.addStatusBarItem();
		this.batchStatusBarEl.addClass("llm-wiki-batch-status-bar");
		this.batchStatusBarEl.addClass("llm-wiki-hidden");
		this.batchStatusBarEl.setAttribute("aria-label", "后台摄取进度");
		this.batchStatusBarEl.addEventListener("click", () => void this.activateChatView());

		this.unsubscribeBatchStatus = this.backgroundIngestionService.subscribe((snapshot) => this.renderBatchStatusBar(snapshot));
		this.backgroundIngestionService.getSnapshot().then((snapshot) => this.renderBatchStatusBar(snapshot)).catch(() => {});
	}

	private renderBatchStatusBar(snapshot: BackgroundIngestionSnapshot): void {
		if (!this.batchStatusBarEl) return;
		const total = Object.values(snapshot.totals).reduce((sum, value) => sum + value, 0);
		const isCompleted = snapshot.status === "completed" || snapshot.status === "completed_with_errors";
		if (total === 0) {
			this.batchStatusBarEl.addClass("llm-wiki-hidden");
			return;
		}
		if (isCompleted) {
			const done = snapshot.totals.completed + snapshot.totals.skipped + snapshot.totals.failed;
			this.batchStatusBarEl.removeClass("llm-wiki-hidden");
			this.batchStatusBarEl.setText(`✅ 摄取完成 ${done}/${total}`);
			this.batchStatusBarEl.setAttribute("aria-label", "本批摄取已完成 — 点击打开助手");
			window.setTimeout(() => {
				this.batchStatusBarEl?.addClass("llm-wiki-hidden");
			}, 5000);
			return;
		}
		this.batchStatusBarEl.removeClass("llm-wiki-hidden");
		const done = snapshot.totals.completed + snapshot.totals.skipped + snapshot.totals.failed;
		const percent = total > 0 ? Math.min(100, Math.round(done / total * 100)) : 0;
		const statusIcon = snapshot.status === "active" ? "⚡" : snapshot.status === "stopping" ? "⏹" : snapshot.status === "paused" ? "⏸" : "📦";
		const statusText = snapshot.status === "stopping" ? "停止中" : "摄取";
		this.batchStatusBarEl.setText(`${statusIcon} ${statusText} ${done}/${total} · ${percent}%`);
		this.batchStatusBarEl.setAttribute("aria-label", `${snapshot.message || "后台摄取中"} — 点击打开助手`);
	}

	async initAgent() {
		const [agentsContext, memoryContext] = await Promise.all([
			this.memoryService.loadAgentsContext(this.settings.knowledgeBasePath),
			this.memoryService.loadMemoryContext(),
		]);
		this.currentSystemPrompt = buildSystemPrompt(this.settings, agentsContext, memoryContext);

		if (this.agentCore) {
			this.agentCore.updateSettings(this.settings);
			this.agentCore.updateSystemContext(this.currentSystemPrompt);
		} else {
			this.agentCore = new AgentCore(this.settings, this.toolRegistry, this.contextManager);
			this.agentCore.init(this.currentSystemPrompt);
		}
	}

	async activateChatView() {
		const { workspace } = this.app;
		let leaf = workspace.getLeavesOfType(VIEW_TYPE_CHAT)[0];

		if (!leaf) {
			const rightLeaf = workspace.getRightLeaf(false);
			if (rightLeaf) {
				await rightLeaf.setViewState({ type: VIEW_TYPE_CHAT, active: true });
				leaf = workspace.getLeavesOfType(VIEW_TYPE_CHAT)[0];
			}
		}

		if (leaf) {
			void workspace.revealLeaf(leaf);
		}
	}

	async activateFeynmanView() {
		const { workspace } = this.app;
		let leaf = workspace.getLeavesOfType(VIEW_TYPE_FEYNMAN)[0];
		if (!leaf) {
			const rightLeaf = workspace.getRightLeaf(false);
			if (rightLeaf) {
				await rightLeaf.setViewState({ type: VIEW_TYPE_FEYNMAN, active: true });
				leaf = workspace.getLeavesOfType(VIEW_TYPE_FEYNMAN)[0];
			}
		}
		if (leaf) void workspace.revealLeaf(leaf);
	}

	applyTheme() {
		try {
			const view = this.app.workspace.getActiveViewOfType(ItemView);
			const doc = view ? view.containerEl.ownerDocument : window.document;
			doc.body.classList.remove(...THEME_CLASS_NAMES);
			doc.body.classList.add(`llm-wiki-theme-${this.settings.theme}`);
		} catch {
			window.document.body.classList.remove(...THEME_CLASS_NAMES);
			window.document.body.classList.add(`llm-wiki-theme-${this.settings.theme}`);
		}
	}

	async loadSettings() {
		const loaded = (await this.loadData()) as Partial<LLMWikiSettings> | null;
		this.settings = Object.assign({}, DEFAULT_SETTINGS, loaded);
		this.settings = ensureSettings(this.settings);
	}

	async saveSettings() {
		this.settings = ensureSettings(this.settings);
		await this.saveData(this.settings);
		this.memoryService.updateSettings(this.settings);
		this.toolRegistry.updateSettings(this.settings);
		this.transcriptionService.updateSettings(this.settings);
		this.knowledgeEvidenceService.updateSettings(this.settings);
		this.feynmanEvaluationService.updateSettings(this.settings);
		this.feynmanSessionService.updateSettings(this.settings);
		this.backgroundIngestionService.updateSettings(this.settings);
		await this.initAgent();
		this.applyTheme();
	}
}
