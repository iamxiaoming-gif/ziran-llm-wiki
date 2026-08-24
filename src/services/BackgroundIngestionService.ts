import { App, normalizePath, TFile } from "obsidian";
import type { LLMWikiSettings } from "../settings";
import type { ToolRegistry } from "../agent/tools";
import type { AgentCore, ChatMessage } from "../agent/core";
import { IngestionBatchService, type IngestionBatch, type IngestionItemStatus } from "./IngestionBatchService";

export interface BackgroundIngestionSnapshot {
	batchId: string;
	status: string;
	currentFile: string;
	totals: Record<IngestionItemStatus, number>;
	createdPages: number;
	updatedPages: number;
	processedThisRun: number;
	message: string;
	updatedAt: string;
}

type SnapshotListener = (snapshot: BackgroundIngestionSnapshot) => void;

export type AgentFactory = (toolRegistry: ToolRegistry) => AgentCore;

export class BackgroundIngestionService {
	private batchService: IngestionBatchService;
	private listeners = new Set<SnapshotListener>();
	private runningBatchId = "";
	private stopRequested = false;
	private processedThisRun = 0;
	private lastMessage = "";
	private currentAgent: AgentCore | null = null;

	constructor(
		private app: App,
		private settings: LLMWikiSettings,
		private toolRegistry: ToolRegistry,
		private agentFactory: AgentFactory
	) {
		this.batchService = new IngestionBatchService(app, settings);
	}

	async init(): Promise<void> {
		await this.batchService.recoverOrphanedBatches();
	}

	updateSettings(settings: LLMWikiSettings): void {
		this.settings = settings;
		this.batchService.updateSettings(settings);
	}

	subscribe(listener: SnapshotListener): () => void {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	}

	isRunning(): boolean {
		return Boolean(this.runningBatchId);
	}

	async launch(batchId: string): Promise<BackgroundIngestionSnapshot> {
		if (this.runningBatchId) throw new Error(`后台摄取正在处理批次 ${this.runningBatchId}`);
		this.runningBatchId = batchId;
		this.stopRequested = false;
		this.processedThisRun = 0;
		this.lastMessage = "后台摄取已启动";
		void this.run(batchId);
		return await this.getSnapshot(batchId);
	}

	async resume(batchId = ""): Promise<BackgroundIngestionSnapshot> {
		if (this.runningBatchId) throw new Error(`后台摄取正在处理批次 ${this.runningBatchId}`);
		const status = await this.batchService.getStatus(batchId);
		let batch = status.batch;
		if (batch.status === "paused") batch = await this.batchService.resume(batch.id);
		else if (batch.status !== "active" && batch.status !== "stopping") {
			throw new Error(`批次当前状态为 ${batch.status}，不能继续`);
		}
		if (batch.status === "stopping") batch = await this.batchService.pause(batch.id).then((paused) => this.batchService.resume(paused.id));
		return await this.launch(batch.id);
	}

	async requestStop(batchId = ""): Promise<BackgroundIngestionSnapshot> {
		const targetId = batchId || this.runningBatchId;
		if (!targetId) throw new Error("当前没有正在运行的后台摄取任务");
		this.stopRequested = true;
		this.lastMessage = "已请求停止，等待当前操作完成后暂停…";
		this.currentAgent?.abort();
		void this.batchService.markStopping(targetId).catch(() => {});
		void this.emitSnapshot(targetId).catch(() => {});
		try {
			return await this.getSnapshot(targetId);
		} catch {
			return {
				batchId: targetId,
				status: "stopping",
				currentFile: "",
				totals: { pending: 0, processing: 1, completed: 0, failed: 0, skipped: 0 },
				createdPages: 0,
				updatedPages: 0,
				processedThisRun: this.processedThisRun,
				message: this.lastMessage,
				updatedAt: new Date().toISOString(),
			};
		}
	}

