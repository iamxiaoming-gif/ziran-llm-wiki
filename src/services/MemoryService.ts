import { App, normalizePath, TFile, TFolder } from "obsidian";
import type { LLMWikiSettings } from "../settings";

export class MemoryService {
	app: App;
	settings: LLMWikiSettings;

	constructor(app: App, settings: LLMWikiSettings) {
		this.app = app;
		this.settings = settings;
	}

	updateSettings(settings: LLMWikiSettings) {
		this.settings = settings;
	}

	async loadSkillContent(): Promise<string> {
		try {
			const path = normalizePath(`${this.settings.skillFolderPath}/SKILL.md`);
			const file = this.app.vault.getAbstractFileByPath(path);
			if (file && file instanceof TFile) {
				return await this.app.vault.read(file);
			}
		} catch {}
		return "";
	}

	async loadReferencesContent(): Promise<string> {
		try {
			const parts: string[] = [];
			const path = normalizePath(`${this.settings.skillFolderPath}/references`);
			const folder = this.app.vault.getAbstractFileByPath(path);
			if (folder && folder instanceof TFolder) {
				for (const child of folder.children) {
					if (child instanceof TFile && child.extension === "md") {
						const content = await this.app.vault.read(child);
						parts.push(`### ${child.name}\n\n${content}`);
					}
				}
			}
			return parts.join("\n\n---\n\n");
		} catch {}
		return "";
	}

	async loadMemoryContext(): Promise<string> {
		const parts: string[] = [];

		const memoryPath = normalizePath(`${this.settings.memoryFolder}/长期记忆.md`);
		const memoryFile = this.app.vault.getAbstractFileByPath(memoryPath);
		if (memoryFile && memoryFile instanceof TFile) {
			parts.push(await this.app.vault.read(memoryFile));
		}

		const prefPath = normalizePath(`${this.settings.memoryFolder}/用户偏好.md`);
		const prefFile = this.app.vault.getAbstractFileByPath(prefPath);
		if (prefFile && prefFile instanceof TFile) {
			parts.push(await this.app.vault.read(prefFile));
		}

		return parts.join("\n\n---\n\n");
	}

	async writeLog(title: string, detail: string, summary: string) {
		const today = new Date().toISOString().split("T")[0];
		const logPath = normalizePath(`${this.settings.memoryFolder}/日志/${today}.md`);

		const entry = `## ${new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })} | ${title}\n\n${detail}\n\n摘要: ${summary}\n\n---\n`;

		const file = this.app.vault.getAbstractFileByPath(logPath);
		if (file && file instanceof TFile) {
			const existing = await this.app.vault.read(file);
			await this.app.vault.modify(file, existing + entry);
		} else {
			await this.ensureFolder(`${this.settings.memoryFolder}/日志`);
			await this.app.vault.create(
				logPath,
				`# 工作日志 ${today}\n\n${entry}`
			);
		}
	}

	private async ensureFolder(path: string) {
		if (!path) return;
		const parts = normalizePath(path).split("/");
		let current = "";
		for (const part of parts) {
			current = current ? `${current}/${part}` : part;
			if (!this.app.vault.getAbstractFileByPath(current)) {
				await this.app.vault.createFolder(current);
			}
		}
	}
}
