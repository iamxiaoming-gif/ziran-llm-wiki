import { ItemView, Notice, WorkspaceLeaf, MarkdownRenderer, normalizePath, TFile } from "obsidian";
import type LLMWikiPlugin from "../main";
import type { ToolResult } from "../agent/tools";
import type { AgentCore, ChatMessage } from "../agent/core";
import type { BackgroundIngestionSnapshot } from "../services/BackgroundIngestionService";

export const VIEW_TYPE_CHAT = "llm-wiki-chat-view";

interface ActiveChatRequest {
	id: number;
	agent: AgentCore;
	stopRequested: boolean;
	settled: boolean;
	outcome: "pending" | "complete" | "error" | "stopped";
	assistantContent: string;
	userMessage: string;
}

export class ChatView extends ItemView {
	plugin: LLMWikiPlugin;
	private messagesEl!: HTMLElement;
	private inputEl!: HTMLTextAreaElement;
	private sendBtn!: HTMLElement;
	private stopBtn!: HTMLElement;
	private isProcessing: boolean = false;
	private progressBarEl!: HTMLElement;
	private progressTextEl!: HTMLElement;
	private operationHistoryEl!: HTMLElement;
	private operationHistoryListEl!: HTMLElement;
	private operationRecords: { time: string; name: string; success: boolean; detail: string }[] = [];
	private historyVisible: boolean = false;
	private modelInfoEl!: HTMLElement;
	private contextInfoEl!: HTMLElement;
	private batchProgressEl!: HTMLElement;
	private batchProgressTitleEl!: HTMLElement;
	private batchProgressDetailEl!: HTMLElement;
	private batchProgressBarEl!: HTMLElement;
	private batchStopBtn!: HTMLButtonElement;
	private batchResumeBtn!: HTMLButtonElement;
	private unsubscribeBatchProgress: (() => void) | null = null;

