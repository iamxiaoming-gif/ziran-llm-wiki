import { ItemView, MarkdownRenderer, Notice, WorkspaceLeaf, normalizePath } from "obsidian";
import type LLMWikiPlugin from "../main";
import { AudioRecorderService } from "./AudioRecorderService";
import type { FeynmanEvaluation, FeynmanVerdict, RecordedAudio } from "./types";

export const VIEW_TYPE_FEYNMAN = "llm-wiki-feynman-view";

export class FeynmanView extends ItemView {
	private recorder = new AudioRecorderService();
	private topicEl!: HTMLInputElement;
	private transcriptEl!: HTMLTextAreaElement;
	private recordBtn!: HTMLButtonElement;
	private stopBtn!: HTMLButtonElement;
	private transcribeBtn!: HTMLButtonElement;
	private analyzeBtn!: HTMLButtonElement;
	private statusEl!: HTMLElement;
	private resultEl!: HTMLElement;
	private currentAudio: RecordedAudio | null = null;
	private audioFilename = "recording.webm";
	private latestEvaluation: FeynmanEvaluation | null = null;
	private latestTopic = "";
	private latestTranscript = "";
	private busy = false;

	constructor(leaf: WorkspaceLeaf, private plugin: LLMWikiPlugin) { super(leaf); }

	getViewType(): string { return VIEW_TYPE_FEYNMAN; }
	getDisplayText(): string { return "费曼学习"; }
	getIcon(): string { return "brain"; }

	async onOpen(): Promise<void> {
		const container = this.containerEl.children[1] as HTMLElement;
		container.empty();
		container.addClass("llm-wiki-root", "llm-wiki-feynman-root");
		this.buildUI(container);
	}

	async onClose(): Promise<void> {
		this.recorder.cancel();
	}

