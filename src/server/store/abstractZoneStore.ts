import { DNSRecords } from "../../utils/records";

export type DNSZoneRecords = Map<string, Map<DNSRecords.VALID_TYPE, Map<DNSRecords.VALID_CLASS, DNSRecords.Record[]>>>


export class DNSZone {

    constructor(
        public name: string,
        public records: DNSZoneRecords
    ) {}

}

export abstract class AbstractDNSZoneStore {

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

        const soaRecord = zone.records.get(DNSRecords.TYPES.SOA)?.get(DNSRecords.VALID_CLASS.IN)?.[0];
        
        zoneData.records.push(soaRecord);

        await this._setZone(zoneData);
    }

    async deleteZone(name: string): Promise<void> {
        await this._deleteZone(name);
    }

    async existsZone(name: string): Promise<boolean> {
        return this._existsZone(name);
    }

}