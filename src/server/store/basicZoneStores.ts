import { AbstractDNSZoneStore } from "./abstractZoneStore";
import type { DNSZone } from "./dnsZone";

export class BasicInMemoryDNSZoneStore extends AbstractDNSZoneStore {

    private readonly zones: Map<string, DNSZone> = new Map();

    protected async _getZone(name: string): Promise<DNSZone | null> {
        return this.zones.get(name) || null;
    }
    protected async _setZone(zone: DNSZone): Promise<boolean> {
        this.zones.set(zone.name, zone);
        return true;
    }
    protected async _deleteZone(name: string): Promise<boolean> {
        return this.zones.delete(name);
    }
    protected async _existsZone(name: string): Promise<boolean> {
        return this.zones.has(name);
    }

}