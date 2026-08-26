import { App, PluginSettingTab, Setting, debounce, requestUrl, Notice } from "obsidian";
import type LLMWikiPlugin from "./main";
import { ProviderAdapter } from "./services/ProviderAdapter";

export interface ProviderPreset {
	id: string;
	name: string;
	baseUrl: string;
	models: string[];
}

export const PROVIDER_PRESETS: ProviderPreset[] = [
	{
		id: "openai",
		name: "OpenAI",
		baseUrl: "https://api.openai.com/v1",
		models: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo", "o1", "o1-mini"],
	},
	{
		id: "deepseek",
		name: "DeepSeek",
		baseUrl: "https://api.deepseek.com/v1",
		models: ["deepseek-chat", "deepseek-reasoner"],
	},
	{
		id: "anthropic",
		name: "Anthropic (Claude)",
		baseUrl: "https://api.anthropic.com/v1",
		models: ["claude-sonnet-4-20250514", "claude-3-5-sonnet-20241022", "claude-3-5-haiku-20241022"],
	},
	{
		id: "gemini",
		name: "Google Gemini",
		baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
		models: ["gemini-2.5-pro", "gemini-2.5-flash", "gemini-2.0-flash"],
	},
	{
		id: "ollama",
		name: "Ollama (本地)",
		baseUrl: "http://localhost:11434/v1",
		models: ["llama3", "qwen2", "mistral"],
	},
	{
		id: "siliconflow",
		name: "硅基流动",
		baseUrl: "https://api.siliconflow.cn/v1",
		models: ["deepseek-ai/DeepSeek-V3", "deepseek-ai/DeepSeek-R1", "Qwen/Qwen2.5-72B-Instruct"],
	},
	{
		id: "custom",
		name: "自定义供应商",
		baseUrl: "",
		models: [],
	},
];

const VALID_DETAIL_LEVELS = ["concise", "standard", "deep"];
const CUSTOM_MODEL_SENTINEL = "__custom_model__";

export const THEME_OPTIONS: Record<string, string> = {
	"dark-blue": "暗夜蓝",
	"warm-light": "暖白",
	"obsidian-red": "Obsidian 红",
	lavender: "薰衣草紫",
	"forest-green": "墨绿",
	folio: "Folio",
	glass: "Glass",
	terminal: "Terminal",
	studio: "Studio",
};

export const THEME_CLASS_NAMES = Object.keys(THEME_OPTIONS).map((theme) => `llm-wiki-theme-${theme}`);

export type TranscriptionProvider = "groq" | "local-whisper" | "cloudflare" | "google" | "custom";

export interface TranscriptionSettings {
	enabled: boolean;
	provider: TranscriptionProvider;
	language: string;
	maxRecordingMinutes: number;
	retainAudio: boolean;
	retainTranscript: boolean;
	confirmBeforeEvaluation: boolean;
	saveLearningRecords: boolean;
	providers: {
		groq: { apiKey: string; baseUrl: string; model: string };
		localWhisper: { baseUrl: string; path: string; model: string };
		cloudflare: { accountId: string; apiToken: string; model: string };
		google: { apiKey: string; model: string; languageCode: string };
		custom: { apiKey: string; baseUrl: string; path: string; model: string };
	};
}

export const DEFAULT_TRANSCRIPTION_SETTINGS: TranscriptionSettings = {
	enabled: true,
	provider: "groq",
	language: "zh",
	maxRecordingMinutes: 10,
	retainAudio: false,
	retainTranscript: true,
	confirmBeforeEvaluation: true,
	saveLearningRecords: true,
	providers: {
		groq: { apiKey: "", baseUrl: "https://api.groq.com/openai/v1", model: "whisper-large-v3-turbo" },
		localWhisper: { baseUrl: "http://127.0.0.1:8080", path: "/inference", model: "base" },
		cloudflare: { accountId: "", apiToken: "", model: "@cf/openai/whisper-large-v3-turbo" },
		google: { apiKey: "", model: "latest_long", languageCode: "cmn-Hans-CN" },
		custom: { apiKey: "", baseUrl: "", path: "/audio/transcriptions", model: "whisper-1" },
	},
};

export interface BatchIngestionSettings {
	batchSize: number;
	maxFileChars: number;
	chunkChars: number;
	maxPagesPerFile: number;
	maxRetries: number;
}

export const DEFAULT_BATCH_INGESTION_SETTINGS: BatchIngestionSettings = {
	batchSize: 20,
	maxFileChars: 60000,
	chunkChars: 12000,
	maxPagesPerFile: 8,
	maxRetries: 1,
};

