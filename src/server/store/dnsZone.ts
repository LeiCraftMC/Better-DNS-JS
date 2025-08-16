import { DNSRecords } from "../../utils/records";
import type { AbstractDNSZoneStore } from "./abstractZoneStore";


export class DNSZone {

    constructor(
        readonly name: string,
        readonly records: DNSZone.Records
    ) {}

    static create(name: string, setting: AbstractDNSZoneStore.Options): DNSZone {
        const records = new Map<string, Map<DNSRecords.TYPES, DNSRecords.RecordData[]>>();

        const apexRecords = new Map<DNSRecords.TYPES, DNSRecords.RecordData[]>();

        const soaRecord: DNSRecords.SOA = {
            primary: setting.nsDomain,
            admin: setting.nsAdminEmail,
            serial: DNSRecords.Util.nextSoaSerial(),
            refresh: setting.defaultSOASettings?.refresh || 3600,
            retry: setting.defaultSOASettings?.retry || 1800,
            expiration: setting.defaultSOASettings?.expiration || 604800,
            minimum: setting.defaultSOASettings?.minimum || 3600,
            ttl: setting.defaultSOASettings?.ttl || 3600,
        };
        const primaryNSRecord: DNSRecords.NS = {
            ns: setting.nsDomain,
            ttl: setting.defaultSOASettings?.ttl || 3600
        };

        apexRecords.set(DNSRecords.TYPE.SOA, [soaRecord]);
        apexRecords.set(DNSRecords.TYPE.NS, [primaryNSRecord]);

        records.set(name, apexRecords);

        return new DNSZone(name, records);
    }

    public getRecords<TYPE extends DNSRecords.TYPES, RDATA extends DNSRecords.RecordData = DNSRecords[TYPE]>(name: string, type: TYPE): RDATA[] {
        return this.records.get(name)?.get(type) as RDATA[] || [];
    }

    public setRecord<TYPE extends DNSRecords.TYPES, RDATA extends DNSRecords.RecordData = DNSRecords[TYPE]>(name: string, type: TYPE, recordData: RDATA): void {
        const zoneRecords = this.records.get(name) || new Map<DNSRecords.TYPES, DNSRecords.RecordData[]>();
        const records = zoneRecords.get(type) || [];
        records.push(recordData);
        zoneRecords.set(type, records);
        this.records.set(name, zoneRecords);
    }

    public deleteRecord<TYPE extends DNSRecords.TYPES, RDATA extends DNSRecords.RecordData = DNSRecords[TYPE]>(name: string, type: TYPE, recordData: RDATA) {
        const zoneRecords = this.records.get(name);
        if (zoneRecords) {
            const records = zoneRecords.get(type);
            if (records) {
                zoneRecords.set(type, records.filter(r => r !== recordData));
            }
        }
    }

    public existsRecord<TYPE extends DNSRecords.TYPES, RDATA extends DNSRecords.RecordData = DNSRecords[TYPE]>(name: string, type: TYPE, recordData: RDATA): boolean {
        const zoneRecords = this.records.get(name);
        if (zoneRecords) {
            const records = zoneRecords.get(type);
            if (records) {
                return records.includes(recordData);
            }
        }
        return false;
    }

}

export namespace DNSZone {
    export type Records = Map<string, Map<DNSRecords.TYPES, DNSRecords.RecordData[]>>;
}
