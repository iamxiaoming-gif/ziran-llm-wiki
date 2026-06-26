import type { ChatMessage } from "../agent/core";

export class ContextManager {
	summaryCache: Map<string, string> = new Map();
	private maxTokens: number = 8000;

	setMaxTokens(tokens: number) {
		this.maxTokens = tokens;
	}

	estimateTokens(text: string): number {
		return Math.ceil(text.length / 2);
	}

	async compressHistory(
		history: ChatMessage[],
		compressFn: (messages: ChatMessage[]) => Promise<string>
	): Promise<ChatMessage[]> {
		const fullText = history.map((m) => m.content || "").join("\n");
		if (this.estimateTokens(fullText) <= this.maxTokens) {
			return history;
		}

		const turns: ChatMessage[][] = [];
		let currentTurn: ChatMessage[] = [];

		for (const msg of history) {
			currentTurn.push(msg);
			if (msg.role === "assistant" && !msg.tool_calls) {
				turns.push([...currentTurn]);
				currentTurn = [];
			}
		}
		if (currentTurn.length > 0) {
			turns.push(currentTurn);
		}

		if (turns.length <= 6) {
			return history;
		}

		const recentTurns = turns.slice(-6);
		const oldTurns = turns.slice(0, -6);

		const oldText = oldTurns
			.flat()
			.map((m) => `${m.role}: ${m.content || ""}`)
			.join("\n");

		const cacheKey = this.hashText(oldText);
		let summary = this.summaryCache.get(cacheKey);

		if (!summary) {
			try {
				summary = await compressFn([
					{
						role: "system",
						content: `将以下对话历史压缩为一段简洁的摘要，保留关键信息、决策和结论，不超过500字。如果涉及知识点库的操作，保留文件路径和操作类型。`,
					},
					{
						role: "user",
						content: oldText,
					},
				] as ChatMessage[]);
				this.summaryCache.set(cacheKey, summary);
			} catch {
				summary = `[早期对话摘要: ${oldText.substring(0, 500)}...]`;
			}
		}

		const summaryMsg: ChatMessage = {
			role: "assistant",
			content: `[历史对话摘要]\n${summary}`,
		};

		return [summaryMsg, ...recentTurns.flat()];
	}

	private hashText(text: string): string {
		let hash = 0;
		for (let i = 0; i < text.length; i++) {
			const char = text.charCodeAt(i);
			hash = (hash << 5) - hash + char;
			hash |= 0;
		}
		return `ctx_${hash.toString(36)}`;
	}

	getSummaryStats(history: ChatMessage[]): { originalTokens: number; compressedTokens: number; turns: number } {
		const fullText = history.map((m) => m.content || "").join("\n");
		return {
			originalTokens: this.estimateTokens(fullText),
			compressedTokens: Math.ceil(fullText.length / 3),
			turns: history.filter((m) => m.role === "user").length,
		};
	}
}
