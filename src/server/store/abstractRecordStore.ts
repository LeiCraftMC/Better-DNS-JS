import { DNSRecords } from "../../utils/records";

export abstract class AbstractDNSRecordStore {

    abstract getRecords(name: string, type: DNSRecords.TYPES): Promise<DNSRecords.Record[]>;

}
