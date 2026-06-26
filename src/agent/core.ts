import { requestUrl } from "obsidian";
import type { LLMWikiSettings } from "../settings";
import type { ToolRegistry, ToolResult } from "./tools";
import { buildSystemPrompt } from "./prompts";

export interface ChatMessage {
	role: "system" | "user" | "assistant" | "tool";
	content: string;
	tool_calls?: any[];
	tool_call_id?: string;
	name?: string;
}

export interface ChatCallbacks {
	onToken: (token: string) => void;
	onToolCall: (name: string, args: any) => void;
	onToolResult: (name: string, result: ToolResult) => void;
	onComplete: (fullContent: string) => void;
	onError: (error: string) => void;
}

export class AgentCore {
	settings: LLMWikiSettings;
	toolRegistry: ToolRegistry;
	history: ChatMessage[] = [];
	abortController: AbortController | null = null;
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
		if (this.abortController) {
			this.abortController.abort();
			this.abortController = null;
		}
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
					let args: any = {};
					try {
						args = JSON.parse(toolCall.function.arguments);
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
	): Promise<{ content: string; toolCalls: any[] }> {
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
			stream: true,
		};

		this.abortController = new AbortController();

		// eslint-disable-next-line obsidianmd/no-fetch -- fetch needed for SSE streaming, requestUrl doesn't support it
		const response = await fetch(url, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${this.settings.apiKey}`,
			},
			body: JSON.stringify(body),
			signal: this.abortController?.signal,
		});

		if (!response.ok) {
			const errorText = await response.text().catch(() => "未知错误");
			throw new Error(`API 请求失败: ${response.status} ${errorText}`);
		}

		const reader = response.body?.getReader();
		if (!reader) throw new Error("无法获取响应流");

		const decoder = new TextDecoder();
		let buffer = "";
		let content = "";

		const toolCallsMap = new Map<
			number,
			{ id: string; type: string; function: { name: string; arguments: string } }
		>();

		while (true) {
			const { done, value } = await reader.read();
			if (done) break;

			buffer += decoder.decode(value, { stream: true });
			const lines = buffer.split("\n");
			buffer = lines.pop() || "";

			for (const line of lines) {
				const trimmed = line.trim();
				if (!trimmed || trimmed === "data: [DONE]") continue;
				if (!trimmed.startsWith("data: ")) continue;

				try {
					const data = JSON.parse(trimmed.slice(6));
					const delta = data.choices?.[0]?.delta;

					if (!delta) continue;

					if (delta.content) {
						content += delta.content;
						callbacks.onToken(delta.content);
					}

					if (delta.tool_calls) {
						for (const tc of delta.tool_calls) {
							const idx = tc.index ?? 0;
							if (!toolCallsMap.has(idx)) {
								toolCallsMap.set(idx, {
									id: "",
									type: "function",
									function: { name: "", arguments: "" },
								});
							}
							const existing = toolCallsMap.get(idx)!;
							if (tc.id) existing.id += tc.id;
							if (tc.function?.name)
								existing.function.name += tc.function.name;
							if (tc.function?.arguments)
								existing.function.arguments += tc.function.arguments;
						}
					}
				} catch {
					continue;
				}
			}
		}

		const toolCalls = Array.from(toolCallsMap.values()).filter((tc) => tc.id);

		this.abortController = null;
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
					let args: any = {};
					try {
						args = JSON.parse(toolCall.function.arguments);
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
			} catch (e: any) {
				const errorMsg = `请求失败: ${e.message}`;
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
	): Promise<{ content: string; toolCalls: any[] }> {
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

				const choice = response.json.choices?.[0];
				if (!choice) throw new Error("API 返回为空");

				const msg = choice.message || {};
				return {
					content: msg.content || "",
					toolCalls: msg.tool_calls || [],
				};
			} catch (e: unknown) {
				const status = (e as Record<string, number>)?.status || 0;
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
