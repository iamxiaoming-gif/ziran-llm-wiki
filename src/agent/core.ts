import { requestUrl } from "obsidian";
import type { LLMWikiSettings } from "../settings";
import type { ContextManager } from "../services/ContextManager";
import { ProviderAdapter } from "../services/ProviderAdapter";
import type { ToolRegistry, ToolResult } from "./tools";

export interface ToolCallFunction {
	name: string;
	arguments: string;
}

export interface ToolCall {
	id: string;
	type: "function";
	function: ToolCallFunction;
}

export interface ChatMessage {
	role: "system" | "user" | "assistant" | "tool";
	content: string;
	tool_calls?: ToolCall[];
	tool_call_id?: string;
	name?: string;
}

export interface ChatCallbacks {
	onToken: (token: string) => void;
	onToolCall: (name: string, args: Record<string, unknown>) => void;
	onToolResult: (name: string, result: ToolResult) => void;
	onComplete: (fullContent: string) => void;
	onError: (error: string) => void;
	onIteration?: (current: number, max: number) => void;
}

export interface ContextStatus {
	estimatedTokens: number;
	maxTokens: number;
	usageRatio: number;
	turns: number;
	compressed: boolean;
}

interface ChatCompletionResponse {
	choices?: Array<{
		message?: {
			content?: string | null;
			tool_calls?: ToolCall[];
		};
		delta?: {
			content?: string | null;
			tool_calls?: ToolCall[];
		};
	}>;
	error?: { message?: string };
}

interface RequestContext {
	id: number;
	aborted: boolean;
}

export class AgentCore {
	settings: LLMWikiSettings;
	toolRegistry: ToolRegistry;
	history: ChatMessage[] = [];
	private systemPrompt = "";
	private requestSequence = 0;
	private activeRequest: RequestContext | null = null;
	private providerAdapter = new ProviderAdapter();

	constructor(
		settings: LLMWikiSettings,
		toolRegistry: ToolRegistry,
		private contextManager?: ContextManager
	) {
		this.settings = settings;
		this.toolRegistry = toolRegistry;
	}

	init(systemPrompt: string = ""): void {
		this.systemPrompt = systemPrompt;
		this.history = [];
	}

	updateSystemContext(systemPrompt: string): void {
		this.systemPrompt = systemPrompt;
	}

	setHistory(history: ChatMessage[]): void {
		this.history = history;
	}

	getHistory(): ChatMessage[] {
		return this.history;
	}

	getContextStatus(): ContextStatus {
		const compressed = this.history.some((message) => message.content.startsWith("[历史对话摘要]"));
		if (!this.contextManager) {
			const estimatedTokens = Math.ceil(JSON.stringify(this.history).length / 2);
			return {
				estimatedTokens,
				maxTokens: 8000,
				usageRatio: estimatedTokens / 8000,
				turns: this.history.filter((message) => message.role === "user").length,
				compressed,
			};
		}
		const overheadTokens = this.contextManager.estimateTokens(this.systemPrompt)
			+ this.contextManager.estimateTokens(JSON.stringify(this.toolRegistry.getToolDefinitions()));
		const stats = this.contextManager.getSummaryStats(this.history, overheadTokens);
		return {
			estimatedTokens: stats.totalTokens,
			maxTokens: stats.maxTokens,
			usageRatio: stats.maxTokens > 0 ? stats.totalTokens / stats.maxTokens : 0,
			turns: this.history.filter((message) => message.role === "user").length,
			compressed,
		};
	}

	clearHistory(): void {
		this.history = [];
	}

	updateSettings(settings: LLMWikiSettings): void {
		this.settings = settings;
		this.toolRegistry.updateSettings(settings);
	}

	abort(): void {
		if (this.activeRequest) this.activeRequest.aborted = true;
	}

