import { App, normalizePath, TFile, TFolder } from "obsidian";
import type { LLMWikiSettings } from "../settings";

export type IngestionItemStatus = "pending" | "processing" | "completed" | "failed" | "skipped";
export type IngestionItemAction = "new" | "changed" | "forced" | "skip" | "error";
export type IngestionBatchStatus = "planned" | "active" | "stopping" | "paused" | "completed" | "completed_with_errors";

export interface IngestionBatchItem {
	path: string;
	fingerprint: string;
	size: number;
	action: IngestionItemAction;
	status: IngestionItemStatus;
	error?: string;
	createdPages?: string[];
	updatedPages?: string[];
	notes?: string;
}

export interface IngestionBatch {
	id: string;
	createdAt: string;
	updatedAt: string;
	status: IngestionBatchStatus;
	items: IngestionBatchItem[];
}

interface CompletedFileRecord {
	fingerprint: string;
	lastCompletedAt: string;
	createdPages?: string[];
	updatedPages?: string[];
	notes?: string;
	/** 完成时原始资料文件的 mtime，用于下次计划时跳过未变化文件 */
	mtime?: number;
	/** 完成时原始资料文件的大小，用于下次计划时跳过未变化文件 */
	size?: number;
}

interface IngestionStore {
	version: 1;
	files: Record<string, CompletedFileRecord>;
	batches: Record<string, IngestionBatch>;
}

export interface IngestionPlanSummary {
	batch: IngestionBatch;
	totals: {
		all: number;
		toProcess: number;
		skipped: number;
		newFiles: number;
		changedFiles: number;
		failed: number;
		deferred: number;
	};
}

export interface IngestionPlanOptions {
	/** 时间范围：all | today | week | month */
	scope?: string;
	/** 起始日期（YYYY-MM-DD 或 ISO 时间），限定只摄取该时间之后修改过的文件 */
	since?: string;
	/** 本批最多纳入的待处理文件数；0 表示不限制（全部纳入），缺省使用设置中的每批数量 */
	limit?: number;
}

const SUPPORTED_EXTENSIONS = new Set(["md", "txt", "json", "csv", "tsv", "html", "htm", "xml", "yaml", "yml"]);

export class IngestionBatchService {
	private storeCache: IngestionStore | null = null;
	private storeLoadPromise: Promise<IngestionStore> | null = null;
	private saveQueue: Promise<void> = Promise.resolve();

	constructor(private app: App, private settings: LLMWikiSettings) {}

	updateSettings(settings: LLMWikiSettings): void {
		this.settings = settings;
	}

	async recoverOrphanedBatches(): Promise<void> {
		try {
			const store = await this.loadStore();
			let dirty = false;
			for (const batch of Object.values(store.batches)) {
				if (batch.status === "active" || batch.status === "stopping") {
					for (const item of batch.items) {
						if (item.status === "processing") item.status = "pending";
					}
					batch.status = "paused";
					batch.updatedAt = new Date().toISOString();
					dirty = true;
				}
			}
			if (dirty) this.enqueueSave(store);
		} catch { /* no store file yet */ }
	}