	private buildUI(container: HTMLElement): void {
		const header = container.createDiv({ cls: "llm-wiki-feynman-header" });
		const heading = header.createDiv({ cls: "llm-wiki-feynman-heading" });
		heading.createEl("h2", { text: "🎓 费曼学习教练" });
		heading.createEl("p", { text: "用自己的话讲清楚，再用知识库证据核验理解。" });
		const actions = header.createDiv({ cls: "llm-wiki-header-actions" });
		const chatBtn = actions.createEl("button", { text: "返回知识助手", cls: "llm-wiki-btn llm-wiki-btn-sm" });
		chatBtn.addEventListener("click", () => void this.plugin.activateChatView());
		const resetBtn = actions.createEl("button", { text: "新一轮", cls: "llm-wiki-btn llm-wiki-btn-sm" });
		resetBtn.addEventListener("click", () => this.reset());
		const historyBtn = actions.createEl("button", { text: "学习记录", cls: "llm-wiki-btn llm-wiki-btn-sm" });
		historyBtn.addEventListener("click", () => void this.openLearningHistory());

		const card = container.createDiv({ cls: "llm-wiki-feynman-card" });
		card.createEl("label", { text: "这次要讲的主题", cls: "llm-wiki-feynman-label" });
		this.topicEl = card.createEl("input", { cls: "llm-wiki-feynman-topic", attr: { type: "text", placeholder: "例如：什么是梯度下降？" } });

		const provider = this.plugin.transcriptionService.getProviderDisplayName();
		const providerLine = card.createDiv({ cls: "llm-wiki-feynman-provider" });
		providerLine.addClass("llm-wiki-hidden");
		providerLine.createSpan({ text: `当前转写：${provider}${this.plugin.transcriptionService.isLocalProvider() ? "（音频不离开本机）" : "（音频将发送给该供应商）"}` });
		const settingsBtn = providerLine.createEl("button", { text: "转写设置", cls: "llm-wiki-link-button" });
		settingsBtn.addEventListener("click", () => this.openSettings());

		const voiceRow = card.createDiv({ cls: "llm-wiki-feynman-voice-row" });
		if (!this.plugin.settings.transcription.enabled) voiceRow.addClass("llm-wiki-hidden");
		this.recordBtn = voiceRow.createEl("button", { text: "开始口述", cls: "llm-wiki-btn llm-wiki-btn-primary" });
		this.recordBtn.addEventListener("click", () => {
			if (this.recorder.isRecording()) void this.stopRecording();
			else void this.startRecording();
		});
		this.stopBtn = voiceRow.createEl("button", { text: "■ 停止录音", cls: "llm-wiki-btn llm-wiki-btn-danger" });
		this.stopBtn.disabled = true;
		this.stopBtn.addClass("llm-wiki-hidden");
		this.stopBtn.addEventListener("click", () => void this.stopRecording());
		const uploadLabel = voiceRow.createEl("label", { text: "选择音频", cls: "llm-wiki-btn llm-wiki-file-label" });
		const upload = uploadLabel.createEl("input", { attr: { type: "file", accept: "audio/*" } });
		uploadLabel.addClass("llm-wiki-hidden");
		upload.addEventListener("change", () => {
			const file = upload.files?.[0];
			if (!file) return;
			void this.loadSelectedAudio(file);
		});
		this.transcribeBtn = voiceRow.createEl("button", { text: "转写为文字", cls: "llm-wiki-btn" });
		this.transcribeBtn.disabled = true;
		this.transcribeBtn.addClass("llm-wiki-hidden");
		this.transcribeBtn.addEventListener("click", () => void this.transcribe());

		card.createEl("label", { text: "我的讲解（可手动修改）", cls: "llm-wiki-feynman-label" });
		this.transcriptEl = card.createEl("textarea", {
			cls: "llm-wiki-feynman-transcript",
			attr: { rows: "9", placeholder: "你也可以直接输入自己的理解。尽量讲清楚：它是什么、为什么、如何工作、适用边界。" },
		});
		this.transcriptEl.addEventListener("input", () => this.updateButtons());

		this.statusEl = card.createDiv({ cls: "llm-wiki-feynman-status", text: "准备好了。你可以口述、选择音频，或直接输入文字。" });
		this.analyzeBtn = card.createEl("button", { text: "对照知识库评估", cls: "llm-wiki-btn llm-wiki-btn-primary llm-wiki-feynman-analyze" });
		this.analyzeBtn.disabled = true;
		this.analyzeBtn.addEventListener("click", () => void this.analyze());

		this.resultEl = container.createDiv({ cls: "llm-wiki-feynman-results" });
		this.updateButtons();
	}

	private async startRecording(): Promise<void> {
		try {
			this.currentAudio = null;
			this.audioFilename = "recording.webm";
			await this.recorder.start(this.plugin.settings.transcription.maxRecordingMinutes, () => void this.stopRecording(true));
			this.setStatus(`正在录音，最长 ${this.plugin.settings.transcription.maxRecordingMinutes} 分钟…`, "recording");
		} catch (error) {
			this.setStatus(error instanceof Error ? error.message : String(error), "error");
		}
		this.updateButtons();
	}

	private async stopRecording(auto = false): Promise<void> {
		try {
			this.currentAudio = await this.recorder.stop();
			this.audioFilename = this.currentAudio.mimeType.includes("ogg") ? "recording.ogg" : "recording.webm";
			this.currentAudio.originalFilename = this.audioFilename;
			this.setStatus(`${auto ? "已到时自动停止。" : "录音完成。"}正在转写…`, "working");
			this.updateButtons();
			await this.transcribe();
			return;
		} catch (error) {
			this.setStatus(error instanceof Error ? error.message : String(error), "error");
		}
		this.updateButtons();
	}

