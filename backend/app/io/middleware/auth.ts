import * as jwt from 'jsonwebtoken';

/**
 * Socket.IO connection authentication middleware
 * Authenticates clients using JWT Token (merchant) or Session Token (customer)
 */
export default () => {
  return async (ctx: any, next: () => Promise<void>) => {
    const { app, socket } = ctx;
    const token = socket.handshake?.auth?.token || socket.handshake?.query?.token as string | undefined;

    if (!token) {
      ctx.logger.warn('WebSocket connection rejected: no token provided');
      socket.emit('error', { message: '未提供认证令牌' });
      socket.disconnect(true);
      return;
    }

    // Try to authenticate as merchant (JWT Token)
    try {
      const { secret } = app.config.jwt;
      const decoded = jwt.verify(token, secret) as { merchantId: string; username: string };
      
      // Merchant authentication successful
      const merchantId = decoded.merchantId;
      const merchantRoom = `merchant:${merchantId}`;

      socket.join(merchantRoom);
      socket.data = {
        type: 'merchant',
        merchantId,
        room: merchantRoom,
      };

      ctx.logger.info(`Merchant ${merchantId} joined room ${merchantRoom}`);
      socket.emit('authenticated', { type: 'merchant', merchantId });

      await next();
      return;
    } catch (error) {
      // JWT verification failed, try session token
    }

    // Try to authenticate as customer (Session Token)
    try {
      const result = await ctx.service.session.validateSessionToken(token);
      if (result.valid) {
        const tableId = result.tableId!;
        const sessionId = result.sessionId!;
        const tableRoom = `table:${tableId}`;

        socket.join(tableRoom);
        socket.data = {
          type: 'customer',
          sessionId,
          tableId,
          room: tableRoom,
        };

        ctx.logger.info(`Customer (session ${sessionId}) joined room ${tableRoom}`);
        socket.emit('authenticated', { type: 'customer', tableId, sessionId });

        await next();
        return;
      }
    } catch (error) {
      ctx.logger.error('Session token validation error:', error);
    }

    // Authentication failed
    ctx.logger.warn('WebSocket connection rejected: invalid token');
    socket.emit('error', { message: '认证失败' });
    socket.disconnect(true);
  };
};
