
export class BufferReader {

	public buffer: Buffer;
	public offset: number;

	constructor(buffer: Buffer, offset?: number) {
		this.buffer = buffer;
		this.offset = offset || 0;
	}

	public static read(buffer: Buffer, offset: number, length: number) {
		let a: any[] = [];
		let c = Math.ceil(length / 8);
		let l = Math.floor(offset / 8);
		const m = offset % 8;
		function t(n: number) {
			const r = [0, 0, 0, 0, 0, 0, 0, 0];
			for (let i = 7; i >= 0; i--) {
				r[7 - i] = n & Math.pow(2, i) ? 1 : 0;
			}
			a = a.concat(r);
		}
		function p(a: any[]) {
			let n = 0;
			const f = a.length - 1;
			for (let i = f; i >= 0; i--) { if (a[f - i]) n += Math.pow(2, i); }
			return n;
		}
		while (c--) t(buffer.readUInt8(l++));
		return p(a.slice(m, m + length));
	};


	public read(size: number) {
		const val = BufferReader.read(this.buffer, this.offset, size);
		this.offset += size;
		return val;
	};

}

export class BufferWriter {

	public buffer: number[];

	constructor() {
		this.buffer = [];
	}

	public write(d: number, size: number) {
		for (let i = 0; i < size; i++) {
			this.buffer.push((d & Math.pow(2, size - i - 1)) ? 1 : 0);
		}
	}

	public writeBuffer(b: BufferWriter) {
		this.buffer = this.buffer.concat(b.buffer);
	}

	public toBuffer() {
		const arr = [];
		for (let i = 0; i < this.buffer.length; i += 8) {
			const chunk = this.buffer.slice(i, i + 8);
			arr.push(parseInt(chunk.join(''), 2));
		}
		return Buffer.from(arr);
	};
}

