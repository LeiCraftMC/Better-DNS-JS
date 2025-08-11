import { debuglog } from 'util';
import { BufferReader, BufferWriter } from './buffer-utils';

const debug = debuglog('dns2');

export const toIPv6 = (buffer: any) => buffer
	.map((part: any) => (part > 0 ? part.toString(16) : '0'))
	.join(':')
	.replace(/\b(?:0+:){1,}/, ':');

export const fromIPv6 = (address: string) => {
	const digits = address.split(':');
	// CAVEAT edge case for :: and IPs starting
	// or ending by ::
	if (digits[0] === '') {
		digits.shift();
	}
	if (digits[digits.length - 1] === '') {
		digits.pop();
	}
	// node js 10 does not support Array.prototype.flatMap
	if (!Array.prototype.flatMap) {
		// eslint-disable-next-line no-extend-native
		Array.prototype.flatMap = function (f, ctx: any) {
			return this.reduce((r, x, i, a) => r.concat(f.call(ctx, x, i, a)), []);
		};
	}

	// CAVEAT we have to take into account
	// the extra space used by the empty string
	const missingFields = 8 - digits.length + 1;
	return digits.flatMap((digit) => {
		if (digit === '') {
			return Array(missingFields).fill('0');
		}
		return digit.padStart(4, '0');
	});
};


export class Packet {

	public header: Packet.Header;
	public questions: Packet.Question[];
	public answers: Packet.Resource[];
	public authorities: Packet.Resource[];
	public additionals: Packet.Resource[];

	constructor(data?: any) {
		//@ts-ignore
		this.header = {};
		this.questions = [];
		this.answers = [];
		this.authorities = [];
		this.additionals = [];
		if (data instanceof Packet) {
			return data;
		} else if (data instanceof Packet.Header) {
			this.header = data;
		} else if (data instanceof Packet.Question) {
			this.questions.push(data);
		} else if (data instanceof Packet.Resource) {
			this.answers.push(data);
		} else if (typeof data === 'string') {
			//@ts-ignore
			this.questions.push(data);
		} else if (typeof data === 'object') {
			//@ts-ignore
			const type = ({}).toString.call(data).match(/\[object (\w+)\]/)[1];
			if (type === 'Array') {
				this.questions = data;
			}
			if (type === 'Object') {
				this.header = data;
			}
		}
	}

	static uuid() {
		return Math.floor(Math.random() * 1e5);
	}

	static parse(buffer: Buffer) {
		const packet = new Packet();
		const reader = new BufferReader(buffer);
		packet.header = Packet.Header.parse(reader);
		([ // props             parser              count
			['questions', Packet.Question, packet.header.qdcount],
			['answers', Packet.Resource, packet.header.ancount],
			['authorities', Packet.Resource, packet.header.nscount],
			['additionals', Packet.Resource, packet.header.arcount],
		]).forEach(function (def) {
			const section = def[0];
			const decoder = def[1];
			let count = def[2] as number;
			while (count--) {
				try { //@ts-ignore
					packet[section] = packet[section] || []; //@ts-ignore
					packet[section].push(decoder.parse(reader));
				} catch (e: any) {
					debug('node-dns > parse %s error:', section, e.message);
				}
			}
		});
		return packet;
	}

	get recursive(): boolean {
		return !!this.header.rd;
	}

	set recursive(value: boolean) {
		this.header.rd = value ? 1 : 0;
	}

	public toBuffer(writer?: BufferWriter) {
		writer = writer || new BufferWriter();
		this.header.qdcount = this.questions.length;
		this.header.ancount = this.answers.length;
		this.header.nscount = this.authorities.length;
		this.header.arcount = this.additionals.length;
		if (!(this instanceof Packet.Header)) { this.header = new Packet.Header(this.header); }
		this.header.toBuffer(writer);
		([ // section          encoder
			['questions', Packet.Question],
			['answers', Packet.Resource],
			['authorities', Packet.Resource],
			['additionals', Packet.Resource],
		]).forEach(function (def: any) {
			const section = def[0];
			const Encoder = def[1];
			// @ts-ignore
			(this[section] || []).map(function (resource: any) {
				return Encoder.encode(resource, writer);
			});
		}.bind(this));
		return writer.toBuffer();
	};


