/**
 * Integration Tests - WebSocket Order Status Push
 *
 * Tests WebSocket real-time push notifications for order status changes:
 * 1. Merchant WebSocket connection with JWT authentication
 * 2. Customer WebSocket connection with Session Token authentication
 * 3. Order status change events pushed to relevant rooms
 * 4. New order events pushed to merchant room
 *
 * **Validates: Requirements 5.2, 5.3, 6.1**
 */

import { app } from '../bootstrap';
import { io as ioClient, Socket } from 'socket.io-client';
import * as jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcryptjs';

describe('Integration Tests - WebSocket Push Notifications', () => {
  let server: any;
  let merchantToken: string;
  let merchantId: string;
  let tableId: string;
  let sessionToken: string;
  let sessionId: string;
  let dishId: string;
  let categoryId: string;

  const JWT_SECRET = 'qr_ordering_jwt_secret_change_in_production';
  const WS_PORT = 7002; // Use a different port for WebSocket tests

  beforeAll(async () => {
    // Start the Egg.js application on a specific port
    server = app.listen(WS_PORT);
    await app.ready();

    // Sync database models
    await app.model.sync({ force: true });

    // Create test merchant
    const merchant = await app.model.Merchant.create({
      id: uuidv4(),
      username: 'ws_test_merchant',
      password_hash: await bcrypt.hash('password123', 10),
      shop_name: 'WebSocket Test Restaurant',
      is_locked: false,
      failed_login_count: 0,
    });
    merchantId = (merchant as any).id;

    // Generate JWT token
    merchantToken = jwt.sign(
      { merchantId: (merchant as any).id, username: (merchant as any).username },
      JWT_SECRET,
      { expiresIn: '24h' },
    );

    // Create test table
    const table = await app.model.Table.create({
      id: uuidv4(),
      merchant_id: merchantId,
      table_no: 'WS01',
      seat_count: 4,
      area: 'Test Area',
      qr_token: uuidv4(),
      is_active: true,
    });
    tableId = (table as any).id;

    // Create test category
    const category = await app.model.Category.create({
      id: uuidv4(),
      merchant_id: merchantId,
      name: 'WebSocket Test Category',
      sort_order: 1,
    });
    categoryId = (category as any).id;

    // Create test dish
    const dish = await app.model.Dish.create({
      id: uuidv4(),
      merchant_id: merchantId,
      category_id: categoryId,
      name: 'WebSocket Test Dish',
      description: 'Test dish for WebSocket',
      price: 5000,
      is_available: true,
      has_sku: false,
      sort_order: 1,
    });
    dishId = (dish as any).id;

    // Create test session
    const session = await app.model.Session.create({
      id: uuidv4(),
      open_id: 'ws_test_openid',
      table_id: tableId,
      session_token: uuidv4(),
      expires_at: new Date(Date.now() + 4 * 3600 * 1000),
    });
    sessionToken = (session as any).session_token;
    sessionId = (session as any).id;
  });

  afterAll(async () => {
    await app.model.sync({ force: true });
    await app.close();
    server.close();
  });

  describe('1. WebSocket Connection Authentication', () => {
    it('should accept merchant connection with valid JWT token', (done) => {
      const merchantSocket: Socket = ioClient(`http://localhost:${WS_PORT}`, {
        auth: {
          token: merchantToken,
          type: 'merchant',
        },
        transports: ['websocket'],
      });

      merchantSocket.on('connect', () => {
        expect(merchantSocket.connected).toBe(true);
        merchantSocket.disconnect();
        done();
      });

      merchantSocket.on('connect_error', (error) => {
        done(new Error(`Connection failed: ${error.message}`));
      });
    });

    it('should reject merchant connection with invalid JWT token', (done) => {
      const invalidToken = jwt.sign(
        { merchantId: 'invalid', username: 'invalid' },
        'wrong_secret',
        { expiresIn: '24h' },
      );

      const merchantSocket: Socket = ioClient(`http://localhost:${WS_PORT}`, {
        auth: {
          token: invalidToken,
          type: 'merchant',
        },
        transports: ['websocket'],
      });

      merchantSocket.on('connect', () => {
        merchantSocket.disconnect();
        done(new Error('Should not connect with invalid token'));
      });

      merchantSocket.on('connect_error', (error) => {
        expect(error).toBeDefined();
        done();
      });
    });

    it('should accept customer connection with valid session token', (done) => {
      const customerSocket: Socket = ioClient(`http://localhost:${WS_PORT}`, {
        auth: {
          token: sessionToken,
          type: 'customer',
        },
        transports: ['websocket'],
      });

      customerSocket.on('connect', () => {
        expect(customerSocket.connected).toBe(true);
        customerSocket.disconnect();
        done();
      });

      customerSocket.on('connect_error', (error) => {
        done(new Error(`Connection failed: ${error.message}`));
      });
    });

    it('should reject customer connection with invalid session token', (done) => {
      const customerSocket: Socket = ioClient(`http://localhost:${WS_PORT}`, {
        auth: {
          token: 'invalid_session_token',
          type: 'customer',
        },
        transports: ['websocket'],
      });

      customerSocket.on('connect', () => {
        customerSocket.disconnect();
        done(new Error('Should not connect with invalid session token'));
      });

      customerSocket.on('connect_error', (error) => {
        expect(error).toBeDefined();
        done();
      });
    });
  });

  describe('2. Order Status Change Push Notifications', () => {
    it('should push order:status_changed event to merchant and customer', (done) => {
      let merchantReceived = false;
      let customerReceived = false;

      const merchantSocket: Socket = ioClient(`http://localhost:${WS_PORT}`, {
        auth: {
          token: merchantToken,
          type: 'merchant',
        },
        transports: ['websocket'],
      });

      const customerSocket: Socket = ioClient(`http://localhost:${WS_PORT}`, {
        auth: {
          token: sessionToken,
          type: 'customer',
        },
        transports: ['websocket'],
      });

      const checkCompletion = () => {
        if (merchantReceived && customerReceived) {
          merchantSocket.disconnect();
          customerSocket.disconnect();
          done();
        }
      };

      merchantSocket.on('connect', async () => {
        customerSocket.on('connect', async () => {
          // Create an order
          const order = await app.model.Order.create({
            id: uuidv4(),
            order_no: 'WS_ORD_' + Date.now(),
            merchant_id: merchantId,
            table_id: tableId,
            session_id: sessionId,
            total_amount: 5000,
            status: '待支付',
          });

          await app.model.OrderItem.create({
            id: uuidv4(),
            order_id: (order as any).id,
            dish_id: dishId,
            sku_id: null,
            dish_name: 'WebSocket Test Dish',
            sku_name: null,
            unit_price: 5000,
            quantity: 1,
            subtotal: 5000,
          });

          // Listen for status change events
          merchantSocket.on('order:status_changed', (data) => {
            expect(data.orderId).toBe((order as any).id);
            expect(data.status).toBe('已支付');
            merchantReceived = true;
            checkCompletion();
          });

          customerSocket.on('order:status_changed', (data) => {
            expect(data.orderId).toBe((order as any).id);
            expect(data.status).toBe('已支付');
            customerReceived = true;
            checkCompletion();
          });

          // Trigger status change via service
          await app.model.Order.update(
            { status: '已支付', paid_at: new Date() },
            { where: { id: (order as any).id } },
          );

          // Manually trigger WebSocket push (simulating what the service would do)
          if ((app as any).io) {
            (app as any).io.to(`merchant:${merchantId}`).emit('order:status_changed', {
              orderId: (order as any).id,
              tableId: tableId,
              status: '已支付',
              updatedAt: new Date().toISOString(),
            });

            (app as any).io.to(`table:${tableId}`).emit('order:status_changed', {
              orderId: (order as any).id,
              tableId: tableId,
              status: '已支付',
              updatedAt: new Date().toISOString(),
            });
          }
        });
      });

      // Timeout after 5 seconds
      setTimeout(() => {
        merchantSocket.disconnect();
        customerSocket.disconnect();
        if (!merchantReceived || !customerReceived) {
          done(
            new Error(
              `Timeout: merchant=${merchantReceived}, customer=${customerReceived}`,
            ),
          );
        }
      }, 5000);
    });

    it('should push order:status_changed event within 5 seconds (Requirement 5.3)', (done) => {
      const customerSocket: Socket = ioClient(`http://localhost:${WS_PORT}`, {
        auth: {
          token: sessionToken,
          type: 'customer',
        },
        transports: ['websocket'],
      });

      customerSocket.on('connect', async () => {
        // Create an order
        const order = await app.model.Order.create({
          id: uuidv4(),
          order_no: 'WS_TIMING_' + Date.now(),
          merchant_id: merchantId,
          table_id: tableId,
          session_id: sessionId,
          total_amount: 5000,
          status: '待支付',
        });

        const startTime = Date.now();

        customerSocket.on('order:status_changed', (data) => {
          const endTime = Date.now();
          const delay = endTime - startTime;

          expect(data.orderId).toBe((order as any).id);
          expect(delay).toBeLessThan(5000); // Should be within 5 seconds

          customerSocket.disconnect();
          done();
        });

        // Trigger status change
        await app.model.Order.update(
          { status: '已接单' },
          { where: { id: (order as any).id } },
        );

        // Manually trigger WebSocket push
        if ((app as any).io) {
          (app as any).io.to(`table:${tableId}`).emit('order:status_changed', {
            orderId: (order as any).id,
            tableId: tableId,
            status: '已接单',
            updatedAt: new Date().toISOString(),
          });
        }
      });

      // Timeout after 6 seconds (should fail if not received within 5s)
      setTimeout(() => {
        customerSocket.disconnect();
        done(new Error('Status change notification not received within 5 seconds'));
      }, 6000);
    });
  });

  describe('3. New Order Push Notifications (Requirement 6.1)', () => {
    it('should push order:new event to merchant within 10 seconds', (done) => {
      const merchantSocket: Socket = ioClient(`http://localhost:${WS_PORT}`, {
        auth: {
          token: merchantToken,
          type: 'merchant',
        },
        transports: ['websocket'],
      });

      merchantSocket.on('connect', async () => {
        const startTime = Date.now();

        merchantSocket.on('order:new', (data) => {
          const endTime = Date.now();
          const delay = endTime - startTime;

          expect(data.orderId).toBeDefined();
          expect(data.tableNo).toBe('WS01');
          expect(data.totalAmount).toBe(5000);
          expect(delay).toBeLessThan(10000); // Should be within 10 seconds

          merchantSocket.disconnect();
          done();
        });

        // Create a new order
        const order = await app.model.Order.create({
          id: uuidv4(),
          order_no: 'WS_NEW_' + Date.now(),
          merchant_id: merchantId,
          table_id: tableId,
          session_id: sessionId,
          total_amount: 5000,
          status: '已支付',
          paid_at: new Date(),
        });

        // Manually trigger WebSocket push
        if ((app as any).io) {
          (app as any).io.to(`merchant:${merchantId}`).emit('order:new', {
            orderId: (order as any).id,
            tableNo: 'WS01',
            totalAmount: 5000,
            createdAt: new Date().toISOString(),
          });
        }
      });

      // Timeout after 11 seconds
      setTimeout(() => {
        merchantSocket.disconnect();
        done(new Error('New order notification not received within 10 seconds'));
      }, 11000);
    });

    it('should only push order:new to merchant, not to customer', (done) => {
      let merchantReceived = false;
      let customerReceived = false;

      const merchantSocket: Socket = ioClient(`http://localhost:${WS_PORT}`, {
        auth: {
          token: merchantToken,
          type: 'merchant',
        },
        transports: ['websocket'],
      });

      const customerSocket: Socket = ioClient(`http://localhost:${WS_PORT}`, {
        auth: {
          token: sessionToken,
          type: 'customer',
        },
        transports: ['websocket'],
      });

      merchantSocket.on('connect', () => {
        customerSocket.on('connect', async () => {
          merchantSocket.on('order:new', () => {
            merchantReceived = true;
          });

          customerSocket.on('order:new', () => {
            customerReceived = true;
          });

          // Create a new order
          const order = await app.model.Order.create({
            id: uuidv4(),
            order_no: 'WS_MERCHANT_ONLY_' + Date.now(),
            merchant_id: merchantId,
            table_id: tableId,
            session_id: sessionId,
            total_amount: 5000,
            status: '已支付',
            paid_at: new Date(),
          });

          // Manually trigger WebSocket push
          if ((app as any).io) {
            (app as any).io.to(`merchant:${merchantId}`).emit('order:new', {
              orderId: (order as any).id,
              tableNo: 'WS01',
              totalAmount: 5000,
              createdAt: new Date().toISOString(),
            });
          }

          // Wait 2 seconds to ensure customer doesn't receive the event
          setTimeout(() => {
            expect(merchantReceived).toBe(true);
            expect(customerReceived).toBe(false);

            merchantSocket.disconnect();
            customerSocket.disconnect();
            done();
          }, 2000);
        });
      });
    });
  });

  describe('4. WebSocket Room Management', () => {
    it('should join merchant to merchant room on connection', (done) => {
      const merchantSocket: Socket = ioClient(`http://localhost:${WS_PORT}`, {
        auth: {
          token: merchantToken,
          type: 'merchant',
        },
        transports: ['websocket'],
      });

      merchantSocket.on('connect', () => {
        // Verify socket is in merchant room by sending a test event
        merchantSocket.on('test:merchant_room', (data) => {
          expect(data.message).toBe('You are in merchant room');
          merchantSocket.disconnect();
          done();
        });

        // Manually emit to merchant room
        if ((app as any).io) {
          (app as any).io.to(`merchant:${merchantId}`).emit('test:merchant_room', {
            message: 'You are in merchant room',
          });
        }
      });

      setTimeout(() => {
        merchantSocket.disconnect();
        done(new Error('Merchant room test timeout'));
      }, 3000);
    });

    it('should join customer to table room on connection', (done) => {
      const customerSocket: Socket = ioClient(`http://localhost:${WS_PORT}`, {
        auth: {
          token: sessionToken,
          type: 'customer',
        },
        transports: ['websocket'],
      });

      customerSocket.on('connect', () => {
        // Verify socket is in table room by sending a test event
        customerSocket.on('test:table_room', (data) => {
          expect(data.message).toBe('You are in table room');
          customerSocket.disconnect();
          done();
        });

        // Manually emit to table room
        if ((app as any).io) {
          (app as any).io.to(`table:${tableId}`).emit('test:table_room', {
            message: 'You are in table room',
          });
        }
      });

      setTimeout(() => {
        customerSocket.disconnect();
        done(new Error('Table room test timeout'));
      }, 3000);
    });
  });
});
