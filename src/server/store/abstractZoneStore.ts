import { DNSRecords } from "../../utils/records";
import { AbstractDNSRecordStore } from "./abstractRecordStore";

export type DNSZoneRecords = Map<string, Map<DNSRecords.TYPES, DNSRecords.Record[]>>;


export class DNSZone {

    constructor(
        public name: string,
        public records: DNSZoneRecords
    ) {}

}

export abstract class AbstractDNSZoneStore extends AbstractDNSRecordStore {

    protected abstract _createZone(name: string): Promise<void>;
    protected abstract _getZone(name: string): Promise<DNSZone | null>;
    protected abstract _setZone(zone: DNSZone): Promise<void>;
    protected abstract _deleteZone(name: string): Promise<void>;
    protected abstract _existsZone(name: string): Promise<boolean>;

    async createZone(name: string): Promise<DNSZone> {
        const zone = new DNSZone(name, []);
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