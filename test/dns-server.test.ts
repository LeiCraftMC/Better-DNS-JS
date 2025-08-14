import { describe, test, expect } from "bun:test";


describe("DNSServer", () => {

    test("should start the server", async () => {
        const server = new DNSServer({
            port: 53,
            ip: "0.0.0.0",
            protocol: "udp",
            dnsRecordStore: new ()
        });

        await server.start();

        expect(server).toBeInstanceOf(DNSServer);
    });

});