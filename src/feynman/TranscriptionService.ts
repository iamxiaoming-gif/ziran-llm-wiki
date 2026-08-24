import { requestUrl } from "obsidian";
import type { LLMWikiSettings, TranscriptionProvider } from "../settings";

interface JsonRecord { [key: string]: unknown }

interface RawResponse {
	status: number;
	text: string;
	json: JsonRecord;
}

interface RequestOptions {
	method?: string;
	headers?: Record<string, string>;
	body?: string | ArrayBuffer;
	contentType?: string;
}

export interface ConnectionTestResult {
	status: "connected" | "reachable" | "configured";
	message: string;
}

export class TranscriptionService {
	constructor(private settings: LLMWikiSettings) {}

	updateSettings(settings: LLMWikiSettings): void { this.settings = settings; }

	getProviderDisplayName(provider = this.settings.transcription.provider): string {
		const names: Record<TranscriptionProvider, string> = {
			groq: "Groq Whisper",
			"local-whisper": "本地 Whisper",
			cloudflare: "Cloudflare Workers AI",
			google: "Google Speech-to-Text",
			custom: "自定义 OpenAI 兼容服务",
		};
		return names[provider];
	}

	isLocalProvider(): boolean { return this.settings.transcription.provider === "local-whisper"; }

	async transcribe(audio: Blob, filename = "recording.webm", durationSeconds = 0): Promise<string> {
		if (!this.settings.transcription.enabled) throw new Error("语音转写已在设置中关闭。");
		if (!audio.size) throw new Error("录音为空，请重新录制。");
		let text = "";
		switch (this.settings.transcription.provider) {
			case "groq": text = await this.transcribeGroq(audio, filename); break;
			case "local-whisper": text = await this.transcribeLocal(audio, filename); break;
			case "cloudflare": text = await this.transcribeCloudflare(audio); break;
			case "google":
				if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) throw new Error("无法读取音频时长，Google 转写前无法确认 60 秒限制。请换用可读取的音频或其他供应商。");
				if (durationSeconds > 60) throw new Error("Google 同步转写只适合 60 秒以内的录音，请缩短录音或改用其他供应商。");
				text = await this.transcribeGoogle(audio, filename); break;
			case "custom": text = await this.transcribeCustom(audio, filename); break;
		}
		text = text.trim();
		if (!text) throw new Error("供应商没有返回可用的转写文本，请检查音量、语言和模型配置。");
		return text;
	}

	async testConnection(): Promise<ConnectionTestResult> {
		const provider = this.settings.transcription.provider;
		const config = this.settings.transcription.providers;
		if (provider === "groq") {
			if (!config.groq.apiKey) throw new Error("请先填写 Groq API Key。");
			await this.requestJson(`${this.trim(config.groq.baseUrl)}/models`, { headers: { Authorization: `Bearer ${config.groq.apiKey}` } });
			return { status: "connected", message: "Groq 地址与 API Key 验证成功。" };
		}
		if (provider === "local-whisper") {
			await this.probeEndpoint(`${this.trim(config.localWhisper.baseUrl)}${this.path(config.localWhisper.path)}`, {});
			return { status: "reachable", message: "本地转写端点可访问；请再用短录音确认接口字段。" };
		}
		if (provider === "cloudflare") {
			if (!config.cloudflare.accountId || !config.cloudflare.apiToken) throw new Error("请填写 Cloudflare Account ID 和 API Token。");
			const url = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(config.cloudflare.accountId)}/ai/models/search?per_page=1`;
			await this.requestJson(url, { headers: { Authorization: `Bearer ${config.cloudflare.apiToken}` } });
			return { status: "connected", message: "Cloudflare Account ID、API Token 和 Workers AI 权限验证成功。" };
		}
		if (provider === "google") {
			if (!config.google.apiKey) throw new Error("请填写 Google API Key。");
			return { status: "configured", message: "Google 配置已填写；为避免无提示产生语音识别调用，本检测不标记为可用，请用短录音完成真实验证。" };
		}
		if (!config.custom.baseUrl) throw new Error("请填写自定义服务地址。");
		const headers: Record<string, string> = {};
		if (config.custom.apiKey) headers.Authorization = `Bearer ${config.custom.apiKey}`;
		await this.probeEndpoint(`${this.trim(config.custom.baseUrl)}${this.path(config.custom.path)}`, headers);
		return { status: "reachable", message: "自定义转写端点可访问；请再用短录音确认接口字段。" };
	}

	private async transcribeGroq(audio: Blob, filename: string): Promise<string> {
		const config = this.settings.transcription.providers.groq;
		if (!config.apiKey) throw new Error("请先在设置中填写 Groq API Key。");
		return this.transcribeOpenAICompatible(`${this.trim(config.baseUrl)}/audio/transcriptions`, config.apiKey, config.model, audio, filename);
	}

	private async transcribeCustom(audio: Blob, filename: string): Promise<string> {
		const config = this.settings.transcription.providers.custom;
		if (!config.baseUrl) throw new Error("请先在设置中填写自定义转写地址。");
		return this.transcribeOpenAICompatible(`${this.trim(config.baseUrl)}${this.path(config.path)}`, config.apiKey, config.model, audio, filename);
	}

	private async transcribeLocal(audio: Blob, filename: string): Promise<string> {
		const config = this.settings.transcription.providers.localWhisper;
		const multipart = await this.buildMultipart(audio, filename, config.model);
		const json = await this.requestJson(`${this.trim(config.baseUrl)}${this.path(config.path)}`, {
			method: "POST", body: multipart.body, contentType: multipart.contentType,
		});
		return this.readTranscript(json);
	}

	private async transcribeOpenAICompatible(url: string, apiKey: string, model: string, audio: Blob, filename: string): Promise<string> {
		const headers: Record<string, string> = {};
		if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
		const multipart = await this.buildMultipart(audio, filename, model);
		const json = await this.requestJson(url, { method: "POST", headers, body: multipart.body, contentType: multipart.contentType });
		return this.readTranscript(json);
	}

	private async transcribeCloudflare(audio: Blob): Promise<string> {
		const config = this.settings.transcription.providers.cloudflare;
		if (!config.accountId || !config.apiToken) throw new Error("请先填写 Cloudflare Account ID 和 API Token。");
		const base64 = await this.blobToBase64(audio);
		const url = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(config.accountId)}/ai/run/${config.model}`;
		const json = await this.requestJson(url, {
			method: "POST",
			headers: { Authorization: `Bearer ${config.apiToken}` },
			contentType: "application/json",
			body: JSON.stringify({ audio: base64, language: this.settings.transcription.language, task: "transcribe", vad_filter: true }),
		});
		return this.readTranscript((json.result as JsonRecord) || json);
	}

	private async transcribeGoogle(audio: Blob, filename: string): Promise<string> {
		const config = this.settings.transcription.providers.google;
		if (!config.apiKey) throw new Error("请先填写 Google API Key。");
		const encoding = this.googleEncoding(audio.type, filename);
		const json = await this.requestJson(`https://speech.googleapis.com/v1/speech:recognize?key=${encodeURIComponent(config.apiKey)}`, {
			method: "POST", contentType: "application/json",
			body: JSON.stringify({
				config: { encoding, languageCode: config.languageCode, model: config.model, enableAutomaticPunctuation: true },
				audio: { content: await this.blobToBase64(audio) },
			}),
		});
		const results = Array.isArray(json.results) ? json.results as JsonRecord[] : [];
		return results.map((item) => {
			const alternatives = Array.isArray(item.alternatives) ? item.alternatives as JsonRecord[] : [];
			return String(alternatives[0]?.transcript || "");
		}).filter(Boolean).join(" ");
	}

	private async buildMultipart(audio: Blob, filename: string, model: string): Promise<{ body: ArrayBuffer; contentType: string }> {
		const boundary = `----LLMWiki${Date.now().toString(16)}${Math.random().toString(16).slice(2)}`;
		const encoder = new TextEncoder();
		const chunks: Uint8Array[] = [];
		const addText = (value: string) => chunks.push(encoder.encode(value));
		const safeFilename = filename.replace(/[\r\n\"]/g, "_");
		addText(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${safeFilename}"\r\nContent-Type: ${audio.type || "application/octet-stream"}\r\n\r\n`);
		chunks.push(new Uint8Array(await audio.arrayBuffer()));
		addText("\r\n");
		const fields: [string, string][] = [];
		if (model) fields.push(["model", model]);
		if (this.settings.transcription.language) fields.push(["language", this.settings.transcription.language]);
		fields.push(["response_format", "json"]);
		for (const [name, value] of fields) {
			addText(`--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`);
		}
		addText(`--${boundary}--\r\n`);
		const size = chunks.reduce((total, chunk) => total + chunk.byteLength, 0);
		const output = new Uint8Array(size);
		let offset = 0;
		for (const chunk of chunks) { output.set(chunk, offset); offset += chunk.byteLength; }
		return { body: output.buffer, contentType: `multipart/form-data; boundary=${boundary}` };
	}

	private readTranscript(json: JsonRecord): string {
		if (typeof json.text === "string") return json.text;
		if (typeof json.transcript === "string") return json.transcript;
		const info = json.transcription_info as JsonRecord | undefined;
		if (typeof info?.text === "string") return info.text;
		const result = json.result as JsonRecord | undefined;
		return result ? this.readTranscript(result) : "";
	}

	private async requestRaw(url: string, init: RequestOptions = {}): Promise<RawResponse> {
		try {
			const response = await requestUrl({ url, method: init.method, headers: init.headers, body: init.body, contentType: init.contentType, throw: false });
			const text = response.text || "";
			let json: JsonRecord = {};
			try { json = text ? JSON.parse(text) as JsonRecord : (response.json as JsonRecord || {}); } catch { json = {}; }
			return { status: response.status, text, json };
		} catch (error) {
			throw new Error(`无法连接转写服务：${error instanceof Error ? error.message : String(error)}`);
		}
	}

	private async requestJson(url: string, init: RequestOptions = {}): Promise<JsonRecord> {
		const response = await this.requestRaw(url, init);
		if (response.status < 200 || response.status >= 300) {
			throw new Error(`转写服务请求失败 (${response.status})：${this.errorMessage(response).slice(0, 300)}`);
		}
		if (response.text && !Object.keys(response.json).length) throw new Error("转写服务返回了无法识别的数据格式。");
		return response.json;
	}

	private async probeEndpoint(url: string, headers: Record<string, string>): Promise<void> {
		const response = await this.requestRaw(url, { method: "GET", headers });
		if (response.status === 401 || response.status === 403) throw new Error(`转写端点认证失败 (${response.status})。`);
		if (response.status === 404) throw new Error("配置的转写端点不存在 (404)。");
		if (response.status >= 500 || response.status === 0) throw new Error(`转写端点当前不可用 (${response.status})。`);
	}

	private errorMessage(response: RawResponse): string {
		const error = response.json.error as JsonRecord | string | undefined;
		if (typeof error === "string") return error;
		if (error && typeof error.message === "string") return error.message;
		return response.text || "未知错误";
	}

	private async blobToBase64(blob: Blob): Promise<string> {
		const bytes = new Uint8Array(await blob.arrayBuffer());
		let binary = "";
		const chunk = 0x8000;
		for (let i = 0; i < bytes.length; i += chunk) binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
		return btoa(binary);
	}

	private googleEncoding(mimeType: string, filename: string): string {
		const type = mimeType.toLowerCase();
		const ext = filename.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] || "";
		if (type.includes("wav") || ext === "wav") return "LINEAR16";
		if (type.includes("mpeg") || ext === "mp3") return "MP3";
		if (type.includes("ogg") || ext === "ogg" || ext === "oga") return "OGG_OPUS";
		if (type.includes("webm") || ext === "webm") return "WEBM_OPUS";
		if (type.includes("flac") || ext === "flac") return "FLAC";
		throw new Error(`Google 同步转写暂不支持此音频容器：${mimeType || ext || "未知格式"}。请转换为 WAV、MP3、OGG、WebM 或 FLAC。`);
	}

	private trim(value: string): string { return value.replace(/\/+$/, ""); }
	private path(value: string): string { return value.startsWith("/") ? value : `/${value}`; }
}