	async forceStopAndCleanup(): Promise<void> {
		this.stopRequested = true;
		this.currentAgent?.abort();
		this.currentAgent = null;
		this.runningBatchId = "";
		this.lastMessage = "";
		this.processedThisRun = 0;
		await this.batchService.recoverOrphanedBatches();
		for (const listener of this.listeners) {
			listener({
				batchId: "",
				status: "completed",
				currentFile: "",
				totals: { pending: 0, processing: 0, completed: 0, failed: 0, skipped: 0 },
				createdPages: 0,
				updatedPages: 0,
				processedThisRun: 0,
				message: "",
				updatedAt: new Date().toISOString(),
			});
		}
	}

	async deleteBatch(batchId: string): Promise<void> {
		await this.batchService.deleteBatch(batchId);
		for (const listener of this.listeners) {
			listener({
				batchId: "",
				status: "completed",
				currentFile: "",
				totals: { pending: 0, processing: 0, completed: 0, failed: 0, skipped: 0 },
				createdPages: 0,
				updatedPages: 0,
				processedThisRun: 0,
				message: "",
				updatedAt: new Date().toISOString(),
			});
		}
	}

	async deleteAllCompletedBatches(): Promise<number> {
		const count = await this.batchService.deleteAllCompletedBatches();
		if (count > 0) {
			for (const listener of this.listeners) {
				listener({
					batchId: "",
					status: "completed",
					currentFile: "",
					totals: { pending: 0, processing: 0, completed: 0, failed: 0, skipped: 0 },
					createdPages: 0,
					updatedPages: 0,
					processedThisRun: 0,
					message: "",
					updatedAt: new Date().toISOString(),
				});
			}
		}
		return count;
	}

	async getSnapshot(batchId = ""): Promise<BackgroundIngestionSnapshot> {
		try {
			const status = await this.batchService.getStatus(batchId);
			const snapshot = this.snapshotFromBatch(status.batch);
			if (!this.runningBatchId) {
				if (snapshot.status === "active" || snapshot.status === "stopping") {
					snapshot.status = "paused";
					snapshot.message = snapshot.message || "批次状态已恢复为暂停";
				}
				if (snapshot.status === "paused" && !batchId) {
					return {
						batchId: "",
						status: "completed",
						currentFile: "",
						totals: { pending: 0, processing: 0, completed: 0, failed: 0, skipped: 0 },
						createdPages: 0,
						updatedPages: 0,
						processedThisRun: 0,
						message: "",
						updatedAt: new Date().toISOString(),
					};
				}
			}
			return snapshot;
		} catch {
			return {
				batchId: batchId || "",
				status: "completed",
				currentFile: "",
				totals: { pending: 0, processing: 0, completed: 0, failed: 0, skipped: 0 },
				createdPages: 0,
				updatedPages: 0,
				processedThisRun: 0,
				message: "",
				updatedAt: new Date().toISOString(),
			};
		}
	}

	formatSummary(snapshot: BackgroundIngestionSnapshot): string {
		const done = snapshot.totals.completed + snapshot.totals.skipped;
		const title = snapshot.status === "completed" || snapshot.status === "completed_with_errors"
			? "本批摄取已结束"
			: snapshot.status === "paused" ? "本轮后台摄取已暂停" : "后台摄取进度";
		return [
			`## ${title}`,
			"",
			`- 批次 ID：${snapshot.batchId}`,
			`- 文件进度：${done}/${done + snapshot.totals.pending + snapshot.totals.processing + snapshot.totals.failed}`,
			`- 完成：${snapshot.totals.completed}`,
			`- 跳过：${snapshot.totals.skipped}`,
			`- 失败：${snapshot.totals.failed}`,
			`- 创建知识页面：${snapshot.createdPages}`,
			`- 更新知识页面：${snapshot.updatedPages}`,
			`- 当前状态：${snapshot.status}`,
			"",
			snapshot.message,
		].join("\n");
	}

