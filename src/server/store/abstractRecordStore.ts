import type { DNSQuery } from "../../utils/query";
import { DNSRecords } from "../../utils/records";

export abstract class AbstractDNSRecordStore {

    /**
     * Get DNS records for a given name and type
     * @param name The domain name to get records for
     * @param type The DNS record type to get
     */
    abstract getRecords(name: string, type: DNSRecords.TYPES): Promise<AbstractDNSRecordStore.Types.GetRecordsResponse>;

    /**
     * Get the authority section for a given name
     * @param name The domain name to get authority for
     * @returns SOA and NS records for the zone. First element should be the SOA record, than NS records, tthan others.
     */
    abstract getAuthority(name: string): Promise<AbstractDNSRecordStore.Types.GetAuthorityResponse>;

    /**
     * Get all records for a given zone
     * @param name The zone name to get all records for
     */
    abstract getAllRecordsForZone(name: string): Promise<DNSQuery.Response>;
}

export namespace AbstractDNSRecordStore.Types {

    export type ComplexQueryResponse = DNSQuery.Response;
    export type BaseResponse = DNSRecords.RecordData[];
    
    export type GetRecordsResponse = ComplexQueryResponse | BaseResponse;
    export type GetAuthorityResponse = DNSRecords.ResponseWithoutClass[];

}