	private async loadSelectedAudio(file: File): Promise<void> {
		this.currentAudio = null;
		this.audioFilename = file.name;
		this.setBusy(true, `正在读取音频信息：${file.name}…`);
		let durationSeconds = 0;
		try {
			durationSeconds = await this.readAudioDuration(file);
		} catch {
			// 非 Google 服务仍可尝试转写；Google 会在发送前明确拦截未知时长。
		}
		this.currentAudio = {
			blob: file,
			mimeType: file.type || "application/octet-stream",
			durationSeconds,
			originalFilename: file.name,
		};
		this.setStatus(
			durationSeconds > 0
				? `已选择音频：${file.name}，时长约 ${Math.ceil(durationSeconds)} 秒，可以开始转写。`
				: `已选择音频：${file.name}，但无法读取时长；Google 模式会阻止发送，其他供应商可尝试转写。`,
			durationSeconds > 0 ? "ready" : "error"
		);
		this.setBusy(false);
	}

	private readAudioDuration(file: File): Promise<number> {
		return new Promise((resolve, reject) => {
			const audio = this.containerEl.ownerDocument.createElement("audio");
			const url = URL.createObjectURL(file);
			let settled = false;
			const timeout = window.setTimeout(() => finish(new Error("读取音频时长超时。")), 10000);
			const cleanup = () => {
				window.clearTimeout(timeout);
				audio.removeAttribute("src");
				audio.load();
				URL.revokeObjectURL(url);
			};
			const finish = (error?: Error) => {
				if (settled) return;
				settled = true;
				const duration = audio.duration;
				cleanup();
				if (error || !Number.isFinite(duration) || duration <= 0) reject(error || new Error("无法读取音频时长。"));
				else resolve(duration);
			};
			audio.preload = "metadata";
			audio.addEventListener("loadedmetadata", () => finish(), { once: true });
			audio.addEventListener("error", () => finish(new Error("无法读取音频元数据。")), { once: true });
			audio.src = url;
		});
	}

	private async transcribe(): Promise<void> {
		if (!this.currentAudio) return;
		this.setBusy(true, `正在通过 ${this.plugin.transcriptionService.getProviderDisplayName()} 转写…`);
		try {
			this.transcriptEl.value = await this.plugin.transcriptionService.transcribe(this.currentAudio.blob, this.audioFilename, this.currentAudio.durationSeconds);
			this.setStatus("转写完成。请检查文字，确认无误后再评估。", "ready");
		} catch (error) {
			this.setStatus(error instanceof Error ? error.message : String(error), "error");
		} finally {
			this.setBusy(false);
		}
	}

	private async analyze(): Promise<void> {
		const transcript = this.transcriptEl.value.trim();
		const topic = this.topicEl.value.trim() || this.inferTopic(transcript);
		if (!this.topicEl.value.trim()) this.topicEl.value = topic;
		if (!topic) { new Notice("请先填写本次讲解的主题。"); this.setStatus("请先填写本次讲解的主题。", "error"); this.topicEl.focus(); return; }
		if (transcript.length < 20) { new Notice("讲解内容太短，至少输入 20 个字符后才能评估。"); this.setStatus("讲解内容太短，至少再补充几句话后评估。", "error"); return; }
		this.setBusy(true, "正在检索知识库证据…");
		this.resultEl.empty();
		try {
			const evidence = await this.plugin.knowledgeEvidenceService.search(topic, transcript);
			if (!evidence.length) {
				new Notice(`知识库「${this.plugin.settings.knowledgeBasePath}/10-知识点库」中没有检索到相关内容，请先通过摄取功能将资料导入知识库。`);
			}
			this.setStatus(evidence.length ? `找到 ${evidence.length} 条相关证据，正在核验理解…` : "没有找到足够证据，正在生成无法核验报告…", "working");
			const evaluation = await this.plugin.feynmanEvaluationService.evaluate(topic, transcript, evidence);
			this.latestEvaluation = evaluation;
			this.latestTopic = topic;
			this.latestTranscript = transcript;
			this.renderEvaluation(evaluation);
			this.setStatus("评估完成。确认内容后可保存为一份完整学习记录。", "success");
		} catch (error) {
			this.setStatus(error instanceof Error ? error.message : String(error), "error");
		} finally {
			this.setBusy(false);
		}
	}

