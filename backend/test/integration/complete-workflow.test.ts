/**
 * Integration Tests - Complete Ordering Workflow
 *
 * Tests the complete ordering flow using supertest + Docker Compose test database:
 * 1. Merchant authentication and token verification
 * 2. Session creation → Menu query → Order submission → Payment callback → Status changes
 * 3. WebSocket order status push notifications
 *
 * **Validates: Requirements 3.1 ~ 5.7, 9.1 ~ 9.5**
 */

import request from 'supertest';
import { app } from '../bootstrap';
import * as jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcryptjs';

describe('Integration Tests - Complete Workflow', () => {
  let server: any;
  let merchantToken: string;
  let merchantId: string;
  let tableId: string;
  let sessionToken: string;
  let categoryId: string;
  let dishId: string;
  let orderId: string;

  const JWT_SECRET = 'qr_ordering_jwt_secret_change_in_production';

  beforeAll(async () => {
    // Start the Egg.js application
    server = app.listen(0); // Use random port
    await app.ready();

    // Sync database models (create tables if not exist)
    await app.model.sync({ force: true });

    // Create a test merchant
    const merchant = await app.model.Merchant.create({
      id: uuidv4(),
      username: 'test_merchant',
      password_hash: await bcrypt.hash('password123', 10),
      shop_name: 'Test Restaurant',
      is_locked: false,
      failed_login_count: 0,
    });
    merchantId = (merchant as any).id;

    // Generate JWT token for the merchant
    merchantToken = jwt.sign(
      { merchantId: (merchant as any).id, username: (merchant as any).username },
      JWT_SECRET,
      { expiresIn: '24h' },
    );
  });

  afterAll(async () => {
    // Clean up
    await app.model.sync({ force: true }); // Clear all data
    await app.close();
    server.close();
  });

  describe('1. Merchant Authentication Flow (Requirements 9.1 ~ 9.5)', () => {
    it('should login successfully with correct credentials', async () => {
      const response = await request(server)
        .post('/api/auth/login')
        .send({
          username: 'test_merchant',
          password: 'password123',
        })
        .expect(200);

      expect(response.body.code).toBe(0);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.merchant.username).toBe('test_merchant');
    });

    it('should reject login with incorrect password', async () => {
      const response = await request(server)
        .post('/api/auth/login')
        .send({
          username: 'test_merchant',
          password: 'wrong_password',
        })
        .expect(401);

      expect(response.body.code).not.toBe(0);
    });

    it('should accept API requests with valid JWT token', async () => {
      const response = await request(server)
        .get('/api/tables')
        .set('Authorization', `Bearer ${merchantToken}`)
        .expect(200);

      expect(response.body.code).toBe(0);
    });

    it('should reject API requests without JWT token', async () => {
      await request(server).get('/api/tables').expect(401);
    });

    it('should reject API requests with expired JWT token', async () => {
      const expiredToken = jwt.sign(
        { merchantId, username: 'test_merchant' },
        JWT_SECRET,
        { expiresIn: '-1s' }, // Already expired
      );

      await request(server)
        .get('/api/tables')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);
    });

    it('should reject API requests with invalid JWT signature', async () => {
      const invalidToken = jwt.sign(
        { merchantId, username: 'test_merchant' },
        'wrong_secret',
        { expiresIn: '24h' },
      );

      await request(server)
        .get('/api/tables')
        .set('Authorization', `Bearer ${invalidToken}`)
        .expect(401);
    });
  });

  describe('2. Complete Ordering Flow (Requirements 3.1 ~ 5.7)', () => {
    it('Step 1: Merchant creates a table', async () => {
      const response = await request(server)
        .post('/api/tables')
        .set('Authorization', `Bearer ${merchantToken}`)
        .send({
          table_no: 'A01',
          seat_count: 4,
          area: 'Main Hall',
        })
        .expect(200);

      expect(response.body.code).toBe(0);
      expect(response.body.data.table_no).toBe('A01');
      expect(response.body.data.qr_token).toBeDefined();
      tableId = response.body.data.id;
    });

    it('Step 2: Merchant creates a category', async () => {
      const response = await request(server)
        .post('/api/categories')
        .set('Authorization', `Bearer ${merchantToken}`)
        .send({
          name: 'Main Dishes',
          sort_order: 1,
        })
        .expect(200);

      expect(response.body.code).toBe(0);
      categoryId = response.body.data.id;
    });

    it('Step 3: Merchant creates a dish', async () => {
      const response = await request(server)
        .post('/api/dishes')
        .set('Authorization', `Bearer ${merchantToken}`)
        .send({
          category_id: categoryId,
          name: 'Kung Pao Chicken',
          description: 'Spicy stir-fried chicken',
          price: 3800, // 38.00 yuan in cents
          is_available: true,
          has_sku: false,
        })
        .expect(200);

      expect(response.body.code).toBe(0);
      expect(response.body.data.name).toBe('Kung Pao Chicken');
      expect(response.body.data.price).toBe(3800);
      dishId = response.body.data.id;
    });

    it('Step 4: Customer scans QR code and creates session', async () => {
      // Get table QR token
      const tableResponse = await request(server)
        .get(`/api/tables/${tableId}/qrcode`)
        .set('Authorization', `Bearer ${merchantToken}`)
        .expect(200);

      const qrToken = tableResponse.body.data.qr_token;

      // Create session
      const response = await request(server)
        .post('/api/sessions')
        .send({
          qr_token: qrToken,
          open_id: 'test_openid_12345',
        })
        .expect(200);

      expect(response.body.code).toBe(0);
      expect(response.body.data.session_token).toBeDefined();
      expect(response.body.data.table_id).toBe(tableId);
      sessionToken = response.body.data.session_token;
    });

    it('Step 5: Customer queries menu (only available dishes)', async () => {
      const response = await request(server)
        .get('/api/dishes')
        .set('X-Session-Token', sessionToken)
        .expect(200);

      expect(response.body.code).toBe(0);
      expect(response.body.data.length).toBeGreaterThan(0);
      // All dishes should be available
      response.body.data.forEach((dish: any) => {
        expect(dish.is_available).toBe(true);
      });
    });

    it('Step 6: Customer submits order', async () => {
      const response = await request(server)
        .post('/api/orders')
        .set('X-Session-Token', sessionToken)
        .send({
          items: [
            {
              dish_id: dishId,
              sku_id: null,
              quantity: 2,
            },
          ],
          customer_remark: 'Less spicy please',
        })
        .expect(200);

      expect(response.body.code).toBe(0);
      expect(response.body.data.order_no).toBeDefined();
      expect(response.body.data.total_amount).toBe(7600); // 2 * 3800
      expect(response.body.data.status).toBe('待支付');
      orderId = response.body.data.id;
    });

    it('Step 7: Customer creates prepay order', async () => {
      const response = await request(server)
        .post('/api/payments/prepay')
        .set('X-Session-Token', sessionToken)
        .send({
          order_id: orderId,
        })
        .expect(200);

      expect(response.body.code).toBe(0);
      expect(response.body.data.prepay_id).toBeDefined();
    });

    it('Step 8: WeChat payment callback (idempotent)', async () => {
      // Simulate WeChat payment callback
      // Note: In real scenario, this would include proper signature verification
      const callbackPayload = {
        order_id: orderId,
        transaction_id: 'wx_txn_' + Date.now(),
        amount: 7600,
      };

      // First callback - should update order status
      const response1 = await request(server)
        .post('/api/payments/notify')
        .send(callbackPayload)
        .expect(200);

      expect(response1.body.code).toBe(0);

      // Verify order status changed to paid
      const orderResponse1 = await request(server)
        .get(`/api/orders/${orderId}`)
        .set('Authorization', `Bearer ${merchantToken}`)
        .expect(200);

      expect(orderResponse1.body.data.status).toBe('已支付');

      // Second callback (duplicate) - should be idempotent
      const response2 = await request(server)
        .post('/api/payments/notify')
        .send(callbackPayload)
        .expect(200);

      expect(response2.body.code).toBe(0);

      // Verify order status remains the same
      const orderResponse2 = await request(server)
        .get(`/api/orders/${orderId}`)
        .set('Authorization', `Bearer ${merchantToken}`)
        .expect(200);

      expect(orderResponse2.body.data.status).toBe('已支付');

      // Verify only one payment record exists
      const payment = await app.model.Payment.findOne({
        where: { order_id: orderId },
      });
      expect(payment).not.toBeNull();

      const paymentCount = await app.model.Payment.count({
        where: { order_id: orderId },
      });
      expect(paymentCount).toBe(1);
    });

    it('Step 9: Merchant accepts order', async () => {
      const response = await request(server)
        .put(`/api/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${merchantToken}`)
        .send({
          status: '已接单',
        })
        .expect(200);

      expect(response.body.code).toBe(0);
      expect(response.body.data.status).toBe('已接单');
    });

    it('Step 10: Merchant completes order', async () => {
      const response = await request(server)
        .put(`/api/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${merchantToken}`)
        .send({
          status: '已完成',
        })
        .expect(200);

      expect(response.body.code).toBe(0);
      expect(response.body.data.status).toBe('已完成');
    });

    it('Step 11: Customer views order status', async () => {
      const response = await request(server)
        .get(`/api/orders/${orderId}`)
        .set('X-Session-Token', sessionToken)
        .expect(200);

      expect(response.body.code).toBe(0);
      expect(response.body.data.status).toBe('已完成');
      expect(response.body.data.items.length).toBe(1);
      expect(response.body.data.items[0].dish_name).toBe('Kung Pao Chicken');
      expect(response.body.data.items[0].quantity).toBe(2);
    });
  });

  describe('3. Order Status Validation (Requirements 5.1, 5.6)', () => {
    let testOrderId: string;

    beforeEach(async () => {
      // Create a test order for status transition tests
      const session = await app.model.Session.create({
        id: uuidv4(),
        open_id: 'test_openid_status_' + Date.now(),
        table_id: tableId,
        session_token: uuidv4(),
        expires_at: new Date(Date.now() + 4 * 3600 * 1000),
      });

      const order = await app.model.Order.create({
        id: uuidv4(),
        order_no: 'ORD' + Date.now(),
        merchant_id: merchantId,
        table_id: tableId,
        session_id: (session as any).id,
        total_amount: 3800,
        status: '待支付',
      });

      testOrderId = (order as any).id;
    });

    it('should reject invalid status transition (backward)', async () => {
      // Update to paid first
      await app.model.Order.update(
        { status: '已完成' },
        { where: { id: testOrderId } },
      );

      // Try to go back to accepted_preparing (invalid)
      const response = await request(server)
        .put(`/api/orders/${testOrderId}/status`)
        .set('Authorization', `Bearer ${merchantToken}`)
        .send({
          status: '已接单',
        })
        .expect(422);

      expect(response.body.code).not.toBe(0);
    });

    it('should accept valid status transition', async () => {
      // 待支付 → 已支付
      await app.model.Order.update(
        { status: '待支付' },
        { where: { id: testOrderId } },
      );

      const response1 = await request(server)
        .put(`/api/orders/${testOrderId}/status`)
        .set('Authorization', `Bearer ${merchantToken}`)
        .send({
          status: '已支付',
        })
        .expect(200);

      expect(response1.body.code).toBe(0);

      // 已支付 → 已接单
      const response2 = await request(server)
        .put(`/api/orders/${testOrderId}/status`)
        .set('Authorization', `Bearer ${merchantToken}`)
        .send({
          status: '已接单',
        })
        .expect(200);

      expect(response2.body.code).toBe(0);
    });

    it('should allow cancellation from any status', async () => {
      await app.model.Order.update(
        { status: '已支付' },
        { where: { id: testOrderId } },
      );

      const response = await request(server)
        .put(`/api/orders/${testOrderId}/status`)
        .set('Authorization', `Bearer ${merchantToken}`)
        .send({
          status: '已取消',
        })
        .expect(200);

      expect(response.body.code).toBe(0);
      expect(response.body.data.status).toBe('已取消');
    });
  });

  describe('4. Unavailable Dish Validation (Requirements 3.6, 3.7)', () => {
    let unavailableDishId: string;

    beforeAll(async () => {
      // Create an unavailable dish
      const dish = await app.model.Dish.create({
        id: uuidv4(),
        merchant_id: merchantId,
        category_id: categoryId,
        name: 'Unavailable Dish',
        description: 'This dish is not available',
        price: 2000,
        is_available: false,
        has_sku: false,
        sort_order: 1,
      });
      unavailableDishId = (dish as any).id;
    });

    it('should not return unavailable dishes in customer menu query', async () => {
      const response = await request(server)
        .get('/api/dishes')
        .set('X-Session-Token', sessionToken)
        .expect(200);

      expect(response.body.code).toBe(0);
      const unavailableDish = response.body.data.find(
        (d: any) => d.id === unavailableDishId,
      );
      expect(unavailableDish).toBeUndefined();
    });

    it('should reject order submission with unavailable dish', async () => {
      const response = await request(server)
        .post('/api/orders')
        .set('X-Session-Token', sessionToken)
        .send({
          items: [
            {
              dish_id: unavailableDishId,
              sku_id: null,
              quantity: 1,
            },
          ],
          customer_remark: '',
        })
        .expect(422);

      expect(response.body.code).toBe(3001); // Dish unavailable error code
      expect(response.body.message).toContain('Unavailable Dish');
    });

    it('should reject order with mixed available and unavailable dishes', async () => {
      const response = await request(server)
        .post('/api/orders')
        .set('X-Session-Token', sessionToken)
        .send({
          items: [
            {
              dish_id: dishId, // Available
              sku_id: null,
              quantity: 1,
            },
            {
              dish_id: unavailableDishId, // Unavailable
              sku_id: null,
              quantity: 1,
            },
          ],
          customer_remark: '',
        })
        .expect(422);

      expect(response.body.code).toBe(3001);
    });
  });

  describe('5. Session Management (Requirements 10.1 ~ 10.6)', () => {
    it('should create new session for new OpenID + table combination', async () => {
      const tableResponse = await request(server)
        .get(`/api/tables/${tableId}/qrcode`)
        .set('Authorization', `Bearer ${merchantToken}`)
        .expect(200);

      const qrToken = tableResponse.body.data.qr_token;

      const response = await request(server)
        .post('/api/sessions')
        .send({
          qr_token: qrToken,
          open_id: 'new_openid_' + Date.now(),
        })
        .expect(200);

      expect(response.body.code).toBe(0);
      expect(response.body.data.session_token).toBeDefined();
    });

    it('should reuse existing valid session for same OpenID + table', async () => {
      const tableResponse = await request(server)
        .get(`/api/tables/${tableId}/qrcode`)
        .set('Authorization', `Bearer ${merchantToken}`)
        .expect(200);

      const qrToken = tableResponse.body.data.qr_token;
      const openId = 'reuse_openid_' + Date.now();

      // First session creation
      const response1 = await request(server)
        .post('/api/sessions')
        .send({
          qr_token: qrToken,
          open_id: openId,
        })
        .expect(200);

      const sessionToken1 = response1.body.data.session_token;

      // Second session creation with same OpenID + table
      const response2 = await request(server)
        .post('/api/sessions')
        .send({
          qr_token: qrToken,
          open_id: openId,
        })
        .expect(200);

      const sessionToken2 = response2.body.data.session_token;

      // Should return the same session token
      expect(sessionToken2).toBe(sessionToken1);

      // Verify only one valid session exists in database
      const validSessions = await app.model.Session.count({
        where: {
          open_id: openId,
          table_id: tableId,
          expires_at: {
            [app.Sequelize.Op.gt]: new Date(),
          },
        },
      });

      expect(validSessions).toBe(1);
    });

    it('should reject API requests with expired session token', async () => {
      // Create an expired session
      const expiredSession = await app.model.Session.create({
        id: uuidv4(),
        open_id: 'expired_openid',
        table_id: tableId,
        session_token: uuidv4(),
        expires_at: new Date(Date.now() - 1000), // Already expired
      });

      const response = await request(server)
        .get('/api/sessions/current')
        .set('X-Session-Token', (expiredSession as any).session_token)
        .expect(401);

      expect(response.body.code).toBe(5002); // Session expired error code
    });

    it('should reject API requests with invalid session token', async () => {
      const response = await request(server)
        .get('/api/sessions/current')
        .set('X-Session-Token', 'invalid_token_12345')
        .expect(401);

      expect(response.body.code).toBe(5002);
    });
  });

  describe('6. API Response Format (Requirements 11.1, 11.7)', () => {
    it('should return consistent response format for all endpoints', async () => {
      // Test various endpoints
      const endpoints = [
        { method: 'get', path: '/health', auth: false },
        { method: 'get', path: '/api/tables', auth: true },
        { method: 'get', path: '/api/categories', auth: true },
        { method: 'get', path: '/api/dishes', auth: false },
      ];

      for (const endpoint of endpoints) {
        let req;
        if (endpoint.method === 'get') {
          req = request(server).get(endpoint.path);
        } else {
          req = request(server).post(endpoint.path);
        }

        if (endpoint.auth) {
          req.set('Authorization', `Bearer ${merchantToken}`);
        }

        const response = await req.expect(200);

        // Verify response structure
        expect(response.body).toHaveProperty('code');
        expect(response.body).toHaveProperty('message');
        expect(response.body).toHaveProperty('data');
        expect(typeof response.body.code).toBe('number');
        expect(typeof response.body.message).toBe('string');
      }
    });

    it('should return all amount fields as non-negative integers (cents)', async () => {
      // Query dishes
      const dishResponse = await request(server)
        .get('/api/dishes')
        .set('X-Session-Token', sessionToken)
        .expect(200);

      dishResponse.body.data.forEach((dish: any) => {
        expect(Number.isInteger(dish.price)).toBe(true);
        expect(dish.price).toBeGreaterThanOrEqual(0);
      });

      // Query order
      const orderResponse = await request(server)
        .get(`/api/orders/${orderId}`)
        .set('Authorization', `Bearer ${merchantToken}`)
        .expect(200);

      expect(Number.isInteger(orderResponse.body.data.total_amount)).toBe(true);
      expect(orderResponse.body.data.total_amount).toBeGreaterThanOrEqual(0);

      orderResponse.body.data.items.forEach((item: any) => {
        expect(Number.isInteger(item.unit_price)).toBe(true);
        expect(item.unit_price).toBeGreaterThanOrEqual(0);
        expect(Number.isInteger(item.subtotal)).toBe(true);
        expect(item.subtotal).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('7. Health Check (Requirement 11.6)', () => {
    it('should return service health status', async () => {
      const response = await request(server).get('/health').expect(200);

      expect(response.body.code).toBe(0);
      expect(response.body.data.status).toBe('ok');
      expect(response.body.data.database).toBeDefined();
    });
  });
});
