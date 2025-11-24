import { BasicInMemoryDNSZoneStore, DNSRecords, DNSServer } from "better-dns";

const server = new DNSServer({
    port: 53,
    host: "::",
    protocol: "both",
    dnsRecordStore: new BasicInMemoryDNSZoneStore({
        nsDomain: "ns.example.com",
        nsAdminEmail: "admin.ns.example.com"
    })
});


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


await server.start();
console.log("DNS server started on [::]:53");