	static createResponseFromRequest(request) {
		const response = new Packet(request);
		response.header.qr = 1;
		response.additionals = [];
		return response;
	};

	static createResourceFromQuestion(base, record) {
		const resource = new Packet.Resource(base);
		Object.assign(resource, record);
		return resource;
	};

	static readStream(socket) {
		let chunks: any[] = [];
		let chunklen = 0;
		let received = false;
		let expected = false;
		return new Promise((resolve, reject) => {
			const processMessage = () => {
				if (received) return;
				received = true;
				const buffer = Buffer.concat(chunks, chunklen);
				resolve(buffer.subarray(2));
			};
			socket.on('end', processMessage);
			socket.on('error', reject);
			socket.on('readable', () => {
				let chunk;
				while ((chunk = socket.read()) !== null) {
					chunks.push(chunk);
					chunklen += chunk.length;
				}
				if (!expected && chunklen >= 2) {
					if (chunks.length > 1) {
						chunks = [Buffer.concat(chunks, chunklen)];
					}
					expected = chunks[0].readUInt16BE(0);
				}

				if (chunklen >= 2 + (expected as number)) {
					processMessage();
				}
			});
		});
	};

	public toBase64URL() {
		const buffer = this.toBuffer();
		const base64 = buffer.toString('base64');
		return base64
			.replace(/=/g, '')
			.replace(/\+/g, '-')
			.replace(/\//g, '_');
	};

}

// /**
//  * recursive
//  */
// Object.defineProperty(Packet.prototype, 'recursive', {
// 	enumerable: true,
// 	configurable: true,
// 	get() {
// 		return !!this.header.rd;
// 	},
// 	set(yn) {
// 		this.header.rd = +yn;
// 		return this.header.rd;
// 	},
// });


export namespace Packet {

	export const TYPE = {
		A      : 0x01,
		NS     : 0x02,
		MD     : 0x03,
		MF     : 0x04,
		CNAME  : 0x05,
		SOA    : 0x06,
		MB     : 0x07,
		MG     : 0x08,
		MR     : 0x09,
		NULL   : 0x0A,
		WKS    : 0x0B,
		PTR    : 0x0C,
		HINFO  : 0x0D,
		MINFO  : 0x0E,
		MX     : 0x0F,
		TXT    : 0x10,
		AAAA   : 0x1C,
		SRV    : 0x21,
		EDNS   : 0x29,
		SPF    : 0x63,
		AXFR   : 0xFC,
		MAILB  : 0xFD,
		MAILA  : 0xFE,
		ANY    : 0xFF,
		CAA    : 0x101,
		DNSKEY : 0x30
	};

	export const CLASS = {
		IN: 0x01,
		CS: 0x02,
		CH: 0x03,
		HS: 0x04,
		ANY: 0xFF,
	};

	export const EDNS_OPTION_CODE = {
		ECS: 0x08,
	};


	export class Header {

		public id: number;
		public qr: number;
		public opcode: number;
		public aa: number;
		public tc: number;
		public rd: number;
		public ra: number;
		public z: number;
		public rcode: number;
		public qdcount: number;
		//@ts-ignore
		public ancount: number;
		public nscount: number;
		public arcount: number;

		constructor(header?: Partial<Header>) {
			this.id = 0;
			this.qr = 0;
			this.opcode = 0;
			this.aa = 0;
			this.tc = 0;
			this.rd = 0;
			this.ra = 0;
			this.z = 0;
			this.rcode = 0;
			this.qdcount = 0;
			this.nscount = 0;
			this.arcount = 0;
			for (const k in header) {
				// @ts-ignore
				this[k] = header[k];
			}
		}

