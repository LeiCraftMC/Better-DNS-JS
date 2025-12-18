import DNS from "../../libs/dns2";

export class SlaveSettings {

    constructor(
        protected readonly slaveServers: SlaveSettings.SlaveServerData[] = []
    ) {}

    public getSlaveServers() {
        return this.slaveServers;
    }

    async sendNOTIFY() {
        for (const server of this.slaveServers) {

            const client = new DNS.UDPClient({
                dns: ""
            })

        }
    }

}

export namespace SlaveSettings {

    export interface SlaveServerData {
        address: string;
        port: number;
    }

}