export interface LLMWikiSettings {
	apiKey: string;
	apiBaseUrl: string;
	modelName: string;
	provider: string;
	knowledgeBasePath: string;
	memoryFolder: string;
	skillFolderPath: string;
	theme: string;
	temperature: number;
	maxIterations: number;
	autoLog: boolean;
	streamMode: boolean;
	extractionDetail: string;
	enableBatchSkip: boolean;
	batchIngestion: BatchIngestionSettings;
	transcription: TranscriptionSettings;
}

export const DEFAULT_SETTINGS: LLMWikiSettings = {
	apiKey: "",
	apiBaseUrl: "https://api.openai.com/v1",
	modelName: "gpt-4o",
	provider: "openai",
	knowledgeBasePath: "知识库",
	memoryFolder: "记忆",
	skillFolderPath: "知识库/topic-knowledge-base-llm-wiki",
	theme: "dark-blue",
	temperature: 0.7,
	maxIterations: 30,
	autoLog: true,
	streamMode: true,
	extractionDetail: "standard",
	enableBatchSkip: true,
	batchIngestion: DEFAULT_BATCH_INGESTION_SETTINGS,
	transcription: DEFAULT_TRANSCRIPTION_SETTINGS,
};

export function ensureSettings(settings: LLMWikiSettings): LLMWikiSettings {
	settings.temperature = Number(settings.temperature ?? DEFAULT_SETTINGS.temperature);
	if (isNaN(settings.temperature) || settings.temperature < 0 || settings.temperature > 2) {
		settings.temperature = DEFAULT_SETTINGS.temperature;
	}
	settings.maxIterations = Number(settings.maxIterations ?? DEFAULT_SETTINGS.maxIterations);
	if (isNaN(settings.maxIterations) || settings.maxIterations < 1 || settings.maxIterations > 100) {
		settings.maxIterations = DEFAULT_SETTINGS.maxIterations;
	}
	if (typeof settings.extractionDetail !== "string" || !VALID_DETAIL_LEVELS.includes(settings.extractionDetail)) {
		settings.extractionDetail = DEFAULT_SETTINGS.extractionDetail;
	}
	if (typeof settings.provider !== "string" || !PROVIDER_PRESETS.some((p) => p.id === settings.provider)) {
		settings.provider = DEFAULT_SETTINGS.provider;
	}
	if (typeof settings.modelName !== "string" || !settings.modelName) {
		settings.modelName = DEFAULT_SETTINGS.modelName;
	}
	if (typeof settings.enableBatchSkip !== "boolean") settings.enableBatchSkip = DEFAULT_SETTINGS.enableBatchSkip;
	if (typeof settings.autoLog !== "boolean") settings.autoLog = DEFAULT_SETTINGS.autoLog;
	if (typeof settings.streamMode !== "boolean") settings.streamMode = DEFAULT_SETTINGS.streamMode;
	const incomingBatch = settings.batchIngestion as Partial<BatchIngestionSettings> | undefined;
	settings.batchIngestion = {
		...DEFAULT_BATCH_INGESTION_SETTINGS,
		...(incomingBatch || {}),
	};
	settings.batchIngestion.batchSize = Math.max(5, Math.min(20, Math.floor(Number(settings.batchIngestion.batchSize) || 20)));
	settings.batchIngestion.maxFileChars = Math.max(12000, Math.min(120000, Math.floor(Number(settings.batchIngestion.maxFileChars) || 60000)));
	settings.batchIngestion.chunkChars = Math.max(4000, Math.min(20000, Math.floor(Number(settings.batchIngestion.chunkChars) || 12000)));
	settings.batchIngestion.maxPagesPerFile = Math.max(1, Math.min(12, Math.floor(Number(settings.batchIngestion.maxPagesPerFile) || 8)));
	settings.batchIngestion.maxRetries = Math.max(0, Math.min(3, Math.floor(Number(settings.batchIngestion.maxRetries) || 1)));
	const incoming = settings.transcription as Partial<TranscriptionSettings> | undefined;
	const incomingProviders = incoming?.providers as Partial<TranscriptionSettings["providers"]> | undefined;
	settings.transcription = {
		...DEFAULT_TRANSCRIPTION_SETTINGS,
		...(incoming || {}),
		providers: {
			groq: { ...DEFAULT_TRANSCRIPTION_SETTINGS.providers.groq, ...(incomingProviders?.groq || {}) },
			localWhisper: { ...DEFAULT_TRANSCRIPTION_SETTINGS.providers.localWhisper, ...(incomingProviders?.localWhisper || {}) },
			cloudflare: { ...DEFAULT_TRANSCRIPTION_SETTINGS.providers.cloudflare, ...(incomingProviders?.cloudflare || {}) },
			google: { ...DEFAULT_TRANSCRIPTION_SETTINGS.providers.google, ...(incomingProviders?.google || {}) },
			custom: { ...DEFAULT_TRANSCRIPTION_SETTINGS.providers.custom, ...(incomingProviders?.custom || {}) },
		},
	};
	const validTranscriptionProviders: TranscriptionProvider[] = ["groq", "local-whisper", "cloudflare", "google", "custom"];
	if (!validTranscriptionProviders.includes(settings.transcription.provider)) settings.transcription.provider = "groq";
	settings.transcription.maxRecordingMinutes = Math.max(1, Math.min(30, Number(settings.transcription.maxRecordingMinutes) || 10));
	return settings;
}

