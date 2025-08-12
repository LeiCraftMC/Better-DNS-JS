

export namespace DNSRecords {

    export const TYPE = {
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

    export type TYPES = typeof DNSRecords.TYPE[keyof typeof DNSRecords.TYPE];

    export const CLASS = {
        IN  : 0x01,
        CS  : 0x02,
        CH  : 0x03,
        HS  : 0x04,
        ANY : 0xFF
    } as const;

    export type CLASSES = typeof DNSRecords.CLASS[keyof typeof DNSRecords.CLASS];

    export interface Record {
        name: string;
        ttl: number;
        [data: string]: any;
    }

    export interface ResponseRecord extends Record {
        type: TYPES;
        class: CLASSES;
    }

    export interface A extends Record {
        address: string;
    }

    export interface AAAA extends A {}

    export interface CNAME extends Record {
        domain: string;
    }

    export interface MX extends Record {
        exchange: string;
        priority: number;
    }

    export interface NS extends Record {
        ns: string;
    }

    export interface PTR extends Record {
        domain: string;
    }

    export interface SOA extends Record {
        primary: string;
        admin: string;
        serial: number;
        refresh: number;
        retry: number;
        expiration: number;
        minimum: number;
    }

    export interface TXT extends Record {
        data: string | string[];
    }
}

export namespace DNSRecords.Util {

    export function nextSoaSerial(currentSerial?: number) {
        const now = new Date();

        // Create today's base serial: YYYYMMDD
        const todayBase = now.getFullYear().toString() +
            String(now.getMonth() + 1).padStart(2, '0') +
            String(now.getDate()).padStart(2, '0');

        const todayBaseNum = parseInt(todayBase, 10);

        if (!currentSerial) {
            // If no serial exists yet, start with today's date + 00
            return parseInt(todayBase + '00', 10);
        }

        const currentDatePart = Math.floor(currentSerial / 100); // first 8 digits
        let counter = currentSerial % 100; // last 2 digits

        if (currentDatePart === todayBaseNum) {
            // Same date → increment counter
            counter++;
            if (counter > 99) {
                throw new Error('SOA serial overflow for today — max 99 edits per day.');
            }
        } else if (currentDatePart < todayBaseNum) {
            // New day → reset counter
            counter = 0;
        } else {
            throw new Error('Current serial is from the future — check your clock.');
        }

        return parseInt(todayBase + String(counter).padStart(2, '0'), 10);
    }

}