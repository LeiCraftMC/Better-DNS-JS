

export namespace DNSRecords {

    export const TYPES = {
        A     : 0x01,
        NS    : 0x02,
        MD    : 0x03,
        MF    : 0x04,
        CNAME : 0x05,
        SOA   : 0x06,
        MB    : 0x07,
        MG    : 0x08,
        MR    : 0x09,
        NULL  : 0x0A,
        WKS   : 0x0B,
        PTR   : 0x0C,
        HINFO : 0x0D,
        MINFO : 0x0E,
        MX    : 0x0F,
        TXT   : 0x10,
        AAAA  : 0x1C,
        SRV   : 0x21,
        EDNS  : 0x29,
        SPF   : 0x63,
        AXFR  : 0xFC,
        MAILB : 0xFD,
        MAILA : 0xFE,
        ANY   : 0xFF,
        CAA   : 0x101
    } as const;

    export type VALID_TYPE = typeof DNSRecords.TYPES[keyof typeof DNSRecords.TYPES];

    export const CLASSES = {
        IN  : 0x01,
        CS  : 0x02,
        CH  : 0x03,
        HS  : 0x04,
        ANY : 0xFF
    } as const;

    export type VALID_CLASS = typeof DNSRecords.CLASSES[keyof typeof DNSRecords.CLASSES];

    export interface Record {
        name: string;
        type: VALID_TYPE;
        class: VALID_CLASS;
        ttl: number;
        [data: string]: any;
    }

    export interface A extends Record {
        type: typeof DNSRecords.TYPES.A;
        address: string;
    }

    export interface AAAA extends Record {
        type: typeof DNSRecords.TYPES.AAAA;
        address: string;
    }

    export interface CNAME extends Record {
        type: typeof DNSRecords.TYPES.CNAME;
        domain: string;
    }

    export interface MX extends Record {
        type: typeof DNSRecords.TYPES.MX;
        exchange: string;
        priority: number;
    }

    export interface NS extends Record {
        type: typeof DNSRecords.TYPES.NS;
        ns: string;
    }

    export interface PTR extends Record {
        type: typeof DNSRecords.TYPES.PTR;
        domain: string;
    }

    export interface SOA extends Record {
        type: typeof DNSRecords.TYPES.SOA;
        primary: string;
        admin: string;
        serial: number;
        refresh: number;
        retry: number;
        expiration: number;
        minimum: number;
    }

    export interface TXT extends Record {
        type: typeof DNSRecords.TYPES.TXT;
        data: string | string[];
    }
}