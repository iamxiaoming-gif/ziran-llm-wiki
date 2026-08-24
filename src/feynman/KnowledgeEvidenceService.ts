import { normalizePath, TFile } from "obsidian";
import type { App } from "obsidian";
import type { LLMWikiSettings } from "../settings";
import type { KnowledgeEvidence } from "./types";

export class KnowledgeEvidenceService {
	constructor(private app: App, private settings: LLMWikiSettings) {}

	updateSettings(settings: LLMWikiSettings): void {
		this.settings = settings;
	}

	async search(topic: string, transcript: string, limit = 6): Promise<KnowledgeEvidence[]> {
		const root = normalizePath(`${this.settings.knowledgeBasePath}/10-知识点库`);
		const terms = this.tokenize(`${topic} ${transcript}`);
		if (!terms.length) return [];
		const files = this.app.vault.getMarkdownFiles().filter((file) => file.path.startsWith(`${root}/`));
		const ranked: KnowledgeEvidence[] = [];
		for (const file of files) {
			const content = await this.app.vault.cachedRead(file);
			const title = file.basename;
			const score = this.score(`${title} ${file.path}`, content, terms);
			if (score <= 0) continue;
			ranked.push({
				id: "",
				path: file.path,
				title,
				excerpt: this.excerpt(content, terms),
				score,
			});
		}
		return ranked
			.sort((a, b) => b.score - a.score || a.path.localeCompare(b.path))
			.slice(0, Math.max(1, limit))
			.map((item, index) => ({ ...item, id: `E${index + 1}` }));
	}

	async openEvidence(evidence: KnowledgeEvidence): Promise<void> {
		const file = this.app.vault.getAbstractFileByPath(evidence.path);
		if (file instanceof TFile) await this.app.workspace.getLeaf(false).openFile(file);
	}

	private tokenize(value: string): string[] {
		const normalized = value.toLowerCase();
		const latin = normalized.match(/[a-z0-9_-]{2,}/g) || [];
		const chineseRuns = normalized.match(/[\u3400-\u9fff]{2,}/g) || [];
		const chinese: string[] = [];
		for (const run of chineseRuns) {
			if (run.length <= 4) chinese.push(run);
			for (let i = 0; i < run.length - 1; i += 1) chinese.push(run.slice(i, i + 2));
		}
		return Array.from(new Set([...latin, ...chinese])).slice(0, 80);
	}

	private score(header: string, content: string, terms: string[]): number {
		const h = header.toLowerCase();
		const body = content.toLowerCase();
		let score = 0;
		for (const term of terms) {
			if (h.includes(term)) score += 8;
			let cursor = 0;
			let count = 0;
			while (count < 6 && (cursor = body.indexOf(term, cursor)) >= 0) {
				count += 1;
				cursor += term.length;
			}
			score += count;
		}
		return score;
	}

	private excerpt(content: string, terms: string[]): string {
		const clean = content.replace(/^---\r?\n[\s\S]*?\r?\n---\s*/, "").replace(/\n{3,}/g, "\n\n").trim();
		const lower = clean.toLowerCase();
		const positions = terms.map((term) => lower.indexOf(term)).filter((value) => value >= 0);
		const position = positions.length ? Math.min(...positions) : 0;
		const roughStart = Math.max(0, position - 180);
		const previousLineBreak = clean.lastIndexOf("\n", roughStart);
		const start = roughStart > 0 && previousLineBreak >= 0 ? previousLineBreak + 1 : 0;
		const roughEnd = Math.min(clean.length, start + 850);
		const nextLineBreak = clean.indexOf("\n", roughEnd);
		const end = nextLineBreak >= 0 ? nextLineBreak : clean.length;
		const prefix = start > 0 ? "_…前文省略…_\n\n" : "";
		const suffix = end < clean.length ? "\n\n_…后文省略…_" : "";
		return `${prefix}${clean.slice(start, end).trim()}${suffix}`;
	}
}
