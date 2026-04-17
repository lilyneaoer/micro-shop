/**
 * Socket.IO default controller
 * Handles connection and disconnection events
 */
export default class DefaultController {
  app: any;
  ctx: any;

  async connect() {
    const { socket } = this.ctx;
    const socketData = socket.data || {};

    this.app.logger.info('WebSocket client connected:', {
      id: socket.id,
      type: socketData.type,
      room: socketData.room,
    });
  }

  async disconnect() {
    const { socket } = this.ctx;
    const socketData = socket.data || {};

    this.app.logger.info('WebSocket client disconnected:', {
      id: socket.id,
      type: socketData.type,
      room: socketData.room,
    });
  }
}