	async chatStream(userMessage: string, callbacks: ChatCallbacks): Promise<void> {
		const request = this.beginRequest(userMessage);
		const maxIterations = this.settings.maxIterations || 30;

		try {
			for (let iteration = 1; iteration <= maxIterations; iteration++) {
				if (this.isRequestAborted(request)) {
					this.settleAbort(callbacks);
					return;
				}
				callbacks.onIteration?.(iteration, maxIterations);

				const result = await this.nonStreamCompletion(this.buildMessages(), request);
				if (this.isRequestAborted(request)) {
					this.settleAbort(callbacks);
					return;
				}

				if (result.toolCalls.length === 0) {
					const finalContent = result.content.trim();
					if (!finalContent) throw new Error("模型未返回最终答复，请重试。已完成的工具操作不会丢失。");
					this.history.push({ role: "assistant", content: finalContent });
					if (this.isRequestAborted(request)) {
						callbacks.onComplete(finalContent);
						return;
					}
					await this.streamTokens(finalContent, request, callbacks);
					callbacks.onComplete(finalContent);
					return;
				}

				this.history.push({
					role: "assistant",
					content: result.content,
					tool_calls: result.toolCalls,
				});

				for (const toolCall of result.toolCalls) {
					if (this.isRequestAborted(request)) {
						this.appendCancelledToolResults(result.toolCalls, toolCall);
						return;
					}
					await this.executeToolCall(toolCall, callbacks);
				}
			}

			const message = `任务尚未完成：已达到最大执行轮数（${maxIterations}）。已完成的操作已保留，请发送“继续”恢复处理。`;
			this.history.push({ role: "assistant", content: message });
			callbacks.onComplete(message);
		} catch (error: unknown) {
			if (this.isRequestAborted(request)) this.settleAbort(callbacks);
			else this.finishWithError(error, callbacks);
		} finally {
			if (this.activeRequest?.id === request.id) this.activeRequest = null;
		}
	}

	async chatNonStream(userMessage: string, callbacks: ChatCallbacks): Promise<void> {
		const request = this.beginRequest(userMessage);
		const maxIterations = this.settings.maxIterations || 30;

		try {
			for (let iteration = 1; iteration <= maxIterations; iteration++) {
				if (this.isRequestAborted(request)) {
					this.settleAbort(callbacks);
					return;
				}
				callbacks.onIteration?.(iteration, maxIterations);

				const result = await this.nonStreamCompletion(this.buildMessages(), request);
				if (this.isRequestAborted(request)) {
					this.settleAbort(callbacks);
					return;
				}

				if (result.toolCalls.length === 0) {
					const finalContent = result.content.trim();
					if (!finalContent) throw new Error("模型未返回最终答复，请重试。已完成的工具操作不会丢失。");
					this.history.push({ role: "assistant", content: finalContent });
					callbacks.onComplete(finalContent);
					return;
				}

				this.history.push({
					role: "assistant",
					content: result.content,
					tool_calls: result.toolCalls,
				});

				for (const toolCall of result.toolCalls) {
					if (this.isRequestAborted(request)) {
						this.appendCancelledToolResults(result.toolCalls, toolCall);
						return;
					}
					await this.executeToolCall(toolCall, callbacks);
				}
			}

			const message = `任务尚未完成：已达到最大执行轮数（${maxIterations}）。已完成的操作已保留，请发送“继续”恢复处理。`;
			this.history.push({ role: "assistant", content: message });
			callbacks.onComplete(message);
		} catch (error: unknown) {
			if (this.isRequestAborted(request)) this.settleAbort(callbacks);
			else this.finishWithError(error, callbacks);
		} finally {
			if (this.activeRequest?.id === request.id) this.activeRequest = null;
		}
	}

	private settleAbort(callbacks: ChatCallbacks, partialContent = ""): void {
		const content = (partialContent || "").trim();
		callbacks.onComplete(content
			? `${content}\n\n_（已按你的要求停止生成；已完成的工具操作会保留，正在执行的工具操作可能仍会完成。）_`
			: "已停止生成。");
	}

	private async streamTokens(text: string, request: RequestContext, callbacks: ChatCallbacks): Promise<void> {
		if (!text) return;
		const chunkSize = 2;
		const delayMs = 16;
		for (let i = 0; i < text.length; i += chunkSize) {
			if (this.isRequestAborted(request)) return;
			const chunk = text.slice(i, i + chunkSize);
			callbacks.onToken(chunk);
			if (i + chunkSize < text.length) {
				await new Promise((resolve) => window.setTimeout(resolve, delayMs));
			}
		}
	}