export class LLMWikiSettingTab extends PluginSettingTab {
	plugin: LLMWikiPlugin;
	debouncedSave: () => void;
	private fetchedModels: string[] = [];
	private providerAdapter = new ProviderAdapter();
	private savedScrollPos = 0;
	private savedScrollRatio = 0;

	constructor(app: App, plugin: LLMWikiPlugin) {
		super(app, plugin);
		this.plugin = plugin;
		const _debounced = debounce(
			async () => { await this.plugin.saveSettings(); },
			500,
			true
		);
		this.debouncedSave = () => { void _debounced(); };
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		this.safeSection(containerEl, "ensureSettings", () => {
			ensureSettings(this.plugin.settings);
		});
		this.safeSection(containerEl, "模型供应商", () => {
			this.buildProviderSection(containerEl);
		});
		this.safeSection(containerEl, "语音转写", () => {
			this.buildTranscriptionSection(containerEl);
		});
		this.safeSection(containerEl, "知识库", () => {
			this.buildKnowledgeSection(containerEl);
		});
		this.safeSection(containerEl, "界面与对话", () => {
			this.buildChatSection(containerEl);
		});
		this.safeSection(containerEl, "提取与构建", () => {
			this.buildExtractionSection(containerEl);
		});
		this.restoreScrollPos();
	}

	private captureScrollPos(): void {
		const scroller = this.scrollContainer();
		if (!scroller) return;
		this.savedScrollPos = scroller.scrollTop;
		this.savedScrollRatio = scroller.scrollHeight > 0 ? scroller.scrollTop / scroller.scrollHeight : 0;
	}

	private restoreScrollPos(): void {
		const scroller = this.scrollContainer();
		if (!scroller) return;
		requestAnimationFrame(() => {
			if (this.savedScrollPos > 0) {
				scroller.scrollTop = this.savedScrollPos;
			} else if (this.savedScrollRatio > 0) {
				scroller.scrollTop = Math.round(scroller.scrollHeight * this.savedScrollRatio);
			}
		});
	}

	private scrollContainer(): Element | null {
		const { containerEl } = this;
		if (containerEl.scrollHeight > containerEl.clientHeight) return containerEl;
		let el = containerEl.parentElement;
		while (el) {
			if (el.scrollHeight > el.clientHeight) return el;
			el = el.parentElement;
		}
		return containerEl;
	}

	private safeSection(containerEl: HTMLElement, name: string, fn: () => void) {
		try {
			fn();
		} catch (e: unknown) {
			const msg = e instanceof Error ? e.message : String(e);
			new Setting(containerEl).setName(`⚠️ 区块「${name}」渲染失败: ${msg}`).setHeading();
			new Notice(`LLM Wiki 设置出错 [${name}]: ${msg}`, 8000);
		}
	}

