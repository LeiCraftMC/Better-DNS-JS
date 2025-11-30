import type { DNSRecords } from "./records";

export namespace DNSQuery {

    export interface Response {
        answers: DNSRecords.RecordData[];
        authorities: DNSRecords.ResponseWithoutClass[];
        additionals: DNSRecords.ResponseWithoutClass[];
    }

}