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
                
                // @ts-ignore Mark this as an authoritative answer
                response.header.aa = 1;

                // @ts-ignore You are not doing recursion, so make that clear
                response.header.ra = 0;

                // @ts-ignore AD should only be set for DNSSEC, so ensure it's off 
                response.header.ad = 0;

                if (cls === DNSRecords.CLASS.IN) {

                    const records = await options.dnsRecordStore.getRecords(name, type);

                    records.forEach(recordData => {
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
                address: this.options.host
            };
        }

        if (this.options.protocol === "tcp" || this.options.protocol === "both") {
            listenOptions.tcp = {
                port: this.options.port,
                address: this.options.host
            };
        }

        this.dnsServer.listen(listenOptions);
    }

}

export namespace DNSServer {

    export interface Options<R extends AbstractDNSRecordStore = AbstractDNSRecordStore> {
        port: number;
        host: string;
        protocol: "udp" | "tcp" | "both";
        dnsRecordStore: R;
    }

}
