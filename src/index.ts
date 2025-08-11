import {
    TCPServer,
    UDPServer,
    DOHServer,
    createTCPServer,
    createUDPServer,
    createDOHServer,
    createServer,
} from "./server/index"
const EventEmitter = require('events');

/**
 * [DNS description]
 * @docs https://tools.ietf.org/html/rfc1034
 * @docs https://tools.ietf.org/html/rfc1035
 */
export class DNS extends EventEmitter {
    constructor(options) {
        super();
        Object.assign(this, {
            port: 53,
            retries: 3,
            timeout: 3,
            recursive: true,
            resolverProtocol: 'UDP',
            nameServers: [
                '8.8.8.8',
                '114.114.114.114',
            ],
            rootServers: [
                'a', 'b', 'c', 'd', 'e', 'f',
                'g', 'h', 'i', 'j', 'k', 'l', 'm',
            ].map(x => `${x}.root-servers.net`),
        }, options);
    }

    /**
     * resolve
     * @param {*} domain
     * @param {*} type
     * @param {*} cls
     */
    resolve(domain, type = 'ANY', cls = DNS.Packet.CLASS.IN, options = {}) {
        const { port, nameServers, resolverProtocol = 'UDP' } = this;
        const createResolver = DNS[resolverProtocol + 'Client'];
        return Promise.race(nameServers.map(address => {
            const resolve = createResolver({ dns: address, port });
            return resolve(domain, type, cls, options);
        }));
    }

    resolveA(domain, clientIp) {
        return this.resolve(domain, 'A', undefined, clientIp);
    }

    resolveAAAA(domain) {
        return this.resolve(domain, 'AAAA');
    }

    resolveMX(domain) {
        return this.resolve(domain, 'MX');
    }

    resolveCNAME(domain) {
        return this.resolve(domain, 'CNAME');
    }

    resolvePTR(domain) {
        return this.resolve(domain, 'PTR');
    }

    resolveDNSKEY(domain) {
        return this.resolve(domain, 'DNSKEY');
    }

    resolveRRSIG(domain) {
        return this.resolve(domain, 'RRSIG');
    }
}

export * from "./server/index"

export * from "./client/tcp";
export * from "./client/doh";
export * from "./client/udp";
export * from "./client/google";

export { Packet } from "./util/packet";

export default DNS;