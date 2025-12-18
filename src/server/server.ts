import DNS from '../libs/dns2';
import { DNSRecords } from '../utils/records';
import { AbstractDNSRecordStore } from './store/abstractRecordStore';

export class DNSServer<R extends AbstractDNSRecordStore = AbstractDNSRecordStore> {

    protected readonly dnsServer: InstanceType<typeof DNS.DNSServer>;
    protected readonly requestHandler: DNSServer.RequestHandler<R>;

    readonly recordStore: R;

    constructor(
        protected readonly options: Readonly<DNSServer.Options<R>>
    ) {
        this.recordStore = options.dnsRecordStore;

        this.requestHandler = options.requestHandler ?? new DNSServer.RequestHandler(options);

        this.dnsServer = DNS.createServer({
            tcp: true,
            udp: true,
            handle: this.requestHandler.getHandleFn()
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

    export interface Options<R extends AbstractDNSRecordStore = AbstractDNSRecordStore> extends RequestHandlerOptions<R> {
        port: number;
        host: string;
        protocol: "udp" | "tcp" | "both";
        requestHandler?: RequestHandler<R>;
    }

    export interface RequestHandlerOptions<R extends AbstractDNSRecordStore = AbstractDNSRecordStore> {
        dnsRecordStore: R;
        logErrors?: boolean;
    }

    export class RequestHandler<R extends AbstractDNSRecordStore = AbstractDNSRecordStore> {

        constructor(protected readonly options: RequestHandlerOptions<R>) { }

        private static normalizeName(unparsedName: string): string {
            return (unparsedName.endsWith('.') ? unparsedName.slice(0, -1) : unparsedName).toLowerCase();
        }

        private static async addAnswers(question: DNS.Packet.IQuestion, response: DNS.Packet, dnsRecordStore: AbstractDNSRecordStore, records: DNSRecords.RecordData[]) {

            if (records.length === 0) {
                // NXDOMAIN
                response.header.rcode = 0x03;

                const soaRecord = (await dnsRecordStore.getAuthority(question.name))[0];
                if (soaRecord) {
                    response.authorities.push({
                        class: question.class,
                        ...soaRecord
                    });
                    // Mark this as an authoritative answer
                    response.header.aa = 1;
                }
            } else {
                // Mark this as an authoritative answer
                response.header.aa = 1;
            }

            records.forEach(recordData => {
                response.answers.push({
                    name: question.name,
                    type: question.type,
                    class: question.class,
                    ...recordData
                });
            });
        }

        private static addAuthoritiesAndAdditionals(question: DNS.Packet.IQuestion, response: DNS.Packet, authorities?: DNSRecords.ResponseWithoutClass[], additionals?: DNSRecords.ResponseWithoutClass[]) {
            if (authorities) {
                authorities.forEach(data => {
                    response.authorities.push({
                        class: question.class,
                        ...data
                    });
                });
            }
            if (additionals) {
                additionals.forEach(data => {
                    response.additionals.push({
                        class: question.class,
                        ...data
                    });
                });
            }
        }

        private static async beforeRequestHandle(question: DNS.Packet.IQuestion, response: DNS.Packet, dnsRecordStore: AbstractDNSRecordStore, send: DNS.DnsSendResponseFn) {
            
            if (question.type !== DNSRecords.SYSTEM_TYPES.AXFR) {
                RequestHandler.addEDNSAdditionals(response);
            }

            if(question.type === DNSRecords.SYSTEM_TYPES.AXFR) {
                await RequestHandler.handleAXFRRequest(question, response, dnsRecordStore, send);
                return false;
            } 

            return true;
        }

        private static async handleAXFRRequest(question: DNS.Packet.IQuestion, response: DNS.Packet, dnsRecordStore: AbstractDNSRecordStore, send: DNS.DnsSendResponseFn) {

            const zoneRecords = await dnsRecordStore.getAllRecordsForZone(RequestHandler.normalizeName(question.name));
            const soaRecords = zoneRecords.filter(record => record.type === DNSRecords.TYPE.SOA);

            if (soaRecords.length === 0) {
                // No SOA record found for zone, cannot perform AXFR
                response.header.rcode = 0x03; // NXDOMAIN
                send(response, false);
                return;
            }

            // AXFR requires the response to start and end with the SOA record
            const soaRecord = soaRecords[0];

            // Start with SOA
            // @ts-ignore
            response.answers = [];
            response.answers.push({
                class: question.class,
                ...soaRecord
            });
            send(response, true);

            // Add all other records
            zoneRecords.forEach(recordData => {
                if (recordData.type !== DNSRecords.TYPE.SOA) {
                    // @ts-ignore
                    response.answers = [];
                    response.answers.push({
                        class: question.class,
                        ...recordData
                    });
                    send(response, true);
                }
            });

            // End with SOA
            // @ts-ignore
            response.answers = [];
            response.answers.push({
                class: question.class,
                ...soaRecord
            });
            send(response, false);
        }

        private static async addEDNSAdditionals(response: DNS.Packet) {
            // Handle EDNS (copy from request)
            // request.additionals.forEach(add => {
            //     if (add.type === Packet.TYPE.EDNS) { // @ts-ignore
            //         response.additionals.push(Packet.Resource.EDNS(add.rdata));
            //     }
            // });

            // @ts-ignore
            response.additionals.push(DNS.Packet.Resource.EDNS([]));
        }


        public getHandleFn(): DNS.DnsHandler {
            const opts = this.options;

            return async function handle(request, send, rinfo) {

                const response = DNS.Packet.createResponseFromRequest(request);

                // You are not doing recursion, so make that clear
                response.header.ra = 0;

                // AD should only be set for DNSSEC, so ensure it's off 
                // response.header.ad = 0;

                try {
                    const [ question ] = request.questions;
                    const { name: unparsedName, type, class: cls } = question;

                    const name = RequestHandler.normalizeName(unparsedName);


                    if (cls === DNSRecords.CLASS.IN) {

                        const continueHandling = await RequestHandler.beforeRequestHandle(question, response, opts.dnsRecordStore, send);
                        if (!continueHandling) {
                            return;
                        }

                        let answers: DNSRecords.RecordData[];
                        let authorities: DNSRecords.ResponseWithoutClass[] | undefined;
                        let additionals: DNSRecords.ResponseWithoutClass[] | undefined;

                        const records = await opts.dnsRecordStore.getRecords(name, type as any);
                        if (Array.isArray(records)) {
                            answers = records;
                        } else {
                            answers = records.answers;
                            authorities = records.authorities;
                            additionals = records.additionals;
                        }

                        await RequestHandler.addAnswers(question, response, opts.dnsRecordStore, answers);

                        RequestHandler.addAuthoritiesAndAdditionals(question, response, authorities, additionals);
                    }
                } catch (err) {
                    if (opts.logErrors) {
                        console.log('Error handling DNS request:', err);
                    }
                }

                send(response);
            };
        }

    }

}
