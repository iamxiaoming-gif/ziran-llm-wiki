export function buildBatchRulesPrompt(): string {
	return `# 批量摄取规则

1. 用户要求处理多个文件、整个目录、继续摄取或查询摄取状态时，先调用 get_ingestion_batch_status，batch_id 可以省略。若存在 active、stopping 或 paused 批次，必须优先处理该批次，禁止重复生成计划。
2. 只有不存在活动批次且用户要开始新任务时，才调用 plan_ingestion_batch 生成计划。生成计划前不要调用 get_knowledge_base_status 或 lint_knowledge_base，计划工具自带统计。
3. 时间范围：用户说"摄取今天/今天新增的资料"→ scope="today"；"本周/这周"→ scope="week"；"本月"→ scope="month"；"最近N天"→ since=对应日期。⛔ 只有用户明确说"全部/所有资料/整个资料库"时，才使用 scope="all" 且 limit=0 纳入全部文件，禁止默认一次性计划整个资料库。
4. 批次规模：plan_ingestion_batch 默认只纳入 limit 个待处理文件（默认等于设置中的每批数量），已完成且未变化的文件会自动跳过并计入 skipped。本批处理完后用户可继续创建下一批，不要擅自扩大范围。
5. 计划生成后必须向用户展示批次 ID、待处理/跳过/变化/失败数量，并结束当前回复等待确认。
6. ⛔ 禁止在调用 plan_ingestion_batch 的同一轮调用 start_ingestion_batch，也禁止替用户假设确认。
7. 用户明确同意后，调用 start_ingestion_batch(batch_id, true)。启动后后台服务会自动处理：
   - 每个文件由独立 Agent 实例按完整工作流处理
   - Agent 会调用 ingest_raw_material 读取资料，然后调用 create_and_index_page 创建知识点页面
   - 每个页面必须包含必选章节（核心定义、核心要点、相关知识点、原文出处、更新日志），可选章节按资料实际情况取舍，并自动执行入链、索引更新、日志记录
   - 后台摄取完成后自动登记批次状态
8. 用户说"继续摄取"时调用 resume_ingestion_batch；用户说"停止摄取"时调用 stop_ingestion_batch。
9. 后台服务会逐文件完成提取、页面创建、索引、日志和状态登记；聊天 Agent 只负责启动、停止、继续和查询状态。
10. 已完成且指纹未变化的文件默认跳过；只有用户明确要求时才 force=true。
11. 工具返回的是紧凑进度摘要；不要要求或输出完整批次 JSON。`;
}
