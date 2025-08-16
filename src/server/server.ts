import DNS, { createServer as createDNSServer, Packet } from 'dns2';
import { DNSRecords } from '../utils/records';
import { AbstractDNSRecordStore } from './store/abstractRecordStore';

export class DNSServer<R extends AbstractDNSRecordStore = AbstractDNSRecordStore> {

    protected readonly dnsServer: ReturnType<typeof createDNSServer>;

    readonly recordStore: R;

    constructor(
        protected readonly options: Readonly<DNSServer.Options<R>>
    ) {
        this.recordStore = options.dnsRecordStore;
        
        this.dnsServer = createDNSServer({
            tcp: true,
            udp: true,
            async handle(request, send, rinfo) {
                const [ question ] = request.questions;
                const { name, type, class: cls } = question as { name: string; type: DNSRecords.TYPES, class: DNSRecords.CLASSES };

                const response = Packet.createResponseFromRequest(request);

                if (cls === DNSRecords.CLASS.IN) {

                    (await options.dnsRecordStore.getRecords(name, type)).forEach(recordData => {
                        response.answers.push({
                            name,
                            type,
                            class: cls,
                            ...recordData
                        });
                    });
                }

                send(response);
            }
        });
    }

    async start() {

        const listenOptions: DNS.DnsServerListenOptions = {};

        if (this.options.protocol === "udp" || this.options.protocol === "both") {
            listenOptions.udp = {
                port: this.options.port,
                address: this.options.ip
            };
        }

        if (this.options.protocol === "tcp" || this.options.protocol === "both") {
            listenOptions.tcp = {
                port: this.options.port,
                address: this.options.ip
            };
        }

        this.dnsServer.listen(listenOptions);
    }

}

export namespace DNSServer {

    export interface Options<R extends AbstractDNSRecordStore = AbstractDNSRecordStore> {
        port: number;
        ip: string;
        protocol: "udp" | "tcp" | "both";
        dnsRecordStore: R;
    }

}
