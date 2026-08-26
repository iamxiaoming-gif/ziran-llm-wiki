import { TFile, Vault } from "obsidian";

/** DecompressionStream 类型声明（Electron/Chrome 运行时有，TS 4.7 lib 未收录） */
declare class DecompressionStream {
	constructor(format: string);
	readonly readable: ReadableStream;
	readonly writable: WritableStream;
}

/**
 * 轻量文件文字提取服务：支持 Markdown/文本、PDF、Word(docx)、PowerPoint(pptx)。
 * 不引入外部依赖：docx/pptx 按 ZIP 结构解析 XML；pdf 按对象流扫描提取文本。
 */
export class FileTextExtractor {
	constructor(private vault: Vault) {}

	/** 支持直接提取文字的文件扩展名 */
	static readonly SUPPORTED_EXTENSIONS = new Set([
		"md", "txt", "json", "csv", "tsv", "html", "htm", "xml", "yaml", "yml",
		"pdf", "docx", "pptx",
	]);

	async extract(file: TFile): Promise<string> {
		const ext = file.extension.toLowerCase();
		if (ext === "pdf") return this.extractPdf(file);
		if (ext === "docx") return this.extractDocx(file);
		if (ext === "pptx") return this.extractPptx(file);
		// 其余文本类格式直接读取
		return this.vault.read(file);
	}

	/** 读取二进制文件为 Uint8Array */
	private async readBinary(file: TFile): Promise<Uint8Array> {
		const buf = await this.vault.readBinary(file);
		return new Uint8Array(buf);
	}

	// ==================== DOCX ====================
	private async extractDocx(file: TFile): Promise<string> {
		const data = await this.readBinary(file);
		const zip = await parseZip(data);
		const parts: string[] = [];
		const doc = zip.get("word/document.xml");
		if (doc) parts.push(xmlToPlainText(utf8Decode(doc)));
		for (const name of ["word/header1.xml", "word/header2.xml", "word/header3.xml", "word/footer1.xml"]) {
			const p = zip.get(name);
			if (p) parts.push(xmlToPlainText(utf8Decode(p)));
		}
		const text = parts.filter((s) => s.trim()).join("\n\n");
		if (!text.trim()) throw new Error("该 Word 文件未提取到可读文字（可能是扫描件或加密文件）");
		return text;
	}

	// ==================== PPTX ====================
	private async extractPptx(file: TFile): Promise<string> {
		const data = await this.readBinary(file);
		const zip = await parseZip(data);
		const slideNames = zip.names()
			.filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n))
			.sort((a, b) => {
				const na = parseInt(a.match(/slide(\d+)/)?.[1] || "0", 10);
				const nb = parseInt(b.match(/slide(\d+)/)?.[1] || "0", 10);
				return na - nb;
			});
		const parts: string[] = [];
		for (const name of slideNames) {
			const entry = zip.get(name);
			if (!entry) continue;
			const xml = utf8Decode(entry);
			const text = xmlToPlainText(xml);
			if (text.trim()) parts.push(text);
		}
		const text = parts.join("\n\n");
		if (!text.trim()) throw new Error("该 PowerPoint 文件未提取到可读文字（可能是扫描件或加密文件）");
		return text;
	}

	// ==================== PDF ====================
	private async extractPdf(file: TFile): Promise<string> {
		const data = await this.readBinary(file);
		const text = await extractPdfText(data);
		if (!text.trim()) throw new Error("该 PDF 未提取到可读文字（可能是扫描件/纯图片 PDF，或使用了不受支持的压缩算法）");
		return text;
	}
}

// ==================== 工具函数 ====================

function utf8Decode(bytes: Uint8Array): string {
	const decoder = new TextDecoder("utf-8");
	return decoder.decode(bytes);
}

function bytesToString(bytes: Uint8Array): string {
	let out = "";
	for (let i = 0; i < bytes.length; i++) out += String.fromCharCode(bytes[i]);
	return out;
}

