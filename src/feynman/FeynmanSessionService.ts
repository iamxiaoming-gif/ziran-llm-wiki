import { normalizePath, TFile, TFolder } from "obsidian";
import type { App } from "obsidian";
import type { LLMWikiSettings } from "../settings";
import type { FeynmanEvaluation, RecordedAudio } from "./types";

export class FeynmanSessionService {
	constructor(private app: App, private settings: LLMWikiSettings) {}

	updateSettings(settings: LLMWikiSettings): void {
		this.settings = settings;
	}

	async save(topic: string, transcript: string, evaluation: FeynmanEvaluation, audio?: RecordedAudio): Promise<string | null> {
		if (!this.settings.transcription.saveLearningRecords) return null;
		const day = evaluation.createdAt.slice(0, 10);
		const root = normalizePath(`${this.settings.memoryFolder}/费曼学习/${day}`);
		await this.ensureFolder(root);
		const stamp = evaluation.createdAt.slice(11, 23).replace(/[:.]/g, "-");
		const baseName = `${stamp}-${this.safeName(topic || "未命名主题")}`;
		const notePath = normalizePath(`${root}/${baseName}.md`);
		let noteFile: TFile | null = null;
		let audioFile: TFile | null = null;
		try {
			noteFile = await this.app.vault.create(notePath, this.toMarkdown(topic, transcript, evaluation, ""));
			if (audio && this.settings.transcription.retainAudio) {
				const audioPath = normalizePath(`${root}/${baseName}.${this.audioExtension(audio)}`);
				audioFile = await this.app.vault.createBinary(audioPath, await audio.blob.arrayBuffer());
				await this.app.vault.modify(noteFile, this.toMarkdown(topic, transcript, evaluation, `[[${audioPath}]]`));
			}
			await this.updateIndex(root, notePath, topic, evaluation);
			return notePath;
		} catch (error) {
			if (audioFile) await this.bestEffortDelete(audioFile);
			if (noteFile) await this.bestEffortDelete(noteFile);
			throw error;
		}
	}

	private toMarkdown(topic: string, transcript: string, evaluation: FeynmanEvaluation, audioLink: string): string {
		const verdictNames = { correct: "理解正确", partial: "部分正确", incorrect: "存在错误", unverifiable: "知识库不足" };
		const claims = evaluation.claims.map((claim, index) => [
			`### ${index + 1}. ${this.headingText(claim.userClaim)}`,
			"",
			`- **判定：** ${verdictNames[claim.verdict]}`,
			`- **证据：** ${claim.evidenceIds.length ? claim.evidenceIds.join("、") : "暂无"}`,
			"",
			"**诊断说明**",
			"",
			claim.explanation,
			claim.correction ? `\n**建议修正**\n\n${claim.correction}` : "",
		].filter(Boolean).join("\n")).join("\n\n");
		const evidence = evaluation.evidence.map((item) => [
			`### ${item.id} · ${this.headingText(item.title)}`,
			"",
			`> [!info] 知识库依据`,
			`> **来源：** [[${item.path}|${this.linkText(item.title)}]]`,
			">",
			...item.excerpt.split(/\r?\n/).map((line) => `> ${line}`),
		].join("\n")).join("\n\n") || "> [!warning] 无证据\n> 本次评估未检索到知识库依据。";
		const savedTranscript = this.settings.transcription.retainTranscript ? transcript : "（已按隐私设置不保存口述文本）";
		const sections = [
			"---",
			"type: feynman-learning",
			`created: ${JSON.stringify(evaluation.createdAt)}`,
			`topic: ${JSON.stringify(topic)}`,
			`verdict: ${evaluation.overallVerdict}`,
			"---",
			"",
			`# 费曼学习：${this.headingText(topic)}`,
			"",
			"## 学习结论",
			"",
			`**总体判定：${verdictNames[evaluation.overallVerdict]}**`,
			"",
			evaluation.summary,
			"",
			"## 评分",
			"",
			"| 维度 | 得分 |",
			"| --- | ---: |",
			`| 准确度 | ${evaluation.scores.accuracy} |`,
			`| 完整度 | ${evaluation.scores.completeness} |`,
			`| 清晰度 | ${evaluation.scores.clarity} |`,
			"",
			"## 我的讲解",
			"",
			this.quoteMarkdown(savedTranscript),
			"",
			"## 系统诊断",
			"",
			"### 主张核验",
			"",
			claims || "暂无可拆分的主张。",
			"",
			"### 遗漏知识点",
			"",
			this.listMarkdown(evaluation.missingPoints),
			"",
			"### 复习问题",
			"",
			this.listMarkdown(evaluation.reviewQuestions),
			"",
			"## 知识库证据",
			"",
			evidence,
		];
		if (audioLink) sections.push("", "## 本次录音", "", `- ${audioLink}`);
		return `${sections.join("\n").replace(/\n{3,}/g, "\n\n").trim()}\n`;
	}

