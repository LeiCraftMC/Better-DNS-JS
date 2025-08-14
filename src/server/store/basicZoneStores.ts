import { AbstractDNSZoneStore, DNSZone } from "./abstractZoneStore";

export class BasicInMemoryDNSZoneStore extends AbstractDNSZoneStore {

    private readonly zones: Map<string, DNSZone> = new Map();

    protected _createZone(name: string): Promise<void> {
        throw new Error("Method not implemented.");
    }
    protected _getZone(name: string): Promise<DNSZone | null> {
        throw new Error("Method not implemented.");
    }
    protected _setZone(zone: DNSZone): Promise<void> {
        throw new Error("Method not implemented.");
    }
    protected _deleteZone(name: string): Promise<void> {
        throw new Error("Method not implemented.");
    }
    protected _existsZone(name: string): Promise<boolean> {
        throw new Error("Method not implemented.");
    }

}