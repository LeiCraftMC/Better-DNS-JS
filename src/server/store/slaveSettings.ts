import { SocketAddress, isIP } from "net";
import DNS from "../../libs/dns2";

export class SlaveSettings {

    constructor(
        protected readonly zoneName: string,
        protected readonly slaveServers: SlaveSettings.SlaveServerData[] = [],
        protected readonly allowedTransferIPs: string[] = []
    ) { }

    public getSlaveServers() {
        return this.slaveServers as ReadonlyArray<SlaveSettings.SlaveServerData>;
    }

    async addSlaveServer(address: string, port: number = 53) {
        const socketAddress = SocketAddress.parse(`${address}:${port}`);

        if (!socketAddress) {
            throw new Error(`Invalid address or port: ${address}:${port}`);
        }

        this.slaveServers.push({
            address: socketAddress.address,
            port: socketAddress.port
        });
    }

    async addAllowedTransferIP(ip: string, cidr: number = 32) {
        // Support both forms: "ip" + cidr, or "ip/cidr" in the first arg
        let baseIp = ip;
        let mask = cidr;
        if (ip.includes('/')) {
            const [parsedIp, parsedMask] = ip.split('/')
            baseIp = parsedIp;
            mask = parseInt(parsedMask, 10);
        }

        if (isIP(baseIp) === 0) {
            throw new Error(`Invalid IP address: ${ip}`);
        }
        if (!this.isValidCIDR(baseIp, mask)) {
            throw new Error(`Invalid CIDR mask for ${baseIp}: ${mask}`);
        }

        const cidrNotation = `${baseIp}/${mask}`;
        if (!this.allowedTransferIPs.includes(cidrNotation)) {
            this.allowedTransferIPs.push(cidrNotation);
        }
    }

    async removeAllowedTransferIP(ip: string, cidr: number = 32) {
        const cidrNotation = `${ip}/${cidr}`;
        const index = this.allowedTransferIPs.indexOf(cidrNotation);
        if (index !== -1) {
            this.allowedTransferIPs.splice(index, 1);
        }
    }

    async removeSlaveServer(address: string, port: number = 53) {
        const index = this.slaveServers.findIndex(server => server.address === address && server.port === port);
        if (index !== -1) {
            this.slaveServers.splice(index, 1);
        }
    }

    public isSlaveAllowed(address: string): boolean {
        // Reject invalid IP addresses outright
        if (isIP(address) === 0) {
            return false;
        }
        const addrVersion = isIP(address);
        return this.allowedTransferIPs.some(cidr => {
            const [ip, mask] = cidr.split('/');
            const cidrMask = parseInt(mask, 10);
            if (isIP(ip) === 0) {
                return false;
            }
            if (Number.isNaN(cidrMask)) {
                return false;
            }
            if (!this.isValidCIDR(ip, cidrMask)) {
                return false;
            }
            if (isIP(ip) !== addrVersion) {
                return false;
            }
            return this.isCIDRMatch(address, ip, cidrMask);
        });
    }

    private isCIDRMatch(addr: string, cidrIp: string, mask: number): boolean {
        const isIPv6 = addr.includes(':');
        if (isIPv6 !== cidrIp.includes(':')) {
            return false;
        }

        if (isIPv6) {
            return this.isIPv6InCIDR(addr, cidrIp, mask);
        } else {
            return this.isIPv4InCIDR(addr, cidrIp, mask);
        }
    }

    private isIPv4InCIDR(addr: string, cidrIp: string, mask: number): boolean {
        if (mask < 0 || mask > 32) {
            return false;
        }
        const parts1 = addr.split('.').map(Number);
        const parts2 = cidrIp.split('.').map(Number);
        if (parts1.length !== 4 || parts2.length !== 4) {
            return false;
        }
        const maskBits = 0xffffffff ^ (0xffffffff >>> mask);
        const addr1 = (parts1[0] << 24) | (parts1[1] << 16) | (parts1[2] << 8) | parts1[3];
        const addr2 = (parts2[0] << 24) | (parts2[1] << 16) | (parts2[2] << 8) | parts2[3];
        return (addr1 & maskBits) === (addr2 & maskBits);
    }