		static parse(reader: BufferReader | Buffer) {
			const header = new Packet.Header();
			if (reader instanceof Buffer) {
				reader = new BufferReader(reader);
			}
			header.id = (reader as BufferReader).read(16);
			header.qr = (reader as BufferReader).read(1);
			header.opcode = (reader as BufferReader).read(4);
			header.aa = (reader as BufferReader).read(1);
			header.tc = (reader as BufferReader).read(1);
			header.rd = (reader as BufferReader).read(1);
			header.ra = (reader as BufferReader).read(1);
			header.z = (reader as BufferReader).read(3);
			header.rcode = (reader as BufferReader).read(4);
			header.qdcount = (reader as BufferReader).read(16);
			header.ancount = (reader as BufferReader).read(16);
			header.nscount = (reader as BufferReader).read(16);
			header.arcount = (reader as BufferReader).read(16);
			return header;
		};

		public toBuffer(writer?: BufferWriter) {
			writer = writer || new BufferWriter();
			writer.write(this.id, 16);
			writer.write(this.qr, 1);
			writer.write(this.opcode, 4);
			writer.write(this.aa, 1);
			writer.write(this.tc, 1);
			writer.write(this.rd, 1);
			writer.write(this.ra, 1);
			writer.write(this.z, 3);
			writer.write(this.rcode, 4);
			writer.write(this.qdcount, 16);
			writer.write(this.ancount, 16);
			writer.write(this.nscount, 16);
			writer.write(this.arcount, 16);
			return writer.toBuffer();
		};

	}

	export class Question {

		//@ts-ignore
		public name: string;
		//@ts-ignore
		public type: number;
		//@ts-ignore
		public class: number;

		constructor(name?: any, type?: number, cls?: number) {
			const defaults = {
				type: Packet.TYPE.ANY,
				class: Packet.CLASS.ANY,
			};
			if (typeof name === 'object') {
				for (const k in name) {
					//@ts-ignore
					this[k] = name[k] || defaults[k];
				}
			} else {
				this.name = name;
				this.type = type || defaults.type;
				this.class = cls || defaults.class;
			}
		}

		public toBuffer(writer?: BufferWriter) {
			return Packet.Question.encode(this, writer);
		}

		static parse(reader: BufferReader | Buffer) {
			const question = new Packet.Question();
			if (reader instanceof Buffer) {
				reader = new BufferReader(reader);
			}
			question.name = Packet.Name.decode(reader);
			question.type = (reader as BufferReader).read(16);
			question.class = (reader as BufferReader).read(16);
			return question;
		};

		static decode(reader: BufferReader | Buffer) {
			return Packet.Question.parse(reader);
		}

		static encode(question: Packet.Question, writer?: BufferWriter) {
			writer = writer || new BufferWriter();
			Packet.Name.encode(question.name, writer);
			writer.write(question.type, 16);
			writer.write(question.class, 16);
			return writer.toBuffer();
		};

	}

	export class Resource {

		//@ts-ignore
		public name: string;
		//@ts-ignore
		public type: number;
		//@ts-ignore
		public class: number;
		//@ts-ignore
		public ttl: number;
		//@ts-ignore
		public data: Buffer;

		constructor(name?: any, type?: number, cls?: number, ttl?: number) {
			const defaults = {
				name: '',
				ttl: 300,
				type: Packet.TYPE.ANY,
				class: Packet.CLASS.ANY,
			};
			let input;
			if (typeof name === 'object') {
				input = name;
			} else {
				input = {
					name, type, class: cls, ttl,
				};
			}
			Object.assign(this, defaults, input);
		}

		public toBuffer(writer?: BufferWriter) {
			return Packet.Resource.encode(this, writer);
		}

		static encode(resource: Packet.Resource, writer?: BufferWriter) {
			writer = writer || new BufferWriter();
			Packet.Name.encode(resource.name, writer);
			writer.write(resource.type, 16);
			writer.write(resource.class, 16);
			writer.write(resource.ttl, 32);
			const encoder = Object.keys(Packet.TYPE).filter(function (type) {
				return resource.type === (Packet.TYPE as any)[type] as number;
			})[0];
			if (encoder in Packet.Resource && (Packet.Resource as any)[encoder].encode) {
				return (Packet.Resource as any)[encoder].encode(resource, writer);
			} else {
				debug('node-dns > unknown encoder %s(%j)', encoder, resource.type);
			}
		}