async function inflate(bytes: Uint8Array): Promise<Uint8Array | null> {
	// 兼容两种实现：Chromium/Electron 的 'deflate' 指 raw deflate；Node 的指 zlib 包装
	try {
		const ds = new DecompressionStream("deflate");
		const stream = new Blob([bytes]).stream().pipeThrough(ds);
		const buf = await new Response(stream).arrayBuffer();
		return new Uint8Array(buf);
	} catch {
		try {
			// 部分实现（如 Node）需要完整 zlib 包装：补 2 字节头 + 4 字节 Adler-32 校验
			const adler = adler32(bytes);
			const withHeader = new Uint8Array(bytes.length + 6);
			withHeader[0] = 0x78;
			withHeader[1] = 0x9c;
			withHeader.set(bytes, 2);
			withHeader[bytes.length + 2] = (adler >>> 24) & 0xff;
			withHeader[bytes.length + 3] = (adler >>> 16) & 0xff;
			withHeader[bytes.length + 4] = (adler >>> 8) & 0xff;
			withHeader[bytes.length + 5] = adler & 0xff;
			const ds2 = new DecompressionStream("deflate");
			const stream2 = new Blob([withHeader]).stream().pipeThrough(ds2);
			const buf2 = await new Response(stream2).arrayBuffer();
			return new Uint8Array(buf2);
		} catch {
			return null;
		}
	}
}

function adler32(data: Uint8Array): number {
	let a = 1;
	let b = 0;
	for (let i = 0; i < data.length; i++) {
		a = (a + data[i]) % 65521;
		b = (b + a) % 65521;
	}
	return ((b << 16) | a) >>> 0;
}

/** 极简 ZIP 读取器：只读取本地文件头与数据，支持 deflate 解压 */
async function parseZip(data: Uint8Array): Promise<{ get(name: string): Uint8Array | null; names(): string[] }> {
	const entries = new Map<string, Uint8Array>();

	// 定位 End of Central Directory
	let eocd = -1;
	for (let i = data.length - 22; i >= 0; i--) {
		if (data[i] === 0x50 && data[i + 1] === 0x4b && data[i + 2] === 0x05 && data[i + 3] === 0x06) {
			eocd = i;
			break;
		}
	}
	if (eocd < 0) throw new Error("无效的 Office 文件（缺少 ZIP 结构）");

	const centralOffset = readU32(data, eocd + 16);
	const totalEntries = readU16(data, eocd + 10);
	let pos = centralOffset;

	for (let n = 0; n < totalEntries; n++) {
		if (pos + 46 > data.length) break;
		if (data[pos] !== 0x50 || data[pos + 1] !== 0x4b || data[pos + 2] !== 0x01 || data[pos + 3] !== 0x02) break;
		const method = readU16(data, pos + 10);
		const compressedSize = readU32(data, pos + 20);
		const nameLen = readU16(data, pos + 28);
		const extraLen = readU16(data, pos + 30);
		const commentLen = readU16(data, pos + 32);
		const localOffset = readU32(data, pos + 42);
		const name = utf8Decode(data.slice(pos + 46, pos + 46 + nameLen));
		pos += 46 + nameLen + extraLen + commentLen;

		// 从本地文件头读取数据
		if (localOffset + 30 <= data.length) {
			const localNameLen = readU16(data, localOffset + 26);
			const localExtraLen = readU16(data, localOffset + 28);
			const start = localOffset + 30 + localNameLen + localExtraLen;
			const end = Math.min(start + compressedSize, data.length);
			if (end > start) {
				const raw = data.slice(start, end);
				if (method === 0) {
					entries.set(name, raw);
				} else {
					// ZIP 条目使用 raw deflate；个别工具会在条目内带 zlib 头，兼容剥头
					let deflateData = raw;
					if (raw.length > 2 && raw[0] === 0x78 && (raw[1] === 0x9c || raw[1] === 0xda || raw[1] === 0x01 || raw[1] === 0x5e)) {
						deflateData = raw.slice(2);
					}
					const inflated = await inflate(deflateData);
					entries.set(name, inflated ?? raw);
				}
			}
		}
	}

	return {
		get: (name: string) => entries.get(name) ?? null,
		names: () => [...entries.keys()],
	};
}

