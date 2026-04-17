'use strict';

const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const merchantId = uuidv4();
    const passwordHash = await bcrypt.hash('admin123', 10);

    // 创建商户
    await queryInterface.bulkInsert('merchants', [
      {
        id: merchantId,
        username: 'admin',
        password_hash: passwordHash,
        shop_name: '示例餐厅',
        is_locked: false,
        failed_login_count: 0,
        locked_until: null,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);

    // 创建分类
    const categoryIds = {
      hotDishes: uuidv4(),
      coldDishes: uuidv4(),
      drinks: uuidv4(),
    };

    await queryInterface.bulkInsert('categories', [
      {
        id: categoryIds.hotDishes,
        merchant_id: merchantId,
        name: '热菜',
        sort_order: 1,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: categoryIds.coldDishes,
        merchant_id: merchantId,
        name: '凉菜',
        sort_order: 2,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: categoryIds.drinks,
        merchant_id: merchantId,
        name: '饮品',
        sort_order: 3,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);

    // 创建菜品
    const dishIds = {
      kungPaoChicken: uuidv4(),
      sweetSourPork: uuidv4(),
      cucumberSalad: uuidv4(),
      cola: uuidv4(),
      juice: uuidv4(),
    };

    await queryInterface.bulkInsert('dishes', [
      {
        id: dishIds.kungPaoChicken,
        merchant_id: merchantId,
        category_id: categoryIds.hotDishes,
        name: '宫保鸡丁',
        description: '经典川菜，鸡肉鲜嫩，花生酥脆',
        price: 3800, // 38.00元
        image_url: null,
        is_available: true,
        has_sku: false,
        sort_order: 1,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: dishIds.sweetSourPork,
        merchant_id: merchantId,
        category_id: categoryIds.hotDishes,
        name: '糖醋里脊',
        description: '酸甜可口，外酥里嫩',
        price: 4200, // 42.00元
        image_url: null,
        is_available: true,
        has_sku: false,
        sort_order: 2,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: dishIds.cucumberSalad,
        merchant_id: merchantId,
        category_id: categoryIds.coldDishes,
        name: '拍黄瓜',
        description: '清爽开胃',
        price: 1200, // 12.00元
        image_url: null,
        is_available: true,
        has_sku: false,
        sort_order: 1,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: dishIds.cola,
        merchant_id: merchantId,
        category_id: categoryIds.drinks,
        name: '可乐',
        description: '冰镇可乐',
        price: 500, // 5.00元
        image_url: null,
        is_available: true,
        has_sku: true,
        sort_order: 1,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: dishIds.juice,
        merchant_id: merchantId,
        category_id: categoryIds.drinks,
        name: '鲜榨果汁',
        description: '新鲜水果现榨',
        price: 1500, // 15.00元
        image_url: null,
        is_available: true,
        has_sku: true,
        sort_order: 2,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);

    // 创建SKU（规格）
    await queryInterface.bulkInsert('skus', [
      {
        id: uuidv4(),
        dish_id: dishIds.cola,
        name: '小杯',
        price_delta: 0,
        is_available: true,
      },
      {
        id: uuidv4(),
        dish_id: dishIds.cola,
        name: '大杯',
        price_delta: 300, // +3.00元
        is_available: true,
      },
      {
        id: uuidv4(),
        dish_id: dishIds.juice,
        name: '西瓜汁',
        price_delta: 0,
        is_available: true,
      },
      {
        id: uuidv4(),
        dish_id: dishIds.juice,
        name: '橙汁',
        price_delta: 200, // +2.00元
        is_available: true,
      },
      {
        id: uuidv4(),
        dish_id: dishIds.juice,
        name: '芒果汁',
        price_delta: 500, // +5.00元
        is_available: true,
      },
    ]);

    // 创建桌台
    await queryInterface.bulkInsert('tables', [
      {
        id: uuidv4(),
        merchant_id: merchantId,
        table_no: 'A01',
        seat_count: 4,
        area: 'A区',
        qr_token: uuidv4(),
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: uuidv4(),
        merchant_id: merchantId,
        table_no: 'A02',
        seat_count: 4,
        area: 'A区',
        qr_token: uuidv4(),
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: uuidv4(),
        merchant_id: merchantId,
        table_no: 'B01',
        seat_count: 6,
        area: 'B区',
        qr_token: uuidv4(),
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: uuidv4(),
        merchant_id: merchantId,
        table_no: 'B02',
        seat_count: 6,
        area: 'B区',
        qr_token: uuidv4(),
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: uuidv4(),
        merchant_id: merchantId,
        table_no: 'C01',
        seat_count: 8,
        area: 'C区',
        qr_token: uuidv4(),
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);

    console.log('✅ 演示数据创建成功！');
    console.log('📝 商户账号: admin');
    console.log('🔑 密码: admin123');
  },

  async down(queryInterface, Sequelize) {
    // 按照依赖关系的反向顺序删除
    await queryInterface.bulkDelete('tables', null, {});
    await queryInterface.bulkDelete('skus', null, {});
    await queryInterface.bulkDelete('dishes', null, {});
    await queryInterface.bulkDelete('categories', null, {});
    await queryInterface.bulkDelete('merchants', null, {});
  },
};
