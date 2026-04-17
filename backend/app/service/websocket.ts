import { Service } from 'egg';
import { OrderStatus } from '../model/order';

/**
 * WebSocket real-time push service
 * Requirements: 5.2, 5.3, 6.1
 *
 * Manages merchant rooms and table rooms using egg-socket.io
 * - Merchant side carries JWT Token for authentication
 * - Customer side carries Session Token for authentication
 * - Server validates tokens and joins clients to corresponding rooms
 *
 * Events:
 * - order:status_changed - Push order status changes to related rooms (customer and merchant)
 * - order:new - Push new order arrival to merchant room
 */
export default class WebSocketService extends Service {
  /**
   * Push order status change event to related rooms
   * Requirements: 5.2, 5.3
   *
   * Pushes to:
   * - Table room (customer side)
   * - Merchant room (merchant side)
   *
   * Status update should be pushed within 5 seconds (Requirement 5.3)
   */
  async pushOrderStatusChanged(orderId: string, merchantId: string, tableId: string, status: OrderStatus) {
    const io = this.app.io;
    if (!io) {
      this.ctx.logger.warn('Socket.IO not initialized, cannot push order status change');
      return;
    }

    const event = 'order:status_changed';
    const data = {
      orderId,
      tableId,
      status,
      updatedAt: new Date().toISOString(),
    };

    // Push to table room (customer)
    const tableRoom = `table:${tableId}`;
    io.of('/').to(tableRoom).emit(event, data);
    this.ctx.logger.info(`Pushed ${event} to table room ${tableRoom}:`, data);

    // Push to merchant room
    const merchantRoom = `merchant:${merchantId}`;
    io.of('/').to(merchantRoom).emit(event, data);
    this.ctx.logger.info(`Pushed ${event} to merchant room ${merchantRoom}:`, data);
  }

  /**
   * Push new order arrival event to merchant room
   * Requirements: 6.1
   *
   * New order should be pushed within 10 seconds (Requirement 6.1)
   */
  async pushNewOrder(
    orderId: string,
    merchantId: string,
    tableNo: string,
    totalAmount: number,
  ) {
    const io = this.app.io;
    if (!io) {
      this.ctx.logger.warn('Socket.IO not initialized, cannot push new order');
      return;
    }

    const event = 'order:new';
    const data = {
      orderId,
      tableNo,
      totalAmount,
      createdAt: new Date().toISOString(),
    };

    // Push to merchant room only
    const merchantRoom = `merchant:${merchantId}`;
    io.of('/').to(merchantRoom).emit(event, data);
    this.ctx.logger.info(`Pushed ${event} to merchant room ${merchantRoom}:`, data);
  }
}
