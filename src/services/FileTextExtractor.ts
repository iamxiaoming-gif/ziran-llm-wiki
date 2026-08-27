import { TFile, Vault } from "obsidian";

/** DecompressionStream 类型声明（Electron/Chrome 运行时有，TS 4.7 lib 未收录） */
declare class DecompressionStream {
	constructor(format: string);
	readonly readable: ReadableStream;
	readonly writable: WritableStream;
}

interface PdfObject {
	dict: string;
	decoded?: Uint8Array | null;
	toUnicode?: Map<string, string>;
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

function rawBytes(s: string): Uint8Array {
	const bytes = new Uint8Array(s.length);
	for (let i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i) & 0xff;
	return bytes;
}

function hexBytes(hex: string): Uint8Array {
	const clean = hex.replace(/\s+/g, "");
	const out = new Uint8Array(Math.floor(clean.length / 2));
	for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
	return out;
}

/** 括号字符串字面量 → 字节（处理 \\n \\r \\t 与八进制转义） */
function parenToBytes(s: string): Uint8Array {
	const bytes: number[] = [];
	for (let i = 0; i < s.length; i++) {
		const ch = s[i];
		if (ch === "\\") {
			const next = s[i + 1];
			if (next === "n") { bytes.push(10); i++; }
			else if (next === "r") { bytes.push(13); i++; }
			else if (next === "t") { bytes.push(9); i++; }
			else if (next === "b") { bytes.push(8); i++; }
			else if (next === "f") { bytes.push(12); i++; }
			else if (next >= "0" && next <= "7") {
				let oct = "";
				let j = i + 1;
				while (j < s.length && oct.length < 3 && s[j] >= "0" && s[j] <= "7") { oct += s[j]; j++; }
				bytes.push(parseInt(oct, 8) & 0xff);
				i = j - 1;
			} else {
				bytes.push(s.charCodeAt(i + 1) & 0xff);
				i++;
			}
		} else {
			bytes.push(s.charCodeAt(i) & 0xff);
		}
	}
	return new Uint8Array(bytes);
}

async function inflate(bytes: Uint8Array): Promise<Uint8Array | null> {
	const tryInflate = async (b: Uint8Array): Promise<Uint8Array> => {
		const ds = new DecompressionStream("deflate");
		const stream = new Blob([b]).stream().pipeThrough(ds);
		const buf = await new Response(stream).arrayBuffer();
		return new Uint8Array(buf);
	};
	try {
		return await tryInflate(bytes);
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
			return await tryInflate(withHeader);
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

function isZlibHeader(b: Uint8Array): boolean {
	if (b.length < 2) return false;
	const cmf = b[0];
	const flg = b[1];
	return (cmf & 0x0f) === 8 && (((cmf << 8) | flg) % 31 === 0);
}

/** 智能解压：兼容 raw deflate / zlib 包装，并容忍 endstream 前的换行符 */
async function inflateSmart(bytes: Uint8Array): Promise<Uint8Array | null> {
	const stripEol = (b: Uint8Array): Uint8Array => {
		let n = b.length;
		while (n > 0 && (b[n - 1] === 10 || b[n - 1] === 13)) n--;
		return b.slice(0, n);
	};
	const variants: Uint8Array[] = [bytes, stripEol(bytes)];
	for (const v of variants) {
		if (isZlibHeader(v)) variants.push(v.slice(2));
	}
	for (const v of variants) {
		const r = await inflate(v);
		if (r) return r;
	}
	return null;
}

function asciiHexDecode(bytes: Uint8Array): Uint8Array {
	let s = "";
	for (const b of bytes) {
		const c = String.fromCharCode(b);
		if (!/\s/.test(c)) s += c;
	}
	if (s.endsWith(">")) s = s.slice(0, -1);
	if (s.length % 2) s += "0";
	const out: number[] = [];
	for (let i = 0; i + 1 < s.length; i += 2) out.push(parseInt(s.slice(i, i + 2), 16));
	return new Uint8Array(out);
}

function ascii85Decode(bytes: Uint8Array): Uint8Array {
	let s = "";
	for (const b of bytes) {
		const c = String.fromCharCode(b);
		if (!/\s/.test(c)) s += c;
	}
	if (s.endsWith("~>")) s = s.slice(0, -2);
	const out: number[] = [];
	let i = 0;
	while (i < s.length) {
		if (s[i] === "z") {
			out.push(0, 0, 0, 0);
			i++;
			continue;
		}
		const chunk = s.slice(i, i + 5);
		const pad = 5 - chunk.length;
		const full = chunk + "u".repeat(pad);
		let val = 0;
		for (const ch of full) val = val * 85 + (ch.charCodeAt(0) - 33);
		const b4 = [(val >>> 24) & 0xff, (val >>> 16) & 0xff, (val >>> 8) & 0xff, val & 0xff];
		out.push(...b4.slice(0, 4 - pad));
		i += chunk.length;
	}
	return new Uint8Array(out);
}

/** 解析流字典中的过滤器列表（支持单个或数组形式） */
function getFilters(dictText: string): string[] {
	const m = /\/Filter\s*(\[[^\]]*\]|\/[A-Za-z0-9]+)/.exec(dictText);
	if (!m) return [];
	if (m[1].startsWith("[")) return (m[1].match(/\/[A-Za-z0-9]+/g) || []).map((x) => x.slice(1));
	return [m[1].slice(1)];
}

async function applyFilters(data: Uint8Array, filters: string[]): Promise<Uint8Array | null> {
	let cur: Uint8Array | null = data;
	for (const f of filters) {
		if (f === "FlateDecode" || f === "Fl") cur = await inflateSmart(cur);
		else if (f === "ASCIIHexDecode" || f === "AHx") cur = asciiHexDecode(cur);
		else if (f === "ASCII85Decode" || f === "A85") cur = ascii85Decode(cur);
		else return null;
		if (!cur) return null;
	}
	return cur;
}

// ==================== 字典解析 ====================

interface ParsedValue {
	value: string | null;
	end: number;
}

function parseValueAt(text: string, i: number): ParsedValue {
	while (i < text.length && /\s/.test(text[i])) i++;
	if (i >= text.length) return { value: null, end: i };
	const c = text[i];
	if (c === "(") {
		let depth = 1;
		let j = i + 1;
		let out = "";
		while (j < text.length && depth > 0) {
			if (text[j] === "\\") { out += text.slice(j, j + 2); j += 2; continue; }
			if (text[j] === "(") depth++;
			else if (text[j] === ")") { depth--; if (depth === 0) break; }
			out += text[j];
			j++;
		}
		return { value: out, end: j + 1 };
	}
	if (c === "<" && text[i + 1] === "<") {
		let depth = 1;
		let j = i + 2;
		let out = "";
		while (j < text.length && depth > 0) {
			if (text[j] === "<" && text[j + 1] === "<") { depth++; out += "<"; j += 2; continue; }
			if (text[j] === ">" && text[j + 1] === ">") { depth--; if (depth === 0) break; out += ">"; j += 2; continue; }
			out += text[j];
			j++;
		}
		return { value: out, end: j + 2 };
	}
	if (c === "[") {
		let depth = 1;
		let j = i + 1;
		let out = "";
		while (j < text.length && depth > 0) {
			if (text[j] === "[") depth++;
			else if (text[j] === "]") { depth--; if (depth === 0) break; }
			out += text[j];
			j++;
		}
		return { value: out, end: j + 1 };
	}
	if (c === "<") {
		const j = text.indexOf(">", i);
		return { value: j < 0 ? "" : text.slice(i + 1, j), end: j < 0 ? text.length : j + 1 };
	}
	let j = i;
	while (j < text.length && !/[\s<>\[\]()]/.test(text[j])) j++;
	let value = text.slice(i, j);
	// 引用值（如 "7 0 R"）：继续吞掉后面的 "数字 R"
	if (/^\d+$/.test(value)) {
		const ref = text.slice(j).match(/^\s+(\d+)\s+R\b/);
		if (ref) {
			value += ref[0];
			j += ref[0].length;
		}
	}
	return { value, end: j };
}

function getValue(dictText: string, key: string): string | null {
	const re = new RegExp("/" + key + "\\b");
	const m = re.exec(dictText);
	if (!m) return null;
	return parseValueAt(dictText, m.index + m[0].length).value;
}

function parseRefs(value: string): number[] {
	const refs: number[] = [];
	const re = /(\d+)\s+(\d+)\s+R/g;
	let m: RegExpExecArray | null;
	while ((m = re.exec(value)) !== null) refs.push(parseInt(m[1], 10));
	return refs;
}

function parseFontPairs(resourcesFontValue: string): Record<string, number> {
	const out: Record<string, number> = {};
	const re = /\/([A-Za-z0-9]+)\s+(\d+)\s+(\d+)\s+R/g;
	let m: RegExpExecArray | null;
	while ((m = re.exec(resourcesFontValue)) !== null) out[m[1]] = parseInt(m[2], 10);
	return out;
}

// ==================== ToUnicode / CMap ====================

/** 判断字节串更像 UTF-16BE（中文 CID 字体常见）还是 Latin-1 */
function looksUtf16be(bytes: Uint8Array): boolean {
	if (bytes.length < 4 || bytes.length % 2 !== 0) return false;
	let score = 0;
	let hasHigh = false;
	for (let i = 0; i + 1 < bytes.length; i += 2) {
		const hi = bytes[i];
		const lo = bytes[i + 1];
		if (hi >= 0x80 && hi <= 0xff) { score += 3; hasHigh = true; }
		else if (hi === 0 && lo >= 0x20 && lo <= 0x7e) score += 4;
		else if (hi >= 0x4e && hi <= 0x7f && (lo >= 0x80 || lo < 0x20)) score += 2;
		else if (hi >= 0x20 && hi <= 0x7e && lo >= 0x20 && lo <= 0x7e) score -= 2;
	}
	if (score >= 2) return true;
	return hasHigh && score >= 1;
}

function decodeUtf16be(bytes: Uint8Array): string {
	let out = "";
	for (let i = 0; i + 1 < bytes.length; i += 2) {
		const code = (bytes[i] << 8) | bytes[i + 1];
		if (code >= 0xd800 && code <= 0xdbff && i + 3 < bytes.length) {
			const lo = (bytes[i + 2] << 8) | bytes[i + 3];
			if (lo >= 0xdc00 && lo <= 0xdfff) {
				out += String.fromCharCode(code, lo);
				i += 2;
				continue;
			}
		}
		out += String.fromCharCode(code);
	}
	return out;
}

function hexToUnicode(hex: string): string {
	const bytes = hexBytes(hex);
	// CMap 目标值按规范是 UTF-16BE（1 字节值按 Latin-1 处理）
	if (bytes.length === 1) return String.fromCharCode(bytes[0]);
	if (bytes.length >= 2 && bytes.length % 2 === 0) return decodeUtf16be(bytes);
	let out = "";
	for (const b of bytes) out += String.fromCharCode(b);
	return out;
}

/** 解析 ToUnicode CMap（beginbfchar / beginbfrange） */
function parseToUnicode(decoded: Uint8Array): Map<string, string> {
	const s = new TextDecoder().decode(decoded);
	const map = new Map<string, string>();
	let m: RegExpExecArray | null;
	const charRe = /beginbfchar([\s\S]*?)endbfchar/g;
	while ((m = charRe.exec(s)) !== null) {
		const pairs = m[1].match(/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>/g) || [];
		for (const p of pairs) {
			const mm = /<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>/.exec(p);
			if (mm) map.set(mm[1].toLowerCase(), hexToUnicode(mm[2]));
		}
	}
	const rangeRe = /beginbfrange([\s\S]*?)endbfrange/g;
	while ((m = rangeRe.exec(s)) !== null) {
		const arrRanges = m[1].match(/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>\s*\[([\s\S]*?)\]/g) || [];
		for (const r of arrRanges) {
			const mm = /<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>\s*\[([\s\S]*?)\]/.exec(r);
			if (!mm) continue;
			const start = parseInt(mm[1], 16);
			const end = parseInt(mm[2], 16);
			const dests = mm[3].match(/<([0-9a-fA-F]+)>/g) || [];
			for (let code = start, k = 0; code <= end && k < dests.length; code++, k++) {
				const dm = /<([0-9a-fA-F]+)>/.exec(dests[k]);
				if (dm) map.set(code.toString(16), hexToUnicode(dm[1]));
			}
		}
		const ranges = m[1].match(/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>/g) || [];
		for (const r of ranges) {
			const mm = /<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>/.exec(r);
			if (!mm) continue;
			const start = parseInt(mm[1], 16);
			const end = parseInt(mm[2], 16);
			const base = parseInt(mm[3], 16);
			for (let code = start; code <= end; code++) {
				map.set(code.toString(16), String.fromCodePoint(base + (code - start)));
			}
		}
	}
	return map;
}

// ==================== 文本操作符提取 ====================

function decodeString(bytes: Uint8Array, fontObj: PdfObject | null): string {
	if (!bytes.length) return "";
	if (fontObj && fontObj.toUnicode) {
		const multi = /\/Subtype\s*\/Type0/.test(fontObj.dict);
		const step = multi ? 2 : 1;
		let out = "";
		let matched = 0;
		let total = 0;
		for (let i = 0; i + step <= bytes.length; i += step) {
			total++;
			let key = "";
			for (let k = 0; k < step; k++) key += bytes[i + k].toString(16).padStart(2, "0");
			const v = fontObj.toUnicode.get(key);
			if (v !== undefined && v !== "\uFFFD") {
				out += v;
				matched++;
			}
		}
		if (matched >= Math.ceil(total / 2)) return out;
	}
	if (looksUtf16be(bytes)) return decodeUtf16be(bytes);
	let out = "";
	for (const b of bytes) out += String.fromCharCode(b);
	return out;
}

/** 从内容流中提取文本：跟踪当前字体（Tf）与文本定位（Td/Tm/T*） */
function extractContentText(decoded: Uint8Array, fonts: Record<string, number>, objects: Map<number, PdfObject>): string {
	const s = new TextDecoder().decode(decoded);
	let fontNum: number | null = null;
	const out: string[] = [];
	let pendingSep = "";
	let i = 0;
	while (i < s.length) {
		const c = s[i];
		if (c === "(") {
			const parsed = parseValueAt(s, i);
			const rest = s.slice(parsed.end).match(/^\s*Tj\b/);
			if (rest) {
				if (pendingSep && out.length) out.push(pendingSep);
				pendingSep = "";
				out.push(decodeString(parenToBytes(parsed.value ?? ""), fontNum ? objects.get(fontNum) ?? null : null));
				i = parsed.end + rest[0].length;
			} else {
				i = parsed.end;
			}
			continue;
		}
		if (c === "<" && s[i + 1] !== "<") {
			const parsed = parseValueAt(s, i);
			const rest = s.slice(parsed.end).match(/^\s*Tj\b/);
			if (rest) {
				if (pendingSep && out.length) out.push(pendingSep);
				pendingSep = "";
				out.push(decodeString(hexBytes(parsed.value ?? ""), fontNum ? objects.get(fontNum) ?? null : null));
				i = parsed.end + rest[0].length;
			} else {
				i = parsed.end;
			}
			continue;
		}
		if (c === "[") {
			const parsed = parseValueAt(s, i);
			const rest = s.slice(parsed.end).match(/^\s*TJ\b/);
			if (rest) {
				if (pendingSep && out.length) out.push(pendingSep);
				pendingSep = "";
				const arrRe = /\(((?:\\.|[^()\\])*)\)|<([0-9a-fA-F\s]+)>/g;
				let am: RegExpExecArray | null;
				while ((am = arrRe.exec(parsed.value ?? "")) !== null) {
					const bytes = am[1] !== undefined ? parenToBytes(am[1]) : hexBytes(am[2] ?? "");
					out.push(decodeString(bytes, fontNum ? objects.get(fontNum) ?? null : null));
				}
				i = parsed.end + rest[0].length;
			} else {
				i = parsed.end;
			}
			continue;
		}
		const td = s.slice(i).match(/^([\d.-]+)\s+([\d.-]+)\s+Td\b/);
		if (td) {
			pendingSep = parseFloat(td[2]) !== 0 ? "\n" : " ";
			i += td[0].length;
			continue;
		}
		const tm = s.slice(i).match(/^[\d.-]+(\s+[\d.-]+)*\s*Tm\b/);
		if (tm) {
			pendingSep = "\n";
			i += tm[0].length;
			continue;
		}
		const tstar = s.slice(i).match(/^T\*\b/);
		if (tstar) {
			pendingSep = "\n";
			i += tstar[0].length;
			continue;
		}
		if (c === "/") {
			const nm = s.slice(i).match(/^\/([A-Za-z0-9+\-]+)\s+[\d.]+(\s+[\d.]+)*\s*Tf/);
			if (nm) {
				fontNum = fonts[nm[1]] ?? null;
				i += nm[0].length;
				continue;
			}
		}
		i++;
	}
	return out.join("").trim();
}

/** PDF 文本提取：解析对象与流，支持 Flate/ASCII85/ASCIIHex 过滤器链、Tj/TJ、ToUnicode 映射与中文 UTF-16BE */
async function extractPdfText(data: Uint8Array): Promise<string> {
	const src = bytesToString(data);
	const objects = new Map<number, PdfObject>();
	const objRe = /(\d+)\s+(\d+)\s+obj([\s\S]*?)endobj/g;
	let m: RegExpExecArray | null;
	while ((m = objRe.exec(src)) !== null) {
		const num = parseInt(m[1], 10);
		const body = m[3];
		const si = body.search(/stream[\r\n]/);
		if (si >= 0) {
			const dict = body.slice(0, si);
			const rm = /stream[\r\n]+([\s\S]*?)[\r\n]*endstream/.exec(body);
			const raw = rm ? rawBytes(rm[1]) : new Uint8Array(0);
			const decoded = await applyFilters(raw, getFilters(dict));
			objects.set(num, { dict, decoded });
		} else {
			objects.set(num, { dict: body });
		}
	}

	// 解析各字体的 ToUnicode 映射
	for (const obj of objects.values()) {
		if (/\/ToUnicode/.test(obj.dict)) {
			const refs = parseRefs(getValue(obj.dict, "ToUnicode") || "");
			const tuObj = refs.length ? objects.get(refs[0]) : null;
			if (tuObj && tuObj.decoded) obj.toUnicode = parseToUnicode(tuObj.decoded);
		}
	}

	// 页面 → 字体映射
	const pages: PdfObject[] = [];
	for (const obj of objects.values()) {
		if (/\/Type\s*\/Page\b/.test(obj.dict) && !/\/Type\s*\/Pages\b/.test(obj.dict)) pages.push(obj);
	}

	const results: string[] = [];
	for (const page of pages) {
		const resources = getValue(page.dict, "Resources");
		const fonts = resources ? parseFontPairs(getValue(resources, "Font") || "") : {};
		const contents = parseRefs(getValue(page.dict, "Contents") || "");
		for (const ref of contents) {
			const obj = objects.get(ref);
			if (obj && obj.decoded) results.push(extractContentText(obj.decoded, fonts, objects));
		}
	}

	// 兜底：扫描所有看起来像内容流的对象（页面结构解析失败时）
	if (!results.some((r) => r.trim())) {
		for (const obj of objects.values()) {
			if (!obj.decoded) continue;
			const s = new TextDecoder().decode(obj.decoded);
			if (/BT\b|Tf\b|Tj\b|TJ\b/.test(s)) results.push(extractContentText(obj.decoded, {}, objects));
		}
	}

	return results.filter((r) => r.trim()).join("\n");
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

function readU16(d: Uint8Array, o: number): number {
	return (d[o] | (d[o + 1] << 8)) & 0xffff;
}

function readU32(d: Uint8Array, o: number): number {
	return ((d[o] | (d[o + 1] << 8) | (d[o + 2] << 16) | (d[o + 3] << 24)) >>> 0);
}