	async plan(paths: string[], force = false, options: IngestionPlanOptions = {}): Promise<IngestionPlanSummary> {
		const files = this.resolveFiles(paths);
		if (files.length === 0) throw new Error("没有找到可摄取的文本文件");

		const store = await this.loadStore();
		const existingActive = this.findLatestBatch(store, ["active", "stopping", "paused"]);
		if (existingActive) throw new Error(`已有未完成的批次 ${existingActive.id}（状态：${existingActive.status}），请先继续或删除该批次后再创建新计划`);

		const sinceMs = this.resolveSinceMs(options);
		const limit = options.limit === undefined || options.limit === null
			? this.settings.batchIngestion.batchSize
			: Math.max(0, Math.floor(Number(options.limit) || 0));

		const items: IngestionBatchItem[] = [];
		for (const file of files) {
			if (sinceMs !== null && file.stat.mtime < sinceMs) continue;
			try {
				const previous = store.files[file.path];
				let action: IngestionItemAction = "new";
				let fingerprint = "";
				const statUnchanged = previous
					&& typeof previous.mtime === "number"
					&& typeof previous.size === "number"
					&& previous.mtime === file.stat.mtime
					&& previous.size === file.stat.size;
				if (previous && statUnchanged && !force) {
					// 文件未变化，直接用历史指纹，避免重复读取内容
					fingerprint = previous.fingerprint;
					action = "skip";
				} else {
					const content = await this.app.vault.read(file);
					fingerprint = this.fingerprint(content);
					if (force) action = "forced";
					else if (previous?.fingerprint === fingerprint) action = "skip";
					else if (previous) action = "changed";
				}

				items.push({
					path: file.path,
					fingerprint,
					size: file.stat.size,
					action,
					status: action === "skip" ? "skipped" : "pending",
				});
			} catch (error: unknown) {
				items.push({
					path: file.path,
					fingerprint: "",
					size: file.stat.size,
					action: "error",
					status: "failed",
					error: this.errorMessage(error),
				});
			}
		}

		const processable = items.filter((item) => item.status === "pending");
		const skippedItems = items.filter((item) => item.status === "skipped");
		const failedItems = items.filter((item) => item.status === "failed");
		const cappedProcessable = limit > 0 ? processable.slice(0, limit) : processable;

		const now = new Date().toISOString();
		const id = `batch_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
		const batch: IngestionBatch = {
			id,
			createdAt: now,
			updatedAt: now,
			status: "planned",
			items: [...cappedProcessable, ...skippedItems, ...failedItems],
		};
		store.batches[id] = batch;
		this.enqueueSave(store);
		await this.saveQueue;

		return {
			batch,
			totals: {
				...this.summarize(items),
				toProcess: cappedProcessable.length,
				deferred: processable.length - cappedProcessable.length,
			},
		};
	}

	async start(batchId: string, confirmed: boolean): Promise<IngestionBatch> {
		if (!confirmed) throw new Error("必须在用户明确确认后才能启动摄取批次");
		const store = await this.loadStore();
		const batch = batchId
			? this.requireBatch(store, batchId)
			: this.latestBatch(store, ["planned"]);
		const otherActive = this.findLatestBatch(store, ["active", "stopping"], batch.id);
		if (otherActive) {
			throw new Error(`已有活动批次 ${otherActive.id}，请先继续或完成该批次，避免多个批次同时修改知识库`);
		}
		if (batch.status !== "planned") throw new Error(`批次当前状态为 ${batch.status}，不能重复启动`);
		batch.status = batch.items.some((item) => item.status === "pending")
			? "active"
			: batch.items.some((item) => item.status === "failed") ? "completed_with_errors" : "completed";
		batch.updatedAt = new Date().toISOString();
		this.enqueueSave(store);
		await this.saveQueue;
		return batch;
	}

	async getNext(batchId: string): Promise<{ batch: IngestionBatch; item: IngestionBatchItem | null }> {
		const store = await this.loadStore();
		const batch = batchId
			? this.requireBatch(store, batchId)
			: this.latestBatch(store, ["active"]);
		if (batch.status !== "active") {
			if (batch.status === "completed" || batch.status === "completed_with_errors") {
				return { batch, item: null };
			}
			throw new Error("批次尚未启动，请先获得用户确认并调用 start_ingestion_batch");
		}

		let item = batch.items.find((candidate) => candidate.status === "processing");
		if (!item) {
			item = batch.items.find((candidate) => candidate.status === "pending");
			if (item) item.status = "processing";
		}

		if (!item) {
			this.finishBatch(batch);
			this.enqueueSave(store);
			return { batch, item: null };
		}

		const file = this.app.vault.getAbstractFileByPath(item.path);
		if (!(file instanceof TFile)) {
			item.status = "failed";
			item.error = "文件不存在或不再是普通文件";
			batch.updatedAt = new Date().toISOString();
			this.enqueueSave(store);
			return { batch, item };
		}

		try {
			const raw = await this.app.vault.read(file);
			const currentFingerprint = this.fingerprint(raw);
			if (currentFingerprint !== item.fingerprint) {
				item.fingerprint = currentFingerprint;
				item.size = file.stat.size;
				item.action = "changed";
			}
			batch.updatedAt = new Date().toISOString();
			this.enqueueSave(store);
			return { batch, item };
		} catch (error: unknown) {
			item.status = "failed";
			item.error = this.errorMessage(error);
			batch.updatedAt = new Date().toISOString();
			this.enqueueSave(store);
			return { batch, item };
		}
	}

	async complete(
		batchId: string,
		filePath: string,
		createdPages: string[],
		updatedPages: string[],
		notes = ""
	): Promise<IngestionBatch> {
		const store = await this.loadStore();
		const batch = this.requireBatch(store, batchId);
		const item = this.requireItem(batch, filePath);
		if (item.status !== "processing") throw new Error(`文件当前状态为 ${item.status}，不能标记完成`);

		item.status = "completed";
		item.error = undefined;
		item.createdPages = this.cleanStrings(createdPages, 50);
		item.updatedPages = this.cleanStrings(updatedPages, 50);
		item.notes = notes.slice(0, 300);
		const sourceFile = this.app.vault.getAbstractFileByPath(item.path);
		const stat = sourceFile instanceof TFile ? sourceFile.stat : null;
		store.files[item.path] = {
			fingerprint: item.fingerprint,
			lastCompletedAt: new Date().toISOString(),
			mtime: stat?.mtime,
			size: stat?.size,
		};
		this.finishBatch(batch);
		batch.updatedAt = new Date().toISOString();
		this.enqueueSave(store);
		return batch;
	}

	async fail(batchId: string, filePath: string, error: string): Promise<IngestionBatch> {
		const store = await this.loadStore();
		const batch = this.requireBatch(store, batchId);
		const item = this.requireItem(batch, filePath);
		if (item.status !== "processing" && item.status !== "pending") {
			throw new Error(`文件当前状态为 ${item.status}，不能标记失败`);
		}
		item.status = "failed";
		item.error = error.slice(0, 2000) || "未知错误";
		this.finishBatch(batch);
		batch.updatedAt = new Date().toISOString();
		this.enqueueSave(store);
		return batch;
	}

	async retryFailed(batchId: string): Promise<IngestionBatch> {
		const store = await this.loadStore();
		const batch = this.requireBatch(store, batchId);
		let count = 0;
		for (const item of batch.items) {
			if (item.status === "failed") {
				item.status = "pending";
				item.error = undefined;
				count++;
			}
		}
		if (count === 0) throw new Error("当前批次没有失败项目");
		batch.status = "active";
		batch.updatedAt = new Date().toISOString();
		this.enqueueSave(store);
		return batch;
	}

	async markStopping(batchId = ""): Promise<IngestionBatch> {
		const store = await this.loadStore();
		const batch = batchId ? this.requireBatch(store, batchId) : this.latestBatch(store, ["active"]);
		if (batch.status !== "active") throw new Error(`批次当前状态为 ${batch.status}，不能请求停止`);
		batch.status = "stopping";
		batch.updatedAt = new Date().toISOString();
		this.enqueueSave(store);
		return batch;
	}

	async pause(batchId = ""): Promise<IngestionBatch> {
		const store = await this.loadStore();
		const batch = batchId ? this.requireBatch(store, batchId) : this.latestBatch(store, ["stopping", "active"]);
		for (const item of batch.items) {
			if (item.status === "processing") item.status = "pending";
		}
		batch.status = "paused";
		batch.updatedAt = new Date().toISOString();
		this.enqueueSave(store);
		return batch;
	}

	async resume(batchId = ""): Promise<IngestionBatch> {
		const store = await this.loadStore();
		const batch = batchId ? this.requireBatch(store, batchId) : this.latestBatch(store, ["paused"]);
		if (batch.status !== "paused") throw new Error(`批次当前状态为 ${batch.status}，不能继续`);
		batch.status = "active";
		batch.updatedAt = new Date().toISOString();
		this.enqueueSave(store);
		return batch;
	}

	async deleteBatch(batchId: string): Promise<void> {
		const store = await this.loadStore();
		const batch = this.requireBatch(store, batchId);
		if (batch.status === "active" || batch.status === "stopping") {
			throw new Error(`批次 ${batchId} 当前状态为 ${batch.status}，请先停止后再删除`);
		}
		delete store.batches[batchId];
		this.enqueueSave(store);
	}

	async deleteAllCompletedBatches(): Promise<number> {
		const store = await this.loadStore();
		let count = 0;
		for (const [id, batch] of Object.entries(store.batches)) {
			if (batch.status === "completed" || batch.status === "completed_with_errors") {
				delete store.batches[id];
				count++;
			}
		}
		if (count > 0) this.enqueueSave(store);
		return count;
	}

	async getStatus(batchId = ""): Promise<{ batch: IngestionBatch; totals: Record<IngestionItemStatus, number> }> {
		const store = await this.loadStore();
		const batch = batchId
			? this.requireBatch(store, batchId)
			: this.latestBatch(store, ["active", "stopping", "paused", "planned", "completed_with_errors", "completed"]);
		const totals: Record<IngestionItemStatus, number> = {
			pending: 0, processing: 0, completed: 0, failed: 0, skipped: 0,
		};
		for (const item of batch.items) totals[item.status]++;
		return { batch, totals };
	}

	private resolveFiles(paths: string[]): TFile[] {
		const rawRoot = normalizePath(`${this.settings.knowledgeBasePath}/00-原始资料`);
		const results = new Map<string, TFile>();
		const visit = (entry: TFile | TFolder) => {
			if (entry instanceof TFile) {
				if (SUPPORTED_EXTENSIONS.has(entry.extension.toLowerCase())) results.set(entry.path, entry);
				return;
			}
			for (const child of entry.children) {
				if (child instanceof TFile || child instanceof TFolder) visit(child as TFile | TFolder);
			}
		};

		for (const input of paths) {
			if (String(input || "").replace(/\\/g, "/").split("/").includes("..")) {
				throw new Error(`路径不能包含上级目录引用: ${input}`);
			}
			const path = normalizePath(String(input || ""));
			if (!path || (path !== rawRoot && !path.startsWith(`${rawRoot}/`))) {
				throw new Error(`只能规划原始资料目录中的文件: ${path || "(空路径)"}`);
			}
			let entry = this.app.vault.getAbstractFileByPath(path);
			if (!entry) {
				const allFiles = this.app.vault.getFiles();
				const basename = path.split("/").pop() || path;
				const basenameNoExt = basename.replace(/\.[^.]+$/, "");
				const fuzzy = allFiles.filter(
					(f) => f.path.startsWith(rawRoot + "/") && (f.basename === basename || f.basename === basenameNoExt || f.path.endsWith("/" + basename) || f.path.endsWith("/" + basenameNoExt + ".md"))
				);
				if (fuzzy.length === 1) entry = fuzzy[0];
			}
			if (!entry || (!(entry instanceof TFile) && !(entry instanceof TFolder))) {
				throw new Error(`路径不存在: ${path}`);
			}
			visit(entry as TFile | TFolder);
		}

		return [...results.values()].sort((left, right) => left.path.localeCompare(right.path, "zh-CN"));
	}

	private summarize(items: IngestionBatchItem[]): IngestionPlanSummary["totals"] {
		return {
			all: items.length,
			toProcess: items.filter((item) => item.status === "pending").length,
			skipped: items.filter((item) => item.status === "skipped").length,
			newFiles: items.filter((item) => item.action === "new").length,
			changedFiles: items.filter((item) => item.action === "changed").length,
			failed: items.filter((item) => item.status === "failed").length,
			deferred: 0,
		};
	}

	private finishBatch(batch: IngestionBatch): void {
		if (batch.items.some((item) => item.status === "pending" || item.status === "processing")) return;
		batch.status = batch.items.some((item) => item.status === "failed")
			? "completed_with_errors"
			: "completed";
	}

	private requireBatch(store: IngestionStore, batchId: string): IngestionBatch {
		const batch = store.batches[batchId];
		if (!batch) throw new Error(`摄取批次不存在: ${batchId}`);
		return batch;
	}

	private latestBatch(store: IngestionStore, preferredStatuses: IngestionBatchStatus[]): IngestionBatch {
		const batch = this.findLatestBatch(store, preferredStatuses);
		if (!batch) throw new Error("没有找到可继续的摄取批次，请先生成摄取计划");
		return batch;
	}

	private findLatestBatch(
		store: IngestionStore,
		preferredStatuses: IngestionBatchStatus[],
		excludeId = ""
	): IngestionBatch | null {
		const batches = Object.values(store.batches).filter((batch) => batch.id !== excludeId);
		for (const status of preferredStatuses) {
			const match = batches
				.filter((batch) => batch.status === status)
				.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0];
			if (match) return match;
		}
		return null;
	}

	private requireItem(batch: IngestionBatch, filePath: string): IngestionBatchItem {
		const normalized = normalizePath(filePath);
		const item = batch.items.find((candidate) => candidate.path === normalized);
		if (!item) throw new Error(`文件不属于该批次: ${normalized}`);
		return item;
	}

	private async loadStore(): Promise<IngestionStore> {
		if (this.storeCache) return this.storeCache;
		if (!this.storeLoadPromise) {
			this.storeLoadPromise = this.readStoreFromDisk().then((store) => {
				this.storeCache = store;
				this.migrateStore(store);
				return store;
			});
		}
		return this.storeLoadPromise;
	}

	private async readStoreFromDisk(): Promise<IngestionStore> {
		const path = this.storePath();
		const file = this.app.vault.getAbstractFileByPath(path);
		if (!(file instanceof TFile)) return { version: 1, files: {}, batches: {} };
		try {
			const parsed = JSON.parse(await this.app.vault.read(file)) as Partial<IngestionStore>;
			return {
				version: 1,
				files: parsed.files && typeof parsed.files === "object" ? parsed.files : {},
				batches: parsed.batches && typeof parsed.batches === "object" ? parsed.batches : {},
			};
		} catch {
			throw new Error(`摄取任务文件格式无效: ${path}`);
		}
	}

	/**
	 * 迁移旧版数据：已完成文件的登记只保留指纹、完成时间和来源文件 stat，
	 * 丢弃每文件最多 200 条页面路径和 2000 字备注，避免摄取任务文件无限膨胀。
	 */
	private migrateStore(store: IngestionStore): void {
		let dirty = false;
		for (const key of Object.keys(store.files)) {
			const rec = store.files[key];
			if (!rec) continue;
			const compact: CompletedFileRecord = {
				fingerprint: rec.fingerprint,
				lastCompletedAt: rec.lastCompletedAt,
			};
			if (typeof rec.mtime === "number") compact.mtime = rec.mtime;
			if (typeof rec.size === "number") compact.size = rec.size;
			if (rec.createdPages || rec.updatedPages || rec.notes) dirty = true;
			store.files[key] = compact;
		}
		if (dirty) this.enqueueSave(store);
	}

	private enqueueSave(store: IngestionStore): void {
		const snapshot = JSON.stringify(store, null, 2);
		this.saveQueue = this.saveQueue.then(async () => {
			try {
				const folder = normalizePath(`${this.settings.knowledgeBasePath}/30-维护记录`);
				await this.ensureFolder(folder);
				const path = this.storePath();
				const file = this.app.vault.getAbstractFileByPath(path);
				if (file instanceof TFile) await this.app.vault.modify(file, snapshot);
				else await this.app.vault.create(path, snapshot);
			} catch (error: unknown) {
				console.error("保存摄取任务失败:", error);
			}
		});
	}

	private async ensureFolder(path: string): Promise<void> {
		let current = "";
		for (const part of normalizePath(path).split("/")) {
			current = current ? `${current}/${part}` : part;
			if (!this.app.vault.getAbstractFileByPath(current)) await this.app.vault.createFolder(current);
		}
	}

	private storePath(): string {
		return normalizePath(`${this.settings.knowledgeBasePath}/30-维护记录/摄取任务.json`);
	}

	private fingerprint(content: string): string {
		let first = 0x811c9dc5;
		let second = 0x9e3779b9;
		for (let index = 0; index < content.length; index++) {
			const value = content.charCodeAt(index);
			first ^= value;
			first = Math.imul(first, 0x01000193);
			second ^= value + index;
			second = Math.imul(second, 0x85ebca6b);
		}
		return `${content.length.toString(36)}-${(first >>> 0).toString(36)}-${(second >>> 0).toString(36)}`;
	}

	private cleanStrings(values: string[], max = 200): string[] {
		return [...new Set((Array.isArray(values) ? values : []).map(String).map((value) => value.trim()).filter(Boolean))].slice(0, max);
	}

	private resolveSinceMs(options: IngestionPlanOptions): number | null {
		const scope = String(options.scope || "all").toLowerCase();
		const now = new Date();
		if (scope === "today") return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
		if (scope === "week") {
			const sinceMonday = (now.getDay() + 6) % 7;
			return new Date(now.getFullYear(), now.getMonth(), now.getDate() - sinceMonday).getTime();
		}
		if (scope === "month") return new Date(now.getFullYear(), now.getMonth(), 1).getTime();
		if (options.since) {
			const parsed = new Date(String(options.since).trim());
			if (!Number.isNaN(parsed.getTime())) return parsed.getTime();
		}
		return null;
	}

	private errorMessage(error: unknown): string {
		return error instanceof Error ? error.message : String(error);
	}
}