	private buildProviderSection(containerEl: HTMLElement) {
		new Setting(containerEl).setName("LLM Wiki 知识库助手设置").setHeading();
		new Setting(containerEl).setName("模型供应商").setHeading();

		const presetIds = PROVIDER_PRESETS.map((p) => p.id);
		const safeProvider = presetIds.includes(this.plugin.settings.provider) ? this.plugin.settings.provider : "openai";

		new Setting(containerEl)
			.setName("供应商")
			.setDesc("选择模型供应商，自动配置 API 地址")
			.addDropdown((dropdown) => {
				for (const p of PROVIDER_PRESETS) {
					dropdown.addOption(p.id, p.name);
				}
				dropdown.setValue(safeProvider);
				dropdown.onChange(async (value) => {
					this.plugin.settings.provider = value;
					const preset = PROVIDER_PRESETS.find((p) => p.id === value);
					if (preset && preset.baseUrl) {
						this.plugin.settings.apiBaseUrl = preset.baseUrl;
					}
					if (preset && preset.models.length > 0) {
						this.plugin.settings.modelName = preset.models[0];
					}
					this.fetchedModels = [];
					await this.plugin.saveSettings();
					this.captureScrollPos();
					this.display();
				});
			});

		const isCustom = this.plugin.settings.provider === "custom";

		new Setting(containerEl)
			.setName("API Base URL")
			.setDesc(isCustom ? "自定义 API 地址（OpenAI 兼容格式）" : "API 地址（自动填入，可在自定义模式下修改）")
			.addText((text) =>
				text
					.setPlaceholder("https://api.example.com/v1")
					.setValue(this.plugin.settings.apiBaseUrl)
					.setDisabled(!isCustom)
					.onChange(async (value) => {
						this.plugin.settings.apiBaseUrl = value;
						this.debouncedSave();
					})
			);

		new Setting(containerEl)
			.setName("API Key")
			.setDesc(`API 密钥`)
			.addText((text) => {
				text.setPlaceholder("sk-...")
					.setValue(this.plugin.settings.apiKey)
					.onChange(async (value) => {
						this.plugin.settings.apiKey = value;
						this.debouncedSave();
					});
				text.inputEl.type = "password";
			});

		if (isCustom) {
			new Setting(containerEl)
				.setName("模型名称")
				.setDesc("输入模型名称（必填）")
				.addText((text) =>
					text
						.setPlaceholder("输入模型名称...")
						.setValue(this.plugin.settings.modelName === CUSTOM_MODEL_SENTINEL ? "" : this.plugin.settings.modelName)
						.onChange(async (value) => {
							const trimmed = value.trim();
							this.plugin.settings.modelName = trimmed || CUSTOM_MODEL_SENTINEL;
							if (trimmed) await this.plugin.saveSettings();
						})
				);

			new Setting(containerEl)
				.setName("获取模型列表")
				.setDesc("尝试从 API 获取可用模型列表（部分自定义 API 可能不支持）")
				.addButton((btn) =>
					btn.setButtonText("获取").onClick(async () => {
						btn.setButtonText("获取中...");
						btn.setDisabled(true);
						const models = await this.fetchModels();
						btn.setDisabled(false);
						if (models.length > 0) {
							this.fetchedModels = models;
							if (!models.includes(this.plugin.settings.modelName) || this.plugin.settings.modelName === CUSTOM_MODEL_SENTINEL) {
								this.plugin.settings.modelName = models[0];
							}
							await this.plugin.saveSettings();
							this.captureScrollPos();
							this.display();
						}
						btn.setButtonText("获取");
					})
				);
		} else {
			const currentPreset = PROVIDER_PRESETS.find((p) => p.id === this.plugin.settings.provider);
			const presetModels: string[] = currentPreset?.models || [];
			const allModels: string[] = this.fetchedModels.length > 0 ? this.fetchedModels : presetModels;

			new Setting(containerEl)
				.setName("模型")
				.setDesc("选择模型名称")
				.addDropdown((dropdown) => {
					for (const m of allModels) {
						dropdown.addOption(m, m);
					}
					dropdown.addOption(CUSTOM_MODEL_SENTINEL, "✏️ 自定义模型名称...");

					const current = this.plugin.settings.modelName;
					if (allModels.includes(current)) {
						dropdown.setValue(current);
					} else {
						dropdown.setValue(CUSTOM_MODEL_SENTINEL);
					}

					dropdown.onChange(async (value) => {
						this.plugin.settings.modelName = value;
						await this.plugin.saveSettings();
						this.captureScrollPos();
						this.display();
					});
				});

			const needCustomInput = this.plugin.settings.modelName === CUSTOM_MODEL_SENTINEL || (!allModels.includes(this.plugin.settings.modelName) && this.plugin.settings.modelName !== CUSTOM_MODEL_SENTINEL);

			if (needCustomInput) {
				new Setting(containerEl)
					.setName("自定义模型名称")
					.setDesc("手动输入模型名称")
					.addText((text) =>
						text
							.setPlaceholder("输入模型名...")
							.setValue(this.plugin.settings.modelName === CUSTOM_MODEL_SENTINEL ? "" : this.plugin.settings.modelName)
							.onChange(async (value) => {
								const trimmed = value.trim();
								this.plugin.settings.modelName = trimmed || CUSTOM_MODEL_SENTINEL;
								if (trimmed) {
									await this.plugin.saveSettings();
									this.captureScrollPos();
									this.display();
								}
							})
					);
			}

			new Setting(containerEl)
				.setName("获取模型列表")
				.setDesc("用 API Key 从接口获取该供应商真正的可用模型列表")
				.addButton((btn) =>
					btn.setButtonText("获取").onClick(async () => {
						btn.setButtonText("获取中...");
						btn.setDisabled(true);
						const models = await this.fetchModels();
						btn.setDisabled(false);
						this.fetchedModels = models;
						if (models.length > 0) {
							this.plugin.settings.modelName = models[0];
							await this.plugin.saveSettings();
							this.captureScrollPos();
							this.display();
						} else {
							new Notice("未获取到模型列表，请检查 API Key 或该接口不支持 /models。你可以选择「自定义模型名称」手动输入。", 6000);
							btn.setButtonText("获取");
						}
					})
				);
		}

		new Setting(containerEl)
			.setName("检测连接")
			.setDesc("测试当前 API Key 和模型是否可用")
			.addButton((btn) =>
				btn.setButtonText("检测").onClick(() => {
					void (async () => {
						btn.setButtonText("检测中...");
						btn.setDisabled(true);
						const result = await this.testConnection();
						btn.setDisabled(false);
						btn.setButtonText(result);
						window.setTimeout(() => {
							btn.setButtonText("检测");
						}, 4000);
					})();
				})
			);
	}

