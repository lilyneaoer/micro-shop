import { EggAppConfig, EggAppInfo, PowerPartial } from 'egg';

export default (appInfo: EggAppInfo): PowerPartial<EggAppConfig> => {
  const config: PowerPartial<EggAppConfig> = {};

  // Secret key for cookie signing
  config.keys = appInfo.name + '_qr_ordering_secret_key';

  // Middleware configuration
  config.middleware = ['logger', 'rateLimit'];

  // Security configuration
  config.security = {
    csrf: {
      enable: false,
    },
  };

  // CORS configuration
  config.cors = {
    origin: '*',
    allowMethods: 'GET,HEAD,PUT,POST,DELETE,PATCH',
  };

  // Body parser configuration
  config.bodyParser = {
    jsonLimit: '10mb',
    formLimit: '10mb',
    // Ignore Socket.IO paths
    ignore: /^\/socket\.io/,
  };

  // Multipart configuration for file uploads
  config.multipart = {
    mode: 'stream',
    fileSize: '10mb',
    fileExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
  };

  // Sequelize (PostgreSQL) configuration
  config.sequelize = {
    dialect: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'qr_ordering',
    username: process.env.DB_USER || 'snow',
    password: process.env.DB_PASSWORD || '',
    timezone: '+08:00',
    define: {
      underscored: true,
      freezeTableName: false,
      timestamps: true,
    },
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
  };

  // Redis configuration
  config.redis = {
    client: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD || '',
      db: parseInt(process.env.REDIS_DB || '0', 10),
    },
  };

  // JWT configuration
  config.jwt = {
    secret: process.env.JWT_SECRET || 'qr_ordering_jwt_secret_change_in_production',
    expiresIn: '24h',
  };

  // Rate limit configuration (requests per minute per IP)
  config.rateLimit = {
    max: 60,
    windowMs: 60 * 1000, // 1 minute
  };

  // Logger configuration
  config.logger = {
    dir: 'logs',
    level: 'INFO',
    consoleLevel: 'INFO',
  };

  // Socket.IO configuration
  config.io = {
    init: {
      // Socket.IO server options
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
      },
      transports: ['websocket', 'polling'],
    },
    namespace: {
      '/': {
        connectionMiddleware: ['auth'],
        packetMiddleware: [],
      },
    },
  };

  return config;
};