	private async run(batchId: string): Promise<void> {
		try {
			while (true) {
				if (this.stopRequested) {
					await this.pauseBatch(batchId, "用户已停止，本批可以稍后继续");
					return;
				}
				if (this.processedThisRun >= this.settings.batchIngestion.batchSize) {
					const status = await this.batchService.getStatus(batchId);
					if (status.totals.pending > 0 || status.totals.processing > 0) {
						await this.pauseBatch(batchId, `本轮已处理 ${this.processedThisRun} 个文件，点击继续可处理下一批`);
						return;
					}
				}

				const next = await this.batchService.getNext(batchId);
				if (!next.item) {
					this.lastMessage = next.batch.status === "completed_with_errors" ? "批次完成，但存在失败文件，可执行失败重试" : "批次全部处理完成";
					await this.emitSnapshot(batchId);
					return;
				}
				if (next.item.status === "failed") {
					this.processedThisRun++;
					this.lastMessage = `文件异常：${next.item.path}`;
					await this.emitSnapshot(batchId);
					continue;
				}

				this.lastMessage = `正在处理：${next.item.path}`;
				await this.emitSnapshot(batchId);
				const stopped = await this.processItem(batchId, next.item.path);
				if (stopped) {
					await this.pauseBatch(batchId, "用户已停止，当前文件已中断");
					return;
				}
				this.processedThisRun++;
				await this.emitSnapshot(batchId);
			}
		} catch (error: unknown) {
			this.lastMessage = `后台摄取中断：${this.errorMessage(error)}`;
			try { await this.batchService.pause(batchId); } catch { /* preserve original failure */ }
			await this.emitSnapshot(batchId).catch(() => undefined);
		} finally {
			this.currentAgent = null;
			if (this.runningBatchId === batchId) this.runningBatchId = "";
			this.stopRequested = false;
		}
	}

	private async processItem(batchId: string, filePath: string): Promise<boolean> {
		let lastError: unknown = null;
		for (let attempt = 0; attempt <= this.settings.batchIngestion.maxRetries; attempt++) {
			if (this.stopRequested) return true;
			try {
				const agent = this.agentFactory(this.toolRegistry);
				this.currentAgent = agent;
				agent.clearHistory();

				const result = await this.runAgentForFile(agent, filePath);
				if (this.stopRequested) return true;

				const { createdPages, updatedPages } = this.collectPagesFromHistory(agent.getHistory());

				if (createdPages.length === 0 && updatedPages.length === 0) {
					const notes = result.trim() || "未检测到新创建的页面";
					await this.batchService.complete(batchId, filePath, [], [], notes);
					this.lastMessage = `已处理 ${filePath}，未创建新页面`;
				} else {
					const notes = result.trim();
					await this.batchService.complete(batchId, filePath, createdPages, updatedPages, notes);
					this.lastMessage = `已完成 ${filePath}，创建 ${createdPages.length} 个页面`;
				}
				return false;
			} catch (error: unknown) {
				lastError = error;
				if (this.stopRequested) return true;
				if (attempt < this.settings.batchIngestion.maxRetries) {
					this.lastMessage = `${filePath} 处理失败，正在进行第 ${attempt + 1} 次重试`;
					await this.emitSnapshot(batchId);
				}
			} finally {
				this.currentAgent = null;
			}
		}
		await this.batchService.fail(batchId, filePath, this.errorMessage(lastError));
		this.lastMessage = `处理失败：${filePath} — ${this.errorMessage(lastError)}`;
		return false;
	}