	currentAssistantEl: HTMLElement | null = null;
	currentContent: string = "";
	private renderTimer: number | null = null;
	private tokenBuffer: string = "";
	private toolCardEl: HTMLElement | null = null;
	private currentAssistantMessageEl: HTMLElement | null = null;
	private requestSequence: number = 0;
	private activeRequest: ActiveChatRequest | null = null;

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
		this.unsubscribeBatchProgress = this.plugin.backgroundIngestionService.subscribe((snapshot) => this.renderBatchProgress(snapshot));
		try {
			this.renderBatchProgress(await this.plugin.backgroundIngestionService.getSnapshot());
		} catch { /* no previous batch */ }
		await this.loadChatHistory();
	}

	async onClose() {
		const request = this.activeRequest;
		if (request && !request.stopRequested && !request.settled) {
			this.stopGeneration();
		}
		if (this.renderTimer) {
			window.clearInterval(this.renderTimer);
			this.renderTimer = null;
		}
		this.unsubscribeBatchProgress?.();
		this.unsubscribeBatchProgress = null;
		await this.saveChatHistory();
	}

	private buildUI(container: HTMLElement) {

		const chatHeader = container.createDiv( { cls: "llm-wiki-chat-header" });
		chatHeader.createEl("h3", { text: "💬 LLM Wiki 知识库助手" });

		this.modelInfoEl = chatHeader.createSpan( { cls: "llm-wiki-model-info" });
		this.contextInfoEl = chatHeader.createSpan( { cls: "llm-wiki-context-info" });
		this.updateModelInfo();
		this.updateContextInfo();

		const headerActions = chatHeader.createDiv( { cls: "llm-wiki-header-actions" });
		const feynmanBtn = headerActions.createEl("button", { text: "🎓 费曼学习", cls: "llm-wiki-btn llm-wiki-btn-sm" });
		feynmanBtn.addEventListener("click", () => void this.plugin.activateFeynmanView());
		
		const historyBtn = headerActions.createEl("button", { text: "📋 操作记录", cls: "llm-wiki-btn llm-wiki-btn-sm" });
		historyBtn.addEventListener("click", () => this.toggleOperationHistory());
		
		const newBtn = headerActions.createEl("button", { text: "新对话", cls: "llm-wiki-btn" });
		newBtn.addEventListener("click", () => void this.newConversation());

		this.batchProgressEl = container.createDiv({ cls: "llm-wiki-batch-progress llm-wiki-hidden" });
		const batchInfo = this.batchProgressEl.createDiv({ cls: "llm-wiki-batch-progress-info" });
		this.batchProgressTitleEl = batchInfo.createEl("strong", { text: "后台摄取" });
		this.batchProgressDetailEl = batchInfo.createSpan( { text: "等待任务" });
		const batchTrack = this.batchProgressEl.createDiv({ cls: "llm-wiki-batch-progress-track" });
		this.batchProgressBarEl = batchTrack.createDiv({ cls: "llm-wiki-batch-progress-bar" });
		const batchActions = this.batchProgressEl.createDiv({ cls: "llm-wiki-batch-progress-actions" });
		this.batchStopBtn = batchActions.createEl("button", { text: "停止", cls: "llm-wiki-btn llm-wiki-btn-sm llm-wiki-btn-danger" });
		this.batchStopBtn.addEventListener("click", () => {
			this.plugin.backgroundIngestionService.requestStop().catch((e: unknown) => {
				const msg = e instanceof Error ? e.message : String(e);
				if (!msg.includes("没有正在运行")) new Notice(`停止摄取失败：${msg}`);
			});
		});
		this.batchResumeBtn = batchActions.createEl("button", { text: "继续", cls: "llm-wiki-btn llm-wiki-btn-sm llm-wiki-btn-primary" });
		this.batchResumeBtn.addEventListener("click", () => void this.plugin.backgroundIngestionService.resume());

		this.messagesEl = container.createDiv( { cls: "llm-wiki-messages" });

		this.operationHistoryEl = container.createDiv( { cls: "llm-wiki-operation-history llm-wiki-hidden" });
		const historyHeader = this.operationHistoryEl.createDiv( { cls: "llm-wiki-history-header" });
		historyHeader.createSpan( { text: "📋 操作历史" });
		const closeHistoryBtn = historyHeader.createEl("button", { text: "关闭", cls: "llm-wiki-btn llm-wiki-btn-sm" });
		closeHistoryBtn.addEventListener("click", () => this.toggleOperationHistory());
		const clearHistoryBtn = historyHeader.createEl("button", { text: "清空", cls: "llm-wiki-btn llm-wiki-btn-sm" });
		clearHistoryBtn.addEventListener("click", () => this.clearOperationHistory());
		this.operationHistoryListEl = this.operationHistoryEl.createDiv( { cls: "llm-wiki-history-list" });

		const progressContainer = container.createDiv( { cls: "llm-wiki-progress-container llm-wiki-hidden" });
		this.progressBarEl = progressContainer.createDiv( { cls: "llm-wiki-progress-bar" });
		this.progressTextEl = progressContainer.createDiv( { cls: "llm-wiki-progress-text", text: "就绪" });

		const inputContainer = container.createDiv( { cls: "llm-wiki-input-container" });

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

		const hintsEl = inputContainer.createDiv( { cls: "llm-wiki-hints" });
		const hints = [
			{ text: "初始化知识库", tip: "创建专题知识库目录结构" },
			{ text: "摄取资料", tip: "处理原始资料文件" },
			{ text: "批量摄取", tip: "扫描原始资料目录，先生成计划再确认执行" },
			{ text: "查询知识", tip: "搜索知识库内容" },
			{ text: "Lint 检查", tip: "执行整理检查" },
			{ text: "知识库状态", tip: "查看知识库概况" },
		];
		for (const h of hints) {
			const chip = hintsEl.createSpan( { cls: "llm-wiki-hint-chip", text: h.text, attr: { title: h.tip } });
			chip.addEventListener("click", () => {
				this.inputEl.value = h.text;
				this.inputEl.focus();
			});
		}

		const btnRow = inputContainer.createDiv( { cls: "llm-wiki-btn-row" });

		this.sendBtn = btnRow.createEl("button", { text: "发送", cls: "llm-wiki-btn llm-wiki-btn-primary" });
		this.sendBtn.addEventListener("click", () => void this.sendMessage());

		this.stopBtn = btnRow.createEl("button", {
			text: "停止",
			cls: "llm-wiki-btn llm-wiki-btn-danger",
		});
		this.stopBtn.addClass("llm-wiki-hidden");
		this.stopBtn.addEventListener("click", () => this.stopGeneration());
	}

	private renderBatchProgress(snapshot: BackgroundIngestionSnapshot): void {
		if (!this.batchProgressEl) return;
		const total = Object.values(snapshot.totals).reduce((sum, value) => sum + value, 0);
		const isCompleted = snapshot.status === "completed" || snapshot.status === "completed_with_errors";
		if (total === 0 || isCompleted) {
			this.batchProgressEl.addClass("llm-wiki-hidden");
			return;
		}
		const done = snapshot.totals.completed + snapshot.totals.skipped + snapshot.totals.failed;
		const percent = total > 0 ? Math.min(100, Math.round(done / total * 100)) : 0;
		this.batchProgressEl.removeClass("llm-wiki-hidden");
		const statusLabel = snapshot.status === "stopping" ? "正在停止" : snapshot.status === "active" ? "运行中" : snapshot.status === "paused" ? "已暂停" : snapshot.status;
		this.batchProgressTitleEl.textContent = `后台摄取 · ${statusLabel} · ${done}/${total}`;
		this.batchProgressDetailEl.textContent = snapshot.currentFile || snapshot.message || `批次 ${snapshot.batchId}`;
		this.batchProgressDetailEl.setAttribute("title", snapshot.currentFile || snapshot.message);
		this.batchProgressBarEl.style.width = `${percent}%`;
		this.batchStopBtn.disabled = snapshot.status !== "active" && snapshot.status !== "stopping";
		this.batchStopBtn.setText(snapshot.status === "stopping" ? "停止中…" : "停止");
		this.batchResumeBtn.disabled = snapshot.status !== "paused";
	}

	private updateModelInfo() {
		if (!this.modelInfoEl) return;
		this.modelInfoEl.textContent = `${this.plugin.settings.modelName}`;
	}

	private updateContextInfo() {
		if (!this.contextInfoEl) return;
		const status = this.plugin.agentCore?.getContextStatus();
		if (!status) {
			this.contextInfoEl.textContent = "上下文: --";
			return;
		}
		const used = status.estimatedTokens >= 1000
			? `${(status.estimatedTokens / 1000).toFixed(1)}k`
			: String(status.estimatedTokens);
		const max = status.maxTokens >= 1000 ? `${(status.maxTokens / 1000).toFixed(0)}k` : String(status.maxTokens);
		const state = status.compressed ? " · 已压缩" : status.usageRatio >= 0.8 ? " · 接近上限" : "";
		this.contextInfoEl.textContent = `上下文: ${used}/${max} · ${status.turns}轮${state}`;
		this.contextInfoEl.setAttribute("title", "上下文 token 为估算值，不等同于供应商计费 token");
	}

	async newConversation() {
		if (this.isProcessing) return;
		this.plugin.agentCore?.clearHistory();
		this.messagesEl.empty();
		this.currentContent = "";
		this.tokenBuffer = "";
		this.addSystemMessage("新对话已开始。您可以输入问题，或尝试以下指令：\n\n\u2022 **'初始化知识库'** - 创建专题知识库目录结构\n\u2022 **'摄取'** - 处理原始资料\n\u2022 **'查询'** - 搜索知识库\n\u2022 **'Lint'** - 执行整理检查\n\u2022 **'创建知识点'** - 新建知识点页面\n\u2022 **'知识库状态'** - 查看知识库概况");
		await this.saveChatHistory(true);
		this.updateContextInfo();
	}

	private async sendMessage() {
		const text = this.inputEl.value.trim();
		if (!text || this.isProcessing) return;
		const agent = this.plugin.agentCore;

		this.inputEl.value = "";
		this.isProcessing = true;
		this.sendBtn.addClass("llm-wiki-hidden");
		this.stopBtn.removeClass("llm-wiki-hidden");
		this.updateModelInfo();

		void this.addUserMessage(text);
		this.addAssistantMessage("");

		if (!agent) {
			this.updateAssistantMessage("❌ Agent 未初始化，请检查设置。");
			this.finalizeAssistantMessage();
			this.resetRequestUI();
			return;
		}

		const request: ActiveChatRequest = {
			id: ++this.requestSequence,
			agent,
			stopRequested: false,
			settled: false,
			outcome: "pending",
			assistantContent: "",
			userMessage: text,
		};
		this.activeRequest = request;

		try {
			const callbacks = {
				onToken: (token: string) => {
					if (this.canUpdateRequest(request)) this.appendToken(token);
				},
				onToolCall: (name: string, args: Record<string, unknown>) => {
					if (this.canUpdateRequest(request)) this.showToolCall(name, args);
				},
				onToolResult: (name: string, result: ToolResult) => {
					if (!this.isCurrentRequest(request)) return;
					if (request.stopRequested) {
						// 已开始的工具无法安全回滚，仍展示并记录它的真实执行结果。
						this.showToolResult(name, result);
						return;
					}
					if (!request.settled) this.showToolResult(name, result);
				},
				onIteration: (current: number, max: number) => {
					if (this.canUpdateRequest(request)) this.updateProgressBar(current, max);
				},
				onComplete: (content: string) => {
					if (!this.canSettleRequest(request)) return;
					request.settled = true;
					request.outcome = "complete";
					request.assistantContent = content;
					this.updateAssistantMessage(content);
					this.finalizeAssistantMessage();
				},
				onError: (error: string) => {
					if (!this.canSettleRequest(request)) return;
					request.settled = true;
					request.outcome = "error";
					request.assistantContent = `❌ ${error}`;
					this.updateAssistantMessage(`❌ ${error}`);
					this.finalizeAssistantMessage();
				},
			};

			await agent.chatStream(text, callbacks);
		} catch (e: unknown) {
			if (this.canSettleRequest(request)) {
				request.settled = true;
				request.outcome = "error";
				request.assistantContent = `❌ 发生错误: ${e instanceof Error ? e.message : String(e)}`;
				this.updateAssistantMessage(request.assistantContent);
				this.finalizeAssistantMessage();
			}
		} finally {
			if (request.stopRequested) {
				this.syncStoppedHistory(request);
			}
			if (request.outcome === "complete") {
				await this.autoLog(text, request.assistantContent);
			}
			await this.saveChatHistory();
			this.updateContextInfo();
			if (this.isCurrentRequest(request)) {
				this.activeRequest = null;
				this.resetRequestUI();
			}
		}
	}

	private stopGeneration() {
		const request = this.activeRequest;
		if (!request || request.stopRequested || request.settled) return;

		request.stopRequested = true;
		request.settled = true;
		request.outcome = "stopped";
		request.agent.abort();

		this.flushTokenBuffer();
		const partialContent = this.currentContent.replace(/\s+$/, "");
		const stopNotice = "_（已按你的要求停止生成；已完成的工具操作会保留，正在执行的工具操作可能仍会完成。）_";
		request.assistantContent = partialContent
			? `${partialContent}\n\n${stopNotice}`
			: `已停止生成。\n\n${stopNotice}`;
		this.updateAssistantMessage(request.assistantContent);
		this.finalizeAssistantMessage();
		if (this.toolCardEl) {
			const nameEl = this.toolCardEl.querySelector(".llm-wiki-tool-name");
			if (nameEl) nameEl.textContent = "🟡 已请求停止；当前工具可能仍在执行";
		}
		this.hideProgressBar();

		// 等当前 Agent Promise 真正退出后再允许新请求，避免新请求重置旧请求的停止标记。
		this.stopBtn.textContent = "正在停止…";
		this.activeRequest = null;
		this.resetRequestUI();
	}

	private isCurrentRequest(request: ActiveChatRequest): boolean {
		return this.activeRequest?.id === request.id;
	}

	private canUpdateRequest(request: ActiveChatRequest): boolean {
		return this.isCurrentRequest(request) && !request.stopRequested && !request.settled;
	}

	private canSettleRequest(request: ActiveChatRequest): boolean {
		return this.isCurrentRequest(request) && !request.stopRequested && !request.settled;
	}

	private syncStoppedHistory(request: ActiveChatRequest) {
		const history = request.agent.getHistory();
		let userIndex = -1;
		for (let index = history.length - 1; index >= 0; index--) {
			const message = history[index];
			if (message.role === "user" && message.content === request.userMessage) {
				userIndex = index;
				break;
			}
		}

		if (userIndex < 0) return;
		for (let index = history.length - 1; index > userIndex; index--) {
			const message = history[index];
			if (message.role === "assistant" && !message.tool_calls) {
				message.content = request.assistantContent;
				return;
			}
		}
		history.push({ role: "assistant", content: request.assistantContent });
	}

	private resetRequestUI() {
		this.isProcessing = false;
		this.sendBtn.removeClass("llm-wiki-hidden");
		this.stopBtn.addClass("llm-wiki-hidden");
		this.stopBtn.textContent = "停止";
		this.stopBtn.removeAttribute("disabled");
		this.toolCardEl = null;
		this.hideProgressBar();
		this.inputEl.focus();
	}

	private async addUserMessage(text: string) {
		const msgDiv = this.messagesEl.createDiv( { cls: "llm-wiki-message llm-wiki-user-message" });
		msgDiv.createDiv( { cls: "llm-wiki-message-sender", text: "你" });
		const contentDiv = msgDiv.createDiv( { cls: "llm-wiki-message-content" });
		await MarkdownRenderer.render(this.app, text, contentDiv, "", this);
		this.setupWikiLinkHandler(contentDiv);
		this.scrollToBottom();
	}

	private addSystemMessage(text: string) {
		const msgDiv = this.messagesEl.createDiv( { cls: "llm-wiki-message llm-wiki-system-message" });
		const contentDiv = msgDiv.createDiv( { cls: "llm-wiki-message-content" });
		void MarkdownRenderer.render(this.app, text, contentDiv, "", this);
		this.setupWikiLinkHandler(contentDiv);
	}

	private addAssistantMessage(text: string) {
		const msgDiv = this.messagesEl.createDiv( { cls: "llm-wiki-message llm-wiki-assistant-message" });
		const senderRow = msgDiv.createDiv( { cls: "llm-wiki-message-sender" });
		senderRow.createSpan({ text: "Agent" });
		const copyBtn = senderRow.createEl("button", { cls: "llm-wiki-copy-btn", text: "复制" });
		copyBtn.addEventListener("click", () => {
			void (async () => {
				try {
					await navigator.clipboard.writeText(text);
					copyBtn.textContent = "已复制 ✓";
				} catch {
					// 剪贴板不可用时回退到选择文本
					window.getSelection()?.selectAllChildren(this.currentAssistantEl ?? msgDiv);
					copyBtn.textContent = "已选中";
				}
				window.setTimeout(() => {
					copyBtn.textContent = "复制";
				}, 1800);
			})();
		});
		this.currentAssistantMessageEl = msgDiv;
		this.currentAssistantEl = msgDiv.createDiv( { cls: "llm-wiki-message-content" });
		this.currentContent = text;
		this.tokenBuffer = "";
	}

	private updateAssistantMessage(text: string) {
		if (this.currentAssistantEl) {
			this.currentContent = text;
			this.currentAssistantEl.empty();
			void MarkdownRenderer.render(this.app, text, this.currentAssistantEl, "", this);
			this.setupWikiLinkHandler(this.currentAssistantEl);
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
			void MarkdownRenderer.render(this.app, this.currentContent, this.currentAssistantEl, "", this);
			this.setupWikiLinkHandler(this.currentAssistantEl);
			this.tokenBuffer = "";
		}
	}

	private finalizeAssistantMessage() {
		this.flushTokenBuffer();
		this.currentAssistantMessageEl = null;
		this.currentAssistantEl = null;
		this.currentContent = "";
	}

	showToolCall(name: string, args: Record<string, unknown>) {
		this.flushTokenBuffer();
		const argsStr = JSON.stringify(args, null, 2);
		if (this.currentAssistantMessageEl) {
			const card = this.currentAssistantMessageEl.createDiv( { cls: "llm-wiki-tool-card llm-wiki-tool-running" });
			// Keep all process cards before the answer so the final reply is always
			// the last thing the user sees in this message.
			if (this.currentAssistantEl) this.currentAssistantMessageEl.insertBefore(card, this.currentAssistantEl);
			card.createDiv( { cls: "llm-wiki-tool-name", text: `🟡 调用工具: ${name}` });
			const details = card.createEl("details", { cls: "llm-wiki-tool-details" });
			details.createEl("summary", { text: "查看执行参数" });
			const argsPre = details.createEl("pre", { cls: "llm-wiki-tool-args" });
			argsPre.textContent = argsStr;
			this.toolCardEl = card;
		}
		this.scrollToBottom();
	}

	showToolResult(name: string, result: ToolResult) {
		this.recordOperation(name, result.success, result.content);
		if (this.toolCardEl) {
			const status = result.success ? `🟢 ${name} 完成` : `🔴 ${name} 失败`;
			const nameEl = this.toolCardEl.querySelector(".llm-wiki-tool-name");
			if (nameEl) nameEl.textContent = status;

			this.toolCardEl.removeClass("llm-wiki-tool-running");
			this.toolCardEl.addClass(result.success ? "llm-wiki-tool-success" : "llm-wiki-tool-error");

			if (result.content) {
				const resultDiv = this.toolCardEl.createDiv( { cls: "llm-wiki-tool-result" });
				resultDiv.textContent = this.formatToolResultPreview(name, result);
			}

			this.toolCardEl = null;
		}
		this.scrollToBottom();
	}

	private formatToolResultPreview(name: string, result: ToolResult): string {
		if (!result.success) {
			return result.content.length > 300 ? result.content.substring(0, 300) + "..." : result.content;
		}
		if (name.includes("ingestion")) return "摄取步骤结果已记录。";
		if (name.includes("search") || name.includes("read") || name.includes("list")) return "知识库信息已获取。";
		return "工具执行结果已记录。";
	}

	private updateProgressBar(current: number, max: number) {
		const pct = Math.min(100, Math.round((current / max) * 100));
		this.progressBarEl.setCssProps({ "--llm-wiki-progress": `${pct}%` });
		this.progressTextEl.textContent = `第 ${current}/${max} 轮`;
		const container = this.progressBarEl.parentElement;
		if (container) {
			container.removeClass("llm-wiki-hidden");
		}
	}

	private hideProgressBar() {
		const container = this.progressBarEl.parentElement;
		if (container) {
			container.addClass("llm-wiki-hidden");
			this.progressBarEl.setCssProps({ "--llm-wiki-progress": "0%" });
			this.progressTextEl.textContent = "就绪";
		}
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

	private async saveChatHistory(includeEmpty = false) {
		try {
			const history = this.plugin.agentCore?.getHistory();
			if (!history || (!includeEmpty && history.length === 0)) return;
			const persistedHistory = this.plugin.historySanitizer
				? this.plugin.historySanitizer.sanitize(history)
				: history;
			const data = { messages: persistedHistory, savedAt: new Date().toISOString() };
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
				this.addSystemMessage("欢迎使用 LLM Wiki 知识库助手！\n\n请先完成以下设置：\n1. 在设置中选择模型供应商并填写 API Key\n2. 设置知识库路径\n\n然后就可以开始对话了！");
				return;
			}
			const rawData = await this.app.vault.read(file);
			const data = JSON.parse(rawData) as { messages: ChatMessage[]; savedAt: string };
			const storedMessages = Array.isArray(data.messages) ? data.messages : [];
			const messages = this.plugin.historySanitizer
				? this.plugin.historySanitizer.sanitizeForRuntime(storedMessages)
				: storedMessages;
			this.plugin.agentCore?.setHistory(messages);
			this.updateContextInfo();
			if (messages.length === 0) {
				this.addSystemMessage("新对话已开始，可以继续输入问题。");
				return;
			}
			for (const msg of messages) {
				if (msg.role === "user") {
					void this.addUserMessage(msg.content);
				} else if (msg.role === "assistant" && !msg.tool_calls) {
					this.addAssistantMessage(msg.content);
					this.updateAssistantMessage(msg.content);
					this.finalizeAssistantMessage();
				}
			}
		} catch {
			this.addSystemMessage("欢迎回来！上次的对话历史加载失败，已开启新对话。");
		}
	}

	private setupWikiLinkHandler(el: HTMLElement) {
		el.addEventListener("click", (e) => {
			const target = e.target as HTMLElement;
			const anchor = target.closest("a");
			if (!anchor) return;
			const href = anchor.getAttribute("data-href") || anchor.getAttribute("href") || "";
			if (href && !href.startsWith("http")) {
				e.preventDefault();
				e.stopPropagation();
				const file = this.app.vault.getAbstractFileByPath(href);
				if (file instanceof TFile) {
					void this.app.workspace.getLeaf().openFile(file);
				} else if (file) {
					this.inputEl.value = `帮我查看 ${href}`;
					this.inputEl.focus();
				}
			}
		});
	}

	private recordOperation(name: string, success: boolean, detail: string) {
		const now = new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
		this.operationRecords.unshift({ time: now, name, success, detail: detail.length > 100 ? detail.substring(0, 100) + "..." : detail });
		if (this.operationRecords.length > 100) this.operationRecords.length = 100;
		if (this.historyVisible) this.renderOperationHistory();
	}

	private renderOperationHistory() {
		if (!this.operationHistoryListEl) return;
		const list = this.operationHistoryListEl;
		list.empty();
		for (const r of this.operationRecords.slice(0, 50)) {
			const item = list.createDiv( { cls: "llm-wiki-history-item" });
			const icon = r.success ? "✅" : "❌";
			item.createSpan( { cls: "llm-wiki-history-time", text: r.time });
			item.createSpan( { cls: "llm-wiki-history-name", text: `${icon} ${r.name}` });
			if (r.detail) {
				item.createDiv( { cls: "llm-wiki-history-detail", text: r.detail });
			}
		}
	}

	private toggleOperationHistory() {
		this.historyVisible = !this.historyVisible;
		if (this.operationHistoryEl) {
			if (this.historyVisible) {
				this.operationHistoryEl.removeClass("llm-wiki-hidden");
				this.renderOperationHistory();
			} else {
				this.operationHistoryEl.addClass("llm-wiki-hidden");
			}
		}
	}

	private clearOperationHistory() {
		this.operationRecords = [];
		this.renderOperationHistory();
	}
}
