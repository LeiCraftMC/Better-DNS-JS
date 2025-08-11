import { DNSServer } from './dns';
import { DOHServer } from './doh';
import { TCPServer } from './tcp';
import { UDPServer } from './udp';

export const createUDPServer = options => {
  return new UDPServer(options);
};

export const createTCPServer = options => {
  return new TCPServer(options);
};

export const createDOHServer = options => {
  return new DOHServer(options);
};

export const createServer = options => {
  return new DNSServer(options);
};


export * from './udp';
export * from './tcp';
export * from './doh';
export * from './dns';