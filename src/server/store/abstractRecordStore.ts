import type { DNSQuery } from "../../utils/query";
import { DNSRecords } from "../../utils/records";

export abstract class AbstractDNSRecordStore {

    abstract getRecords(name: string, type: DNSRecords.TYPES): Promise<DNSQuery.Response>;

}
