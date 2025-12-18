/// <reference types="node" />

import * as udp from "dgram";
import { EventEmitter } from "events";
import * as net from "net";
import type { BufferWriter } from "./lib/writer";
import type { BufferReader } from "./lib/reader";

export declare class Packet {

    readonly header: Packet.Header;
    readonly questions: Packet.IQuestion[];
    readonly answers: Packet.IResource[];
    readonly authorities: Packet.IResource[];
    readonly additionals: Packet.IResource[];

    constructor();
    constructor(packet: Packet);
    constructor(header: Packet.Header);
    constructor(questios: Packet.Question);
    constructor(answer: Packet.Resource);

    static createResponseFromRequest(request: DNS.Packet): DNS.Packet;
    
    toBuffer(): Buffer;
}

export declare namespace Packet {

    const OPCODE: {
        readonly QUERY: 0x00;
        readonly IQUERY: 0x01;
        readonly STATUS: 0x02;
        readonly NOTIFY: 0x04;
        readonly UPDATE: 0x05;
        readonly DSO: 0x06;
    }

    const TYPE: {
        readonly A: 0x01;
        readonly NS: 0x02;
        // readonly MD: 0x03;
        // readonly MF: 0x04;
        readonly CNAME: 0x05;
        readonly SOA: 0x06;
        // readonly MB: 0x07;
        // readonly MG: 0x08;
        // readonly MR: 0x09;
        // readonly NULL: 0x0a;
        // readonly WKS: 0x0b;
        readonly PTR: 0x0c;
        // readonly HINFO: 0x0d;
        // readonly MINFO: 0x0e;
        readonly MX: 0x0f;
        readonly TXT: 0x10;
        readonly AAAA: 0x1c;
        readonly SRV: 0x21;
        readonly EDNS: 0x29;
        readonly SPF: 0x63;
        readonly AXFR: 0xfc;
        readonly IXFR: 0xfb;
        // readonly MAILB: 0xfd;
        // readonly MAILA: 0xfe;
        readonly ANY: 0xff;
        readonly CAA: 0x101;
    };

    const CLASS: {
        readonly IN: 0x01;
        readonly CS: 0x02;
        readonly CH: 0x03;
        readonly HS: 0x04;
        readonly ANY: 0xff;
    };

    declare type Writer = BufferWriter;
    declare const Writer: typeof BufferWriter;
    declare type Reader = BufferReader;
    declare const Reader: typeof BufferReader;

    declare interface IHeader {
        id: number;
        qr: number;
        opcode: number;
        aa: number;
        tc: number;
        rd: number;
        ra: number;
        z: number;
        rcode: number;
        qdcount: number;
        nscount: number;
        arcount: number;
    }
    class Header implements Packet.IHeader {
        id: number;
        qr: number;
        opcode: number;
        aa: number;
        tc: number;
        rd: number;
        ra: number;
        z: number;
        rcode: number;
        qdcount: number;
        nscount: number;
        arcount: number;

        constructor(header: Partial<Packet.Header>);

        static parse(buffer: Buffer | Packet.Reader): Packet.Header;

        public toBuffer(writer?: Packet.Writer): Buffer;
    }

    declare interface IQuestion {
        name: string;
        type: DNS.PacketType;
        class: DNS.PacketClass;
    }
    declare class Question implements IQuestion {
        name: string;
        type: DNS.PacketType;
        class: DNS.PacketClass;

        constructor(name: string, type: DNS.PacketClass, cls: DNS.PacketType);
        constructor(question: Question);

        toBuffer(writer?: Packet.Writer): Buffer;

        static parse(buffer: Buffer | Packet.Reader): Question;
        static decode(buffer: Buffer | Packet.Reader): Question;
        static encode(question: Question, writer?: Packet.Writer): Buffer;
    }

    declare interface IResource {
        name: string;
        ttl: number;
        type: DNS.PacketType;
        class: DNS.PacketClass;
    }
    declare class Resource implements IResource {
        name: string;
        ttl: number;
        type: DNS.PacketType;
        class: DNS.PacketClass;

        constructor(name: string, type: DNS.PacketClass, cls: DNS.PacketType, ttl: number);
        constructor(resource: Resource);

        toBuffer(writer?: Packet.Writer): Buffer;

        static parse(buffer: Buffer | Packet.Reader): Resource;
        static decode(buffer: Buffer | Packet.Reader): Resource;
        static encode(resource: Resource, writer?: Packet.Writer): Buffer;
    }

}

declare namespace DNS {
    interface DnsClientOptions {
        port: number;
        retries: number;
        timeout: number;
        recursive: boolean;
        resolverProtocol: "UDP" | "TCP" | "DOH" | "Google";
        nameServers: string[];
        rootServers: string[];
    }