	private headingText(value: string): string {
		return value.replace(/[\r\n]+/g, " ").replace(/#+/g, "").trim() || "未命名主题";
	}

	private linkText(value: string): string {
		return value.replace(/[\r\n|\]]+/g, " ").trim() || "知识库来源";
	}

	private quoteMarkdown(value: string): string {
		return (value || "暂无").split(/\r?\n/).map((line) => `> ${line}`).join("\n");
	}

	private listMarkdown(values: string[]): string {
		if (!values.length) return "- 暂无";
		return values.map((value) => `- ${value.replace(/\r?\n/g, "\n  ")}`).join("\n");
	}

	private async updateIndex(root: string, notePath: string, topic: string, evaluation: FeynmanEvaluation): Promise<void> {
		const indexPath = normalizePath(`${root}/学习记录索引.md`);
		const title = this.safeName(topic || "未命名主题");
		const line = `- ${evaluation.createdAt.slice(11, 16)} [[${notePath}|${title}]] · ${evaluation.overallVerdict} · 准确度 ${evaluation.scores.accuracy}\n`;
		const existing = this.app.vault.getAbstractFileByPath(indexPath);
		if (existing instanceof TFile) {
			await this.app.vault.modify(existing, `${await this.app.vault.read(existing)}${line}`);
			return;
		}
		await this.app.vault.create(indexPath, [`# 费曼学习记录`, "", `日期：${evaluation.createdAt.slice(0, 10)}`, "", line].join("\n"));
	}

	private async ensureFolder(path: string): Promise<void> {
		let current = "";
		for (const part of path.split("/").filter(Boolean)) {
			current = current ? `${current}/${part}` : part;
			const existing = this.app.vault.getAbstractFileByPath(current);
			if (!existing) await this.app.vault.createFolder(current);
			else if (!(existing instanceof TFolder)) throw new Error(`无法创建学习记录目录：${current} 已被文件占用。`);
		}
	}

	private safeName(value: string): string {
		return value.replace(/[\\/:*?\"<>|#\[\]]/g, "-").replace(/\s+/g, " ").trim().slice(0, 60) || "未命名主题";
	}

	private audioExtension(audio: RecordedAudio): string {
		const type = audio.mimeType.toLowerCase();
		if (type.includes("mpeg") || type.includes("mp3")) return "mp3";
		if (type.includes("wav")) return "wav";
		if (type.includes("ogg")) return "ogg";
		if (type.includes("webm")) return "webm";
		if (type.includes("mp4") || type.includes("m4a")) return "m4a";
		if (type.includes("flac")) return "flac";
		if (type.includes("aac")) return "aac";
		const ext = audio.originalFilename?.toLowerCase().match(/\.(mp3|wav|ogg|oga|webm|m4a|mp4|flac|aac)$/)?.[1];
		return ext === "oga" ? "ogg" : ext === "mp4" ? "m4a" : ext || "webm";
	}

	private async bestEffortDelete(file: TFile): Promise<void> {
		try { await this.app.vault.delete(file); } catch { /* preserve the original save error */ }
	}
}
