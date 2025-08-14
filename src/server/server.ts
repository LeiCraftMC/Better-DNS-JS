import { createServer as createDNSServer, Packet } from 'dns2';
import { DNSRecords } from '../utils/records';
import { AbstractDNSRecordStore } from './store/abstractRecordStore';

export class DNSServer {

    protected readonly dnsServer: ReturnType<typeof createDNSServer>;

    constructor(
        protected readonly options: Readonly<DNSServer.Options>
    ) {
        this.dnsServer = createDNSServer({
            tcp: true,
            udp: true,
            async handle(request, send, rinfo) {
                const [ question ] = request.questions;
                const { name, type, class: cls } = question as { name: string; type: DNSRecords.TYPES, class: DNSRecords.CLASSES };

                const response = Packet.createResponseFromRequest(request);

                if (cls === DNSRecords.CLASS.IN) {

                    (await options.dnsRecordStore.getRecords(name, type)).forEach(record => {
                        response.answers.push({
                            ...record,
                            type,
                            class: cls
                        });
                    });
                }

                send(response);
            }
        });
    }

}

export namespace DNSServer {

    export interface Options {
        port: number;
        ip: string;
        protocol: "udp" | "tcp" | "both";
        dnsRecordStore: AbstractDNSRecordStore;
    }

}