		static parse(reader: BufferReader | Buffer) {
			if (reader instanceof Buffer) {
				reader = new BufferReader(reader);
			}
			let resource = new Packet.Resource();
			resource.name = Packet.Name.decode(reader);
			resource.type = (reader as BufferReader).read(16);
			resource.class = (reader as BufferReader).read(16);
			resource.ttl = (reader as BufferReader).read(32);
			let length = (reader as BufferReader).read(16);
			const parser = Object.keys(Packet.TYPE).filter(function (type) {
				return resource.type === (Packet.TYPE as any)[type] as number;
			})[0];
			if (parser in Packet.Resource) {
				resource = (Packet.Resource as any)[parser].decode.call(resource, reader, length);
			} else {
				debug('node-dns > unknown parser type: %s(%j)', parser, resource.type);
				const arr = [];
				while (length--) arr.push((reader as BufferReader).read(8));
				resource.data = Buffer.from(arr);
			}
			return resource;
		}

		static decode(reader: BufferReader | Buffer) {
			return Packet.Resource.parse(reader);
		}

	}

	export class Name {

		static readonly COPY = 0xc0;

		static decode(reader: BufferReader | Buffer) {
			if (reader instanceof Buffer) {
				reader = new BufferReader(reader);
			}
			const name = []; let o; let len = (reader as BufferReader).read(8);
			while (len) {
				if ((len & Packet.Name.COPY) === Packet.Name.COPY) {
					len -= Packet.Name.COPY;
					len = len << 8;
					const pos = len + (reader as BufferReader).read(8);
					if (!o) o = (reader as BufferReader).offset;
					(reader as BufferReader).offset = pos * 8;
					len = (reader as BufferReader).read(8);
					continue;
				} else {
					let part = '';
					while (len--) part += String.fromCharCode((reader as BufferReader).read(8));
					name.push(part);
					len = (reader as BufferReader).read(8);
				}
			}
			if (o) (reader as BufferReader).offset = o;
			return name.join('.');
		}

		static encode(domain: string, writer?: BufferWriter) {
			writer = writer || new BufferWriter();
			// TODO: domain name compress
			(domain || '').split('.').filter(function (part) {
				return !!part;
			}).forEach(function (part) {
				writer.write(part.length, 8);
				part.split('').map(function (c) {
					writer.write(c.charCodeAt(0), 8);
					return c.charCodeAt(0);
				});
			});
			writer.write(0, 8);
			return writer.toBuffer();
		}

	}

}

export namespace Packet.Resource {
	
	export class A {

		public type: number;
		public class: number;
		public address: string;

		constructor(address: string) {
			this.type = Packet.TYPE.A;
			this.class = Packet.CLASS.IN;
			this.address = address;
		}

		static encode(record: Packet.Resource.A, writer?: BufferWriter) {
			writer = writer || new BufferWriter();
			const parts = record.address.split('.');
			writer.write(parts.length, 16);
			parts.forEach(function (part) {
				writer.write(parseInt(part, 10), 8);
			});
			return writer.toBuffer();
		};

		static decode(reader: BufferReader, length: number) {
			const parts = [];
			while (length--) parts.push(reader.read(8));
			const address = parts.join('.')
			return new Packet.Resource.A(address);
		};

	}

	export class MX {

		public type: number;
		public class: number;
		public exchange: string;
		public priority: number;

		constructor(exchange: string, priority: number) {
			this.type = Packet.TYPE.MX;
			this.class = Packet.CLASS.IN;
			this.exchange = exchange;
			this.priority = priority;
		}

		static encode(record: Packet.Resource.MX, writer?: BufferWriter) {
			writer = writer || new BufferWriter();
			const len = Packet.Name.encode(record.exchange).length;
			writer.write(len + 2, 16);
			writer.write(record.priority, 16);
			Packet.Name.encode(record.exchange, writer);
			return writer.toBuffer();
		};

		static decode(reader: BufferReader, length: number) {
			const priority = reader.read(16);
			const exchange = Packet.Name.decode(reader);
			return new Packet.Resource.MX(exchange, priority);
		};

	}

	export class AAAA {

		public type: number;
		public class: number;
		public address: string;

		constructor(address: string) {
			this.type = Packet.TYPE.AAAA;
			this.class = Packet.CLASS.IN;
			this.address = address;
		}

