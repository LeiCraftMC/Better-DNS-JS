
export type DNSRecords = {
    0x01: DNSRecords.A;
    0x1C: DNSRecords.AAAA;
    0x05: DNSRecords.CNAME;
    0x0F: DNSRecords.MX;
    0x02: DNSRecords.NS;
    0x0C: DNSRecords.PTR;
    0x06: DNSRecords.SOA;
    0x10: DNSRecords.TXT;
}

export namespace DNSRecords {

    export const TYPE = {
        A     : 0x01,
        NS    : 0x02,
        // MD    : 0x03,
        // MF    : 0x04,
        CNAME : 0x05,
        SOA   : 0x06,
        // MB    : 0x07,
        // MG    : 0x08,
        // MR    : 0x09,
        // NULL  : 0x0A,
        // WKS   : 0x0B,
        PTR   : 0x0C,
        // HINFO : 0x0D,
        // MINFO : 0x0E,
        MX    : 0x0F,
        TXT   : 0x10,
        AAAA  : 0x1C,
        // SRV   : 0x21,
        // EDNS  : 0x29,
        // SPF   : 0x63,
        // AXFR  : 0xFC,
        // MAILB : 0xFD,
        // MAILA : 0xFE,
        // ANY   : 0xFF,
        // CAA   : 0x101
    } as const;

    export type TYPES = typeof DNSRecords.TYPE[keyof typeof DNSRecords.TYPE];

    export const CLASS = {
        IN  : 0x01,
        CS  : 0x02,
        CH  : 0x03,
        HS  : 0x04,
        ANY : 0xFF
    } as const;

    export type CLASSES = typeof DNSRecords.CLASS[keyof typeof DNSRecords.CLASS];

    export interface RecordData {
        ttl: number;
    }

    export interface ResponseRecord extends RecordData {
        name: string;
        type: TYPES;
        class: CLASSES;
        [data: string]: any;
    }

    export interface A extends RecordData {
        address: string;
    }

    export interface AAAA extends A {}

    export interface CNAME extends RecordData {
        domain: string;
    }

    export interface MX extends RecordData {
        exchange: string;
        priority: number;
    }

    export interface NS extends RecordData {
        ns: string;
    }

    export interface PTR extends RecordData {
        domain: string;
    }

    export interface SOA extends RecordData {
        primary: string;
        admin: string;
        serial: number;
        refresh: number;
        retry: number;
        expiration: number;
        minimum: number;
    }

    export interface TXT extends RecordData {
        data: string | string[];
    }
}