	private buildKnowledgeSection(containerEl: HTMLElement) {
		new Setting(containerEl).setName("知识库").setHeading();

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
			.setDesc("包含 SKILL.md 和 references/ 的目录路径，默认放在知识库根目录下的 topic-knowledge-base-llm-wiki/ 子文件夹中")
			.addText((text) =>
				text
					.setPlaceholder("知识库/topic-knowledge-base-llm-wiki")
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
	}

	private buildTranscriptionSection(containerEl: HTMLElement) {
		new Setting(containerEl).setName("语音转写").setHeading();
		const config = this.plugin.settings.transcription;

		new Setting(containerEl)
			.setName("启用语音口述")
			.setDesc("费曼学习中允许使用麦克风录音；关闭后仍可使用文字讲解")
			.addToggle((toggle) => toggle.setValue(config.enabled).onChange(async (value) => {
				config.enabled = value;
				await this.plugin.saveSettings();
			}));

		new Setting(containerEl)
			.setName("转写供应商")
			.setDesc("聊天模型与语音转写分别配置；云端转写会上传本次音频")
			.addDropdown((dropdown) => dropdown
				.addOptions({
					groq: "Groq Whisper（推荐）",
					"local-whisper": "本地 Whisper（隐私优先）",
					cloudflare: "Cloudflare Workers AI",
					google: "Google Speech-to-Text",
					custom: "OpenAI 兼容自定义接口",
				})
				.setValue(config.provider)
				.onChange(async (value) => {
					config.provider = value as TranscriptionProvider;
					await this.plugin.saveSettings();
					this.captureScrollPos();
					this.display();
				}));

		new Setting(containerEl)
			.setName("默认语言")
			.setDesc("Whisper 使用 zh；Google 可在供应商配置中单独设置语言代码")
			.addText((text) => text.setValue(config.language).setPlaceholder("zh").onChange((value) => {
				config.language = value.trim() || "zh";
				this.debouncedSave();
			}));

		const minutesSetting = new Setting(containerEl)
			.setName("最大录音时长")
			.setDesc(`当前 ${config.maxRecordingMinutes} 分钟；Google 同步转写仍限制为短录音`)
			.addSlider((slider) => slider.setLimits(1, 30, 1).setValue(config.maxRecordingMinutes).onChange((value) => {
				config.maxRecordingMinutes = value;
				minutesSetting.setDesc(`当前 ${value} 分钟；Google 同步转写仍限制为短录音`);
				this.debouncedSave();
			}));

		this.buildActiveTranscriptionProvider(containerEl, config);

		new Setting(containerEl)
			.setName("检测转写配置")
			.setDesc("检查当前供应商地址与凭据；正式音频识别请在费曼学习中使用录音测试")
			.addButton((button) => button.setButtonText("检测").onClick(() => {
				void (async () => {
					button.setDisabled(true).setButtonText("检测中…");
					try {
						const result = await this.plugin.transcriptionService.testConnection();
						button.setButtonText(result.status === "connected" ? "连接成功" : result.status === "reachable" ? "服务可访问" : "配置完整");
						new Notice(result.message, 7000);
					} catch (error: unknown) {
						button.setButtonText("失败");
						new Notice(error instanceof Error ? error.message : String(error), 6000);
					} finally {
						button.setDisabled(false);
						window.setTimeout(() => {
							button.setButtonText("检测");
						}, 4000);
					}
				})();
			}));

		new Setting(containerEl).setName("隐私与学习记录").setHeading();
		new Setting(containerEl)
			.setName("保留原始录音")
			.setDesc(`默认关闭；开启后仅随学习记录写入 ${this.plugin.settings.memoryFolder}/费曼学习/，不会进入知识点库`)
			.addToggle((toggle) => toggle.setValue(config.retainAudio).onChange(async (value) => {
				config.retainAudio = value;
				await this.plugin.saveSettings();
			}));
		new Setting(containerEl)
			.setName("保存转写文字")
			.setDesc("保存费曼学习记录时包含用户确认后的讲解文字")
			.addToggle((toggle) => toggle.setValue(config.retainTranscript).onChange(async (value) => {
				config.retainTranscript = value;
				await this.plugin.saveSettings();
			}));
		new Setting(containerEl)
			.setName("分析前确认转写")
			.setDesc("已由界面简化移除确认步骤，当前版本不再拦截评估")
			.addToggle((toggle) => toggle.setValue(config.confirmBeforeEvaluation).setDisabled(true));
		new Setting(containerEl)
			.setName("保存费曼学习记录")
			.setDesc(`保存到 ${this.plugin.settings.memoryFolder}/费曼学习/，不会写入知识点库`)
			.addToggle((toggle) => toggle.setValue(config.saveLearningRecords).onChange(async (value) => {
				config.saveLearningRecords = value;
				await this.plugin.saveSettings();
			}));
	}

	private buildActiveTranscriptionProvider(containerEl: HTMLElement, config: TranscriptionSettings) {
		const addText = (name: string, description: string, value: string, update: (value: string) => void, placeholder = "") => {
			new Setting(containerEl).setName(name).setDesc(description).addText((text) => text
				.setValue(value).setPlaceholder(placeholder).onChange((next) => {
					update(next.trim());
					this.debouncedSave();
				}));
		};
		const addSecret = (name: string, description: string, value: string, update: (value: string) => void) => {
			new Setting(containerEl).setName(name).setDesc(description).addText((text) => {
				text.inputEl.type = "password";
				text.setValue(value).onChange((next) => {
					update(next.trim());
					this.debouncedSave();
				});
			});
		};

		if (config.provider === "groq") {
			const provider = config.providers.groq;
			addSecret("Groq API Key", "Groq Console 中创建的 API Key", provider.apiKey, (value) => provider.apiKey = value);
			addText("API Base URL", "默认使用 Groq OpenAI 兼容地址", provider.baseUrl, (value) => provider.baseUrl = value, "https://api.groq.com/openai/v1");
			new Setting(containerEl).setName("转写模型").addDropdown((dropdown) => dropdown
				.addOptions({ "whisper-large-v3-turbo": "Whisper Large V3 Turbo（速度）", "whisper-large-v3": "Whisper Large V3（准确率）" })
				.setValue(provider.model).onChange(async (value) => { provider.model = value; await this.plugin.saveSettings(); }));
		} else if (config.provider === "local-whisper") {
			const provider = config.providers.localWhisper;
			addText("本地服务地址", "音频只发送到本机地址", provider.baseUrl, (value) => provider.baseUrl = value, "http://127.0.0.1:8080");
			addText("转写路径", "whisper.cpp server 常用 /inference，也可填写 /v1/audio/transcriptions", provider.path, (value) => provider.path = value, "/inference");
			addText("模型标识", "由本地服务决定，可留作提示", provider.model, (value) => provider.model = value, "base");
		} else if (config.provider === "cloudflare") {
			const provider = config.providers.cloudflare;
			addText("Cloudflare Account ID", "Workers AI 账户 ID", provider.accountId, (value) => provider.accountId = value);
			addSecret("Cloudflare API Token", "需要 Workers AI 调用权限", provider.apiToken, (value) => provider.apiToken = value);
			addText("模型", "Workers AI 音频模型", provider.model, (value) => provider.model = value, "@cf/openai/whisper-large-v3-turbo");
		} else if (config.provider === "google") {
			const provider = config.providers.google;
			addSecret("Google API Key", "已启用 Speech-to-Text API 的项目密钥", provider.apiKey, (value) => provider.apiKey = value);
			addText("识别模型", "例如 latest_long 或 default", provider.model, (value) => provider.model = value, "latest_long");
			addText("语言代码", "Google 标准语言代码", provider.languageCode, (value) => provider.languageCode = value, "cmn-Hans-CN");
		} else {
			const provider = config.providers.custom;
			addSecret("API Key", "可选；本地兼容服务可以留空", provider.apiKey, (value) => provider.apiKey = value);
			addText("API Base URL", "自定义 OpenAI 兼容地址", provider.baseUrl, (value) => provider.baseUrl = value);
			addText("转写路径", "默认 /audio/transcriptions", provider.path, (value) => provider.path = value, "/audio/transcriptions");
			addText("模型", "服务支持的语音转写模型", provider.model, (value) => provider.model = value, "whisper-1");
		}
	}

	private buildChatSection(containerEl: HTMLElement) {
		new Setting(containerEl).setName("界面与对话").setHeading();

		new Setting(containerEl)
			.setName("主题")
			.setDesc("界面主题风格；新主题会同步作用于知识助手和费曼学习。")
			.addDropdown((dropdown) =>
				dropdown
					.addOptions(THEME_OPTIONS)
					.setValue(this.plugin.settings.theme)
					.onChange(async (value) => {
						this.plugin.settings.theme = value;
						await this.plugin.saveSettings();
						this.plugin.applyTheme();
						this.updateThemePreviewActive();
					})
			);

		this.renderThemePreview(containerEl);

		const temp = this.plugin.settings.temperature;
		const tempSetting = new Setting(containerEl)
			.setName("Temperature")
			.setDesc(`控制回复的随机性。0 = 确定性输出，0.3 = 稳定严谨，0.7 = 均衡(推荐)，1.5 = 创意发散 (当前: ${temp.toFixed(1)})`)
			.addSlider((slider) =>
				slider
					.setLimits(0, 2, 0.1)
					.setValue(temp)
					.onChange(async (value) => {
						this.plugin.settings.temperature = value;
						tempSetting.setDesc(`控制回复的随机性。0 = 确定性输出，0.3 = 稳定严谨，0.7 = 均衡(推荐)，1.5 = 创意发散 (当前: ${value.toFixed(1)})`);
						this.debouncedSave();
					})
			);

		const maxIter = this.plugin.settings.maxIterations;
		const iterSetting = new Setting(containerEl)
			.setName("对话轮次上限")
			.setDesc(`当前: ${maxIter} 轮`)
			.addSlider((slider) =>
				slider
					.setLimits(5, 50, 1)
					.setValue(maxIter)
					.onChange(async (value) => {
						this.plugin.settings.maxIterations = value;
						iterSetting.setDesc(`当前: ${value} 轮`);
						this.debouncedSave();
					})
			);

		new Setting(containerEl)
			.setName("输出模式")
			.setDesc("当前版本统一使用稳定兼容模式，避免流式连接中断摄取、查询和 Lint 工具链。旧的流式配置会继续保留，但不再参与主流程。");

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

	private renderThemePreview(containerEl: HTMLElement): void {
		const grid = containerEl.createDiv({ cls: "llm-wiki-theme-preview-grid" });
		const previewThemes = ["folio", "glass", "terminal", "studio"];
		const descriptions: Record<string, string> = {
			folio: "阅读型插件气质",
			glass: "现代 AI 助手气质",
			terminal: "重度编辑器气质",
			studio: "克制生产力气质",
		};
		for (const theme of previewThemes) {
			const card = grid.createEl("button", {
				cls: `llm-wiki-theme-preview-card llm-wiki-theme-preview-${theme}${this.plugin.settings.theme === theme ? " is-active" : ""}`,
				attr: { type: "button" },
			});
			card.createSpan({ cls: "llm-wiki-theme-preview-swatch" });
			const copy = card.createDiv();
			copy.createEl("strong", { text: THEME_OPTIONS[theme] });
			copy.createEl("small", { text: descriptions[theme] });
			card.addEventListener("click", () => {
				void (async () => {
					this.plugin.settings.theme = theme;
					await this.plugin.saveSettings();
					this.plugin.applyTheme();
					this.updateThemePreviewActive();
				})();
			});
		}
	}

	private updateThemePreviewActive(): void {
		const grid = this.containerEl.querySelector(".llm-wiki-theme-preview-grid");
		if (!grid) return;
		const cards = grid.querySelectorAll(".llm-wiki-theme-preview-card");
		cards.forEach((card) => {
			const cls = card.classList;
			if (cls.contains(`llm-wiki-theme-preview-${this.plugin.settings.theme}`)) {
				cls.add("is-active");
			} else {
				cls.remove("is-active");
			}
		});
	}

	private buildExtractionSection(containerEl: HTMLElement) {
		new Setting(containerEl).setName("提取与构建").setHeading();

		new Setting(containerEl)
			.setName("提取详细度")
			.setDesc("控制从原始资料中提取知识点的详细程度")
			.addDropdown((dropdown) =>
				dropdown
					.addOptions({
						concise: "精简（500-1500字，仅必选章节）",
						standard: "标准（1500-3000字，必选+按需可选章节）",
						deep: "深度（≥3000字，必选详写+尽量补充可选章节）",
					})
					.setValue(this.plugin.settings.extractionDetail)
					.onChange(async (value) => {
						this.plugin.settings.extractionDetail = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("智能批量跳过")
			.setDesc("创建知识点时，如果已有页面成熟度达到完整级则跳过")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.enableBatchSkip)
					.onChange(async (value) => {
						this.plugin.settings.enableBatchSkip = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl).setName("后台批量摄取").setHeading();
		const batchSizeSetting = new Setting(containerEl)
			.setName("每批文件数")
			.setDesc(`每批后台处理的最大文件数（当前 ${this.plugin.settings.batchIngestion.batchSize}），新摄取计划默认只纳入这么多文件；需要处理全部资料时请明确说“全部”`)
			.addSlider((slider) => slider
				.setLimits(5, 20, 1)
				.setValue(this.plugin.settings.batchIngestion.batchSize)
				.onChange((value) => {
					this.plugin.settings.batchIngestion.batchSize = value;
					batchSizeSetting.setDesc(`每批后台处理的最大文件数（当前 ${value}），新摄取计划默认只纳入这么多文件；需要处理全部资料时请明确说“全部”`);
					this.debouncedSave();
				}));

		const pagesSetting = new Setting(containerEl)
			.setName("单文件最多知识页面")
			.setDesc(`当前最多 ${this.plugin.settings.batchIngestion.maxPagesPerFile} 个页面`)
			.addSlider((slider) => slider
				.setLimits(1, 12, 1)
				.setValue(this.plugin.settings.batchIngestion.maxPagesPerFile)
				.onChange((value) => {
					this.plugin.settings.batchIngestion.maxPagesPerFile = value;
					pagesSetting.setDesc(`当前最多 ${value} 个页面`);
					this.debouncedSave();
				}));

		const retrySetting = new Setting(containerEl)
			.setName("单文件自动重试")
			.setDesc(`失败后最多重试 ${this.plugin.settings.batchIngestion.maxRetries} 次`)
			.addSlider((slider) => slider
				.setLimits(0, 3, 1)
				.setValue(this.plugin.settings.batchIngestion.maxRetries)
				.onChange((value) => {
					this.plugin.settings.batchIngestion.maxRetries = value;
					retrySetting.setDesc(`失败后最多重试 ${value} 次`);
					this.debouncedSave();
				}));
	}

	private async fetchModels(): Promise<string[]> {
		try {
			if ((!this.plugin.settings.apiKey && this.plugin.settings.provider !== "ollama") || !this.plugin.settings.apiBaseUrl) return [];
			const url = `${this.plugin.settings.apiBaseUrl.replace(/\/$/, "")}/models`;
			const config = this.providerAdapter.getRequestConfig(this.plugin.settings);
			const response = await requestUrl({
				url,
				method: "GET",
				headers: config.headers,
			});
			const data = response.json as { data?: Array<{ id: string }>; models?: Array<{ id: string }> };
			const list = data.data || data.models;
			if (list && Array.isArray(list)) {
				return list.map((m: { id: string }) => m.id).sort();
			}
			return [];
		} catch (e: unknown) {
			new Notice(`获取模型列表失败: ${e instanceof Error ? e.message : String(e)}`, 5000);
			return [];
		}
	}

	private async testConnection(): Promise<string> {
		try {
			const baseUrl = this.plugin.settings.apiBaseUrl.replace(/\/$/, "");
			const config = this.providerAdapter.getRequestConfig(this.plugin.settings);
			let modelsFetched: string[] = [];
			try {
				const modelsResp = await requestUrl({
					url: `${baseUrl}/models`,
					method: "GET",
					headers: config.headers,
				});
				const data = modelsResp.json as { data?: Array<{ id: string }>; models?: Array<{ id: string }> };
				const list = data.data || data.models;
				if (list && Array.isArray(list)) {
					modelsFetched = list.map((m: { id: string }) => m.id);
				}
			} catch { /* /models optional */ }

			const chatResp = await requestUrl({
				url: config.url,
				method: "POST",
				headers: config.headers,
				body: JSON.stringify({
					model: this.plugin.settings.modelName,
					messages: [{ role: "user", content: "hi" }],
					max_tokens: 5,
				}),
			});

			const respData = chatResp.json as { choices?: Array<unknown>; error?: { message: string } };
			if (respData.error) return `❌ ${respData.error.message}`;

			if (modelsFetched.length > 0) {
				const preview = modelsFetched.slice(0, 8).join(", ");
				const more = modelsFetched.length > 8 ? ` 等${modelsFetched.length}个` : "";
				const found = modelsFetched.includes(this.plugin.settings.modelName);
				return found ? `✅ 可用 (${modelsFetched.length}个模型: ${preview}${more})` : `⚠️ 模型 "${this.plugin.settings.modelName}" 不在列表中 (可用: ${preview}${more})`;
			}
			return "✅ 连接成功 — /models 端点不可用但聊天请求正常，请确保模型名称正确";
		} catch (e: unknown) {
			const msg = e instanceof Error ? e.message : String(e);
			const errStr = typeof e === "object" && e !== null && "status" in e ? `[${(e as { status: number }).status}] ` : "";
			if (msg.includes("404")) return `❌ ${errStr}接口不存在 (404)，请检查 Base URL`;
			if (msg.includes("401") || msg.includes("403")) return `❌ ${errStr}API Key 无效或无权限`;
			return `❌ ${errStr}${msg.substring(0, 60)}`;
		}
	}
}
