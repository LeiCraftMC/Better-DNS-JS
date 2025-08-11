import { createServer as createDNSServer, Packet } from 'dns2';
import { DNSRecords } from '../utils/records';
import { AbstractDNSRecordStore } from './store/abstractRecordStore';


export class DNSServer {

    protected readonly dnsServer: ReturnType<typeof createDNSServer>;

    constructor(
        protected readonly dnsRecordStore: AbstractDNSRecordStore
    ) {
        this.dnsServer = createDNSServer({
            tcp: true,
            udp: true,
            async handle(request, send, rinfo) {
                const [ question ] = request.questions;
                const { name, type, class: cls } = question as { name: string; type: DNSRecords.TYPES, class: DNSRecords.CLASSES };

                const response = Packet.createResponseFromRequest(request);

                if (cls === DNSRecords.CLASS.IN) {
                    response.answers.push(...await dnsRecordStore.getRecords(name, type));
                }

                send(response);
            }
        });
    }

}