	private renderEvaluation(result: FeynmanEvaluation): void {
		this.resultEl.empty();
		const verdict = this.verdictInfo(result.overallVerdict);
		const summary = this.resultEl.createDiv({ cls: `llm-wiki-feynman-summary is-${result.overallVerdict}` });
		summary.createEl("h3", { text: `${verdict.icon} ${verdict.name}` });
		this.renderMarkdown(summary.createDiv({ cls: "llm-wiki-feynman-markdown" }), result.summary);
		const scores = summary.createDiv({ cls: "llm-wiki-feynman-scores" });
		for (const [name, value] of [["准确度", result.scores.accuracy], ["完整度", result.scores.completeness], ["清晰度", result.scores.clarity]] as [string, number][]) {
			const item = scores.createDiv({ cls: "llm-wiki-feynman-score" });
			item.createSpan({ text: name }); item.createEl("strong", { text: String(value) });
		}

		if (result.claims.length) {
			this.resultEl.createEl("h3", { text: "逐条核验" });
			for (const claim of result.claims) {
				const info = this.verdictInfo(claim.verdict);
				const card = this.resultEl.createDiv({ cls: `llm-wiki-feynman-claim is-${claim.verdict}` });
				card.createEl("h4", { text: `${info.icon} ${claim.userClaim}` });
				this.renderMarkdown(card.createDiv({ cls: "llm-wiki-feynman-markdown" }), claim.explanation);
				if (claim.correction) {
					const correction = card.createDiv({ cls: "llm-wiki-feynman-correction llm-wiki-feynman-markdown" });
					this.renderMarkdown(correction, `**建议：** ${claim.correction}`);
				}
				if (claim.evidenceIds.length) card.createEl("small", { text: `依据：${claim.evidenceIds.join("、")}` });
			}
		}
		this.renderList("还可以补充", result.missingPoints);
		this.renderList("再讲一遍前，先回答", result.reviewQuestions);
		if (result.evidence.length) {
			this.resultEl.createEl("h3", { text: "知识库依据" });
			const list = this.resultEl.createDiv({ cls: "llm-wiki-feynman-evidence" });
			for (const item of result.evidence) {
				const card = list.createDiv({ cls: "llm-wiki-feynman-evidence-item" });
				const link = card.createEl("button", { text: `${item.id} · ${item.title}`, cls: "llm-wiki-link-button" });
				link.addEventListener("click", () => void this.plugin.knowledgeEvidenceService.openEvidence(item));
				this.renderMarkdown(card.createDiv({ cls: "llm-wiki-feynman-markdown" }), item.excerpt, item.path);
			}
		}
		const save = this.resultEl.createEl("button", { text: "保存学习记录", cls: "llm-wiki-btn llm-wiki-btn-primary" });
		save.disabled = !this.plugin.settings.transcription.saveLearningRecords;
		if (!this.plugin.settings.transcription.saveLearningRecords) {
			save.setText("保存学习记录（已在设置中关闭）");
		}
		save.addEventListener("click", () => void this.saveLearningRecord(save));
		const retry = this.resultEl.createEl("button", { text: "保留主题，再讲一遍", cls: "llm-wiki-btn llm-wiki-btn-primary" });
		retry.addEventListener("click", () => {
				this.transcriptEl.value = ""; this.currentAudio = null; this.audioFilename = "recording.webm"; this.latestEvaluation = null; this.latestTopic = ""; this.latestTranscript = ""; this.resultEl.empty(); this.updateButtons(); this.transcriptEl.focus();
		});
	}

