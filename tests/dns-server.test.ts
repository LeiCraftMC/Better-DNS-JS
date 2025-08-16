import { BasicInMemoryDNSZoneStore, DNSRecords, DNSServer, DNSZone } from "better-dns";
import { describe, expect, test } from "bun:test";
import DNS from "dns2";


describe("dns_server", () => {

    test("should_return_correct_records", async () => {

        const server = new DNSServer({
            port: 53,
            ip: "0.0.0.0",
            protocol: "udp",
            dnsRecordStore: new BasicInMemoryDNSZoneStore({
                nsDomain: "ns.example.com",
                nsAdminEmail: "admin.ns.example.com"
            })
        });

        await server.start();

        const zone = await server.recordStore.createZone("domain.tld");
        zone.setRecord("domain.tld", DNSRecords.TYPE.A, {
            address: "192.0.2.1",
            ttl: 3600
        });
        zone.setRecord("domain.tld", DNSRecords.TYPE.AAAA, {
            address: "2001:db8::1",
            ttl: 3600
        });
        zone.setRecord("www.domain.tld", DNSRecords.TYPE.CNAME, {
            domain: "domain.tld",
            ttl: 3600
        });
        zone.setRecord("domain.tld", DNSRecords.TYPE.MX, {
            exchange: "mail.domain.tld",
            priority: 10,
            ttl: 3600
        });
        zone.setRecord("domain.tld", DNSRecords.TYPE.TXT, {
            data: "v=spf1 include:example.com -all",
            ttl: 3600
        });
        zone.setRecord("domain.tld", DNSRecords.TYPE.SPF, {
            data: "v=spf1 include:example.com -all",
            ttl: 3600
        });
        zone.setRecord("domain.tld", DNSRecords.TYPE.CAA, {
            flags: 0,
            tag: "issuewild",
            value: "letsencrypt.org",
            ttl: 3600
        });
        zone.setRecord("_srv._tcp.domain.tld", DNSRecords.TYPE.SRV, {
            priority: 10,
            weight: 5,
            port: 8080,
            target: "srv.domain.tld",
            ttl: 3600
        });
        
        await server.recordStore.setZone(zone);

        const client = new DNS({
            nameServers: [
                "127.0.0.1"
            ]
        });

        const a_response = (await client.query("domain.tld", "A", DNSRecords.CLASS.IN)).answers[0] as DNS.DnsAnswer;
        const aaaa_response = (await client.query("domain.tld", "AAAA", DNSRecords.CLASS.IN)).answers[0] as DNS.DnsAnswer;
        const cname_response = (await client.query("www.domain.tld", "CNAME", DNSRecords.CLASS.IN)).answers[0] as DNS.DnsAnswer;
        const mx_response = (await client.query("domain.tld", "MX", DNSRecords.CLASS.IN)).answers[0] as DNS.DnsAnswer;
        const txt_response = (await client.query("domain.tld", "TXT", DNSRecords.CLASS.IN)).answers[0] as DNS.DnsAnswer;
        const soa_response = (await client.query("domain.tld", "SOA", DNSRecords.CLASS.IN)).answers[0] as DNS.DnsAnswer;
        const ns_response = (await client.query("domain.tld", "NS", DNSRecords.CLASS.IN)).answers[0] as DNS.DnsAnswer;
        const spf_response = (await client.query("domain.tld", "SPF", DNSRecords.CLASS.IN)).answers[0] as DNS.DnsAnswer;
        const caa_response = (await client.query("domain.tld", "CAA", DNSRecords.CLASS.IN)).answers[0] as DNS.DnsAnswer;
        const srv_response = (await client.query("_srv._tcp.domain.tld", "SRV", DNSRecords.CLASS.IN)).answers[0] as DNS.DnsAnswer;

        expect(a_response.name).toBe("domain.tld");
        expect(a_response.type).toBe(DNSRecords.TYPE.A);
        expect(a_response.class).toBe(DNSRecords.CLASS.IN);
        expect(a_response.address).toBe("192.0.2.1");
        expect(a_response.ttl).toBe(3600);

        expect(aaaa_response.name).toBe("domain.tld");
        expect(aaaa_response.type).toBe(DNSRecords.TYPE.AAAA);
        expect(aaaa_response.class).toBe(DNSRecords.CLASS.IN);
        expect(aaaa_response.address).toBe("2001:db8::1");
        expect(aaaa_response.ttl).toBe(3600);

        expect(cname_response.name).toBe("www.domain.tld");
        expect(cname_response.type).toBe(DNSRecords.TYPE.CNAME);
        expect(cname_response.class).toBe(DNSRecords.CLASS.IN);
        expect(cname_response.domain).toBe("domain.tld");
        expect(cname_response.ttl).toBe(3600);

        expect(mx_response.name).toBe("domain.tld");
        expect(mx_response.type).toBe(DNSRecords.TYPE.MX);
        expect(mx_response.class).toBe(DNSRecords.CLASS.IN);
        expect((mx_response as any as DNSRecords.MX).exchange).toBe("mail.domain.tld");
        expect((mx_response as any as DNSRecords.MX).priority).toBe(10);
        expect(mx_response.ttl).toBe(3600);

        expect(txt_response.name).toBe("domain.tld");
        expect(txt_response.type).toBe(DNSRecords.TYPE.TXT);
        expect(txt_response.class).toBe(DNSRecords.CLASS.IN);
        expect(txt_response.data).toBe("v=spf1 include:example.com -all");
        expect(txt_response.ttl).toBe(3600);

        expect(soa_response.name).toBe("domain.tld");
        expect(soa_response.type).toBe(DNSRecords.TYPE.SOA);
        expect(soa_response.class).toBe(DNSRecords.CLASS.IN);
        expect((soa_response as any as DNSRecords.SOA).primary).toBe("ns.example.com");
        expect((soa_response as any as DNSRecords.SOA).admin).toBe("admin.ns.example.com");
        expect((soa_response as any as DNSRecords.SOA).serial).toBe(DNSZone.Util.nextSoaSerial() + 2);
        expect((soa_response as any as DNSRecords.SOA).refresh).toBe(3600);
        expect((soa_response as any as DNSRecords.SOA).retry).toBe(1800);
        expect((soa_response as any as DNSRecords.SOA).expiration).toBe(604800);
        expect((soa_response as any as DNSRecords.SOA).minimum).toBe(86400);
        expect(soa_response.ttl).toBe(3600);

        expect(ns_response.name).toBe("domain.tld");
        expect(ns_response.type).toBe(DNSRecords.TYPE.NS);
        expect(ns_response.class).toBe(DNSRecords.CLASS.IN);
        expect((ns_response as any as DNSRecords.NS).ns).toBe("ns.example.com");
        expect(ns_response.ttl).toBe(3600);

        expect(spf_response.name).toBe("domain.tld");
        expect(spf_response.type).toBe(DNSRecords.TYPE.SPF);
        expect(spf_response.class).toBe(DNSRecords.CLASS.IN);
        expect(spf_response.data).toBe("v=spf1 include:example.com -all");
        expect(spf_response.ttl).toBe(3600);

        // expect(caa_response.name).toBe("domain.tld");
        // expect(caa_response.type).toBe(DNSRecords.TYPE.CAA);
        // expect(caa_response.class).toBe(DNSRecords.CLASS.IN);
        // expect((caa_response as any as DNSRecords.CAA).flags).toBe(0);
        // expect((caa_response as any as DNSRecords.CAA).tag).toBe("issuewild");
        // expect((caa_response as any as DNSRecords.CAA).value).toBe("letsencrypt.org");
        // expect(caa_response.ttl).toBe(3600);

        expect(srv_response.name).toBe("_srv._tcp.domain.tld");
        expect(srv_response.type).toBe(DNSRecords.TYPE.SRV);
        expect(srv_response.class).toBe(DNSRecords.CLASS.IN);
        expect((srv_response as any as DNSRecords.SRV).priority).toBe(10);
        expect((srv_response as any as DNSRecords.SRV).weight).toBe(5);
        expect((srv_response as any as DNSRecords.SRV).port).toBe(8080);
        expect((srv_response as any as DNSRecords.SRV).target).toBe("srv.domain.tld");
        expect(srv_response.ttl).toBe(3600);
    });

    test("utility_functions", () => {

        expect(DNSZone.Util.getZoneNames("www.sub.domain.tld")).toEqual([
            "www.sub.domain.tld",
            "sub.domain.tld",
            "domain.tld"
        ]);
        expect(DNSZone.Util.getZoneNames("www.sub.domain.tld", true)).toEqual([
            "www.sub.domain.tld",
            "sub.domain.tld",
            "domain.tld",
            "tld"
        ]);

        expect(DNSZone.Util.nextSoaSerial()).toBeGreaterThan(0);
    });

});