    private isIPv6InCIDR(addr: string, cidrIp: string, mask: number): boolean {
        if (mask < 0 || mask > 128) {
            return false;
        }

        const parseIPv6 = (ip: string): number[] => {
            // Handle IPv4-mapped tail like ::ffff:192.168.0.1
            const toIPv4Hextets = (v4: string): string[] => {
                const p = v4.split('.').map(Number);
                if (p.length !== 4 || p.some(n => Number.isNaN(n) || n < 0 || n > 255)) {
                    throw new Error(`Invalid IPv4 part in IPv6: ${v4}`);
                }
                const h1 = ((p[0] << 8) | p[1]).toString(16);
                const h2 = ((p[2] << 8) | p[3]).toString(16);
                return [h1, h2];
            };

            if (ip.includes('::')) {
                const [left, right] = ip.split('::');
                const leftParts = left ? left.split(':') : [];
                let rightParts = right ? right.split(':') : [];
                if (rightParts.length && rightParts[rightParts.length - 1].includes('.')) {
                    const v4parts = toIPv4Hextets(rightParts.pop()!);
                    rightParts = [...rightParts, ...v4parts];
                }
                const total = leftParts.filter(Boolean).length + rightParts.filter(Boolean).length;
                const zerosToInsert = 8 - total;
                const full = [
                    ...leftParts.filter(Boolean),
                    ...Array(Math.max(zerosToInsert, 0)).fill('0'),
                    ...rightParts.filter(Boolean)
                ];
                if (full.length !== 8) {
                    throw new Error(`Invalid IPv6 address: ${ip}`);
                }
                return full.map(h => parseInt(h, 16));
            } else {
                let parts = ip.split(':');
                if (parts.length && parts[parts.length - 1].includes('.')) {
                    const v4parts = toIPv4Hextets(parts.pop()!);
                    parts = [...parts, ...v4parts];
                }
                if (parts.length !== 8) {
                    throw new Error(`Invalid IPv6 address: ${ip}`);
                }
                return parts.map(h => parseInt(h || '0', 16));
            }
        };

        let a: number[];
        let b: number[];
        try {
            a = parseIPv6(addr);
            b = parseIPv6(cidrIp);
        } catch {
            return false;
        }

        let bitsLeft = mask;
        for (let i = 0; i < 8; i++) {
            if (bitsLeft >= 16) {
                if (a[i] !== b[i]) return false;
                bitsLeft -= 16;
            } else if (bitsLeft > 0) {
                const maskSeg = (0xffff << (16 - bitsLeft)) & 0xffff;
                if ((a[i] & maskSeg) !== (b[i] & maskSeg)) return false;
                bitsLeft = 0;
            } else {
                break;
            }
        }
        return true;
    }

    private isValidCIDR(ip: string, mask: number): boolean {
        const version = isIP(ip);
        if (version === 4) {
            return Number.isInteger(mask) && mask >= 0 && mask <= 32;
        }
        if (version === 6) {
            return Number.isInteger(mask) && mask >= 0 && mask <= 128;
        }
        return false;
    }

    async sendNOTIFY() {
        for (const server of this.slaveServers) {

            const socketAddress = SocketAddress.parse(`${server.address}:${server.port}`);
            if (!socketAddress) {
                continue;
            }

            const query = DNS.UDPClient({
                dns: socketAddress.address,
                port: socketAddress.port,
                socketType: socketAddress.family === "ipv6" ? "udp6" : "udp4"
            });

            const packet = new DNS.Packet();
            packet.header.opcode = DNS.Packet.OPCODE.NOTIFY;
            packet.header.aa = 1;
            packet.questions.push({
                name: this.zoneName,
                type: DNS.Packet.TYPE.SOA,
                class: DNS.Packet.CLASS.IN
            });

            const response = await query(packet);
            if (response.header.rcode !== 0) {
                // console.error(`Failed to send NOTIFY to ${server.address}:${server.port} - RCODE: ${response.header.rcode}`);
                return false;
            }
        }
        return true;
    }

}

export namespace SlaveSettings {

    export interface SlaveServerData {
        address: string;
        port: number;
    }

}