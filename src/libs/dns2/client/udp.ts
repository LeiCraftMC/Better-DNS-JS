import * as udp from 'dgram';
import { Packet } from '../packet';
import { debuglog } from "util";
import { equal } from "assert";

const debug = debuglog("dns2");

export const UDPClient = ({ dns = "8.8.8.8", port = 53, socketType = "udp4" } = {}) => {
    return (
        nameOrPacket: string | any,
        type = "A",
        cls = Packet.CLASS.IN,
        { clientIp = undefined, recursive = true } = {}
    ) => {
		let query;
		if (nameOrPacket instanceof Packet) {
			query = nameOrPacket;
		} else {
			const name = nameOrPacket;
			query = new Packet();
			query.header.id = (Math.random() * 1e4) | 0;

			// see https://github.com/song940/node-dns/issues/29
			if (recursive) {
				query.header.rd = 1;
			}
			if (clientIp) {
				query.additionals.push(
					Packet.Resource.EDNS([Packet.Resource.EDNS.ECS(clientIp)])
				);
			}
			query.questions.push({
				name,
				class: cls,
				type: Packet.TYPE[type],
			});
		}

        const client = new udp.Socket(socketType);
        return new Promise((resolve, reject) => {
            client.once("message", function onMessage(message) {
                client.close();
                const response = Packet.parse(message);
                equal(response.header.id, query.header.id);
                resolve(response);
            });
            debug("send", dns, query.toBuffer());
            client.send(
                query.toBuffer(),
                port,
                dns,
                (err) => err && reject(err)
            );
        });
    };
};
