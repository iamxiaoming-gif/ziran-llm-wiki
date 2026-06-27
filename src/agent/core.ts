import { requestUrl } from "obsidian";
import type { LLMWikiSettings } from "../settings";
import type { ToolRegistry, ToolResult } from "./tools";
import { buildSystemPrompt } from "./prompts";

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
}

interface ChatCompletionChoice {
	message: {
		content?: string;
		tool_calls?: ToolCall[];
	};
}

interface ChatCompletionResponse {
	choices: ChatCompletionChoice[];
}

export class AgentCore {
	settings: LLMWikiSettings;
	toolRegistry: ToolRegistry;
	history: ChatMessage[] = [];
	private systemPrompt: string = "";

	constructor(settings: LLMWikiSettings, toolRegistry: ToolRegistry) {
		this.settings = settings;
		this.toolRegistry = toolRegistry;
	}

	init(skillContent: string = "", referencesContent: string = "", memoryContext: string = "") {
		this.systemPrompt = buildSystemPrompt(this.settings, skillContent, referencesContent, memoryContext);
		this.history = [];
	}

	setHistory(history: ChatMessage[]) {
		this.history = history;
	}

	getHistory(): ChatMessage[] {
		return this.history;
	}

	clearHistory() {
		this.history = [];
	}

	updateSettings(settings: LLMWikiSettings) {
		this.settings = settings;
		this.toolRegistry.updateSettings(settings);
	}

	abort() {
	}

	async chatStream(userMessage: string, callbacks: ChatCallbacks): Promise<void> {
		this.history.push({ role: "user", content: userMessage });

		let fullContent = "";
		let iterationCount = 0;
		const maxIterations = this.settings.maxIterations || 15;

		while (iterationCount < maxIterations) {
			iterationCount++;

			const messages: ChatMessage[] = [
				{ role: "system", content: this.systemPrompt },
				...this.history,
			];

			try {
				const result = await this.streamCompletion(messages, callbacks);
				fullContent = result.content;

				if (result.toolCalls.length === 0) {
					this.history.push({
						role: "assistant",
						content: result.content,
					});
					callbacks.onComplete(fullContent);
					return;
				}

				this.history.push({
					role: "assistant",
					content: result.content || "",
					tool_calls: result.toolCalls,
				});

				for (const toolCall of result.toolCalls) {
					let args: Record<string, unknown> = {};
					try {
						const parsed = JSON.parse(toolCall.function.arguments);
						args = (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed))
							? parsed as Record<string, unknown>
							: {};
					} catch {
						args = {};
					}

					callbacks.onToolCall(toolCall.function.name, args);

					const toolResult = await this.toolRegistry.executeTool(
						toolCall.function.name,
						args
					);

					callbacks.onToolResult(toolCall.function.name, toolResult);

					this.history.push({
						role: "tool",
						content: toolResult.content,
						tool_call_id: toolCall.id,
						name: toolCall.function.name,
					});
				}
			} catch (e: unknown) {
				if (e instanceof Error && e.name === "AbortError") {
					callbacks.onComplete(fullContent);
					return;
				}
				const errorMsg = `请求失败: ${e instanceof Error ? e.message : String(e)}`;
				this.history.push({ role: "assistant", content: errorMsg });
				callbacks.onError(errorMsg);
				return;
			}
		}