/** XML 转纯文本：抽取 <w:t>（docx）、<a:t>（pptx）等文本节点的内容 */
function xmlToPlainText(xml: string): string {
	if (typeof DOMParser === "undefined") {
		// 兜底：正则提取文本节点
		const texts = xml.match(/<(?:\w+:)?t(?:\s[^>]*)?>([^<]*)<\/(?:\w+:)?t>/g) || [];
		return texts
			.map((t) => t.replace(/^<[^>]+>/, "").replace(/<\/[^>]+>$/, ""))
			.filter((t) => t.trim())
			.join("\n");
	}
	try {
		const doc = new DOMParser().parseFromString(xml, "application/xml");
		const paragraphs: string[] = [];
		let current = "";
		const walk = (node: Node) => {
			if (node.nodeType === Node.ELEMENT_NODE) {
				const el = node as Element;
				const tag = el.tagName.toLowerCase().split(":").pop() || "";
				if (tag === "t" || tag === "br") {
					const text = el.textContent || "";
					if (text) current += text;
					return;
				}
				if (tag === "p" || tag === "tr") {
					for (const child of Array.from(el.childNodes)) walk(child);
					if (current.trim()) {
						paragraphs.push(current.trim());
						current = "";
					}
					return;
				}
			}
			for (const child of Array.from(node.childNodes)) walk(child);
		};
		walk(doc);
		if (current.trim()) paragraphs.push(current.trim());
		return paragraphs.join("\n");
	} catch {
		return "";
	}
}

/** PDF 文本提取：扫描对象流，解压 FlateDecode，抽取 Tj/TJ 文本操作符 */
async function extractPdfText(data: Uint8Array): Promise<string> {
	const src = bytesToString(data);
	const texts: string[] = [];

	// 找到所有流对象
	const streamRe = /(\d+)\s+(\d+)\s+obj[\s\S]*?stream\r?\n([\s\S]*?)endstream/g;
	let m: RegExpExecArray | null;
	while ((m = streamRe.exec(src)) !== null) {
		let raw = m[3];
		// 判断是否 Flate 压缩
		const objHeader = src.slice(Math.max(0, m.index - 400), m.index);
		const isFlate = /\/Filter\s*\/FlateDecode/.test(objHeader);
		let content: string;
		if (isFlate) {
			let rawBytesArr = rawBytes(raw);
			// zlib 流开头有 2 字节头（78 9C/78 DA 等），DecompressionStream 需要 raw deflate
			if (rawBytesArr.length > 2 && rawBytesArr[0] === 0x78) {
				rawBytesArr = rawBytesArr.slice(2);
			}
			const inflated = await inflate(rawBytesArr);
			if (!inflated) continue;
			content = utf8Decode(inflated);
		} else {
			content = raw;
		}
		texts.push(extractPdfTextOps(content));
	}

	return texts.filter((t) => t.trim()).join("\n");
}

function rawBytes(s: string): Uint8Array {
	const bytes = new Uint8Array(s.length);
	for (let i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i) & 0xff;
	return bytes;
}

/** 从 PDF 内容流中抽取文本操作符 */
function extractPdfTextOps(content: string): string {
	const out: string[] = [];
	// 括号字符串
	const stringRe = /\(((?:\\.|[^()\\])*)\)\s*Tj|\[((?:\\.|[^\]\\])*)\]\s*TJ/g;
	let m: RegExpExecArray | null;
	while ((m = stringRe.exec(content)) !== null) {
		const s = (m[1] ?? m[2] ?? "").replace(/\\([()\\])/g, "$1").replace(/\\n/g, " ").replace(/\\r/g, " ").replace(/\\([0-7]{1,3})/g, (_a, oct: string) => String.fromCharCode(parseInt(oct, 8)));
		if (s.trim()) out.push(s);
	}
	return out.join("");
}

function readU16(d: Uint8Array, o: number): number {
	return (d[o] | (d[o + 1] << 8)) & 0xffff;
}

function readU32(d: Uint8Array, o: number): number {
	return ((d[o] | (d[o + 1] << 8) | (d[o + 2] << 16) | (d[o + 3] << 24)) >>> 0);
}