    /**
     * @deprecated Use DNS.Packet instead
     */
    interface DnsRequest extends Packet {
        // header: { id: string };
        // questions: DnsQuestion[];
    }

    /**
     * @deprecated Use DNS.Packet.Question instead
     */
    interface DnsQuestion {
        name: string;
    }

    /**
     * @deprecated Use DNS.Packet instead
     */
    interface DnsResponse extends Packet {
        // answers: DnsAnswer[];
    }

    interface DnsAnswer {
        name: string;
        type: number;
        class: number;
        ttl: number;
        address?: string;
        domain?: string;
        data?: string;
    }

    interface UdpDnsServerOptions {
        type: "udp4" | "udp6";
    }

    interface DnsServerListenOptions {
        udp?: ListenOptions;
        tcp?: ListenOptions;
        doh?: ListenOptions;
    }

    type DnsHandler = (
        request: DnsRequest,
        sendResponse: DnsSendResponseFn,
        remoteInfo: udp.RemoteInfo,
    ) => void;

    type DnsSendResponseFn = (response: DnsResponse, preventClose?: boolean) => void;

    type PacketClass = typeof Packet.CLASS[keyof typeof Packet.CLASS];
    type PacketType = typeof Packet.TYPE[keyof typeof Packet.TYPE];
    type PacketQuestion = keyof typeof Packet.TYPE;
    type ListenOptions = number | {
        port: number;
        address: string;
    };

    interface DnsResolveOptions {
        recursive?: boolean;
        /** EDNS ECS, in CIDR format */
        clientIp?: string;
    }

    interface DnsResolver {
        (name: string,
         type?: DNS.PacketQuestion,
         cls?: DNS.PacketClass,
         options?: DNS.DnsResolveOptions,
        ): Promise<DNS.DnsResponse>;
    }

    interface ExtendedDnsResolver extends DnsResolver {
        (name: string,
         type?: DNS.PacketQuestion,
         cls?: DNS.PacketClass,
         clientIp?: string
        ): Promise<DNS.DnsResponse>;
        (packet: DNS.Packet): Promise<DNS.DnsResponse>;
    }

    interface TCPClientOptions {
        dns: string;
        protocol?: "tcp:" | "tls:";
        port?: 53 | 853 | (number & {});
    }

    interface DOHClientOptions {
        dns: string;
    }

    interface UDPClientOptions {
        dns: string;
        port?: 53 | (number & {});
        socketType?: udp.SocketType;
    }
}

// ******** Server *******
declare class DnsServer extends EventEmitter {
    addresses(): {
        udp?: net.AddressInfo;
        tcp?: net.AddressInfo;
        doh?: net.AddressInfo;
    };

    listen(options: DNS.DnsServerListenOptions): Promise<void>;

    close(): Promise<void>;
}

declare class UdpDnsServer extends udp.Socket {
    constructor(arg?: DNS.UdpDnsServerOptions | DNS.DnsHandler);
    listen(port: number, address?: string): Promise<void>;
}

declare class TcpDnsServer extends net.Server {
    constructor(callback?: DNS.DnsHandler);
}

declare class DNS {
    constructor(options?: Partial<DNS.DnsClientOptions>);

    static createServer(options: {
        udp?: boolean | DNS.UdpDnsServerOptions;
        tcp?: boolean;
        doh?: boolean;
        handle: DNS.DnsHandler;
    }): DnsServer;

    // static Packet: typeof Packet;

    static createUDPServer: (...options: ConstructorParameters<typeof UdpDnsServer>) => UdpDnsServer;
    static UDPServer: typeof UdpDnsServer;

    static createTCPServer: (...options: ConstructorParameters<typeof TcpDnsServer>) => TcpDnsServer;
    static TCPServer: typeof TcpDnsServer;

    static TCPClient: (options: DNS.TCPClientOptions) => DNS.ExtendedDnsResolver;
    static DOHClient: (options: DNS.DOHClientOptions) => DNS.ExtendedDnsResolver;
    static UDPClient: (options: DNS.UDPClientOptions) => DNS.ExtendedDnsResolver;
    static GoogleClient: () => DNS.DnsResolver;

    query(name: string, type: DNS.PacketQuestion, cls?: DNS.PacketClass, clientIp?: string): Promise<DNS.DnsResponse>;
    resolve(
        domain: string,
        type?: DNS.PacketQuestion,
        cls?: DNS.PacketClass,
        clientIp?: string,
    ): Promise<DNS.DnsResponse>;
    resolveA(domain: string, clientIp?: string): Promise<DNS.DnsResponse>;
    resolveAAAA(domain: string): Promise<DNS.DnsResponse>;
    resolveMX(domain: string): Promise<DNS.DnsResponse>;
    resolveCNAME(domain: string): Promise<DNS.DnsResponse>;
}

namespace DNS {

    export import Packet = Packet;

}

export = DNS;
