import type { DNSQuery } from "../../utils/query";
import { DNSRecords } from "../../utils/records";

export abstract class AbstractDNSRecordStore {

    abstract getRecords(name: string, type: DNSRecords.TYPES): Promise<DNSQuery.Response>;

    /**
     * Get the authority section for a given name
     * @param name The domain name to get authority for
     * @returns SOA and NS records for the zone. First element should be the SOA record, than NS records, tthan others.
     */
    abstract getAuthority(name: string): Promise<DNSRecords.ResponseWithoutClass[]>;

}
