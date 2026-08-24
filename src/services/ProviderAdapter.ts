import type { LLMWikiSettings } from "../settings";

export interface ProviderRequestConfig {
	url: string;
	headers: Record<string, string>;
	supportsStreaming: boolean;
	protocol: "openai-compatible";
}

export class ProviderAdapter {
	getRequestConfig(settings: LLMWikiSettings): ProviderRequestConfig {
		const baseUrl = settings.apiBaseUrl.replace(/\/+$/, "");
		const headers: Record<string, string> = { "Content-Type": "application/json" };
		if (settings.apiKey) headers.Authorization = `Bearer ${settings.apiKey}`;

		return {
			url: `${baseUrl}/chat/completions`,
			headers,
			supportsStreaming: true,
			protocol: "openai-compatible",
		};
	}

	normalizeTemperature(settings: LLMWikiSettings): number {
		return settings.provider === "anthropic"
			? Math.min(1, settings.temperature)
			: settings.temperature;
	}

	shouldFallbackFromStream(error: unknown): boolean {
		if (error instanceof TypeError) return true;
		if (error instanceof SyntaxError) return true;
		const status = this.statusFromError(error);
		if (status >= 400 && status < 500) return false;
		const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
		return status >= 500
			|| message.includes("failed to fetch")
			|| message.includes("network")
			|| message.includes("cors")
			|| message.includes("数据流")
			|| message.includes("sse")
			|| message.includes("json");
	}

	private statusFromError(error: unknown): number {
		if (typeof error === "object" && error !== null && "status" in error) {
			return Number((error as { status: unknown }).status) || 0;
		}
		const message = error instanceof Error ? error.message : String(error);
		const match = message.match(/\((\d{3})\)/);
		return match ? Number(match[1]) : 0;
	}
}