		const timeoutMsg = `已达到最大迭代次数(${maxIterations})，请简化问题或分步执行。`;
		this.history.push({ role: "assistant", content: timeoutMsg });
		callbacks.onComplete(timeoutMsg);
	}

	private async streamCompletion(
		messages: ChatMessage[],
		callbacks: ChatCallbacks
	): Promise<{ content: string; toolCalls: ToolCall[] }> {
		const url = `${this.settings.apiBaseUrl}/chat/completions`;
		const body = {
			model: this.settings.modelName,
			messages: messages.map((m) => ({
				role: m.role,
				content: m.content || null,
				tool_calls: m.tool_calls,
				tool_call_id: m.tool_call_id,
				name: m.name,
			})),
			tools: this.toolRegistry.getToolDefinitions(),
			tool_choice: "auto" as const,
			temperature: this.settings.temperature,
			stream: false,
		};

		const response = await requestUrl({
			url,
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${this.settings.apiKey}`,
			},
			body: JSON.stringify(body),
		});

		const data = response.json as ChatCompletionResponse;
		const choice = data.choices?.[0];
		if (!choice) throw new Error("API 返回为空");

		const msg = choice.message;
		const content: string = msg.content || "";
		const toolCalls: ToolCall[] = msg.tool_calls || [];

		if (content) {
			callbacks.onToken(content);
		}

		return { content, toolCalls };
	}

	async chatNonStream(userMessage: string, callbacks: ChatCallbacks): Promise<void> {
		this.history.push({ role: "user", content: userMessage });

		let fullContent = "";
		let iterationCount = 0;
		const maxIterations = this.settings.maxIterations || 15;

		while (iterationCount < maxIterations) {
			iterationCount++;

			const messages: ChatMessage[] = [
				{ role: "system", content: this.systemPrompt },
				...this.history,
			];

			try {
				const result = await this.nonStreamCompletion(messages);
				const content = result.content;

				if (result.toolCalls.length === 0) {
					callbacks.onToken(content);
					this.history.push({ role: "assistant", content });
					fullContent = content;
					callbacks.onComplete(fullContent);
					return;
				}

				this.history.push({
					role: "assistant",
					content: content || "",
					tool_calls: result.toolCalls,
				});

				for (const toolCall of result.toolCalls) {
					let args: Record<string, unknown> = {};
					try {
						const parsed = JSON.parse(toolCall.function.arguments);
						args = (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed))
							? parsed as Record<string, unknown>
							: {};
					} catch {
						args = {};
					}

					callbacks.onToolCall(toolCall.function.name, args);
					const toolResult = await this.toolRegistry.executeTool(
						toolCall.function.name,
						args
					);
					callbacks.onToolResult(toolCall.function.name, toolResult);

					this.history.push({
						role: "tool",
						content: toolResult.content,
						tool_call_id: toolCall.id,
						name: toolCall.function.name,
					});
				}
			} catch (e: unknown) {
				const errorMsg = `请求失败: ${e instanceof Error ? e.message : String(e)}`;
				this.history.push({ role: "assistant", content: errorMsg });
				callbacks.onError(errorMsg);
				return;
			}
		}

		const timeoutMsg = `已达到最大迭代次数(${maxIterations})`;
		this.history.push({ role: "assistant", content: timeoutMsg });
		callbacks.onComplete(timeoutMsg);
	}

	private async nonStreamCompletion(
		messages: ChatMessage[]
	): Promise<{ content: string; toolCalls: ToolCall[] }> {
		const url = `${this.settings.apiBaseUrl}/chat/completions`;
		const body = {
			model: this.settings.modelName,
			messages: messages.map((m) => ({
				role: m.role,
				content: m.content || null,
				tool_calls: m.tool_calls,
				tool_call_id: m.tool_call_id,
				name: m.name,
			})),
			tools: this.toolRegistry.getToolDefinitions(),
			tool_choice: "auto" as const,
			temperature: this.settings.temperature,
			stream: false,
		};

		const maxRetries = 2;
		for (let attempt = 0; attempt <= maxRetries; attempt++) {
			try {
				const response = await requestUrl({
					url,
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${this.settings.apiKey}`,
					},
					body: JSON.stringify(body),
				});

				const data = response.json as ChatCompletionResponse;
				const choice = data.choices?.[0];
				if (!choice) throw new Error("API 返回为空");

				const msg = choice.message;
				return {
					content: msg.content || "",
					toolCalls: msg.tool_calls || [],
				};
			} catch (e: unknown) {
				const status = (typeof e === "object" && e !== null && "status" in e) ? (e as { status: number }).status : 0;
				if (status >= 400 && status < 500) throw e;
				if (attempt < maxRetries) {
					await new Promise((r) => window.setTimeout(r, 1000 * (attempt + 1)));
				} else {
					throw e;
				}
			}
		}

		throw new Error("API 调用失败（已重试）");
	}
}
