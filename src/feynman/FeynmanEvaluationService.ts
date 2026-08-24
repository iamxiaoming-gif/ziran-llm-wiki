import { requestUrl } from "obsidian";
import type { LLMWikiSettings } from "../settings";
import { ProviderAdapter } from "../services/ProviderAdapter";
import type { FeynmanClaim, FeynmanEvaluation, FeynmanScores, FeynmanVerdict, KnowledgeEvidence } from "./types";

interface JsonRecord { [key: string]: unknown }

export class FeynmanEvaluationService {
	private providerAdapter = new ProviderAdapter();

	constructor(private settings: LLMWikiSettings) {}

	updateSettings(settings: LLMWikiSettings): void {
		this.settings = settings;
	}

	async evaluate(topic: string, transcript: string, evidence: KnowledgeEvidence[]): Promise<FeynmanEvaluation> {
		if (!evidence.length) return this.unverifiable(topic, "知识库中没有检索到足够相关的内容，当前不能可靠判断你的理解是否正确。");
		if (!this.settings.apiKey && this.settings.provider !== "ollama") {
			throw new Error("请先在设置中配置用于理解评估的大模型 API Key。");
		}
		const config = this.providerAdapter.getRequestConfig(this.settings);
		const response = await requestUrl({
			url: config.url,
			method: "POST",
			headers: config.headers,
			body: JSON.stringify({
				model: this.settings.modelName,
				temperature: Math.min(0.2, this.providerAdapter.normalizeTemperature(this.settings)),
				stream: false,
				messages: [
					{ role: "system", content: this.systemPrompt() },
					{ role: "user", content: JSON.stringify({ topic, learner_explanation: transcript, evidence }, null, 2) },
				],
			}),
		});
		const message = response.json?.choices?.[0]?.message?.content;
		if (typeof message !== "string") throw new Error("评估模型没有返回可用内容。");
		return this.normalize(topic, this.parseJson(message), evidence);
	}

	private systemPrompt(): string {
		return [
			"你是严格、友善的费曼学习教练。只能依据用户提供的 evidence 判断，不得使用外部常识补全。",
			"把学习者表述拆成若干可核验主张。每条主张只能是 correct、partial、incorrect、unverifiable 之一。",
			"若证据不足，必须标为 unverifiable；correct、partial 或 incorrect 都必须给出 evidence_ids，且只可引用现有证据 ID。",
			"输出纯 JSON，不要 Markdown。结构：",
			'{"overall_verdict":"correct|partial|incorrect|unverifiable","summary":"...","scores":{"accuracy":0,"completeness":0,"clarity":0},"claims":[{"user_claim":"...","verdict":"...","explanation":"...","correction":"...","evidence_ids":["E1"]}],"missing_points":["..."],"review_questions":["..."]}',
			"分数范围 0-100。不要把表达不清误判成事实错误。用中文回答。",
		].join("\n");
	}

	private parseJson(content: string): JsonRecord {
		const stripped = content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
		try { return JSON.parse(stripped) as JsonRecord; } catch {
			const start = stripped.indexOf("{");
			const end = stripped.lastIndexOf("}");
			if (start >= 0 && end > start) {
				try { return JSON.parse(stripped.slice(start, end + 1)) as JsonRecord; } catch { /* handled below */ }
			}
			throw new Error("评估模型返回的结果格式不正确，请重试或更换模型。");
		}
	}

	private normalize(topic: string, raw: JsonRecord, evidence: KnowledgeEvidence[]): FeynmanEvaluation {
		const validEvidence = new Set(evidence.map((item) => item.id));
		const rawClaims = Array.isArray(raw.claims) ? raw.claims as JsonRecord[] : [];
		const claims: FeynmanClaim[] = rawClaims.slice(0, 12).map((claim) => {
			let verdict = this.verdict(claim.verdict);
			const evidenceIds = (Array.isArray(claim.evidence_ids) ? claim.evidence_ids : [])
				.map(String).filter((id) => validEvidence.has(id));
			if (verdict !== "unverifiable" && !evidenceIds.length) verdict = "unverifiable";
			return {
				userClaim: this.text(claim.user_claim, "未识别的主张"),
				verdict,
				explanation: this.text(claim.explanation, verdict === "unverifiable" ? "当前证据不足，无法可靠判断。" : ""),
				correction: verdict === "unverifiable" ? "请补充相关知识库资料后再判断。" : this.text(claim.correction, ""),
				evidenceIds,
			};
		});
		const overall = this.overallFromClaims(claims);
		const rawOverall = this.verdict(raw.overall_verdict);
		const scores = this.consistentScores(this.scores(raw.scores), claims, overall);
		return {
			topic,
			overallVerdict: overall,
			summary: rawOverall === overall
				? this.text(raw.summary, "评估已完成。")
				: "总体结论已根据逐条观点和有效知识库证据重新校准，请以逐条核验结果为准。",
			scores,
			claims,
			missingPoints: this.stringArray(raw.missing_points, 8),
			reviewQuestions: this.stringArray(raw.review_questions, 6),
			evidence,
			createdAt: new Date().toISOString(),
		};
	}

	private unverifiable(topic: string, summary: string): FeynmanEvaluation {
		return {
			topic,
			overallVerdict: "unverifiable",
			summary,
			scores: { accuracy: 0, completeness: 0, clarity: 0 },
			claims: [], missingPoints: [],
			reviewQuestions: ["你能先把相关资料加入知识库，再用自己的话讲一遍吗？"],
			evidence: [], createdAt: new Date().toISOString(),
		};
	}

	private verdict(value: unknown): FeynmanVerdict {
		return value === "correct" || value === "partial" || value === "incorrect" || value === "unverifiable"
			? value : "unverifiable";
	}

	private scores(value: unknown): FeynmanScores {
		const source = value && typeof value === "object" ? value as JsonRecord : {};
		return {
			accuracy: this.scoreValue(source.accuracy),
			completeness: this.scoreValue(source.completeness),
			clarity: this.scoreValue(source.clarity),
		};
	}

	private overallFromClaims(claims: FeynmanClaim[]): FeynmanVerdict {
		if (!claims.length) return "unverifiable";
		if (claims.some((claim) => claim.verdict === "incorrect")) return "incorrect";
		if (claims.some((claim) => claim.verdict === "partial")) return "partial";
		if (claims.some((claim) => claim.verdict === "unverifiable")) return "unverifiable";
		return "correct";
	}

	private consistentScores(scores: FeynmanScores, claims: FeynmanClaim[], overall: FeynmanVerdict): FeynmanScores {
		if (!claims.length || claims.every((claim) => claim.verdict === "unverifiable")) {
			return { accuracy: 0, completeness: 0, clarity: scores.clarity };
		}
		if (overall === "incorrect") return { ...scores, accuracy: Math.min(scores.accuracy, 49) };
		if (overall === "partial") return { ...scores, accuracy: Math.min(scores.accuracy, 79) };
		if (overall === "unverifiable") return { ...scores, completeness: Math.min(scores.completeness, 49) };
		return scores;
	}

	private scoreValue(value: unknown): number { return Math.max(0, Math.min(100, Math.round(Number(value) || 0))); }
	private text(value: unknown, fallback: string): string { return typeof value === "string" && value.trim() ? value.trim() : fallback; }
	private stringArray(value: unknown, limit: number): string[] {
		return Array.isArray(value) ? value.map(String).map((item) => item.trim()).filter(Boolean).slice(0, limit) : [];
	}
}
