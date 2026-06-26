import { App, PluginSettingTab, Setting } from "obsidian";
import type LLMWikiPlugin from "./main";

export interface LLMWikiSettings {
	apiKey: string;
	apiBaseUrl: string;
	modelName: string;
	knowledgeBasePath: string;
	memoryFolder: string;
	skillFolderPath: string;
	theme: string;
	temperature: number;
	maxIterations: number;
	autoLog: boolean;
	streamMode: boolean;
}

export const DEFAULT_SETTINGS: LLMWikiSettings = {
	apiKey: "",
	apiBaseUrl: "https://api.openai.com/v1",
	modelName: "gpt-4o",
	knowledgeBasePath: "知识库",
	memoryFolder: "记忆",
	skillFolderPath: "知识库",
	theme: "dark-blue",
	temperature: 0.7,
	maxIterations: 15,
	autoLog: true,
	streamMode: true,
};

export function debounce<T extends (...args: any[]) => any>(
	fn: T,
	ms: number
): T {
	let timer: ReturnType<typeof setTimeout> | null = null;
	return ((...args: any[]) => {
		if (timer) clearTimeout(timer);
		timer = setTimeout(() => fn(...args), ms);
	}) as T;
}

export class LLMWikiSettingTab extends PluginSettingTab {
	plugin: LLMWikiPlugin;
	debouncedSave: () => void;

	constructor(app: App, plugin: LLMWikiPlugin) {
		super(app, plugin);
		this.plugin = plugin;
		this.debouncedSave = debounce(async () => {
			await this.plugin.saveSettings();
		}, 500);
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl("h2", { text: "LLM Wiki 知识库助手设置" });

		new Setting(containerEl)
			.setName("API Key")
			.setDesc("OpenAI 兼容 API 密钥")
			.addText((text) => {
				text.setPlaceholder("sk-...")
					.setValue(this.plugin.settings.apiKey)
					.onChange(async (value) => {
						this.plugin.settings.apiKey = value;
						this.debouncedSave();
					});
				const input = text.inputEl;
				input.type = "password";
			});

		new Setting(containerEl)
			.setName("API Base URL")
			.setDesc("OpenAI 兼容 API 地址")
			.addText((text) =>
				text
					.setPlaceholder("https://api.openai.com/v1")
					.setValue(this.plugin.settings.apiBaseUrl)
					.onChange(async (value) => {
						this.plugin.settings.apiBaseUrl = value;
						this.debouncedSave();
					})
			);

		new Setting(containerEl)
			.setName("模型名称")
			.setDesc("使用的模型，如 gpt-4o、deepseek-chat 等")
			.addText((text) =>
				text
					.setPlaceholder("gpt-4o")
					.setValue(this.plugin.settings.modelName)
					.onChange(async (value) => {
						this.plugin.settings.modelName = value;
						this.debouncedSave();
					})
			);

		new Setting(containerEl)
			.setName("知识库路径")
			.setDesc("知识库在 Vault 中的根路径")
			.addText((text) =>
				text
					.setPlaceholder("知识库")
					.setValue(this.plugin.settings.knowledgeBasePath)
					.onChange(async (value) => {
						this.plugin.settings.knowledgeBasePath = value;
						this.debouncedSave();
					})
			);

		new Setting(containerEl)
			.setName("Skill 文件夹路径")
			.setDesc("包含 SKILL.md 和 references/ 子文件夹的目录路径（从 vault 根目录开始）")
			.addText((text) =>
				text
					.setPlaceholder("知识库")
					.setValue(this.plugin.settings.skillFolderPath)
					.onChange(async (value) => {
						this.plugin.settings.skillFolderPath = value;
						this.debouncedSave();
					})
			);

		new Setting(containerEl)
			.setName("记忆文件夹路径")
			.setDesc("Agent 记忆存储路径")
			.addText((text) =>
				text
					.setPlaceholder("记忆")
					.setValue(this.plugin.settings.memoryFolder)
					.onChange(async (value) => {
						this.plugin.settings.memoryFolder = value;
						this.debouncedSave();
					})
			);

		new Setting(containerEl)
			.setName("主题")
			.setDesc("界面主题风格")
			.addDropdown((dropdown) =>
				dropdown
					.addOptions({
						"dark-blue": "暗夜蓝",
						"warm-light": "暖白",
						"obsidian-red": "Obsidian 红",
						lavender: "薰衣草紫",
						"forest-green": "墨绿",
					})
					.setValue(this.plugin.settings.theme)
					.onChange(async (value) => {
						this.plugin.settings.theme = value;
						await this.plugin.saveSettings();
						this.plugin.applyTheme();
					})
			);

		new Setting(containerEl)
			.setName("Temperature")
			.setDesc("LLM 生成温度 (0-2)")
			.addSlider((slider) =>
				slider
					.setLimits(0, 2, 0.1)
					.setValue(this.plugin.settings.temperature)
					.setDynamicTooltip()
					.onChange(async (value) => {
						this.plugin.settings.temperature = value;
						this.debouncedSave();
					})
			);

		new Setting(containerEl)
			.setName("最大迭代次数")
			.setDesc("Agent 工具调用最大迭代次数")
			.addSlider((slider) =>
				slider
					.setLimits(1, 30, 1)
					.setValue(this.plugin.settings.maxIterations)
					.setDynamicTooltip()
					.onChange(async (value) => {
						this.plugin.settings.maxIterations = value;
						this.debouncedSave();
					})
			);

		new Setting(containerEl)
			.setName("流式输出")
			.setDesc("启用流式输出（实时显示回复）")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.streamMode)
					.onChange(async (value) => {
						this.plugin.settings.streamMode = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("自动日志")
			.setDesc("对话完成后自动记录工作日志")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.autoLog)
					.onChange(async (value) => {
						this.plugin.settings.autoLog = value;
						await this.plugin.saveSettings();
					})
			);
	}
}
