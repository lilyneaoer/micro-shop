import 'egg';
import { Server } from 'http';
import { Redis } from 'ioredis';

declare module 'egg' {
  interface Application {
    server: Server;
    redis: Redis;
    io: any; // egg-socket.io namespace
  }

  interface EggAppConfig {
    jwt: {
      secret: string;
      expiresIn: string;
    };
    rateLimit: {
      max: number;
      windowMs: number;
    };
    io: {
      init: any;
      namespace: any;
    };
  }
}