		static encode(record: Packet.Resource.AAAA, writer?: BufferWriter) {
			writer = writer || new BufferWriter();
			const parts = fromIPv6(record.address);
			writer.write(parts.length * 2, 16);
			parts.forEach(function (part) {
				writer.write(parseInt(part, 16), 16);
			});
			return writer.toBuffer();
		}

		static decode(reader: BufferReader, length: number) {
			const parts = [];
			while (length) {
				length -= 2;
				parts.push(reader.read(16));
			}
			const address = toIPv6(parts);
			return new Packet.Resource.AAAA(address);
		}

	}
	
	export class NS {
		public type: number;
		public class: number;
		public ns: string;

		constructor(ns: string) {
			this.type = Packet.TYPE.NS;
			this.class = Packet.CLASS.IN;
			this.ns = ns;
		}

		static decode(reader: BufferReader, length: number) {
			const resource = new NS('');
			resource.ns = Packet.Name.decode(reader);
			return resource;
		}

		static encode(record: Packet.Resource.NS, writer?: BufferWriter) {
			writer = writer || new BufferWriter();
			writer.write(Packet.Name.encode(record.ns).length, 16);
			Packet.Name.encode(record.ns, writer);
			return writer.toBuffer();
		}
	}

	export class CNAME {
		public type: number;
		public class: number;
		public domain: string;

		constructor(domain: string) {
			this.type = Packet.TYPE.CNAME;
			this.class = Packet.CLASS.IN;
			this.domain = domain;
		}

		static decode(reader: BufferReader, length: number) {
			const resource = new CNAME('');
			resource.domain = Packet.Name.decode(reader);
			return resource;
		}

		static encode(record: Packet.Resource.CNAME, writer?: BufferWriter) {
			writer = writer || new BufferWriter();
			writer.write(Packet.Name.encode(record.domain).length, 16);
			Packet.Name.encode(record.domain, writer);
			return writer.toBuffer();
		}
	}

	export class PTR extends CNAME {
		constructor(domain: string) {
			super(domain);
			this.type = Packet.TYPE.PTR;
		}

		static decode = CNAME.decode;
		static encode = CNAME.encode;
	}

	export class TXT {
		public type: number;
		public class: number;
		public data: string | string[];

		constructor(data: string | string[]) {
			this.type = Packet.TYPE.TXT;
			this.class = Packet.CLASS.IN;
			this.data = data;
		}

		static decode(reader: BufferReader, length: number) {
			const resource = new TXT('');
			const parts = [];
			let bytesRead = 0, chunkLength = 0;

			while (bytesRead < length) {
				chunkLength = reader.read(8);
				bytesRead++;

				while (chunkLength--) {
					parts.push(reader.read(8));
					bytesRead++;
				}
			}

			resource.data = Buffer.from(parts).toString('utf8');
			return resource;
		}

		static encode(record: Packet.Resource.TXT, writer?: BufferWriter) {
			writer = writer || new BufferWriter();

			const characterStrings = Array.isArray(record.data) ? record.data : [record.data];
			const characterStringBuffers = characterStrings.map(function(characterString) {
				if (Buffer.isBuffer(characterString)) {
					return characterString;
				}
				if (typeof characterString === 'string') {
					return Buffer.from(characterString, 'utf8');
				}
				return false;
			}).filter(Boolean);

			const bufferLength = characterStringBuffers.reduce(function(sum, characterStringBuffer) {
				return sum + characterStringBuffer.length;
			}, 0);

			writer.write(bufferLength + characterStringBuffers.length, 16);

			characterStringBuffers.forEach(function(buffer) {
				writer.write(buffer.length, 8);
				buffer.forEach(function(c) {
					writer.write(c, 8);
				});
			});

			return writer.toBuffer();
		}
	}

	export class SPF extends TXT {
		constructor(data: string | string[]) {
			super(data);
			this.type = Packet.TYPE.SPF;
		}

		static decode = TXT.decode;
		static encode = TXT.encode;
	}

	export class SOA {
		public type: number;
		public class: number;
		public primary: string;
		public admin: string;
		public serial: number;
		public refresh: number;
		public retry: number;
		public expiration: number;
		public minimum: number;

