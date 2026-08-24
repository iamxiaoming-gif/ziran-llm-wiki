import type { RecordedAudio } from "./types";

export class AudioRecorderService {
	private recorder: MediaRecorder | null = null;
	private stream: MediaStream | null = null;
	private chunks: Blob[] = [];
	private startedAt = 0;
	private autoStopTimer: number | null = null;
	private autoStopHandler: (() => void) | null = null;

	isSupported(): boolean {
		return typeof navigator !== "undefined"
			&& Boolean(navigator.mediaDevices?.getUserMedia)
			&& typeof MediaRecorder !== "undefined";
	}

	isRecording(): boolean {
		return this.recorder?.state === "recording";
	}

	async start(maxMinutes: number, onAutoStop: () => void): Promise<void> {
		if (!this.isSupported()) throw new Error("当前环境不支持麦克风录音，请改用文字输入或上传音频。");
		if (this.isRecording()) throw new Error("录音已经开始。");

		this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
		try {
			this.chunks = [];
			this.startedAt = Date.now();
			this.autoStopHandler = onAutoStop;
			const mimeType = this.pickMimeType();
			this.recorder = mimeType
				? new MediaRecorder(this.stream, { mimeType })
				: new MediaRecorder(this.stream);
			this.recorder.addEventListener("dataavailable", (event) => {
				if (event.data.size > 0) this.chunks.push(event.data);
			});
			this.recorder.addEventListener("error", () => this.cleanup());
			this.recorder.start(1000);
			this.autoStopTimer = window.setTimeout(() => {
				if (this.isRecording()) this.autoStopHandler?.();
			}, Math.max(1, maxMinutes) * 60 * 1000);
		} catch (error) {
			this.chunks = [];
			this.cleanup();
			throw error;
		}
	}

	stop(): Promise<RecordedAudio> {
		const recorder = this.recorder;
		if (!recorder || recorder.state === "inactive") {
			return Promise.reject(new Error("当前没有正在进行的录音。"));
		}
		return new Promise((resolve, reject) => {
			const finish = () => {
				try {
					const mimeType = recorder.mimeType || this.chunks[0]?.type || "audio/webm";
					const blob = new Blob(this.chunks, { type: mimeType });
					resolve({ blob, mimeType, durationSeconds: Math.max(1, Math.round((Date.now() - this.startedAt) / 1000)) });
				} catch (error) {
					reject(error);
				} finally {
					this.cleanup();
				}
			};
			recorder.addEventListener("stop", finish, { once: true });
			recorder.addEventListener("error", () => {
				this.cleanup();
				reject(new Error("录音失败，请检查麦克风权限后重试。"));
			}, { once: true });
			recorder.stop();
		});
	}

	cancel(): void {
		if (this.recorder && this.recorder.state !== "inactive") this.recorder.stop();
		this.chunks = [];
		this.cleanup();
	}

	private pickMimeType(): string {
		const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus"];
		return candidates.find((type) => MediaRecorder.isTypeSupported(type)) || "";
	}

	private cleanup(): void {
		if (this.autoStopTimer !== null) window.clearTimeout(this.autoStopTimer);
		this.autoStopTimer = null;
		this.autoStopHandler = null;
		this.stream?.getTracks().forEach((track) => track.stop());
		this.stream = null;
		this.recorder = null;
	}
}