	private async runAgentForFile(agent: AgentCore, filePath: string): Promise<string> {
		return new Promise((resolve, reject) => {
			let finalContent = "";
			const callbacks = {
				onToken: () => { /* 后台摄取不输出 tokens */ },
				onToolCall: () => { /* 后台摄取不展示工具调用 */ },
				onToolResult: () => { /* 后台摄取不展示工具结果 */ },
				onComplete: (content: string) => {
					finalContent = content;
					resolve(finalContent);
				},
				onError: (error: string) => {
					reject(new Error(error));
				},
				onIteration: (current: number, max: number) => {
					this.lastMessage = `正在处理：${filePath}（第 ${current}/${max} 轮）`;
					void this.emitSnapshot(this.runningBatchId);
				},
			};

			const prompt = `请摄取以下原始资料文件，并严格按照 SKILL.md 的 9 章模板和工作流执行。\n\n文件路径：${filePath}\n\n请先调用 ingest_raw_material(file_path="${filePath}") 读取资料，然后一次性调用所有 create_and_index_page 创建知识点页面（每个页面必须包含完整 9 章内容），最后执行入链与自检。\n\n注意：\n1. 本次处理只针对这一个文件，不要处理其他文件\n2. 所有知识点页面创建完成后才能结束\n3. 每个新页面必须在 ≥3 个已有页面中添加入链\n4. 最后必须用中文总结创建了哪些页面`;

			void agent.chatNonStream(prompt, callbacks);
		});
	}

	private collectPagesFromHistory(history: ChatMessage[]): { createdPages: string[]; updatedPages: string[] } {
		const createdPages: string[] = [];
		const updatedPages: string[] = [];
		const seenCreated = new Set<string>();
		const seenUpdated = new Set<string>();

		for (const message of history) {
			if (message.role !== "tool" || !message.content) continue;
			const content = message.content;

			const createPatterns = [
				/页面已创建:\s*([^\n()]+)/,
				/一站式操作完成[\s\S]*?页面已创建:\s*([^\n()]+)/,
			];
			for (const pattern of createPatterns) {
				const match = content.match(pattern);
				if (match) {
					const path = match[1].trim();
					if (path && !seenCreated.has(path)) {
						seenCreated.add(path);
						createdPages.push(path);
					}
				}
			}

			const updatePatterns = [
				/内容已追加到:\s*([^\n()]+)/,
				/章节「[^」]+」已更新:\s*([^\n()]+)/,
				/已有页面入链:\s*(\d+)\s*个/,
			];
			for (const pattern of updatePatterns) {
				const match = content.match(pattern);
				if (match) {
					const path = match[1]?.trim();
					if (path && !seenUpdated.has(path) && !seenCreated.has(path)) {
						seenUpdated.add(path);
						updatedPages.push(path);
					}
				}
			}
		}

		return { createdPages, updatedPages };
	}

	private async pauseBatch(batchId: string, message: string): Promise<void> {
		this.lastMessage = message;
		await this.batchService.pause(batchId);
		await this.emitSnapshot(batchId);
	}

	private snapshotFromBatch(batch: IngestionBatch): BackgroundIngestionSnapshot {
		const totals: Record<IngestionItemStatus, number> = { pending: 0, processing: 0, completed: 0, failed: 0, skipped: 0 };
		let createdPages = 0;
		let updatedPages = 0;
		for (const item of batch.items) {
			totals[item.status]++;
			createdPages += item.createdPages?.length || 0;
			updatedPages += item.updatedPages?.length || 0;
		}
		return {
			batchId: batch.id,
			status: batch.status,
			currentFile: batch.items.find((item) => item.status === "processing")?.path || "",
			totals,
			createdPages,
			updatedPages,
			processedThisRun: this.processedThisRun,
			message: this.lastMessage,
			updatedAt: batch.updatedAt,
		};
	}

	private async emitSnapshot(batchId: string): Promise<BackgroundIngestionSnapshot> {
		try {
			const snapshot = await this.getSnapshot(batchId);
			for (const listener of this.listeners) listener(snapshot);
			return snapshot;
		} catch {
			const fallback: BackgroundIngestionSnapshot = {
				batchId,
				status: "active",
				currentFile: "",
				totals: { pending: 0, processing: 1, completed: 0, failed: 0, skipped: 0 },
				createdPages: 0,
				updatedPages: 0,
				processedThisRun: this.processedThisRun,
				message: this.lastMessage,
				updatedAt: new Date().toISOString(),
			};
			for (const listener of this.listeners) listener(fallback);
			return fallback;
		}
	}

	private errorMessage(error: unknown): string {
		return error instanceof Error ? error.message : String(error);
	}
}
