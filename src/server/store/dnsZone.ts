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
            serial: DNSZone.Util.nextSoaSerial(),
            refresh: setting.defaultSOASettings?.refresh || 3600,
            retry: setting.defaultSOASettings?.retry || 1800,
            expiration: setting.defaultSOASettings?.expiration || 604800,
            minimum: setting.defaultSOASettings?.minimum || 86400,
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

export namespace DNSZone.Util {

    export function getZoneNames(domain: string, withTopLevel = false): string[] {
        const parts = domain.split(".");
        const zones: string[] = [];

        for (let i = 0; i < parts.length; i++) {
            if (i === parts.length - 1 && !withTopLevel) {
                continue;
            }
            zones.push(parts.slice(i).join("."));
        }

        return zones;
    }

    export function nextSoaSerial(currentSerial?: number) {
        const now = new Date();

        // Create today's base serial: YYYYMMDD
        const todayBase = now.getFullYear().toString() +
            String(now.getMonth() + 1).padStart(2, '0') +
            String(now.getDate()).padStart(2, '0');

        const todayBaseNum = parseInt(todayBase, 10);

        if (!currentSerial) {
            // If no serial exists yet, start with today's date + 00
            return parseInt(todayBase + '00', 10);
        }

        const currentDatePart = Math.floor(currentSerial / 100); // first 8 digits
        let counter = currentSerial % 100; // last 2 digits

        if (currentDatePart === todayBaseNum) {
            // Same date → increment counter
            counter++;
            if (counter > 99) {
                throw new Error('SOA serial overflow for today — max 99 edits per day.');
            }
        } else if (currentDatePart < todayBaseNum) {
            // New day → reset counter
            counter = 0;
        } else {
            throw new Error('Current serial is from the future — check your clock.');
        }

        return parseInt(todayBase + String(counter).padStart(2, '0'), 10);
    }


}