		constructor(primary: string, admin: string, serial: number, refresh: number, retry: number, expiration: number, minimum: number) {
			this.type = Packet.TYPE.SOA;
			this.class = Packet.CLASS.IN;
			this.primary = primary;
			this.admin = admin;
			this.serial = serial;
			this.refresh = refresh;
			this.retry = retry;
			this.expiration = expiration;
			this.minimum = minimum;
		}

		static decode(reader: BufferReader, length: number) {
			const primary = Packet.Name.decode(reader);
			const admin = Packet.Name.decode(reader);
			const serial = reader.read(32);
			const refresh = reader.read(32);
			const retry = reader.read(32);
			const expiration = reader.read(32);
			const minimum = reader.read(32);
			
			return new SOA(primary, admin, serial, refresh, retry, expiration, minimum);
		}

		static encode(record: Packet.Resource.SOA, writer?: BufferWriter) {
			writer = writer || new BufferWriter();
			let len = 0;
			len += Packet.Name.encode(record.primary).length;
			len += Packet.Name.encode(record.admin).length;
			len += (32 * 5) / 8;
			
			writer.write(len, 16);
			Packet.Name.encode(record.primary, writer);
			Packet.Name.encode(record.admin, writer);
			writer.write(record.serial, 32);
			writer.write(record.refresh, 32);
			writer.write(record.retry, 32);
			writer.write(record.expiration, 32);
			writer.write(record.minimum, 32);
			
			return writer.toBuffer();
		}
	}

	export class SRV {
		public type: number;
		public class: number;
		public priority: number;
		public weight: number;
		public port: number;
		public target: string;

		constructor(target: string, priority: number, weight: number, port: number) {
			this.type = Packet.TYPE.SRV;
			this.class = Packet.CLASS.IN;
			this.target = target;
			this.priority = priority;
			this.weight = weight;
			this.port = port;
		}

		static decode(reader: BufferReader, length: number) {
			const priority = reader.read(16);
			const weight = reader.read(16);
			const port = reader.read(16);
			const target = Packet.Name.decode(reader);
			
			return new SRV(target, priority, weight, port);
		}

		static encode(record: Packet.Resource.SRV, writer?: BufferWriter) {
			writer = writer || new BufferWriter();
			const { length } = Packet.Name.encode(record.target);
			
			writer.write(length + 6, 16);
			writer.write(record.priority, 16);
			writer.write(record.weight, 16);
			writer.write(record.port, 16);
			Packet.Name.encode(record.target, writer);
			
			return writer.toBuffer();
		}
	}

	export class EDNS {
		public type: number;
		public class: number;
		public ttl: number;
		public rdata: any[];

		constructor(rdata: any[] = []) {
			this.type = Packet.TYPE.EDNS;
			this.class = 512; // Supported UDP Payload size
			this.ttl = 0; // Extended RCODE and flags
			this.rdata = rdata;
		}

		static decode(reader: BufferReader, length: number) {
			const resource = new EDNS();
			
			while (length) {
				const optionCode = reader.read(16);
				const optionLength = reader.read(16);

				const decoder = Object.keys(Packet.EDNS_OPTION_CODE).filter(function(type) {
					return optionCode === Packet.EDNS_OPTION_CODE[type];
				})[0];
				
				if (decoder in Packet.Resource.EDNS && Packet.Resource.EDNS[decoder].decode) {
					const rdata = Packet.Resource.EDNS[decoder].decode(reader, optionLength);
					resource.rdata.push(rdata);
				} else {
					reader.read(optionLength); // Ignore data that doesn't understand
					debug('node-dns > unknown EDNS rdata decoder %s(%j)', decoder, optionCode);
				}

				length = length - 4 - optionLength;
			}
			
			return resource;
		}

