import { DNSRecords } from "../../utils/records";
import { AbstractDNSRecordStore } from "./abstractRecordStore";
import { DNSZone } from "./dnsZone";



export abstract class AbstractDNSZoneStore extends AbstractDNSRecordStore {

    protected abstract _getZone(name: string): Promise<DNSZone | null>;
    protected abstract _setZone(zone: DNSZone): Promise<boolean>;
    protected abstract _deleteZone(name: string): Promise<boolean>;
    protected abstract _existsZone(name: string): Promise<boolean>;

    constructor(
        private readonly option: Readonly<AbstractDNSZoneStore.Options>
    ) {super()}

    /**
     * Creates a new DNS zone with the given name.
     * IMPORTANT: You must call {@link updateZone} to save the zone to the store and make changes persistent.
     */
    async createZone(name: string): Promise<DNSZone> {
        const zone = DNSZone.create(name, this.option);
        await this.updateZone(zone);
        return zone;
    }

    async getZone(name: string): Promise<DNSZone | null> {
        return this._getZone(name);
    }

    /**
     * @deprecated Use {@link updateZone} instead.
     */
    async setZone(zone: DNSZone) {
        return await this.updateZone(zone);
    }
    
    async updateZone(zone: DNSZone) {

        const soaRecord = zone.records.get(zone.name)?.get(DNSRecords.TYPE.SOA)?.[0] as DNSRecords.SOA | undefined;
        if (!soaRecord) {
            return false;
        }
        soaRecord.serial = DNSZone.Util.nextSoaSerial(soaRecord.serial);

        zone.records.get(zone.name)?.set(DNSRecords.TYPE.SOA, [soaRecord]);

        return await this._setZone(zone);
    }

    async deleteZone(name: string) {
        return await this._deleteZone(name);
    }

    async existsZone(name: string) {
        return this._existsZone(name);
    }

    async getAuthority(name: string): Promise<DNSRecords.ResponseWithoutClass[]> {
        const zoneNames = DNSZone.Util.getZoneNames(name);

        for (const zoneName of zoneNames) {
            const zone = await this.getZone(zoneName);

            if (!zone) {
                continue;
            }
            
            const authorityRecords: DNSRecords.ResponseWithoutClass[] = [];

            const soaRecord: DNSRecords.ResponseWithoutClass = {
                name: zoneName,
                type: DNSRecords.TYPE.SOA,
                ...zone?.records.get(zoneName)?.get(DNSRecords.TYPE.SOA)?.[0] as DNSRecords.SOA,
            }

            authorityRecords.push(soaRecord);

            authorityRecords.push(...zone?.records.get(zoneName)?.get(DNSRecords.TYPE.NS)?.map(nsRecord => ({
                name: zoneName,
                type: DNSRecords.TYPE.NS,
                ...nsRecord
            })) || []);

            return authorityRecords;

        }
        return [];
    }

    async getRecords(name: string, type: DNSRecords.TYPES) {

        const zoneNames = DNSZone.Util.getZoneNames(name);

        for (const zoneName of zoneNames) {
            const zone = await this.getZone(zoneName);

            if (!zone) {
                continue;
            }
            return {
                answers: zone.records.get(name)?.get(type) || [],
                authorities: [],
                additionals: []
            }
        }
        return {
            answers: [],
            authorities: [],
            additionals: []
        };
    }

    async getAllRecordsForZone(zoneName: string): Promise<DNSRecords.ResponseWithoutClass[]> {
        const zone = await this.getZone(zoneName);
        if (!zone) {
            return [];
        }

        const records: DNSRecords.ResponseWithoutClass[] = [];
        
        for (const [name, typeMap] of zone.records.entries()) {
            for (const [type, recordDatas] of typeMap.entries()) {
                for (const recordData of recordDatas) {
                    records.push({
                        name,
                        type,
                        ...recordData
                    });
                }
            }
        }

        return records;
    }

}

export namespace AbstractDNSZoneStore {

    export interface Options {
        nsDomain: string;
        nsAdminEmail: string;
        defaultSOASettings?: Partial<Omit<DNSRecords.SOA, "name" | "primary" | "admin" | "serial">>;
    }
}