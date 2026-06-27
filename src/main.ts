import { Plugin, ItemView } from "obsidian";
import { LLMWikiSettingTab, DEFAULT_SETTINGS, type LLMWikiSettings } from "./settings";
import { AgentCore } from "./agent/core";
import { ToolRegistry } from "./agent/tools";
import { ChatView, VIEW_TYPE_CHAT } from "./chat/ChatView";
import { MemoryService } from "./services/MemoryService";
import { ContextManager } from "./services/ContextManager";

export default class LLMWikiPlugin extends Plugin {
	settings!: LLMWikiSettings;
	agentCore!: AgentCore;
	toolRegistry!: ToolRegistry;
	memoryService!: MemoryService;
	contextManager!: ContextManager;

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new LLMWikiSettingTab(this.app, this));

		this.toolRegistry = new ToolRegistry(this.app, this.settings);
		this.memoryService = new MemoryService(this.app, this.settings);
		this.contextManager = new ContextManager();

		await this.initAgent();

		this.registerView(VIEW_TYPE_CHAT, (leaf) => new ChatView(leaf, this));

		this.addCommand({
			id: "open-llm-wiki-chat",
			name: "打开 LLM Wiki 知识库助手",
			callback: () => this.activateChatView(),
		});

		this.addRibbonIcon("message-square", "LLM Wiki 知识库助手", () => {
			void this.activateChatView();
		});

		this.applyTheme();

		this.app.workspace.onLayoutReady(() => {
			void this.activateChatView();
		});
	}

	onunload() {
	}

	async initAgent() {
		const [skillContent, refContent, memoryContext] = await Promise.all([
			this.memoryService.loadSkillContent(),
			this.memoryService.loadReferencesContent(),
			this.memoryService.loadMemoryContext(),
		]);
		this.agentCore = new AgentCore(this.settings, this.toolRegistry);
		this.agentCore.init(skillContent, refContent, memoryContext);
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

	applyTheme() {
		try {
			const view = this.app.workspace.getActiveViewOfType(ItemView);
			const doc = view ? view.containerEl.ownerDocument : window.document;
			doc.body.classList.remove(
				"llm-wiki-theme-dark-blue",
				"llm-wiki-theme-warm-light",
				"llm-wiki-theme-obsidian-red",
				"llm-wiki-theme-lavender",
				"llm-wiki-theme-forest-green"
			);
			doc.body.classList.add(`llm-wiki-theme-${this.settings.theme}`);
		} catch {
			window.document.body.classList.remove(
				"llm-wiki-theme-dark-blue",
				"llm-wiki-theme-warm-light",
				"llm-wiki-theme-obsidian-red",
				"llm-wiki-theme-lavender",
				"llm-wiki-theme-forest-green"
			);
			window.document.body.classList.add(`llm-wiki-theme-${this.settings.theme}`);
		}
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData() as Partial<LLMWikiSettings>);
	}

	async saveSettings() {
		await this.saveData(this.settings);
		await this.initAgent();
		this.memoryService.updateSettings(this.settings);
	}
}
