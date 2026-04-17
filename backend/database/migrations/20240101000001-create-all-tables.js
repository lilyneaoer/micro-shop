'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { DataTypes } = Sequelize;

    // ─── merchants ────────────────────────────────────────────────────────────
    await queryInterface.createTable('merchants', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      username: {
        type: DataTypes.STRING(64),
        allowNull: false,
        unique: true,
      },
      password_hash: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      shop_name: {
        type: DataTypes.STRING(128),
        allowNull: false,
      },
      is_locked: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      failed_login_count: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      locked_until: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: null,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('merchants', ['username'], {
      name: 'merchants_username_idx',
      unique: true,
    });

    // ─── tables ───────────────────────────────────────────────────────────────
    await queryInterface.createTable('tables', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      merchant_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'merchants', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      table_no: {
        type: DataTypes.STRING(32),
        allowNull: false,
      },
      seat_count: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 2,
      },
      area: {
        type: DataTypes.STRING(64),
        allowNull: true,
        defaultValue: null,
      },
      qr_token: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('tables', ['merchant_id'], {
      name: 'tables_merchant_id_idx',
    });
    await queryInterface.addIndex('tables', ['qr_token'], {
      name: 'tables_qr_token_idx',
      unique: true,
    });

    // ─── categories ───────────────────────────────────────────────────────────
    await queryInterface.createTable('categories', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      merchant_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'merchants', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      name: {
        type: DataTypes.STRING(64),
        allowNull: false,
      },
      sort_order: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('categories', ['merchant_id'], {
      name: 'categories_merchant_id_idx',
    });
    await queryInterface.addIndex('categories', ['merchant_id', 'sort_order'], {
      name: 'categories_merchant_id_sort_order_idx',
    });

    // ─── dishes ───────────────────────────────────────────────────────────────
    await queryInterface.createTable('dishes', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      merchant_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'merchants', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      category_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'categories', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      name: {
        type: DataTypes.STRING(128),
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
        defaultValue: null,
      },
      // Price in cents (分) — integer, no floats
      price: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      image_url: {
        type: DataTypes.STRING(512),
        allowNull: true,
        defaultValue: null,
      },
      is_available: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      has_sku: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      sort_order: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('dishes', ['merchant_id'], {
      name: 'dishes_merchant_id_idx',
    });
    await queryInterface.addIndex('dishes', ['category_id'], {
      name: 'dishes_category_id_idx',
    });
    await queryInterface.addIndex('dishes', ['merchant_id', 'is_available'], {
      name: 'dishes_merchant_id_is_available_idx',
    });

    // ─── skus ─────────────────────────────────────────────────────────────────
    await queryInterface.createTable('skus', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      dish_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'dishes', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      name: {
        type: DataTypes.STRING(64),
        allowNull: false,
      },
      // Price delta in cents (分) — integer, can be negative
      price_delta: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      is_available: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
    });

    await queryInterface.addIndex('skus', ['dish_id'], {
      name: 'skus_dish_id_idx',
    });

    // ─── sessions ─────────────────────────────────────────────────────────────
    await queryInterface.createTable('sessions', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      open_id: {
        type: DataTypes.STRING(128),
        allowNull: false,
      },
      table_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'tables', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      session_token: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true,
      },
      expires_at: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('sessions', ['session_token'], {
      name: 'sessions_session_token_idx',
      unique: true,
    });
    await queryInterface.addIndex('sessions', ['open_id', 'table_id'], {
      name: 'sessions_open_id_table_id_idx',
    });
    await queryInterface.addIndex('sessions', ['expires_at'], {
      name: 'sessions_expires_at_idx',
    });

    // ─── orders ───────────────────────────────────────────────────────────────
    await queryInterface.createTable('orders', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      order_no: {
        type: DataTypes.STRING(32),
        allowNull: false,
        unique: true,
      },
      merchant_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'merchants', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      table_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'tables', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      session_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'sessions', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      // Total amount in cents (分) — integer only
      total_amount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      status: {
        type: DataTypes.ENUM('待支付', '已支付', '已接单', '已完成', '已取消', '已退款'),
        allowNull: false,
        defaultValue: '待支付',
      },
      customer_remark: {
        type: DataTypes.TEXT,
        allowNull: true,
        defaultValue: null,
      },
      paid_at: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: null,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('orders', ['merchant_id'], {
      name: 'orders_merchant_id_idx',
    });
    await queryInterface.addIndex('orders', ['table_id'], {
      name: 'orders_table_id_idx',
    });
    await queryInterface.addIndex('orders', ['session_id'], {
      name: 'orders_session_id_idx',
    });
    await queryInterface.addIndex('orders', ['status'], {
      name: 'orders_status_idx',
    });
    await queryInterface.addIndex('orders', ['merchant_id', 'status'], {
      name: 'orders_merchant_id_status_idx',
    });
    await queryInterface.addIndex('orders', ['created_at'], {
      name: 'orders_created_at_idx',
    });

    // ─── order_items ──────────────────────────────────────────────────────────
    await queryInterface.createTable('order_items', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      order_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'orders', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      dish_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'dishes', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      sku_id: {
        type: DataTypes.UUID,
        allowNull: true,
        defaultValue: null,
        references: { model: 'skus', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      // Snapshot fields — copied from Dish/SKU at order creation time
      dish_name: {
        type: DataTypes.STRING(128),
        allowNull: false,
      },
      sku_name: {
        type: DataTypes.STRING(64),
        allowNull: true,
        defaultValue: null,
      },
      // Snapshot: unit price in cents (分)
      unit_price: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      // Subtotal in cents (分): unit_price × quantity
      subtotal: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
    });

    await queryInterface.addIndex('order_items', ['order_id'], {
      name: 'order_items_order_id_idx',
    });
    await queryInterface.addIndex('order_items', ['dish_id'], {
      name: 'order_items_dish_id_idx',
    });

    // ─── payments ─────────────────────────────────────────────────────────────
    await queryInterface.createTable('payments', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      order_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'orders', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      wx_prepay_id: {
        type: DataTypes.STRING(128),
        allowNull: true,
        defaultValue: null,
      },
      wx_transaction_id: {
        type: DataTypes.STRING(128),
        allowNull: true,
        defaultValue: null,
      },
      // Payment amount in cents (分) — integer only
      amount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      status: {
        type: DataTypes.ENUM('pending', 'paid', 'refunded', 'failed'),
        allowNull: false,
        defaultValue: 'pending',
      },
      paid_at: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: null,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('payments', ['order_id'], {
      name: 'payments_order_id_idx',
    });
    await queryInterface.addIndex('payments', ['wx_transaction_id'], {
      name: 'payments_wx_transaction_id_idx',
    });

    // ─── daily_stats ──────────────────────────────────────────────────────────
    await queryInterface.createTable('daily_stats', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      merchant_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'merchants', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      stat_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      // Total revenue in cents (分) — integer only
      total_revenue: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      order_count: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      top_dishes: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: null,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('daily_stats', ['merchant_id', 'stat_date'], {
      name: 'daily_stats_merchant_id_stat_date_unique',
      unique: true,
    });
    await queryInterface.addIndex('daily_stats', ['stat_date'], {
      name: 'daily_stats_stat_date_idx',
    });
  },

  async down(queryInterface) {
    // Drop in reverse dependency order
    await queryInterface.dropTable('daily_stats');
    await queryInterface.dropTable('payments');
    await queryInterface.dropTable('order_items');
    await queryInterface.dropTable('orders');
    await queryInterface.dropTable('sessions');
    await queryInterface.dropTable('skus');
    await queryInterface.dropTable('dishes');
    await queryInterface.dropTable('categories');
    await queryInterface.dropTable('tables');
    await queryInterface.dropTable('merchants');

    // Drop ENUM types created by Sequelize for PostgreSQL
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_orders_status";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_payments_status";');
  },
};