		static encode(record: Packet.Resource.EDNS, writer?: BufferWriter) {
			const rdataWriter = new BufferWriter();
			
			for (const rdata of record.rdata) {
				const encoder = Object.keys(Packet.EDNS_OPTION_CODE).filter(function(type) {
					return rdata.ednsCode === Packet.EDNS_OPTION_CODE[type];
				})[0];
				
				if (encoder in Packet.Resource.EDNS && Packet.Resource.EDNS[encoder].encode) {
					const w = new BufferWriter();
					Packet.Resource.EDNS[encoder].encode(rdata, w);
					rdataWriter.write(rdata.ednsCode, 16);
					rdataWriter.write(w.buffer.length / 8, 16);
					rdataWriter.writeBuffer(w);
				} else {
					debug('node-dns > unknown EDNS rdata encoder %s(%j)', encoder, rdata.ednsCode);
				}
			}
			
			writer = writer || new BufferWriter();
			writer.write(rdataWriter.buffer.length / 8, 16);
			writer.writeBuffer(rdataWriter);
			
			return writer.toBuffer();
		}

		static ECS = class {
			public ednsCode: number;
			public family: number;
			public sourcePrefixLength: number;
			public scopePrefixLength: number;
			public ip: string;

			constructor(clientIp: string) {
				const [ip, prefixLength] = clientIp.split('/');
				const numPrefixLength = parseInt(prefixLength) || 32;
				
				this.ednsCode = Packet.EDNS_OPTION_CODE.ECS;
				this.family = 1;
				this.sourcePrefixLength = numPrefixLength;
				this.scopePrefixLength = 0;
				this.ip = ip;
			}

			static decode(reader: BufferReader, length: number) {
				const rdata = new EDNS.ECS('0.0.0.0');
				
				rdata.family = reader.read(16);
				rdata.sourcePrefixLength = reader.read(8);
				rdata.scopePrefixLength = reader.read(8);
				length -= 4;

				if (rdata.family === 1) {
					const ipv4Octets = [];
					while (length--) {
						const octet = reader.read(8);
						ipv4Octets.push(octet);
					}
					while (ipv4Octets.length < 4) {
						ipv4Octets.push(0);
					}
					rdata.ip = ipv4Octets.join('.');
				}

				if (rdata.family === 2) {
					const ipv6Segments = [];
					for (; length; length -= 2) {
						const segment = reader.read(16).toString(16);
						ipv6Segments.push(segment);
					}
					while (ipv6Segments.length < 8) {
						ipv6Segments.push('0');
					}
					rdata.ip = ipv6Segments.join(':');
				}

				return rdata;
			}

			static encode(record: EDNS.ECS, writer?: BufferWriter) {
				writer = writer || new BufferWriter();
				const ip = record.ip.split('.').map(s => parseInt(s));
				
				writer.write(record.family, 16);
				writer.write(record.sourcePrefixLength, 8);
				writer.write(record.scopePrefixLength, 8);
				writer.write(ip[0], 8);
				writer.write(ip[1], 8);
				writer.write(ip[2], 8);
				writer.write(ip[3], 8);
				
				return writer.toBuffer();
			}
		}
	}

	export class CAA {
		public type: number;
		public class: number;
		public flags: number;
		public tag: string;
		public value: string;

		constructor(flags: number, tag: string, value: string) {
			this.type = Packet.TYPE.CAA;
			this.class = Packet.CLASS.IN;
			this.flags = flags;
			this.tag = tag;
			this.value = value;
		}

		static encode(record: Packet.Resource.CAA, writer?: BufferWriter) {
			writer = writer || new BufferWriter();

			const buffer = Buffer.from(record.tag + record.value, 'utf8');
			writer.write(2 + buffer.length, 16);
			writer.write(record.flags, 8);
			writer.write(record.tag.length, 8);

			buffer.forEach(function(c) {
				writer.write(c, 8);
			});
			
			return writer.toBuffer();
		}
	}

	export class DNSKEY {
		public type: number;
		public class: number;
		public flags: number;
		public protocol: number;
		public algorithm: number;
		public keyTag: number;
		public zoneKey: boolean;
		public zoneSep: boolean;
		public key: string;

