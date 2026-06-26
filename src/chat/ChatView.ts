import { ItemView, WorkspaceLeaf, MarkdownRenderer, normalizePath, TFile, setCssStyles } from "obsidian";
import type LLMWikiPlugin from "../main";
import type { ToolResult } from "../agent/tools";

export const VIEW_TYPE_CHAT = "llm-wiki-chat-view";

export class ChatView extends ItemView {
	plugin: LLMWikiPlugin;
	private messagesEl!: HTMLElement;
	private inputEl!: HTMLTextAreaElement;
	private sendBtn!: HTMLElement;
	private stopBtn!: HTMLElement;
	private isProcessing: boolean = false;

	currentAssistantEl: HTMLElement | null = null;
	currentContent: string = "";
	private renderTimer: ReturnType<typeof setInterval> | null = null;
	private tokenBuffer: string = "";
	private toolCardEl: HTMLElement | null = null;

	constructor(leaf: WorkspaceLeaf, plugin: LLMWikiPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType(): string {
		return VIEW_TYPE_CHAT;
	}

	getDisplayText(): string {
		return "LLM Wiki 知识库助手";
	}

	getIcon(): string {
		return "message-square";
	}

	async onOpen() {
		const container = this.containerEl.children[1] as HTMLElement;
		container.empty();
		container.addClass("llm-wiki-root");

		this.buildUI(container);
		await this.loadChatHistory();
	}

	onClose() {
		void this.saveChatHistory();
	}

	private buildUI(container: HTMLElement) {
		setCssStyles(container, {
			display: "flex",
			flexDirection: "column",
			height: "100%",
		});

		const chatHeader = container.createEl("div", { cls: "llm-wiki-chat-header" });
		chatHeader.createEl("h3", { text: "💬 LLM Wiki 知识库助手" });

		const headerActions = chatHeader.createEl("div", { cls: "llm-wiki-header-actions" });
		const newBtn = headerActions.createEl("button", { text: "新对话", cls: "llm-wiki-btn" });
		newBtn.addEventListener("click", () => void this.newConversation());

		this.messagesEl = container.createEl("div", { cls: "llm-wiki-messages" });

		const inputContainer = container.createEl("div", { cls: "llm-wiki-input-container" });

		this.inputEl = inputContainer.createEl("textarea", {
			cls: "llm-wiki-input",
			attr: {
				placeholder: "输入您的问题...",
				rows: "2",
			},
		});

		this.inputEl.addEventListener("keydown", (e) => {
			if (e.key === "Enter" && !e.shiftKey) {
				e.preventDefault();
				void this.sendMessage();
			}
		});

		const hintsEl = inputContainer.createEl("div", { cls: "llm-wiki-hints" });
		const hints = [
			{ text: "初始化知识库", tip: "创建专题知识库目录结构" },
			{ text: "摄取资料", tip: "处理原始资料文件" },
			{ text: "查询知识", tip: "搜索知识库内容" },
			{ text: "Lint 检查", tip: "执行整理检查" },
			{ text: "知识库状态", tip: "查看知识库概况" },
		];
		for (const h of hints) {
			const chip = hintsEl.createEl("span", { cls: "llm-wiki-hint-chip", text: h.text, attr: { title: h.tip } });
			chip.addEventListener("click", () => {
				this.inputEl.value = h.text;
				this.inputEl.focus();
			});
		}

		const btnRow = inputContainer.createEl("div", { cls: "llm-wiki-btn-row" });

		this.sendBtn = btnRow.createEl("button", { text: "发送", cls: "llm-wiki-btn llm-wiki-btn-primary" });
		this.sendBtn.addEventListener("click", () => void this.sendMessage());

		this.stopBtn = btnRow.createEl("button", {
			text: "停止",
			cls: "llm-wiki-btn llm-wiki-btn-danger",
		});
		this.stopBtn.addClass("llm-wiki-hidden");
		this.stopBtn.addEventListener("click", () => this.stopGeneration());
	}

	async newConversation() {
		if (this.isProcessing) return;
		this.plugin.agentCore?.clearHistory();
		this.messagesEl.empty();
		this.currentContent = "";
		this.tokenBuffer = "";
		this.addSystemMessage("新对话已开始。您可以输入问题，或尝试以下指令：\n\n\u2022 **'初始化知识库'** - 创建专题知识库目录结构\n\u2022 **'摄取'** - 处理原始资料\n\u2022 **'查询'** - 搜索知识库\n\u2022 **'Lint'** - 执行整理检查\n\u2022 **'创建知识点'** - 新建知识点页面\n\u2022 **'知识库状态'** - 查看知识库概况");
	}

	private async sendMessage() {
		const text = this.inputEl.value.trim();
		if (!text || this.isProcessing) return;

		this.inputEl.value = "";
		this.isProcessing = true;
		this.sendBtn.addClass("llm-wiki-hidden");
		this.stopBtn.removeClass("llm-wiki-hidden");

		this.addUserMessage(text);
		this.addAssistantMessage("");

		try {
			const agent = this.plugin.agentCore;
			if (!agent) {
				this.updateAssistantMessage("❌ Agent 未初始化，请检查 API Key 设置。");
				return;
			}

				const saveAfterComplete = async (content: string) => {
					this.finalizeAssistantMessage();
					this.autoLog(text, content);
					await this.saveChatHistory();
				};

				if (this.plugin.settings.streamMode) {
					await agent.chatStream(text, {
						onToken: (token) => this.appendToken(token),
						onToolCall: (name, args) => this.showToolCall(name, args),
						onToolResult: (name, result) => this.showToolResult(name, result),
						onComplete: saveAfterComplete,
						onError: (error) => {
							this.updateAssistantMessage(`❌ ${error}`);
							this.finalizeAssistantMessage();
						},
					});
				} else {
					await agent.chatNonStream(text, {
						onToken: (token) => this.appendToken(token),
						onToolCall: (name, args) => this.showToolCall(name, args),
						onToolResult: (name, result) => this.showToolResult(name, result),
						onComplete: saveAfterComplete,
						onError: (error) => {
							this.updateAssistantMessage(`❌ ${error}`);
							this.finalizeAssistantMessage();
						},
					});
				}
		} catch (e: unknown) {
			this.updateAssistantMessage(`❌ 发生错误: ${e instanceof Error ? e.message : String(e)}`);
		} finally {
			this.isProcessing = false;
			this.sendBtn.removeClass("llm-wiki-hidden");
			this.stopBtn.addClass("llm-wiki-hidden");
			this.toolCardEl = null;
			this.inputEl.focus();
		}
	}

	private stopGeneration() {
		this.plugin.agentCore?.abort();
		this.isProcessing = false;
		this.sendBtn.removeClass("llm-wiki-hidden");
		this.stopBtn.addClass("llm-wiki-hidden");
	}

	private async addUserMessage(text: string) {
		const msgDiv = this.messagesEl.createEl("div", { cls: "llm-wiki-message llm-wiki-user-message" });
		msgDiv.createEl("div", { cls: "llm-wiki-message-sender", text: "你" });
		const contentDiv = msgDiv.createEl("div", { cls: "llm-wiki-message-content" });
		await MarkdownRenderer.render(this.app, text, contentDiv, "", this.plugin);
		this.scrollToBottom();
	}

	private addSystemMessage(text: string) {
		const msgDiv = this.messagesEl.createEl("div", { cls: "llm-wiki-message llm-wiki-system-message" });
		const contentDiv = msgDiv.createEl("div", { cls: "llm-wiki-message-content" });
		void MarkdownRenderer.render(this.app, text, contentDiv, "", this.plugin);
	}

	private addAssistantMessage(text: string) {
		const msgDiv = this.messagesEl.createEl("div", { cls: "llm-wiki-message llm-wiki-assistant-message" });
		msgDiv.createEl("div", { cls: "llm-wiki-message-sender", text: "Agent" });
		this.currentAssistantEl = msgDiv.createEl("div", { cls: "llm-wiki-message-content" });
		this.currentContent = text;
		this.tokenBuffer = "";
	}

	private updateAssistantMessage(text: string) {
		if (this.currentAssistantEl) {
			this.currentContent = text;
			this.currentAssistantEl.empty();
			void MarkdownRenderer.render(this.app, text, this.currentAssistantEl, "", this.plugin);
			this.scrollToBottom();
		}
	}

	appendToken(token: string) {
		this.currentContent += token;
		this.tokenBuffer += token;
		if (!this.renderTimer) {
			this.renderTimer = window.setInterval(() => this.flushTokenBuffer(), 50);
		}
		this.scrollToBottom();
	}

	flushTokenBuffer() {
		if (this.renderTimer) {
			window.clearInterval(this.renderTimer);
			this.renderTimer = null;
		}
		if (this.tokenBuffer && this.currentAssistantEl) {
			this.currentAssistantEl.empty();
			void MarkdownRenderer.render(this.app, this.currentContent, this.currentAssistantEl, "", this.plugin);
			this.tokenBuffer = "";
		}
	}

	private finalizeAssistantMessage() {
		this.flushTokenBuffer();
		this.currentAssistantEl = null;
		this.currentContent = "";
	}

	showToolCall(name: string, args: any) {
		const argsStr = JSON.stringify(args, null, 2);
		if (this.currentAssistantEl) {
			const card = this.currentAssistantEl.createEl("div", { cls: "llm-wiki-tool-card llm-wiki-tool-running" });
			card.createEl("div", { cls: "llm-wiki-tool-name", text: `🟡 调用工具: ${name}` });
			const argsPre = card.createEl("pre", { cls: "llm-wiki-tool-args" });
			argsPre.textContent = argsStr;
			this.toolCardEl = card;
		}
		this.scrollToBottom();
	}

	showToolResult(name: string, result: ToolResult) {
		if (this.toolCardEl) {
			const status = result.success ? `🟢 ${name} 完成` : `🔴 ${name} 失败`;
			const nameEl = this.toolCardEl.querySelector(".llm-wiki-tool-name");
			if (nameEl) nameEl.textContent = status;

			this.toolCardEl.removeClass("llm-wiki-tool-running");
			this.toolCardEl.addClass(result.success ? "llm-wiki-tool-success" : "llm-wiki-tool-error");

			if (result.content) {
				const resultDiv = this.toolCardEl.createEl("div", { cls: "llm-wiki-tool-result" });
				resultDiv.textContent = result.content.length > 300 ? result.content.substring(0, 300) + "..." : result.content;
			}

			this.toolCardEl = null;
		}
		this.scrollToBottom();
	}

	private scrollToBottom() {
		this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
	}

	private async autoLog(userMessage: string, assistantReply: string) {
		if (!this.plugin.settings.autoLog || !this.plugin.memoryService) return;
		try {
			const title = userMessage.length > 50 ? userMessage.substring(0, 50) + "..." : userMessage;
			const summary = assistantReply.length > 200 ? assistantReply.substring(0, 200) + "..." : assistantReply;
			await this.plugin.memoryService.writeLog(title, `用户: ${userMessage}`, summary);
		} catch { /* ignore */ }
	}

	private async saveChatHistory() {
		try {
			const history = this.plugin.agentCore?.getHistory();
			if (!history || history.length === 0) return;
			const data = { messages: history, savedAt: new Date().toISOString() };
			const path = normalizePath(`${this.plugin.settings.memoryFolder}/对话历史.json`);
			const file = this.app.vault.getAbstractFileByPath(path);
			if (file && file instanceof TFile) {
				await this.app.vault.modify(file, JSON.stringify(data, null, 2));
			} else {
				await this.app.vault.create(path, JSON.stringify(data, null, 2));
			}
		} catch { /* ignore */ }
	}

	private async loadChatHistory() {
		try {
			const path = normalizePath(`${this.plugin.settings.memoryFolder}/对话历史.json`);
			const file = this.app.vault.getAbstractFileByPath(path);
			if (!file || !(file instanceof TFile)) {
				this.addSystemMessage("欢迎使用 LLM Wiki 知识库助手！\n\n请先完成以下设置：\n1. 在设置中填写 API Key（支持 OpenAI / DeepSeek / 硅基流动等）\n2. 设置知识库路径\n\n然后就可以开始对话了！");
				return;
			}
			const rawData = await this.app.vault.read(file);
			const data = JSON.parse(rawData);
			this.plugin.agentCore?.setHistory(data.messages || []);
			for (const msg of data.messages || []) {
				if (msg.role === "user") {
					this.addUserMessage(msg.content);
				} else if (msg.role === "assistant" && !msg.tool_calls) {
					this.addAssistantMessage(msg.content);
					this.finalizeAssistantMessage();
				}
			}
		} catch {
			this.addSystemMessage("欢迎回来！上次的对话历史加载失败，已开启新对话。");
		}
	}
}
