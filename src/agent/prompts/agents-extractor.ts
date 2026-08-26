export interface AgentsContext {
	topicName: string;
	topicDescription: string;
	maintenanceRules: string;
	ingestWorkflow: string;
	queryWorkflow: string;
	lintWorkflow: string;
	writingRules: string;
	checklistItems: string;
	formatTraps: string;
}

export const DEFAULT_AGENTS_CONTEXT: AgentsContext = {
	topicName: "未初始化",
	topicDescription: "请先使用 init_knowledge_base 初始化知识库",
	maintenanceRules: `三大铁律：原始资料只读不修改 | 知识点原子化 | 冲突不删除
三不原则：不修改原始资料、不删除内容、不创建重复页面
三要原则：要添加内链、要标注出处、要更新索引`,
	ingestWorkflow: `Step 1: 原始资料已存入 00-原始资料/（用户手动放入）
Step 2: 调用 ingest_raw_material 读取资料 + read_skill("知识点页面模板.md") 获取模板
Step 3: 批量调用 create_and_index_page 创建知识点页面（必选章节：核心定义、核心要点、相关知识点、原文出处、更新日志；可选章节按资料实际情况取舍，禁止硬凑）
Step 4: 确认索引更新完整（总索引、关键词索引、关系图谱）
Step 5: 确认日志追加完整（内嵌日志 + 集中日志）`,
	queryWorkflow: `Step 1: 调用 query_knowledge 了解知识库结构
Step 2: 读取相关知识点页面
Step 3: 综合回答
Step 4: 如有新发现，创建页面并更新索引
Step 5: 更新索引
Step 6: 追加日志
Step 7: 执行自检清单`,
	lintWorkflow: `常规检查：矛盾？过时？孤立？缺页？
格式检查：数量同步？标题规范？入链≥3？无空文件？
内容检查：链接格式？数据准确？名称一致？`,
	writingRules: `页面格式见 read_skill("知识点页面模板.md")
人物传记见 read_skill("人物传记模板.md")
组织档案见 read_skill("组织档案模板.md")
详细规范见 read_skill("SKILL.md")`,
	checklistItems: `1.【索引同步】知识库总索引数量是否同步？
2.【关键词同步】是否有新关键词？
3.【关系图谱】是否有新节点？
4.【入链≥3】新页面是否在 ≥3 个已有页面中有入链？
5.【AGENTS同步】目录结构注释数量是否同步？
6.【内嵌日志】该知识点「更新日志」章节是否已追加？
7.【集中日志】30-维护记录/知识库更新日志.md 是否已追加？`,
	formatTraps: `1. 数量占位符必须回填：总索引中每个分类必须填写实际数字，禁止使用 — 或 TBD
2. 表格标题用 ## emoji+中文：禁止用 **文本：** 替代标题层级
3. 新页面入链≥3：每新建一个知识点页面后，必须至少在3个已有页面中添加入链
4. 空文件立即删除：每次操作后检查空文件，发现立即删除`,
};

export function buildAgentsRulesPrompt(ctx: AgentsContext | null): string {
	const c = ctx || DEFAULT_AGENTS_CONTEXT;
	return `# 知识库操作规则

## 专题
${c.topicName} — ${c.topicDescription}

## 维护规则
${c.maintenanceRules}

## 摄取工作流（Ingest）
${c.ingestWorkflow}

## 查询工作流（Query）
${c.queryWorkflow}

## Lint 工作流
${c.lintWorkflow}

## 写作规范
${c.writingRules}

## 自检清单（每次变更后必查）
${c.checklistItems}

## 格式陷阱
${c.formatTraps}`;
}

export function extractAgentsContext(content: string): AgentsContext {
	const extractSection = (...headers: string[]): string => {
		for (const header of headers) {
			const escaped = header.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
			const regex = new RegExp(`##\\s*[一二三四五六七八九十]*[、.]?\\s*${escaped}[\\s\\S]*?(?=\\n##\\s|$)`, "i");
			const match = content.match(regex);
			if (match) {
				return match[0]
					.replace(/^##\s*[一二三四五六七八九十]*[、.]?\s*.*$/m, "")
					.trim();
			}
		}
		return "";
	};

	const titleMatch = content.match(/#\s+AGENTS\.md\s*[—–-]\s*(.+?)(?:知识库|维护|$)/i);
	const topicName = titleMatch ? titleMatch[1].trim() : DEFAULT_AGENTS_CONTEXT.topicName;

	const descMatch = content.match(/>\s*基于\s*(.+?)[\n]/i) || content.match(/>\s*(.+?方法论.+?)[\n]/i);
	const topicDescription = descMatch ? descMatch[1].trim() : DEFAULT_AGENTS_CONTEXT.topicDescription;

	const maintenanceRules = extractSection("核心原则", "维护原则", "铁律") || DEFAULT_AGENTS_CONTEXT.maintenanceRules;
	const ingestWorkflow = extractSection("摄取工作流", "摄取", "Ingest") || DEFAULT_AGENTS_CONTEXT.ingestWorkflow;
	const queryWorkflow = extractSection("查询工作流", "查询", "Query") || DEFAULT_AGENTS_CONTEXT.queryWorkflow;
	const lintWorkflow = extractSection("整理工作流", "Lint", "整理") || DEFAULT_AGENTS_CONTEXT.lintWorkflow;
	const writingRules = extractSection("写作规范", "Writing") || DEFAULT_AGENTS_CONTEXT.writingRules;
	const checklistRaw = extractSection("自检清单") || DEFAULT_AGENTS_CONTEXT.checklistItems;
	const formatTrapsRaw = extractSection("格式陷阱", "陷阱") || DEFAULT_AGENTS_CONTEXT.formatTraps;

	return {
		topicName,
		topicDescription,
		maintenanceRules,
		ingestWorkflow,
		queryWorkflow,
		lintWorkflow,
		writingRules,
		checklistItems: checklistRaw,
		formatTraps: formatTrapsRaw,
	};
}