	private async saveLearningRecord(button: HTMLButtonElement): Promise<void> {
		if (!this.latestEvaluation) return;
		button.disabled = true;
		button.setText("正在保存…");
		try {
			const savedPath = await this.plugin.feynmanSessionService.save(this.latestTopic, this.latestTranscript, this.latestEvaluation, this.currentAudio || undefined);
			this.setStatus(savedPath ? `学习记录已保存到：${savedPath}` : "学习记录保存已关闭。", "success");
			button.setText(savedPath ? "已保存学习记录" : "保存学习记录");
			button.disabled = Boolean(savedPath);
		} catch (saveError) {
			new Notice(`学习记录保存失败：${saveError instanceof Error ? saveError.message : String(saveError)}`);
			button.setText("保存学习记录");
			button.disabled = false;
		}
	}

	private inferTopic(transcript: string): string {
		const compact = transcript.replace(/\s+/g, " ").trim();
		if (!compact) return "";
		return compact.length > 28 ? `${compact.slice(0, 28)}…` : compact;
	}

	private renderList(title: string, values: string[]): void {
		if (!values.length) return;
		this.resultEl.createEl("h3", { text: title });
		const list = this.resultEl.createEl("ul");
		values.forEach((value) => this.renderMarkdown(list.createEl("li"), value));
	}

	private renderMarkdown(container: HTMLElement, markdown: string, sourcePath = ""): void {
		void MarkdownRenderer.render(this.app, markdown || "（暂无内容）", container, sourcePath, this);
	}

	private verdictInfo(verdict: FeynmanVerdict): { name: string; icon: string } {
		return {
			correct: { name: "理解正确", icon: "✅" }, partial: { name: "部分正确", icon: "🟡" },
			incorrect: { name: "存在错误", icon: "🔴" }, unverifiable: { name: "知识库证据不足", icon: "⚪" },
		}[verdict];
	}

	private setBusy(value: boolean, message?: string): void { this.busy = value; if (message) this.setStatus(message, "working"); this.updateButtons(); }
	private setStatus(message: string, state: string): void { this.statusEl.setText(message); this.statusEl.className = `llm-wiki-feynman-status is-${state}`; }
	private updateButtons(): void {
		const recording = this.recorder.isRecording();
		this.recordBtn.disabled = this.busy;
		this.recordBtn.setText(recording ? "停止并转写" : "开始口述");
		this.stopBtn.disabled = this.busy || !recording;
		this.transcribeBtn.disabled = this.busy || recording || !this.currentAudio;
		const transcriptLength = this.transcriptEl?.value.trim().length || 0;
		this.analyzeBtn.disabled = this.busy || recording || transcriptLength < 20;
		this.analyzeBtn.setAttribute("aria-disabled", String(this.analyzeBtn.disabled));
		this.analyzeBtn.title = transcriptLength < 20 ? "至少输入 20 个字符后即可评估" : "对照知识库评估本次讲解";
	}

	private reset(): void {
		this.recorder.cancel(); this.topicEl.value = ""; this.transcriptEl.value = ""; this.currentAudio = null; this.audioFilename = "recording.webm";
		this.latestEvaluation = null; this.latestTopic = ""; this.latestTranscript = "";
		this.resultEl.empty(); this.setStatus("已开始新一轮费曼学习。", "ready"); this.updateButtons(); this.topicEl.focus();
	}

	private openSettings(): void {
		const setting = (this.app as unknown as { setting?: { open(): void; openTabById(id: string): void } }).setting;
		setting?.open(); setting?.openTabById(this.plugin.manifest.id);
	}

	private async openLearningHistory(): Promise<void> {
		const today = new Date().toISOString().slice(0, 10);
		const indexPath = normalizePath(`${this.plugin.settings.memoryFolder}/费曼学习/${today}/学习记录索引.md`);
		if (!this.app.vault.getAbstractFileByPath(indexPath)) {
			new Notice("今天还没有保存费曼学习记录。完成评估后点击“保存学习记录”即可创建。");
			return;
		}
		await this.app.workspace.openLinkText(indexPath, "", false);
	}
}
