import { App, normalizePath, TFile, TFolder } from "obsidian";
import type { LLMWikiSettings } from "../settings";

export interface ToolDefinition {
	name: string;
	description: string;
	parameters: {
		type: "object";
		properties: { [key: string]: { type: string; description: string; enum?: string[] } };
		required: string[];
	};
	execute: (args: any) => Promise<ToolResult>;
}

export interface ToolResult {
	success: boolean;
	content: string;
}

export class ToolRegistry {
	app: App;
	settings: LLMWikiSettings;
	tools: Map<string, ToolDefinition> = new Map();

	constructor(app: App, settings: LLMWikiSettings) {
		this.app = app;
		this.settings = settings;
		this.registerAllTools();
	}

	updateSettings(settings: LLMWikiSettings) {
		this.settings = settings;
	}

	private registerAllTools() {
		this.registerVaultTools();
		this.registerSkillTools();
		this.registerMemoryTools();
	}

	private registerVaultTools() {
		this.tools.set("read_vault_file", {
			name: "read_vault_file",
			description: "读取 Vault 中的文件内容",
			parameters: {
				type: "object",
				properties: {
					path: { type: "string", description: "文件在 Vault 中的相对路径" },
				},
				required: ["path"],
			},
			execute: async (args) => {
				try {
					const normalizedPath = normalizePath(args.path);
					const file = this.app.vault.getAbstractFileByPath(normalizedPath);
					if (!file || !(file instanceof TFile)) {
						return { success: false, content: `文件不存在: ${normalizedPath}` };
					}
					const content = await this.app.vault.read(file);
					return { success: true, content };
				} catch (e: any) {
					return { success: false, content: `读取文件失败: ${e.message}` };
				}
			},
		});

		this.tools.set("write_vault_file", {
			name: "write_vault_file",
			description: "创建新文件（不能写入 00-原始资料/ 目录。如果文件已存在则报错）",
			parameters: {
				type: "object",
				properties: {
					path: { type: "string", description: "文件在 Vault 中的相对路径（必须是不存在的路径，且不能在 00-原始资料/ 下）" },
					content: { type: "string", description: "文件内容" },
				},
				required: ["path", "content"],
			},
			execute: async (args) => {
				try {
					const normalizedPath = normalizePath(args.path);
					const rawCheck = this.isUnderRawMaterials(normalizedPath);
					if (rawCheck) {
						return { success: false, content: `禁止写入原始资料目录：${rawCheck}。00-原始资料/ 目录只读，不能修改。如果用户需要移动文件，请告知用户手动操作。` };
					}
					const existing = this.app.vault.getAbstractFileByPath(normalizedPath);
					if (existing && existing instanceof TFile) {
						return { success: false, content: `文件已存在，禁止覆盖：${normalizedPath}。请使用 append_vault_file 追加内容，或使用 update_knowledge_page 更新页面章节。` };
					}
					await this.ensureFolder(normalizedPath.substring(0, normalizedPath.lastIndexOf("/")));
					await this.app.vault.create(normalizedPath, args.content);
					return { success: true, content: `文件已创建: ${normalizedPath}` };
				} catch (e: any) {
					return { success: false, content: `创建文件失败: ${e.message}` };
				}
			},
		});

		this.tools.set("append_vault_file", {
			name: "append_vault_file",
			description: "在 Vault 文件末尾追加内容（不能修改 00-原始资料/ 目录下的文件）",
			parameters: {
				type: "object",
				properties: {
					path: { type: "string", description: "文件在 Vault 中的相对路径" },
					content: { type: "string", description: "要追加的内容" },
				},
				required: ["path", "content"],
			},
			execute: async (args) => {
				try {
					const normalizedPath = normalizePath(args.path);
					const rawCheck = this.isUnderRawMaterials(normalizedPath);
					if (rawCheck) {
						return { success: false, content: `禁止修改原始资料目录：${rawCheck}。00-原始资料/ 目录只读。` };
					}
					const file = this.app.vault.getAbstractFileByPath(normalizedPath);
					if (!file || !(file instanceof TFile)) {
						return { success: false, content: `文件不存在: ${normalizedPath}` };
					}
					const existing = await this.app.vault.read(file);
					await this.app.vault.modify(file, existing + "\n" + args.content);
					return { success: true, content: `内容已追加到: ${normalizedPath}` };
				} catch (e: any) {
					return { success: false, content: `追加内容失败: ${e.message}` };
				}
			},
		});

		this.tools.set("list_vault_folder", {
			name: "list_vault_folder",
			description: "列出 Vault 文件夹中的所有文件和子文件夹",
			parameters: {
				type: "object",
				properties: {
					path: { type: "string", description: "文件夹在 Vault 中的相对路径" },
				},
				required: ["path"],
			},
			execute: async (args) => {
				try {
					const normalizedPath = normalizePath(args.path);
					const folder = this.app.vault.getAbstractFileByPath(normalizedPath);
					if (!folder || !(folder instanceof TFolder)) {
						return { success: false, content: `文件夹不存在: ${normalizedPath}` };
					}
					const items: string[] = [];
					for (const child of folder.children) {
						if (child instanceof TFile) {
							items.push(`📄 ${child.path} (${child.stat.size} bytes)`);
						} else if (child instanceof TFolder) {
							items.push(`📁 ${child.path}/`);
						}
					}
					return { success: true, content: items.length > 0 ? items.join("\n") : "文件夹为空" };
				} catch (e: any) {
					return { success: false, content: `列出文件夹失败: ${e.message}` };
				}
			},
		});

		this.tools.set("create_vault_folder", {
			name: "create_vault_folder",
			description: "在 Vault 中创建文件夹（支持递归创建）",
			parameters: {
				type: "object",
				properties: {
					path: { type: "string", description: "文件夹在 Vault 中的相对路径" },
				},
				required: ["path"],
			},
			execute: async (args) => {
				try {
					const normalizedPath = normalizePath(args.path);
					await this.ensureFolder(normalizedPath);
					return { success: true, content: `文件夹已创建: ${normalizedPath}` };
				} catch (e: any) {
					return { success: false, content: `创建文件夹失败: ${e.message}` };
				}
			},
		});

		this.tools.set("search_vault_files", {
			name: "search_vault_files",
			description: "在 Vault 中搜索文件名包含关键词的文件",
			parameters: {
				type: "object",
				properties: {
					query: { type: "string", description: "搜索关键词" },
					folder: { type: "string", description: "限定搜索的文件夹路径（可选）" },
				},
				required: ["query"],
			},
			execute: async (args) => {
				try {
					const query = args.query.toLowerCase();
					const files = this.app.vault.getFiles();
					let results = files.filter((f) => f.path.toLowerCase().includes(query));
					if (args.folder) {
						const folder = normalizePath(args.folder).toLowerCase();
						results = results.filter((f) => f.path.toLowerCase().startsWith(folder));
					}
					const items = results.slice(0, 50).map((f) => `📄 ${f.path}`);
					return {
						success: true,
						content: items.length > 0 ? `找到 ${results.length} 个文件:\n${items.join("\n")}` : "未找到匹配文件",
					};
				} catch (e: any) {
					return { success: false, content: `搜索失败: ${e.message}` };
				}
			},
		});

		this.tools.set("search_vault_content", {
			name: "search_vault_content",
			description: "在 Vault 文件内容中搜索包含关键词的文件",
			parameters: {
				type: "object",
				properties: {
					query: { type: "string", description: "搜索内容关键词" },
					folder: { type: "string", description: "限定搜索的文件夹路径（可选）" },
				},
				required: ["query"],
			},
			execute: async (args) => {
				try {
					const query = args.query.toLowerCase();
					let files = this.app.vault.getMarkdownFiles();
					if (args.folder) {
						const folder = normalizePath(args.folder).toLowerCase();
						files = files.filter((f) => f.path.toLowerCase().startsWith(folder));
					}
					const results: string[] = [];
					for (const file of files.slice(0, 100)) {
						const content = await this.app.vault.cachedRead(file);
						if (content.toLowerCase().includes(query)) {
							results.push(`📄 ${file.path}`);
						}
					}
					return {
						success: true,
						content: results.length > 0 ? `找到 ${results.length} 个文件:\n${results.join("\n")}` : "未找到匹配内容",
					};
				} catch (e: any) {
					return { success: false, content: `搜索失败: ${e.message}` };
				}
			},
		});
	}