		constructor(flags: number, protocol: number, algorithm: number, key: string) {
			this.type = Packet.TYPE.DNSKEY;
			this.class = Packet.CLASS.IN;
			this.flags = flags;
			this.protocol = protocol;
			this.algorithm = algorithm;
			this.key = key;
			
			// Set derived properties
			let binFlags = this.flags.toString(2);
			while (binFlags.length < 16) {
				binFlags = '0' + binFlags;
			}
			this.zoneKey = binFlags[7] === '1';
			this.zoneSep = binFlags[15] === '1';
			
			// Calculate key tag
			const buffer = Buffer.from(this.key, 'base64');
			let ac = 0;
			for (let i = 0; i < buffer.length; ++i) {
				ac += (i & 1) ? buffer[i] : buffer[i] << 8;
			}
			ac += (ac >> 16) & 0xFFFF;
			this.keyTag = ac & 0XFFFF;
		}

		static decode(reader: BufferReader, length: number) {
			const RData = [];
			while (RData.length < length) {
				RData.push(reader.read(8));
			}
			
			const flags = RData[0] << 8 | RData[1];
			const protocol = RData[2];
			const algorithm = RData[3];
			const key = Buffer.from(RData.slice(4)).toString('base64');
			
			const resource = new DNSKEY(flags, protocol, algorithm, key);
			
			// Compute key tag
			let ac = 0;
			for (let i = 0; i < length; ++i) {
				ac += (i & 1) ? RData[i] : RData[i] << 8;
			}
			ac += (ac >> 16) & 0xFFFF;
			resource.keyTag = ac & 0XFFFF;
			
			return resource;
		}

		static encode(record: Packet.Resource.DNSKEY, writer?: BufferWriter) {
			writer = writer || new BufferWriter();
			const buffer = Buffer.from(record.key, 'base64');
			
			writer.write(4 + buffer.length, 16);
			writer.write(record.flags, 16);
			writer.write(record.protocol, 8);
			writer.write(record.algorithm, 8);
			
			buffer.forEach(function(c) {
				writer.write(c, 8);
			});
			
			return writer.toBuffer();
		}
	}

	export class RRSIG {
		public type: number;
		public class: number;
		public sigType: number;
		public algorithm: number;
		public labels: number;
		public originalTtl: number;
		public expiration: string;
		public inception: string;
		public keyTag: number;
		public signer: string;
		public signature: string;

		constructor(sigType: number, algorithm: number, labels: number, originalTtl: number, 
					expiration: string, inception: string, keyTag: number, signer: string, signature: string) {
			this.type = Packet.TYPE.RRSIG;
			this.class = Packet.CLASS.IN;
			this.sigType = sigType;
			this.algorithm = algorithm;
			this.labels = labels;
			this.originalTtl = originalTtl;
			this.expiration = expiration;
			this.inception = inception;
			this.keyTag = keyTag;
			this.signer = signer;
			this.signature = signature;
		}

		static decode(reader: BufferReader, length: number) {
			function dateForSig(date: number) {
				date = new Date(date * 1000);
				const definitions = {
					month: (date.getUTCMonth() + 1),
					date: date.getUTCDate(),
					hour: date.getUTCHours(),
					minutes: date.getUTCMinutes(),
					seconds: date.getUTCSeconds(),
				};
				
				for (const key in definitions) {
					if (definitions[key] < 10) {
						definitions[key] = '0' + '' + definitions[key];
					}
				}
				
				return date.getFullYear() + '' +
					definitions.month + '' +
					definitions.date + '' +
					definitions.hour + '' +
					definitions.minutes + '' +
					definitions.seconds;
			}

			const maxOffset = reader.offset + (length * 8);
			
			const sigType = reader.read(16);
			const algorithm = reader.read(8);
			const labels = reader.read(8);
			const originalTtl = reader.read(32);
			const expiration = dateForSig(reader.read(32));
			const inception = dateForSig(reader.read(32));
			const keyTag = reader.read(16);
			const signer = Packet.Name.decode(reader);
			
			const maxLength = (maxOffset - reader.offset) / 8;
			const signatureBytes = [];
			while (signatureBytes.length < maxLength) {
				signatureBytes.push(reader.read(8));
			}
			const signature = Buffer.from(signatureBytes).toString('base64');
			
			return new RRSIG(sigType, algorithm, labels, originalTtl, expiration, inception, keyTag, signer, signature);
		}
	}
}
