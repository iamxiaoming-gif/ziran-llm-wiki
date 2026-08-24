import type { ChatMessage, ToolCall } from "../agent/core";

const INGESTION_TOOLS = new Set([
	"ingest_raw_material",
	"get_next_ingestion_item",
	"plan_ingestion_batch",
]);

const LEGACY_STREAM_FALLBACK = /_?（流式连接不可用，已自动切换为非流式模式。）_?\s*/g;

export class HistorySanitizer {
	/**
	 * Persisted tool chains are useful for audit, but replaying them after a
	 * restart can poison the model with stale batch ids and truncated tool
	 * results. Runtime history therefore keeps only completed user/final-answer
	 * pairs and removes the legacy stream fallback text.
	 */
	sanitizeForRuntime(history: ChatMessage[]): ChatMessage[] {
		const completedTurns: ChatMessage[][] = [];
		let currentUser: ChatMessage | null = null;

		for (const message of Array.isArray(history) ? history : []) {
			if (message.role === "user") {
				currentUser = { role: "user", content: message.content || "" };
				continue;
			}
			if (message.role !== "assistant" || message.tool_calls?.length || !currentUser) continue;

			const content = this.cleanLegacyAssistantContent(message.content);
			if (!content) continue;
			completedTurns.push([currentUser, { role: "assistant", content }]);
			currentUser = null;
		}

		return completedTurns.slice(-20).flat();
	}

	sanitize(history: ChatMessage[]): ChatMessage[] {
		return history.map((message) => {
			const clone: ChatMessage = {
				role: message.role,
				content: message.content,
				tool_call_id: message.tool_call_id,
				name: message.name,
			};
			if (message.tool_calls) clone.tool_calls = message.tool_calls.map((call) => this.sanitizeToolCall(call));
			if (message.role === "tool") {
				const limit = message.name && INGESTION_TOOLS.has(message.name) ? 800 : 4000;
				clone.content = this.truncate(message.content, limit, "工具结果");
			}
			return clone;
		});
	}

	private cleanLegacyAssistantContent(content: string): string {
		return String(content || "").replace(LEGACY_STREAM_FALLBACK, "").trim();
	}

	private sanitizeToolCall(call: ToolCall): ToolCall {
		let safeArguments = call.function.arguments;
		try {
			const parsed: unknown = JSON.parse(call.function.arguments || "{}");
			safeArguments = JSON.stringify(this.sanitizeValue(parsed));
		} catch {
			safeArguments = JSON.stringify({ persisted_summary: this.truncate(call.function.arguments, 1000, "工具参数") });
		}
		if (safeArguments.length > 4000) {
			safeArguments = JSON.stringify({
				persisted_summary: "工具参数过长，持久化时已省略",
				original_length: safeArguments.length,
			});
		}
		return {
			id: call.id,
			type: "function",
			function: {
				name: call.function.name,
				arguments: safeArguments,
			},
		};
	}

	private sanitizeValue(value: unknown, depth = 0): unknown {
		if (depth > 6) return "[嵌套内容已省略]";
		if (typeof value === "string") return this.truncate(value, 1000, "参数内容");
		if (Array.isArray(value)) return value.slice(0, 50).map((item) => this.sanitizeValue(item, depth + 1));
		if (value && typeof value === "object") {
			const result: Record<string, unknown> = {};
			for (const [key, item] of Object.entries(value).slice(0, 100)) {
				result[key] = this.sanitizeValue(item, depth + 1);
			}
			return result;
		}
		return value;
	}

	private truncate(content: string, limit: number, label: string): string {
		if (!content || content.length <= limit) return content;
		return `${content.slice(0, limit)}\n\n[${label}已在持久化时截断，原长度 ${content.length} 字符]`;
	}
}