	private registerSkillTools() {
		this.tools.set("read_skill", {
			name: "read_skill",
			description: "读取 SKILL.md 文件或 references/ 中的参考模板文件。用于随时查阅知识库构建规范原文",
			parameters: {
				type: "object",
				properties: {
					file: {
						type: "string",
						description: '要读取的文件名。可选值：SKILL.md（主规范）、知识点页面模板.md、人物传记模板.md、组织档案模板.md、知识库总索引模板.md、更新日志模板.md、AGENTS-template.md、冲突记录模板.md',
					},
				},
				required: ["file"],
			},
			execute: async (args) => {
				try {
					const skillDir = normalizePath(this.settings.skillFolderPath);
					const refDir = `${skillDir}/references`;
					let filePath: string;

					if (args.file === "SKILL.md") {
						filePath = `${skillDir}/SKILL.md`;
					} else {
						filePath = `${refDir}/${args.file}`;
					}

					const file = this.app.vault.getAbstractFileByPath(normalizePath(filePath));
					if (!file || !(file instanceof TFile)) {
						return { success: false, content: `文件不存在: ${filePath}。Skill 文件夹路径: ${this.settings.skillFolderPath}` };
					}
					const content = await this.app.vault.read(file);
					return { success: true, content };
				} catch (e: any) {
					return { success: false, content: `读取失败: ${e.message}` };
				}
			},
		});
		this.tools.set("init_knowledge_base", {
			name: "init_knowledge_base",
			description: "初始化专题知识库目录结构，创建所有必需的文件夹和初始索引文件",
			parameters: {
				type: "object",
				properties: {
					topic_name: { type: "string", description: "专题名称，如'巴菲特投资'、'Python编程'" },
					categories: {
						type: "string",
						description: "知识点库分类，逗号分隔，如'核心概念,方法论,经典案例,人物传记,组织档案,行业分析'",
					},
					raw_categories: {
						type: "string",
						description: "原始资料分类，逗号分隔，如'致股东信,股东大会演讲'",
					},
				},
				required: ["topic_name"],
			},
			execute: async (args) => {
				try {
					const basePath = normalizePath(this.settings.knowledgeBasePath);
					const categories = (args.categories || "核心概念,方法论,经典案例,人物传记,组织档案,行业分析").split(",");
					const rawCategories = (args.raw_categories || "资料分类1,资料分类2").split(",");

					const folders = [
						basePath,
						`${basePath}/00-原始资料`,
						`${basePath}/00-原始资料/assets`,
						`${basePath}/10-知识点库`,
						`${basePath}/20-知识索引`,
						`${basePath}/30-维护记录`,
					];

					for (const cat of rawCategories) {
						folders.push(`${basePath}/00-原始资料/${cat.trim()}`);
					}
					for (const cat of categories) {
						folders.push(`${basePath}/10-知识点库/${cat.trim()}`);
					}

					for (const folder of folders) {
						await this.ensureFolder(folder);
					}

					const indexContent = `# ${args.topic_name}知识库总索引\n\n## 一、知识点分类索引\n\n${categories
						.map((cat: string, i: number) => `### ${i + 1}. ${cat.trim()}（0个）🔴\n\n（暂无知识点）`)
						.join("\n\n")}\n\n---\n\n## 二、人物传记索引（0位）\n\n（暂无）\n\n---\n\n## 三、组织档案索引（0家）\n\n（暂无）\n\n---\n\n## 四、原始资料统计\n\n| 来源 | 数量 | 状态 |\n|------|------|------|\n${rawCategories
						.map((cat: string) => `| ${cat.trim()} | 0份 | 🟡 收集中 |`)
						.join("\n")}\n\n---\n\n## 五、统计信息\n\n- 知识点总数：0个\n- 人物传记：0位\n- 组织档案：0家\n- 原始资料：0份\n- 关键词：0个\n\n---\n\n## 六、成熟度分布\n\n| 级别 | 数量 | 占比 | 下一步 |\n|------|------|------|--------|\n| 🟢 完整级 | 0个 | 0% | 维护 |\n| 🟡 基础级 | 0个 | 0% | 完善 |\n| 🔴 框架级 | 0个 | 0% | 优先补充 |\n`;

					await this.createFileOnly(`${basePath}/20-知识索引/知识库总索引.md`, indexContent);

					const keywordIndexContent = `# ${args.topic_name}关键词索引\n\n| 关键词 | 相关知识点 | 出现次数 |\n|--------|-----------|----------|\n\n（暂无关键词）\n`;
					await this.createFileOnly(`${basePath}/20-知识索引/关键词索引.md`, keywordIndexContent);

					const graphContent = `# ${args.topic_name}知识点关系图谱\n\n## 知识点关系\n\n\`\`\`mermaid\ngraph LR\n    start[知识库] --> 待补充\n\`\`\`\n\n## 关系说明\n\n（暂无关系数据）\n`;
					await this.createFileOnly(`${basePath}/20-知识索引/知识点关系图谱.md`, graphContent);

					const logContent = `# 知识库更新日志\n\n## ${new Date().toISOString().split("T")[0]} | 知识库初始化\n\n**操作人：** 知识库维护者\n**变更类型：** 新建\n**触发来源：** 用户指令\n\n### 变更内容\n\n初始化 ${args.topic_name} 知识库，创建目录结构和初始索引文件。\n\n### 新建页面\n\n- 20-知识索引/知识库总索引.md\n- 20-知识索引/关键词索引.md\n- 20-知识索引/知识点关系图谱.md\n- 30-维护记录/知识库更新日志.md\n\n---\n`;
					await this.createFileOnly(`${basePath}/30-维护记录/知识库更新日志.md`, logContent);

					const conflictContent = `# 冲突与错误记录\n\n（暂无冲突记录）\n`;
					await this.createFileOnly(`${basePath}/30-维护记录/冲突与错误记录.md`, conflictContent);

					let agentsContent = `# AGENTS.md — ${args.topic_name}知识库维护规则\n\n> 基于 Karpathy LLM Wiki 方法论\n\n## 目录结构\n\n\`\`\`\n${args.topic_name}/\n├── 00-原始资料/\n├── 10-知识点库/\n├── 20-知识索引/\n├── 30-维护记录/\n└── AGENTS.md\n\`\`\`\n`;
				try {
					const templatePath = normalizePath(`${this.settings.skillFolderPath}/references/AGENTS-template.md`);
					const templateFile = this.app.vault.getAbstractFileByPath(templatePath);
					if (templateFile && templateFile instanceof TFile) {
						const templateContent = await this.app.vault.read(templateFile);
						agentsContent = templateContent
							.replace(/\[专题名称\]/g, args.topic_name)
							.replace(/\[专题名称\]/g, args.topic_name)
							.replace(/YYYY-MM-DD/g, new Date().toISOString().split("T")[0])
							.replace(/\[方括号\]/g, "");
					}
				} catch { /* ignore */ }
				await this.createFileOnly(`${basePath}/AGENTS.md`, agentsContent);

					return {
						success: true,
						content: `知识库 "${args.topic_name}" 已初始化完成！\n\n创建的目录：\n- 00-原始资料/（含 ${rawCategories.length} 个分类）\n- 10-知识点库/（含 ${categories.length} 个分类）\n- 20-知识索引/\n- 30-维护记录/\n\n创建的文件：\n- 知识库总索引.md\n- 关键词索引.md\n- 知识点关系图谱.md\n- 知识库更新日志.md\n- 冲突与错误记录.md\n- AGENTS.md\n\n现在可以开始放入原始资料并执行摄取工作流了！`,
					};
				} catch (e: any) {
					return { success: false, content: `初始化知识库失败: ${e.message}` };
				}
			},
		});

		this.tools.set("ingest_raw_material", {
			name: "ingest_raw_material",
			description: "摄取原始资料：读取原始资料文件，返回完整内容供LLM提炼知识点。读取后LLM必须执行完整工作流：提炼→创建页面→更新索引→追加日志。请使用 create_and_index_page 一站式完成",
			parameters: {
				type: "object",
				properties: {
					file_path: { type: "string", description: "原始资料文件路径（必须是以 00-原始资料/ 开头的路径）" },
					focus_topics: { type: "string", description: "重点关注的知识点主题，逗号分隔（可选）" },
				},
				required: ["file_path"],
			},
			execute: async (args) => {
				try {
					const filePath = normalizePath(args.file_path);
					const file = this.app.vault.getAbstractFileByPath(filePath);
					if (!file || !(file instanceof TFile)) {
						return { success: false, content: `原始资料文件不存在: ${filePath}` };
					}
					const content = await this.app.vault.read(file);
					const preview = content.length > 8000 ? content.substring(0, 8000) + "\n\n...（以下内容省略，共" + content.length + "字）" : content;

					const focusHint = args.focus_topics ? `重点关注知识点：${args.focus_topics}` : "请自行判断原始资料中有哪些值得提炼的知识点";

					return {
						success: true,
						content: `📄 已读取原始资料: ${filePath}（共${content.length}字）\n\n---\n内容预览:\n${preview}\n\n---\n\n## ⚠️ 接下来你必须按以下工作流执行，不能跳过任何步骤！\n\n### 必须完成的标准工作流：\n\n**Step 1 — 提炼知识点（你现在的位置）**\n${focusHint}\n\n**Step 2 — 一站式创建页面+索引+日志**\n- 调用 create_and_index_page 工具，传入 page_type、title、content（完整9章markdown）、entry_category、keywords\n- 不要手动拆分多个步骤，用这一个工具完成所有操作\n\n**Step 3 — 链接与入链**\n- 新页面创建后，必须在至少3个已有页面中使用 append_vault_file 添加入链（添加 [[知识点名称]] 到相关页面的「相关知识点」章节）\n\n**Step 4 — 执行自检清单**\n- 索引数量是否同步？\n- 新页面是否有 ≥3 个入链？\n- 更新日志是否已追加？（已由 create_and_index_page 自动完成）\n\n**Step 5 — 总结（最后一步，必须执行）**\n工作流全部完成后，必须用中文向用户完整总结：\n- 读取了哪个原始资料\n- 创建/更新了哪些知识点页面\n- 更新了哪些索引\n- 当前知识库概况（文件数、成熟度）`,
					};
				} catch (e: any) {
					return { success: false, content: `摄取资料失败: ${e.message}` };
				}
			},
		});

		this.tools.set("create_knowledge_page", {
			name: "create_knowledge_page",
			description: "创建知识点页面。推荐优先使用 create_and_index_page 一站式创建+索引+日志。推荐只传 title + category + content(完整markdown) 三个参数，自动套用模板",
			parameters: {
				type: "object",
				properties: {
					category: {
						type: "string",
						description: "知识点分类，如：核心概念、方法论、经典案例、行业分析",
					},
					title: { type: "string", description: "知识点名称" },
					definition: { type: "string", description: "一句话定义（可选，有content时忽略）" },
					core_content: { type: "string", description: "核心定义内容（可选，有content时忽略）" },
					content: { type: "string", description: "完整markdown内容（可选，提供后忽略其他格式化参数）。推荐使用此参数，直接将完整的9章markdown传入" },
					key_points: { type: "string", description: "核心要点（可选，有content时忽略）" },
					cases: { type: "string", description: "经典案例（可选，有content时忽略）" },
					methods: { type: "string", description: "实践方法（可选，有content时忽略）" },
					misconceptions: { type: "string", description: "常见误区（可选，有content时忽略）" },
					related_topics: { type: "string", description: "相关知识点，逗号分隔（可选）" },
					source_refs: { type: "string", description: "原文出处路径，逗号分隔（可选）" },
					insights: { type: "string", description: "对目标人群的启示（可选）" },
					maturity: {
						type: "string",
						description: "成熟度级别",
						enum: ["完整级", "基础级", "框架级"],
					},
				},
				required: ["category", "title"],
			},
			execute: async (args) => {
				try {
					const basePath = normalizePath(this.settings.knowledgeBasePath);
					const categoryPath = `${basePath}/10-知识点库/${args.category}`;
					await this.ensureFolder(categoryPath);

					const today = new Date().toISOString().split("T")[0];
					const filePath = `${categoryPath}/${args.title}.md`;
					const existingFile = this.app.vault.getAbstractFileByPath(normalizePath(filePath));
					if (existingFile && existingFile instanceof TFile) {
						return { success: false, content: `知识点页面已存在，禁止覆盖：${filePath}。请使用 update_knowledge_page 追加内容。` };
					}

					if (args.content) {
						await this.createFileOnly(filePath, args.content);
						return {
							success: true,
							content: `知识点页面已创建: ${filePath}（使用完整markdown内容）\n\n接下来必须执行：\n1. 使用 update_index 工具 update_index action=add_entry 以更新索引\n2. 使用 append_vault_file 追加更新日志到 30-维护记录/知识库更新日志.md\n\n或者直接使用 create_and_index_page 一站式完成上述全部步骤。`,
						};
					}

					const maturity = args.maturity ? `${args.maturity}` : "基础级";
					const maturityEmoji = maturity.includes("完整") ? "🟢" : maturity.includes("框架") ? "🔴" : "🟡";

					let keyPointsSection = "### 要点1：[待补充]\n\n[待补充]";
					if (args.key_points) {
						try {
							const points = JSON.parse(args.key_points);
							keyPointsSection = points
								.map(
									(p: any, i: number) =>
										`### 要点${i + 1}：${p.name || p.title}\n\n${p.content || p.description || ""}`
								)
								.join("\n\n");
						} catch {
							keyPointsSection = args.key_points;
						}
					}

					let casesSection = "### 案例1：[待补充]\n\n[待补充]";
					if (args.cases) {
						try {
							const cases = JSON.parse(args.cases);
							casesSection = cases
								.map(
									(c: any, i: number) =>
										`### 案例${i + 1}：${c.name || c.title}\n\n${c.content || c.description || ""}`
								)
								.join("\n\n");
						} catch {
							casesSection = args.cases;
						}
					}

					let methodsSection = "### 方法1：[待补充]\n\n[待补充]";
					if (args.methods) {
						try {
							const methods = JSON.parse(args.methods);
							methodsSection = methods
								.map(
									(m: any, i: number) =>
										`### 方法${i + 1}：${m.name || m.title}\n\n${m.content || m.description || ""}`
								)
								.join("\n\n");
						} catch {
							methodsSection = args.methods;
						}
					}

					let misconceptionsSection = "### 误区1：[待补充]\n\n[待补充]";
					if (args.misconceptions) {
						try {
							const misconceptions = JSON.parse(args.misconceptions);
							misconceptionsSection = misconceptions
								.map(
									(m: any, i: number) =>
										`### 误区${i + 1}：${m.name || m.title}\n\n${m.content || m.description || ""}`
								)
								.join("\n\n");
						} catch {
							misconceptionsSection = args.misconceptions;
						}
					}

					const relatedTopics = (args.related_topics || "")
						.split(",")
						.filter((t: string) => t.trim())
						.map((t: string) => `- [[${t.trim()}]]`)
						.join("\n");

					const sourceRefs = (args.source_refs || "")
						.split(",")
						.filter((r: string) => r.trim())
						.map((r: string) => `- [[${r.trim()}]]`)
						.join("\n");

					const pageContent = `# ${args.title}\n\n> ${args.definition || "待补充"}\n\n> ${maturityEmoji} ${maturity} | 最后更新：${today}\n\n---\n\n## 一、核心定义\n\n${args.core_content || "待补充"}\n\n---\n\n## 二、核心要点\n\n${keyPointsSection}\n\n---\n\n## 三、经典案例\n\n${casesSection}\n\n---\n\n## 四、实践方法\n\n${methodsSection}\n\n---\n\n## 五、常见误区\n\n${misconceptionsSection}\n\n---\n\n## 六、相关知识点\n\n${relatedTopics || "- [待补充]"}\n\n---\n\n## 七、原文出处\n\n> ⚠️ 链接规范：原文出处必须使用 Obsidian 双向链接 [[路径]] 语法\n\n${sourceRefs || "- [待补充]"}\n\n---\n\n## 八、对目标人群的启示\n\n${args.insights || "[待补充]"}\n\n---\n\n## 九、更新日志\n\n| 日期 | 操作类型 | 触发来源 | 变更内容 |\n|------|---------|---------|----------|\n| ${today} | 创建 | 用户指令 | 初始化页面 |\n`;

					await this.createFileOnly(filePath, pageContent);

					return {
						success: true,
						content: `知识点页面已创建: ${filePath}\n\n接下来必须执行：\n1. 使用 update_index 工具 action=add_entry 更新索引\n2. 在至少3个已有页面中添加入链\n3. 使用 append_vault_file 追加更新日志到 30-维护记录/知识库更新日志.md\n\n推荐直接使用 create_and_index_page 一站式完成以上步骤。`,
					};
				} catch (e: any) {
					return { success: false, content: `创建知识点页面失败: ${e.message}` };
				}
			},
		});

		this.tools.set("create_and_index_page", {
			name: "create_and_index_page",
			description: "一站式创建知识页面 + 更新索引 + 追加日志。推荐使用此工具替代分别调用 create_knowledge_page + update_index + append_vault_file",
			parameters: {
				type: "object",
				properties: {
					page_type: {
						type: "string",
						description: "页面类型：knowledge=知识点, person=人物传记, organization=组织档案",
						enum: ["knowledge", "person", "organization"],
					},
					category: { type: "string", description: "知识点分类（page_type=knowledge时必填），如：核心概念、方法论" },
					title: { type: "string", description: "页面标题/知识点名称" },
					content: { type: "string", description: "完整的markdown页面内容（必须包含全部9个章节）" },
					entry_category: { type: "string", description: "索引中的分类名（可选，默认与category相同）" },
					entry_description: { type: "string", description: "索引条目的一句话描述（可选）" },
					maturity: {
						type: "string",
						description: "成熟度级别",
						enum: ["完整级", "基础级", "框架级"],
					},
					keywords: { type: "string", description: "新增关键词，逗号分隔（可选）" },
				},
				required: ["page_type", "title", "content"],
			},
			execute: async (args) => {
				try {
					const basePath = normalizePath(this.settings.knowledgeBasePath);
					const today = new Date().toISOString().split("T")[0];
					const maturityEmoji = args.maturity?.includes("完整") ? "🟢" : args.maturity?.includes("框架") ? "🔴" : "🟡";

					let category = args.category || "未分类";
					if (args.page_type === "person") category = "人物传记";
					else if (args.page_type === "organization") category = "组织档案";

					const categoryPath = `${basePath}/10-知识点库/${category}`;
					await this.ensureFolder(categoryPath);
					const filePath = `${categoryPath}/${args.title}.md`;
					const existing = this.app.vault.getAbstractFileByPath(normalizePath(filePath));
					if (existing && existing instanceof TFile) {
						return { success: false, content: `页面已存在，禁止覆盖：${filePath}。请使用 update_knowledge_page 追加内容。` };
					}
					await this.createFileOnly(filePath, args.content);

					const indexCategory = args.entry_category || category;

					const indexPath = `${basePath}/20-知识索引/知识库总索引.md`;
					const indexFile = this.app.vault.getAbstractFileByPath(normalizePath(indexPath));
					if (indexFile && indexFile instanceof TFile) {
						const indexContent = await this.app.vault.read(indexFile);
						const escCategory = indexCategory.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
						const categoryPattern = new RegExp(`###\\s+\\d+\\.\\s+${escCategory}\\s*\\(\\d+个\\)`);
						const match = indexContent.match(categoryPattern);
						if (match) {
							const categoryStart = indexContent.indexOf(match[0]);
							const nextCategoryStart = indexContent.indexOf("\n### ", categoryStart + 1);
							const endPos = nextCategoryStart === -1 ? indexContent.indexOf("\n---", categoryStart) : nextCategoryStart;
							const categorySection = indexContent.substring(categoryStart, endPos);
							const countMatch = categorySection.match(/\((\d+)个\)/);
							const currentCount = countMatch ? parseInt(countMatch[1]) : 0;
							const updatedSection = categorySection.replace(`(${currentCount}个)`, `(${currentCount + 1}个)`).replace(/（暂无知识点）/, "");
							const newEntry = `- [[${args.title}]] ${maturityEmoji} - ${args.entry_description || "待补充"}`;
							const updatedContent = indexContent.substring(0, categoryStart) + updatedSection.trimEnd() + "\n" + newEntry + "\n" + indexContent.substring(endPos);
							await this.app.vault.modify(indexFile, updatedContent);

							const totalMatch = updatedContent.match(/知识点总数：(\d+)个/);
							if (totalMatch) {
								const newTotal = parseInt(totalMatch[1]) + 1;
								await this.app.vault.modify(indexFile, updatedContent.replace(`知识点总数：${totalMatch[1]}个`, `知识点总数：${newTotal}个`));
							}
						}

						if (args.keywords) {
							const keywordPath = `${basePath}/20-知识索引/关键词索引.md`;
							const keywordFile = this.app.vault.getAbstractFileByPath(normalizePath(keywordPath));
							if (keywordFile && keywordFile instanceof TFile) {
								const kwContent = await this.app.vault.read(keywordFile);
								const newKeywords = args.keywords.split(",").map((k: string) => `| ${k.trim()} | [[${args.title}]] | 1 |`).join("\n");
								await this.app.vault.modify(keywordFile, kwContent.replace("（暂无关键词）", newKeywords));
							}
						}
					}

					const logPath = `${basePath}/30-维护记录/知识库更新日志.md`;
					const logFile = this.app.vault.getAbstractFileByPath(normalizePath(logPath));
					const logEntry = `\n## ${today} | 新建知识点：${args.title}\n\n**操作人：** 知识库维护者\n**变更类型：** 新建\n**触发来源：** 用户指令\n\n### 变更内容\n\n创建知识点页面：${args.title}（${category}）\n\n### 新建页面\n\n- ${filePath}\n\n### 同步更新\n\n- 20-知识索引/知识库总索引.md - 添加条目\n\n---\n`;
					if (logFile && logFile instanceof TFile) {
						const existing = await this.app.vault.read(logFile);
						await this.app.vault.modify(logFile, existing + logEntry);
					} else {
						await this.createFileOnly(logPath, `# 知识库更新日志\n${logEntry}`);
					}

					return {
						success: true,
						content: `一站式操作完成！\n1. ✅ 页面已创建: ${filePath}\n2. ✅ 索引已更新: ${indexCategory} +1\n3. ✅ 更新日志已追加\n\n请继续：\n4. 在至少3个已有页面中添加入链（用 append_vault_file 追加 [[${args.title}]] 到相关页面的「相关知识点」章节）\n5. 执行自检清单`,
					};
				} catch (e: any) {
					return { success: false, content: `一站式创建失败: ${e.message}` };
				}
			},
		});

		this.tools.set("create_person_page", {
			name: "create_person_page",
			description: "创建人物传记页面，自动应用人物传记模板",
			parameters: {
				type: "object",
				properties: {
					name: { type: "string", description: "人物名称" },
					intro: { type: "string", description: "一句话介绍" },
					birth_year: { type: "string", description: "出生年份" },
					identity: { type: "string", description: "主要身份/职业" },
					field_relation: { type: "string", description: "与本领域的关系" },
					biography: { type: "string", description: "生平经历" },
					contributions: { type: "string", description: "核心贡献，JSON数组格式" },
					quotes: { type: "string", description: "经典语录，JSON数组格式" },
					influence: { type: "string", description: "影响与启示" },
					related_topics: { type: "string", description: "相关知识点，逗号分隔" },
					related_orgs: { type: "string", description: "相关组织，逗号分隔" },
					source_refs: { type: "string", description: "原文出处路径，逗号分隔" },
					maturity: {
						type: "string",
						description: "成熟度级别",
						enum: ["🟢 完整级", "🟡 基础级", "🔴 框架级"],
					},
				},
				required: ["name", "intro", "identity"],
			},
			execute: async (args) => {
				try {
					const basePath = normalizePath(this.settings.knowledgeBasePath);
					const categoryPath = `${basePath}/10-知识点库/人物传记`;
					await this.ensureFolder(categoryPath);

					const today = new Date().toISOString().split("T")[0];
					const maturity = args.maturity || "🟡 基础级";

					let contributionsSection = "### 贡献1：[待补充]\n\n[待补充]";
					if (args.contributions) {
						try {
							const contributions = JSON.parse(args.contributions);
							contributionsSection = contributions
								.map(
									(c: any, i: number) =>
										`### 贡献${i + 1}：${c.name || c.title}\n\n${c.content || c.description || ""}`
								)
								.join("\n\n");
						} catch {
							contributionsSection = args.contributions;
						}
					}

					let quotesSection = "> [待补充]";
					if (args.quotes) {
						try {
							const quotes = JSON.parse(args.quotes);
							quotesSection = quotes
								.map(
									(q: any) =>
										`> "${q.content || q.text}"\n> —— ${q.source || "出处待补充"}`
								)
								.join("\n\n");
						} catch {
							quotesSection = args.quotes;
						}
					}

					const relatedTopics = (args.related_topics || "")
						.split(",")
						.filter((t: string) => t.trim())
						.map((t: string) => `- [[${t.trim()}]]`)
						.join("\n");

					const relatedOrgs = (args.related_orgs || "")
						.split(",")
						.filter((o: string) => o.trim())
						.map((o: string) => `- [[${o.trim()}]]`)
						.join("\n");

					const sourceRefs = (args.source_refs || "")
						.split(",")
						.filter((r: string) => r.trim())
						.map((r: string) => `- [[${r.trim()}]]`)
						.join("\n");

					const pageContent = `# ${args.name}\n\n> ${args.intro}\n\n> ${maturity} | 约2000字 | 最后更新：${today}\n\n---\n\n## 一、人物简介\n\n- **姓名**：${args.name}\n- **生卒年**：${args.birth_year || "待补充"}\n- **身份**：${args.identity}\n- **与领域的关系**：${args.field_relation || "待补充"}\n\n---\n\n## 二、生平经历\n\n${args.biography || "### 早期经历\n\n[待补充]\n\n### 关键转折\n\n[待补充]\n\n### 主要成就\n\n[待补充]"}\n\n---\n\n## 三、核心贡献\n\n${contributionsSection}\n\n---\n\n## 四、经典语录\n\n${quotesSection}\n\n---\n\n## 五、影响与启示\n\n${args.influence || "[待补充]"}\n\n---\n\n## 六、相关知识点\n\n${relatedTopics || "- [待补充]"}\n\n---\n\n## 七、相关组织\n\n${relatedOrgs || "- [待补充]"}\n\n---\n\n## 八、原文出处\n\n> ⚠️ 链接规范：必须使用 Obsidian 双向链接 [[路径]] 语法\n\n${sourceRefs || "- [待补充]"}\n\n---\n\n## 九、更新日志\n\n| 日期 | 操作类型 | 触发来源 | 变更内容 |\n|------|---------|---------|----------|\n| ${today} | 创建 | 用户指令 | 初始化页面 |\n`;

					const filePath = `${categoryPath}/${args.name}.md`;
					const existingPerson = this.app.vault.getAbstractFileByPath(normalizePath(filePath));
					if (existingPerson && existingPerson instanceof TFile) {
						return { success: false, content: `人物传记页面已存在，禁止覆盖：${filePath}。请使用 update_knowledge_page 追加内容。` };
					}
					await this.createFileOnly(filePath, pageContent);

					return {
						success: true,
						content: `人物传记页面已创建: ${filePath}\n\n请继续执行：\n1. 使用 update_index 工具更新索引\n2. 在至少3个已有页面中添加入链\n3. 追加更新日志`,
					};
				} catch (e: any) {
					return { success: false, content: `创建人物传记页面失败: ${e.message}` };
				}
			},
		});

		this.tools.set("create_organization_page", {
			name: "create_organization_page",
			description: "创建组织档案页面，自动应用组织档案模板",
			parameters: {
				type: "object",
				properties: {
					name: { type: "string", description: "组织名称" },
					intro: { type: "string", description: "一句话介绍" },
					founded_year: { type: "string", description: "成立年份" },
					headquarters: { type: "string", description: "总部位置" },
					main_business: { type: "string", description: "主营业务" },
					industry: { type: "string", description: "行业分类" },
					history: { type: "string", description: "发展历程" },
					core_business: { type: "string", description: "核心业务/模式描述" },
					key_figures: { type: "string", description: "关键人物，逗号分隔" },
					events: { type: "string", description: "重要事件，JSON数组格式" },
					related_topics: { type: "string", description: "相关知识点，逗号分隔" },
					source_refs: { type: "string", description: "原文出处路径，逗号分隔" },
					maturity: {
						type: "string",
						description: "成熟度级别",
						enum: ["🟢 完整级", "🟡 基础级", "🔴 框架级"],
					},
				},
				required: ["name", "intro", "main_business"],
			},
			execute: async (args) => {
				try {
					const basePath = normalizePath(this.settings.knowledgeBasePath);
					const categoryPath = `${basePath}/10-知识点库/组织档案`;
					await this.ensureFolder(categoryPath);

					const today = new Date().toISOString().split("T")[0];
					const maturity = args.maturity || "🟡 基础级";

					let eventsSection = "### 事件1：[待补充]\n\n[待补充]";
					if (args.events) {
						try {
							const events = JSON.parse(args.events);
							eventsSection = events
								.map(
									(e: any, i: number) =>
										`### 事件${i + 1}：${e.name || e.title}\n\n${e.content || e.description || ""}`
								)
								.join("\n\n");
						} catch {
							eventsSection = args.events;
						}
					}

					const keyFigures = (args.key_figures || "")
						.split(",")
						.filter((f: string) => f.trim())
						.map((f: string) => `- [[${f.trim()}]]`)
						.join("\n");

					const relatedTopics = (args.related_topics || "")
						.split(",")
						.filter((t: string) => t.trim())
						.map((t: string) => `- [[${t.trim()}]]`)
						.join("\n");

					const sourceRefs = (args.source_refs || "")
						.split(",")
						.filter((r: string) => r.trim())
						.map((r: string) => `- [[${r.trim()}]]`)
						.join("\n");

					const pageContent = `# ${args.name}\n\n> ${args.intro}\n\n> ${maturity} | 约2000字 | 最后更新：${today}\n\n---\n\n## 一、组织简介\n\n- **名称**：${args.name}\n- **成立年份**：${args.founded_year || "待补充"}\n- **总部位置**：${args.headquarters || "待补充"}\n- **主营业务**：${args.main_business}\n- **行业分类**：${args.industry || "待补充"}\n\n---\n\n## 二、发展历程\n\n${args.history || "### 创立阶段\n\n[待补充]\n\n### 成长阶段\n\n[待补充]\n\n### 现状\n\n[待补充]"}\n\n---\n\n## 三、核心业务/模式\n\n${args.core_business || "[待补充]"}\n\n---\n\n## 四、关键人物\n\n${keyFigures || "- [待补充]"}\n\n---\n\n## 五、重要事件/案例\n\n${eventsSection}\n\n---\n\n## 六、相关知识点\n\n${relatedTopics || "- [待补充]"}\n\n---\n\n## 七、原文出处\n\n> ⚠️ 链接规范：必须使用 Obsidian 双向链接 [[路径]] 语法\n\n${sourceRefs || "- [待补充]"}\n\n---\n\n## 八、最新动态\n\n[待补充]\n\n---\n\n## 九、更新日志\n\n| 日期 | 操作类型 | 触发来源 | 变更内容 |\n|------|---------|---------|----------|\n| ${today} | 创建 | 用户指令 | 初始化页面 |\n`;

					const filePath = `${categoryPath}/${args.name}.md`;
					const existingOrg = this.app.vault.getAbstractFileByPath(normalizePath(filePath));
					if (existingOrg && existingOrg instanceof TFile) {
						return { success: false, content: `组织档案页面已存在，禁止覆盖：${filePath}。请使用 update_knowledge_page 追加内容。` };
					}
					await this.createFileOnly(filePath, pageContent);

					return {
						success: true,
						content: `组织档案页面已创建: ${filePath}\n\n请继续执行：\n1. 使用 update_index 工具更新索引\n2. 在至少3个已有页面中添加入链\n3. 追加更新日志`,
					};
				} catch (e: any) {
					return { success: false, content: `创建组织档案页面失败: ${e.message}` };
				}
			},
		});

		this.tools.set("update_knowledge_page", {
			name: "update_knowledge_page",
				description: "向已有的知识点页面追加内容。不可替换或删除已有内容",
			parameters: {
				type: "object",
				properties: {
					path: { type: "string", description: "知识点页面的路径" },
					section: {
						type: "string",
						description: "要更新的章节核心名称，如：核心定义、核心要点、经典案例、实践方法、常见误区、相关知识点、原文出处、启示、更新日志",
					},
					content: { type: "string", description: "要追加的章节内容（只写章节内容本身，不包含章节标题）" },
					append_mode: {
						type: "string",
						description: "固定为 append（在章节末尾追加内容）。注意：不支持 replace，不得删除已有内容",
						enum: ["append"],
					},
				},
				required: ["path", "section", "content"],
			},
			execute: async (args) => {
				try {
					const normalizedPath = normalizePath(args.path);
					const file = this.app.vault.getAbstractFileByPath(normalizedPath);
					if (!file || !(file instanceof TFile)) {
						return { success: false, content: `文件不存在: ${normalizedPath}` };
					}

					const existing = await this.app.vault.read(file);

					const sectionNames: { [key: string]: string[] } = {
						"核心定义": ["核心定义", "核心定义"],
						"核心要点": ["核心要点", "要点"],
						"经典案例": ["经典案例", "案例"],
						"实践方法": ["实践方法", "方法"],
						"常见误区": ["常见误区", "误区"],
						"相关知识点": ["相关知识点", "关联"],
						"原文出处": ["原文出处", "出处"],
						"启示": ["启示", "对目标人群的启示"],
						"更新日志": ["更新日志", "日志"],
					};

					const keywords = sectionNames[args.section] || [args.section];
					let sectionIndex = -1;
					let matchedHeader = "";

					for (const kw of keywords) {
						const regex = new RegExp(`##\\s*[\\d一二三四五六七八九十、\\.]*\\s*${kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`);
						const match = existing.match(regex);
						if (match) {
							sectionIndex = match.index!;
							matchedHeader = match[0];
							break;
						}
					}

					if (sectionIndex === -1) {
						const fallbackRegex = new RegExp(`##\\s*[\\d一二三四五六七八九十、\\.]*\\s*${args.section.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`);
						const fallbackMatch = existing.match(fallbackRegex);
						if (fallbackMatch) {
							sectionIndex = fallbackMatch.index!;
							matchedHeader = fallbackMatch[0];
						} else {
							return { success: false, content: `未找到章节「${args.section}」。文件中的章节标题格式可能不同，请先使用 read_vault_file 读取文件查看实际章节名称` };
						}
					}

					const nextSectionIndex = existing.indexOf("\n## ", sectionIndex + matchedHeader.length);
					const endIndex = nextSectionIndex === -1 ? existing.length : nextSectionIndex;

					const before = existing.substring(0, sectionIndex);
					const after = existing.substring(endIndex);

					const currentSection = existing.substring(sectionIndex, endIndex);
					let newContent = before + currentSection + "\n\n" + args.content + after;

					const today = new Date().toISOString().split("T")[0];
					const logLine = `| ${today} | 修改 | 用户指令 | 更新${args.section}章节 |`;

					const logRegex = /##\s*[一二三四五六七八九十、]*\s*更新日志/;
					const logMatch = newContent.match(logRegex);
					if (logMatch) {
						const logSectionStart = logMatch.index!;
						const tableStart = newContent.indexOf("| 日期 |", logSectionStart);
						if (tableStart !== -1) {
							const headerEnd = newContent.indexOf("\n", tableStart);
							const separatorEnd = newContent.indexOf("\n", headerEnd + 1);
							newContent =
								newContent.substring(0, separatorEnd + 1) +
								logLine +
								"\n" +
								newContent.substring(separatorEnd + 1);
						}
					}

					await this.app.vault.modify(file, newContent);
					return { success: true, content: `章节「${args.section}」已更新: ${normalizedPath}\n\n请执行自检清单并更新集中日志。` };
				} catch (e: any) {
					return { success: false, content: `更新知识点页面失败: ${e.message}` };
				}
			},
		});

		this.tools.set("update_index", {
			name: "update_index",
			description: "更新知识库索引文件（总索引、关键词索引、关系图谱）",
			parameters: {
				type: "object",
				properties: {
					action: {
						type: "string",
						description: "更新类型",
						enum: ["add_entry", "refresh_all"],
					},
					entry_name: { type: "string", description: "条目名称" },
					entry_category: { type: "string", description: "条目分类" },
					entry_description: { type: "string", description: "一句话描述" },
					entry_maturity: {
						type: "string",
						description: "成熟度",
						enum: ["🟢", "🟡", "🔴"],
					},
					keywords: { type: "string", description: "新增关键词，逗号分隔" },
				},
				required: ["action"],
			},
			execute: async (args) => {
				try {
					const basePath = normalizePath(this.settings.knowledgeBasePath);
					const indexPath = `${basePath}/20-知识索引/知识库总索引.md`;
					const indexFile = this.app.vault.getAbstractFileByPath(normalizePath(indexPath));

					if (!indexFile || !(indexFile instanceof TFile)) {
						return { success: false, content: `索引文件不存在: ${indexPath}` };
					}

					if (args.action === "add_entry" && args.entry_name && args.entry_category) {
						const indexContent = await this.app.vault.read(indexFile);
						const categoryHeader = args.entry_category;
						const categoryPattern = new RegExp(
							`###\\s+\\d+\\.\\s+${categoryHeader.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\(\\d+个\\)`
						);
						const match = indexContent.match(categoryPattern);

						if (match) {
							const categoryStart = indexContent.indexOf(match[0]);
							const nextCategoryStart = indexContent.indexOf("\n### ", categoryStart + 1);
							const endPos = nextCategoryStart === -1 ? indexContent.indexOf("\n---", categoryStart) : nextCategoryStart;

							const categorySection = indexContent.substring(categoryStart, endPos);
							const countMatch = categorySection.match(/\((\d+)个\)/);
							const currentCount = countMatch ? parseInt(countMatch[1]) : 0;
							const newCount = currentCount + 1;

							const updatedSection = categorySection
								.replace(`(${currentCount}个)`, `(${newCount}个)`)
								.replace(/（暂无知识点）/, "");

							const maturity = args.entry_maturity || "🟡";
							const newEntry = `- [[${args.entry_name}]] ${maturity} - ${args.entry_description || "待补充"}`;

							const updatedContent =
								indexContent.substring(0, categoryStart) +
								updatedSection.trimEnd() +
								"\n" +
								newEntry +
								"\n" +
								indexContent.substring(endPos);

							await this.app.vault.modify(indexFile, updatedContent);

							const totalMatch = updatedContent.match(/知识点总数：(\d+)个/);
							if (totalMatch) {
								const newTotal = parseInt(totalMatch[1]) + 1;
								const finalContent = updatedContent.replace(
									`知识点总数：${totalMatch[1]}个`,
									`知识点总数：${newTotal}个`
								);
								await this.app.vault.modify(indexFile, finalContent);
							}
						}

						if (args.keywords) {
							const keywordPath = `${basePath}/20-知识索引/关键词索引.md`;
							const keywordFile = this.app.vault.getAbstractFileByPath(normalizePath(keywordPath));
							if (keywordFile && keywordFile instanceof TFile) {
								const kwContent = await this.app.vault.read(keywordFile);
								const newKeywords = args.keywords
									.split(",")
									.map((k: string) => `| ${k.trim()} | [[${args.entry_name}]] | 1 |`)
									.join("\n");
								const updatedKwContent = kwContent.replace(
									"（暂无关键词）",
									newKeywords
								);
								await this.app.vault.modify(keywordFile, updatedKwContent);
							}
						}

						return { success: true, content: `索引已更新：添加 ${args.entry_name} 到 ${args.entry_category}` };
					}

					if (args.action === "refresh_all") {
						return {
							success: true,
							content: "请使用 list_vault_folder 工具扫描各分类目录，然后手动更新索引数量。",
						};
					}

					return { success: true, content: "索引更新操作完成" };
				} catch (e: any) {
					return { success: false, content: `更新索引失败: ${e.message}` };
				}
			},
		});

		this.tools.set("query_knowledge", {
			name: "query_knowledge",
			description: "查询知识库：先读取索引了解结构，再读取相关知识点页面",
			parameters: {
				type: "object",
				properties: {
					query: { type: "string", description: "查询问题或关键词" },
				},
				required: ["query"],
			},
			execute: async (args) => {
				try {
					const basePath = normalizePath(this.settings.knowledgeBasePath);
					const indexPath = `${basePath}/20-知识索引/知识库总索引.md`;
					const indexFile = this.app.vault.getAbstractFileByPath(normalizePath(indexPath));

					if (!indexFile || !(indexFile instanceof TFile)) {
						return {
							success: false,
							content: `知识库索引不存在，请先初始化知识库。索引路径: ${indexPath}`,
						};
					}

					const indexContent = await this.app.vault.read(indexFile);
					const query = args.query.toLowerCase();
					const lines = indexContent.split("\n");
					const relevantEntries: string[] = [];

					for (const line of lines) {
						if (line.includes("[[") && line.toLowerCase().includes(query.split(" ")[0])) {
							relevantEntries.push(line.trim());
						}
					}

					let result = `知识库索引概览:\n${indexContent.substring(0, 2000)}\n\n`;
					if (relevantEntries.length > 0) {
						result += `与 "${args.query}" 相关的条目:\n${relevantEntries.join("\n")}\n\n`;
					} else {
						result += `在索引中未找到与 "${args.query}" 直接匹配的条目。\n\n`;
					}

					result += `请根据以上索引信息，使用 read_vault_file 工具读取相关知识点页面的详细内容来回答用户问题。`;

					return { success: true, content: result };
				} catch (e: any) {
					return { success: false, content: `查询知识库失败: ${e.message}` };
				}
			},
		});

		this.tools.set("lint_knowledge_base", {
			name: "lint_knowledge_base",
			description: "对知识库执行整理检查：检查矛盾、孤立页面、格式问题等",
			parameters: {
				type: "object",
				properties: {
					check_type: {
						type: "string",
						description: "检查类型",
						enum: ["full", "format", "content", "links"],
					},
				},
				required: [],
			},
			execute: async (args) => {
				try {
					const basePath = normalizePath(this.settings.knowledgeBasePath);
					const checkType = args.check_type || "full";
					const issues: string[] = [];

					const knowledgePath = `${basePath}/10-知识点库`;
					const knowledgeFolder = this.app.vault.getAbstractFileByPath(normalizePath(knowledgePath));

					if (!knowledgeFolder || !(knowledgeFolder instanceof TFolder)) {
						return { success: false, content: `知识点库目录不存在: ${knowledgePath}` };
					}

					const allFiles: TFile[] = [];
					const emptyFiles: TFile[] = [];
					const fileNames = new Set<string>();

					const collectFiles = (folder: TFolder) => {
						for (const child of folder.children) {
							if (child instanceof TFile) {
								allFiles.push(child);
								fileNames.add(child.basename);
								if (child.stat.size === 0) {
									emptyFiles.push(child);
								}
							} else if (child instanceof TFolder) {
								collectFiles(child);
							}
						}
					};
					collectFiles(knowledgeFolder);

					if (emptyFiles.length > 0) {
						issues.push(`⚠️ 发现 ${emptyFiles.length} 个空文件:\n${emptyFiles.map((f) => `  - ${f.path}`).join("\n")}`);
					}

					if (checkType === "full" || checkType === "links") {
						const orphanPages: string[] = [];
						const linkedPages = new Set<string>();

						for (const file of allFiles.slice(0, 50)) {
							const content = await this.app.vault.cachedRead(file);
							const linkMatches = content.matchAll(/\[\[([^\]]+)\]\]/g);
							for (const match of linkMatches) {
								linkedPages.add(match[1].split("|")[0].split("#")[0].trim());
							}
						}

						for (const name of fileNames) {
							if (!linkedPages.has(name)) {
								orphanPages.push(name);
							}
						}

						if (orphanPages.length > 0) {
							issues.push(`🔗 发现 ${orphanPages.length} 个孤立页面（无入链）:\n${orphanPages.slice(0, 20).map((p) => `  - ${p}`).join("\n")}`);
						}
					}

					if (checkType === "full" || checkType === "format") {
						for (const file of allFiles.slice(0, 30)) {
							const content = await this.app.vault.cachedRead(file);
							if (!content.includes("## 九、更新日志")) {
								issues.push(`📝 ${file.basename} 缺少"更新日志"章节`);
							}
							if (!content.includes("## 七、原文出处")) {
								issues.push(`📝 ${file.basename} 缺少"原文出处"章节`);
							}
						}
					}

					if (checkType === "full" || checkType === "content") {
						const indexPath = `${basePath}/20-知识索引/知识库总索引.md`;
						const indexFile = this.app.vault.getAbstractFileByPath(normalizePath(indexPath));
						if (indexFile && indexFile instanceof TFile) {
							const indexContent = await this.app.vault.read(indexFile);
							const countMatches = indexContent.matchAll(/\((\d+)个\)/g);
							for (const match of countMatches) {
								const countInIndex = parseInt(match[1]);
								if (countInIndex > 0) {
									issues.push(`📊 分类计数 ${match[0]} 需要验证是否与实际文件数一致`);
								}
							}
						}
					}

					const result =
						issues.length > 0
							? `Lint 检查完成，发现 ${issues.length} 个问题:\n\n${issues.join("\n\n")}\n\n请根据以上问题逐一修复。`
							: `Lint 检查完成，未发现明显问题。知识库状态良好！\n\n共检查 ${allFiles.length} 个文件。`;

					return { success: true, content: result };
				} catch (e: any) {
					return { success: false, content: `Lint 检查失败: ${e.message}` };
				}
			},
		});

		this.tools.set("get_knowledge_base_status", {
			name: "get_knowledge_base_status",
			description: "获取知识库当前状态：文件数量、成熟度分布、最近更新等",
			parameters: {
				type: "object",
				properties: {},
				required: [],
			},
			execute: async (args) => {
				try {
					const basePath = normalizePath(this.settings.knowledgeBasePath);
					const rootFolder = this.app.vault.getAbstractFileByPath(basePath);

					if (!rootFolder || !(rootFolder instanceof TFolder)) {
						return {
							success: false,
							content: `知识库尚未初始化。路径: ${basePath}\n\n请使用 init_knowledge_base 工具初始化知识库。`,
						};
					}

					const stats: { [key: string]: number } = {};
					const maturityCounts = { "🟢": 0, "🟡": 0, "🔴": 0 };

					const countFiles = (folder: TFolder): number => {
						let count = 0;
						for (const child of folder.children) {
							if (child instanceof TFile) {
								count++;
							} else if (child instanceof TFolder) {
								count += countFiles(child);
							}
						}
						return count;
					};

					for (const child of rootFolder.children) {
						if (child instanceof TFolder) {
							stats[child.name] = countFiles(child);
						}
					}

					const knowledgePath = `${basePath}/10-知识点库`;
					const knowledgeFolder = this.app.vault.getAbstractFileByPath(normalizePath(knowledgePath));
					if (knowledgeFolder && knowledgeFolder instanceof TFolder) {
						for (const category of knowledgeFolder.children) {
							if (category instanceof TFolder) {
								for (const file of category.children) {
									if (file instanceof TFile) {
										const content = await this.app.vault.cachedRead(file);
										if (content.includes("🟢")) maturityCounts["🟢"]++;
										else if (content.includes("🟡")) maturityCounts["🟡"]++;
										else if (content.includes("🔴")) maturityCounts["🔴"]++;
									}
								}
							}
						}
					}

					const indexPath = `${basePath}/20-知识索引/知识库总索引.md`;
					const indexFile = this.app.vault.getAbstractFileByPath(normalizePath(indexPath));
					let lastUpdate = "未知";
					if (indexFile && indexFile instanceof TFile) {
						lastUpdate = new Date(indexFile.stat.mtime).toLocaleString("zh-CN");
					}

					return {
						success: true,
						content: `📊 知识库状态报告\n\n路径: ${basePath}\n最后更新: ${lastUpdate}\n\n📁 目录统计:\n${Object.entries(stats)
							.map(([k, v]) => `  - ${k}: ${v} 个文件`)
							.join("\n")}\n\n📈 成熟度分布:\n  - 🟢 完整级: ${maturityCounts["🟢"]}个\n  - 🟡 基础级: ${maturityCounts["🟡"]}个\n  - 🔴 框架级: ${maturityCounts["🔴"]}个`,
					};
				} catch (e: any) {
					return { success: false, content: `获取知识库状态失败: ${e.message}` };
				}
			},
		});

		this.tools.set("record_conflict", {
			name: "record_conflict",
			description: "记录知识点之间的矛盾/冲突",
			parameters: {
				type: "object",
				properties: {
					old_info: { type: "string", description: "旧信息" },
					new_info: { type: "string", description: "新信息" },
					old_source: { type: "string", description: "旧信息来源路径" },
					new_source: { type: "string", description: "新信息来源路径" },
					resolution: {
						type: "string",
						description: "处理方式",
						enum: ["标注矛盾", "以新为准", "需验证"],
					},
				},
				required: ["old_info", "new_info"],
			},
			execute: async (args) => {
				try {
					const basePath = normalizePath(this.settings.knowledgeBasePath);
					const conflictPath = `${basePath}/30-维护记录/冲突与错误记录.md`;
					const today = new Date().toISOString().split("T")[0];

					const entry = `\n## ⚠️ 知识点矛盾记录 (${today})\n\n**矛盾内容**：\n- 旧信息：${args.old_info}\n- 新信息：${args.new_info}\n\n**矛盾来源**：\n- 旧：[[${args.old_source || "待补充"}]]\n- 新：[[${args.new_source || "待补充"}]]\n\n**处理方式**：${args.resolution || "标注矛盾"}\n**记录时间**：${today}\n\n---\n`;

					const file = this.app.vault.getAbstractFileByPath(normalizePath(conflictPath));
					if (file && file instanceof TFile) {
						const existing = await this.app.vault.read(file);
						await this.app.vault.modify(file, existing + entry);
					} else {
						await this.createFileOnly(conflictPath, `# 冲突与错误记录\n\n${entry}`);
					}

					return { success: true, content: `冲突已记录到: ${conflictPath}` };
				} catch (e: any) {
					return { success: false, content: `记录冲突失败: ${e.message}` };
				}
			},
		});
	}

	private registerMemoryTools() {
		this.tools.set("save_memory", {
			name: "save_memory",
			description: "保存长期记忆（经验、洞察、方法论）",
			parameters: {
				type: "object",
				properties: {
					category: { type: "string", description: "记忆分类，如：选题经验、设计技巧、工作方法" },
					content: { type: "string", description: "记忆内容" },
				},
				required: ["category", "content"],
			},
			execute: async (args) => {
				try {
					const memoryPath = normalizePath(`${this.settings.memoryFolder}/长期记忆.md`);
					const file = this.app.vault.getAbstractFileByPath(memoryPath);
					const today = new Date().toISOString().split("T")[0];
					const now = new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });

					const entry = `\n### [${args.category}] ${today} ${now}\n${args.content}\n`;

					if (file && file instanceof TFile) {
						const existing = await this.app.vault.read(file);
						await this.app.vault.modify(file, existing + entry);
					} else {
						await this.ensureFolder(this.settings.memoryFolder);
						await this.createFileOnly(
							memoryPath,
							`# 长期记忆\n\n> Agent 的长期记忆，记录关键经验、用户偏好和运营策略\n${entry}`
						);
					}

					return { success: true, content: `记忆已保存到: ${memoryPath}` };
				} catch (e: any) {
					return { success: false, content: `保存记忆失败: ${e.message}` };
				}
			},
		});

		this.tools.set("save_preference", {
			name: "save_preference",
			description: "保存用户偏好（风格偏好、习惯要求等）",
			parameters: {
				type: "object",
				properties: {
					key: { type: "string", description: "偏好键名，如：写作风格、知识库分类偏好" },
					value: { type: "string", description: "偏好值" },
				},
				required: ["key", "value"],
			},
			execute: async (args) => {
				try {
					const prefPath = normalizePath(`${this.settings.memoryFolder}/用户偏好.md`);
					const file = this.app.vault.getAbstractFileByPath(prefPath);
					const today = new Date().toISOString().split("T")[0];

					if (file && file instanceof TFile) {
						const existing = await this.app.vault.read(file);
						const lines = existing.split("\n");
						const keyLineIdx = lines.findIndex((l) => l.startsWith(`- **${args.key}**:`));

						if (keyLineIdx >= 0) {
							lines[keyLineIdx] = `- **${args.key}**: ${args.value} (_${today}_)`;
						} else {
							lines.push(`- **${args.key}**: ${args.value} (_${today}_)`);
						}

						await this.app.vault.modify(file, lines.join("\n"));
					} else {
						await this.ensureFolder(this.settings.memoryFolder);
						await this.createFileOnly(
							prefPath,
							`# 用户偏好\n\n> Agent 记录的用户偏好和习惯\n\n- **${args.key}**: ${args.value} (_${today}_)\n`
						);
					}

					return { success: true, content: `偏好已保存: ${args.key} = ${args.value}` };
				} catch (e: any) {
					return { success: false, content: `保存偏好失败: ${e.message}` };
				}
			},
		});

		this.tools.set("write_log", {
			name: "write_log",
			description: "写入工作日志",
			parameters: {
				type: "object",
				properties: {
					title: { type: "string", description: "日志标题" },
					content: { type: "string", description: "日志内容" },
				},
				required: ["title", "content"],
			},
			execute: async (args) => {
				try {
					const today = new Date().toISOString().split("T")[0];
					const logPath = normalizePath(`${this.settings.memoryFolder}/日志/${today}.md`);
					const file = this.app.vault.getAbstractFileByPath(logPath);

					const entry = `\n## ${new Date().toLocaleTimeString("zh-CN")} | ${args.title}\n\n${args.content}\n\n---\n`;

					if (file && file instanceof TFile) {
						const existing = await this.app.vault.read(file);
						await this.app.vault.modify(file, existing + entry);
					} else {
						await this.ensureFolder(`${this.settings.memoryFolder}/日志`);
						await this.createFileOnly(
							logPath,
							`# 工作日志 ${today}\n\n${entry}`
						);
					}

					return { success: true, content: `日志已写入: ${logPath}` };
				} catch (e: any) {
					return { success: false, content: `写入日志失败: ${e.message}` };
				}
			},
		});

		this.tools.set("read_memory", {
			name: "read_memory",
			description: "读取长期记忆和用户偏好",
			parameters: {
				type: "object",
				properties: {},
				required: [],
			},
			execute: async (args) => {
				try {
					const results: string[] = [];

					const memoryPath = normalizePath(`${this.settings.memoryFolder}/长期记忆.md`);
					const memoryFile = this.app.vault.getAbstractFileByPath(memoryPath);
					if (memoryFile && memoryFile instanceof TFile) {
						results.push(await this.app.vault.read(memoryFile));
					}

					const prefPath = normalizePath(`${this.settings.memoryFolder}/用户偏好.md`);
					const prefFile = this.app.vault.getAbstractFileByPath(prefPath);
					if (prefFile && prefFile instanceof TFile) {
						results.push(await this.app.vault.read(prefFile));
					}

					return {
						success: true,
						content: results.length > 0 ? results.join("\n\n---\n\n") : "暂无记忆记录",
					};
				} catch (e: any) {
					return { success: false, content: `读取记忆失败: ${e.message}` };
				}
			},
		});
	}

	getToolDefinitions(): ToolDefinition[] {
		const definitions: ToolDefinition[] = [];
		for (const [, tool] of this.tools) {
			definitions.push({
				type: "function",
				function: {
					name: tool.name,
					description: tool.description,
					parameters: tool.parameters,
				},
			});
		}
		return definitions;
	}

	async executeTool(name: string, args: any): Promise<ToolResult> {
		const tool = this.tools.get(name);
		if (!tool) {
			return { success: false, content: `未知工具: ${name}` };
		}
		return await tool.execute(args);
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

	private async createFileOnly(path: string, content: string) {
		const normalizedPath = normalizePath(path);
		const rawCheck = this.isUnderRawMaterials(normalizedPath);
		if (rawCheck) {
			return;
		}
		const existing = this.app.vault.getAbstractFileByPath(normalizedPath);
		if (existing && existing instanceof TFile) {
			return;
		}
		await this.app.vault.create(normalizedPath, content);
	}

	private isUnderRawMaterials(path: string): string | null {
		const basePath = normalizePath(this.settings.knowledgeBasePath);
		const normalized = normalizePath(path);
		const rawDir = `${basePath}/00-原始资料`;
		if (normalized === rawDir || normalized.startsWith(rawDir + "/")) {
			return normalized;
		}
		return null;
	}
}
