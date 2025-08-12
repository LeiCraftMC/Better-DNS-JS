import { DNSRecords } from "../../utils/records";
import { AbstractDNSRecordStore } from "./abstractRecordStore";

export type DNSZoneRecords = Map<string, Map<DNSRecords.TYPES, DNSRecords.Record[]>>;


export class DNSZone {

    constructor(
        public name: string,
        public records: DNSZoneRecords
    ) {}

    static create(name: string, setting: DNSZoneStoreOptions): DNSZone {
        const records = new Map<string, Map<DNSRecords.TYPES, DNSRecords.Record[]>>();

        const apexRecords = new Map<DNSRecords.TYPES, DNSRecords.Record[]>();

        const soaRecord: DNSRecords.SOA = {
            name,
            primary: setting.nsDomain,
            admin: setting.nsAdminEmail,
            serial: 1,
            refresh: 3600,
            retry: 1800,
            expiration: 604800,
            minimum: 3600
        };
        const primaryNSRecord: DNSRecords.NS = {
            name,
            ns: setting.nsDomain
        };

        apexRecords.set(DNSRecords.TYPE.SOA, [soaRecord]);
        apexRecords.set(DNSRecords.TYPE.NS, [primaryNSRecord]);

        records.set(name, apexRecords);

        return new DNSZone(name, records);
    }

}

export interface DNSZoneStoreOptions {
    nsDomain: string;
    nsAdminEmail: string;
    defaultSOASettings: Omit<DNSRecords.SOA, "type" | "primary" | "admin">;
}

export abstract class AbstractDNSZoneStore extends AbstractDNSRecordStore {

    protected abstract _createZone(name: string): Promise<void>;
    protected abstract _getZone(name: string): Promise<DNSZone | null>;
    protected abstract _setZone(zone: DNSZone): Promise<void>;
    protected abstract _deleteZone(name: string): Promise<void>;
    protected abstract _existsZone(name: string): Promise<boolean>;

    constructor(
        private readonly option: Readonly<DNSZoneStoreOptions>
    ) {
        super();
    }

    async createZone(name: string): Promise<DNSZone> {
        const zone = DNSZone.create(name, this.option);
        await this.setZone(zone);
        return zone;
    }

    async getZone(name: string): Promise<DNSZone | null> {
        return this._getZone(name);
    }

    async setZone(zone: DNSZone) {

        const soaRecord = zone.records.get(zone.name)?.get(DNSRecords.TYPE.SOA)?.[0] as DNSRecords.SOA | undefined;
        if (!soaRecord) {
            return null;
        }
        soaRecord.serial = DNSRecords.Util.nextSoaSerial(soaRecord.serial);

        zone.records.get(zone.name)?.set(DNSRecords.TYPE.SOA, [soaRecord]);

        await this._setZone(zone);
    }

    async deleteZone(name: string): Promise<void> {
        await this._deleteZone(name);
    }

    async existsZone(name: string): Promise<boolean> {
        return this._existsZone(name);
    }

    async getRecords(name: string, type: DNSRecords.TYPES): Promise<DNSRecords.Record[]> {
        const zone = await this.getZone(name);
        if (!zone) {
            return [];
        }
        return zone.records.get(name)?.get(type) || [];
    }

}
