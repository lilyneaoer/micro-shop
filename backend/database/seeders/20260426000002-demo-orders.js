'use strict';

const { v4: uuidv4 } = require('uuid');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 获取商户ID
    const merchants = await queryInterface.sequelize.query(
      `SELECT id FROM merchants WHERE username = 'admin' LIMIT 1;`,
      { type: Sequelize.QueryTypes.SELECT }
    );

    if (merchants.length === 0) {
      console.log('⚠️  未找到商户，请先运行基础种子数据');
      return;
    }

    const merchantId = merchants[0].id;

    // 获取桌台
    const tables = await queryInterface.sequelize.query(
      `SELECT id, table_no FROM tables WHERE merchant_id = '${merchantId}' LIMIT 5;`,
      { type: Sequelize.QueryTypes.SELECT }
    );

    if (tables.length === 0) {
      console.log('⚠️  未找到桌台');
      return;
    }

    // 获取菜品
    const dishes = await queryInterface.sequelize.query(
      `SELECT id, name, price FROM dishes WHERE merchant_id = '${merchantId}';`,
      { type: Sequelize.QueryTypes.SELECT }
    );

    if (dishes.length === 0) {
      console.log('⚠️  未找到菜品');
      return;
    }

    // 生成过去7天的订单数据
    const orders = [];
    const orderItems = [];
    const payments = [];
    const sessions = [];
    const now = new Date();

    // 为每一天生成5-15个订单
    for (let dayOffset = 6; dayOffset >= 0; dayOffset--) {
      const orderDate = new Date(now);
      orderDate.setDate(orderDate.getDate() - dayOffset);
      
      // 每天生成8-15个订单
      const ordersPerDay = Math.floor(Math.random() * 8) + 8;

      for (let i = 0; i < ordersPerDay; i++) {
        const orderId = uuidv4();
        const sessionId = uuidv4();
        const paymentId = uuidv4();
        const tableIndex = Math.floor(Math.random() * tables.length);
        const table = tables[tableIndex];

        // 随机选择2-4个菜品
        const itemCount = Math.floor(Math.random() * 3) + 2;
        const selectedDishes = [];
        const usedDishIds = new Set();

        for (let j = 0; j < itemCount; j++) {
          let dish;
          do {
            dish = dishes[Math.floor(Math.random() * dishes.length)];
          } while (usedDishIds.has(dish.id) && usedDishIds.size < dishes.length);
          
          usedDishIds.add(dish.id);
          selectedDishes.push(dish);
        }

        // 计算订单总额
        let totalAmount = 0;
        selectedDishes.forEach(dish => {
          const quantity = Math.floor(Math.random() * 2) + 1; // 1-2份
          const subtotal = dish.price * quantity;
          totalAmount += subtotal;

          orderItems.push({
            id: uuidv4(),
            order_id: orderId,
            dish_id: dish.id,
            dish_name: dish.name,
            sku_id: null,
            sku_name: null,
            quantity: quantity,
            unit_price: dish.price,
            subtotal: subtotal,
          });
        });

        // 设置订单时间（当天的随机时间）
        const orderTime = new Date(orderDate);
        const hour = Math.floor(Math.random() * 10) + 10; // 10:00 - 19:59
        const minute = Math.floor(Math.random() * 60);
        orderTime.setHours(hour, minute, 0, 0);

        const paidTime = new Date(orderTime);
        paidTime.setMinutes(paidTime.getMinutes() + Math.floor(Math.random() * 5)); // 支付时间在下单后0-5分钟

        // 创建 session
        const sessionToken = uuidv4();
        const expiresAt = new Date(paidTime);
        expiresAt.setHours(expiresAt.getHours() + 2); // 2小时后过期

        sessions.push({
          id: sessionId,
          open_id: `DEMO_OPENID_${Math.random().toString(36).substr(2, 16)}`,
          table_id: table.id,
          session_token: sessionToken,
          expires_at: expiresAt,
          created_at: orderTime,
        });

        // 创建订单
        orders.push({
          id: orderId,
          order_no: `ORD${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
          merchant_id: merchantId,
          session_id: sessionId,
          table_id: table.id,
          total_amount: totalAmount,
          status: '已完成',
          created_at: orderTime,
          updated_at: paidTime,
          paid_at: paidTime,
        });

        // 创建支付记录
        payments.push({
          id: paymentId,
          order_id: orderId,
          amount: totalAmount,
          status: 'paid',
          wx_transaction_id: `TXN${Date.now()}${Math.random().toString(36).substr(2, 9)}`,
          paid_at: paidTime,
          created_at: paidTime,
        });
      }
    }

    // 批量插入数据
    if (sessions.length > 0) {
      await queryInterface.bulkInsert('sessions', sessions);
      console.log(`✅ 创建了 ${sessions.length} 个会话`);
    }

    if (orders.length > 0) {
      await queryInterface.bulkInsert('orders', orders);
      console.log(`✅ 创建了 ${orders.length} 个订单`);
    }

    if (orderItems.length > 0) {
      await queryInterface.bulkInsert('order_items', orderItems);
      console.log(`✅ 创建了 ${orderItems.length} 个订单项`);
    }

    if (payments.length > 0) {
      await queryInterface.bulkInsert('payments', payments);
      console.log(`✅ 创建了 ${payments.length} 个支付记录`);
    }

    console.log('✅ 示例订单数据创建成功！');
  },

  async down(queryInterface, Sequelize) {
    // 删除示例订单数据
    await queryInterface.bulkDelete('payments', null, {});
    await queryInterface.bulkDelete('order_items', null, {});
    await queryInterface.bulkDelete('orders', null, {});
    await queryInterface.bulkDelete('sessions', null, {});
  },
};
