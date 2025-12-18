import DNS, { createServer as createDNSServer, Packet } from '../libs/dns2';
import { DNSRecords } from '../utils/records';
import { AbstractDNSRecordStore } from './store/abstractRecordStore';

export class DNSServer<R extends AbstractDNSRecordStore = AbstractDNSRecordStore> {

    protected readonly dnsServer: ReturnType<typeof createDNSServer>;
    protected readonly requestHandler: DNSServer.RequestHandler<R>;

    readonly recordStore: R;

    constructor(
        protected readonly options: Readonly<DNSServer.Options<R>>
    ) {
        this.recordStore = options.dnsRecordStore;
        
        this.requestHandler = options.requestHandler ?? new DNSServer.RequestHandler(options);

        this.dnsServer = createDNSServer({
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

        constructor(protected readonly options: RequestHandlerOptions<R>) {}

        private static normalizeName(unparsedName: string): string {
            return (unparsedName.endsWith('.') ? unparsedName.slice(0, -1) : unparsedName).toLowerCase();
        }

        public getHandleFn(): DNS.DnsHandler {
            const opts = this.options;

            return async function handle(request, send, rinfo) {

                const response = Packet.createResponseFromRequest(request);

                // You are not doing recursion, so make that clear
                response.header.ra = 0;

                // AD should only be set for DNSSEC, so ensure it's off 
                // response.header.ad = 0;

                
                // Handle EDNS (copy from request)
                // request.additionals.forEach(add => {
                //     if (add.type === Packet.TYPE.EDNS) { // @ts-ignore
                //         response.additionals.push(Packet.Resource.EDNS(add.rdata));
                //     }
                // });

                // @ts-ignore
                response.additionals.push(Packet.Resource.EDNS([]));

                try {
                    const [ question ] = request.questions;
                    const { name: unparsedName, type, class: cls } = question;

                    const name = RequestHandler.normalizeName(unparsedName);


                    if (cls === DNSRecords.CLASS.IN) {

                        const { answers, authorities, additionals } = await opts.dnsRecordStore.getRecords(name, type as any);

                        answers.forEach(recordData => {
                            response.answers.push({
                                name,
                                type,
                                class: cls,
                                ...recordData
                            });
                        });

                        if (answers.length === 0) {
                            // NXDOMAIN
                            response.header.rcode = 0x03;

                            const soaRecord = (await opts.dnsRecordStore.getAuthority(name))[0];
                            if (soaRecord) {
                                response.authorities.push({
                                    class: cls,
                                    ...soaRecord
                                });
                                // Mark this as an authoritative answer
                                response.header.aa = 1;
                            }
                        } else {
                            // Mark this as an authoritative answer
                            response.header.aa = 1;
                        }

                        authorities.forEach(data => { 
                            response.authorities.push({
                                class: cls,
                                ...data
                            });
                        });

                        additionals.forEach(data => {
                            response.additionals.push({
                                class: cls,
                                ...data
                            });
                        });
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
