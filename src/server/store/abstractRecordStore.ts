import { DNSRecords } from "../../utils/records";

export abstract class AbstractDNSRecordStore {

    abstract getRecords(name: string, type: DNSRecords.VALID_TYPE, cls: DNSRecords.VALID_CLASS): Promise<DNSRecords.Record[]>;

}