	private beginRequest(userMessage: string): RequestContext {
		if (this.activeRequest) this.activeRequest.aborted = true;
		const request = { id: ++this.requestSequence, aborted: false };
		this.activeRequest = request;
		this.toolRegistry.beginUserTurn();
		this.history.push({ role: "user", content: userMessage });
		return request;
	}

	private buildMessages(): ChatMessage[] {
		return [{ role: "system", content: this.systemPrompt }, ...this.history];
	}

	private async executeToolCall(toolCall: ToolCall, callbacks: ChatCallbacks): Promise<void> {
		const args = this.parseToolArguments(toolCall.function.arguments);
		callbacks.onToolCall(toolCall.function.name, args);
		const result = await this.toolRegistry.executeTool(toolCall.function.name, args);
		callbacks.onToolResult(toolCall.function.name, result);
		this.history.push({
			role: "tool",
			content: result.content,
			tool_call_id: toolCall.id,
			name: toolCall.function.name,
		});
	}

	private parseToolArguments(rawArguments: string): Record<string, unknown> {
		try {
			const parsed: unknown = JSON.parse(rawArguments || "{}");
			return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
				? parsed as Record<string, unknown>
				: {};
		} catch {
			return {};
		}
	}

	private appendCancelledToolResults(toolCalls: ToolCall[], firstCancelled: ToolCall): void {
		const start = toolCalls.indexOf(firstCancelled);
		for (const toolCall of toolCalls.slice(Math.max(0, start))) {
			this.history.push({
				role: "tool",
				content: "用户已停止生成，此工具未执行。",
				tool_call_id: toolCall.id,
				name: toolCall.function.name,
			});
		}
	}

	private async nonStreamCompletion(
		messages: ChatMessage[],
		request: RequestContext
	): Promise<{ content: string; toolCalls: ToolCall[] }> {
		const config = this.providerAdapter.getRequestConfig(this.settings);
		const body = JSON.stringify({
			model: this.settings.modelName,
			messages: this.serializeMessages(messages),
			tools: this.toolRegistry.getToolDefinitions(),
			tool_choice: "auto",
			temperature: this.providerAdapter.normalizeTemperature(this.settings),
			stream: false,
		});

		const maxRetries = 2;
		for (let attempt = 0; attempt <= maxRetries; attempt++) {
			if (this.isRequestAborted(request)) throw new Error("AbortError");
			try {
				const response = await requestUrl({
					url: config.url,
					method: "POST",
					headers: config.headers,
					body,
				});
				return this.readResponse(response.json as ChatCompletionResponse);
			} catch (error: unknown) {
				const status = typeof error === "object" && error !== null && "status" in error
					? Number((error as Record<string, unknown>).status)
					: 0;
				if ((status >= 400 && status < 500) || attempt === maxRetries) throw error;
				await new Promise((resolve) => window.setTimeout(resolve, 1000 * (attempt + 1)));
			}
		}
		throw new Error("API 调用失败（已重试）");
	}

	private readResponse(data: ChatCompletionResponse): { content: string; toolCalls: ToolCall[] } {
		if (data.error?.message) throw new Error(data.error.message);
		const message = data.choices?.[0]?.message;
		if (!message) throw new Error("API 返回为空");
		return {
			content: message.content || "",
			toolCalls: Array.isArray(message.tool_calls) ? message.tool_calls : [],
		};
	}

	private serializeMessages(messages: ChatMessage[]) {
		return messages.map((message) => ({
			role: message.role,
			content: message.content || (message.tool_calls ? null : ""),
			tool_calls: message.tool_calls,
			tool_call_id: message.tool_call_id,
			name: message.name,
		}));
	}

	private isRequestAborted(request: RequestContext): boolean {
		return request.aborted || this.activeRequest?.id !== request.id;
	}

	private finishWithError(error: unknown, callbacks: ChatCallbacks): void {
		const detail = error instanceof Error ? error.message : String(error);
		const message = detail === "AbortError" ? "已停止生成。" : `请求失败: ${detail}`;
		this.history.push({ role: "assistant", content: message });
		callbacks.onError(message);
	}
}
