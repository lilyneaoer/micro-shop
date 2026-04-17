// This file is created by egg-ts-helper@2.1.1
// Do not modify this file!!!!!!!!!
/* eslint-disable */

import 'egg';
import ExportAuth from '../../../app/middleware/auth';
import ExportLogger from '../../../app/middleware/logger';
import ExportOptionalAuth from '../../../app/middleware/optionalAuth';
import ExportRateLimit from '../../../app/middleware/rateLimit';
import ExportSessionAuth from '../../../app/middleware/sessionAuth';

declare module 'egg' {
  interface IMiddleware {
    auth: typeof ExportAuth;
    logger: typeof ExportLogger;
    optionalAuth: typeof ExportOptionalAuth;
    rateLimit: typeof ExportRateLimit;
    sessionAuth: typeof ExportSessionAuth;
  }
}
