import { DNSRecords } from "../../utils/records";

export class DNSZone {

    constructor(
        public name: string,
        public records: DNSRecords.Record[]
    ) {}

}

export abstract class AbstractDNSZoneStore {

    protected abstract _createZone(name: string): Promise<void>;
    protected abstract _getZone(name: string): Promise<DNSZone | null>;
    protected abstract _setZone(zoneData: DNSZone): Promise<void>;
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

    async setZone(zoneData: DNSZone) {
        await this._setZone(zoneData);
    }

    async deleteZone(name: string): Promise<void> {
        await this._deleteZone(name);
    }

    async existsZone(name: string): Promise<boolean> {
        return this._existsZone(name);
    }

}