import { SocketAddress } from "net";
import DNS from "../../libs/dns2";
import { BoundedExecutor } from "@cleverjs/utils";

export class SlaveSettings {

    constructor(
        protected readonly zoneName: string,
        protected readonly slaveServers: SlaveSettings.SlaveServerData[] = []
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

    async removeSlaveServer(address: string, port: number = 53) {
        const index = this.slaveServers.findIndex(server => server.address === address && server.port === port);
        if (index !== -1) {
            this.slaveServers.splice(index, 1);
        }
    }

    async sendNOTIFY() {
        for (const server of this.slaveServers) {

            const socketAddress = SocketAddress.parse(`${server.address}:${server.port}`);
            if (!socketAddress) {
                continue;
            }

            await new BoundedExecutor(async () => {
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
                }
            }, 5_000);
        }
    }

}

export namespace SlaveSettings {

    export interface SlaveServerData {
        address: string;
        port: number;
    }

}