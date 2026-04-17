import { Application } from 'egg';
import { DataTypes, Model } from 'sequelize';

/**
 * Order status values (订单状态)
 * 待支付 → 已支付/待接单 → 已接单/制作中 → 已完成
 * Any state → 已取消
 * 已完成 → 已退款
 */
export type OrderStatus = '待支付' | '已支付' | '已接单' | '已完成' | '已取消' | '已退款';

export interface OrderAttributes {
  id: string;
  order_no: string;
  merchant_id: string;
  table_id: string;
  session_id: string;
  /** Total amount in cents (分) */
  total_amount: number;
  status: OrderStatus;
  customer_remark: string | null;
  paid_at: Date | null;
  created_at?: Date;
  updated_at?: Date;
}

export default (app: Application) => {
  const { STRING, TEXT, UUID, UUIDV4, INTEGER, DATE, ENUM } = DataTypes;

  class Order extends Model<OrderAttributes> implements OrderAttributes {
    public id!: string;
    public order_no!: string;
    public merchant_id!: string;
    public table_id!: string;
    public session_id!: string;
    public total_amount!: number;
    public status!: OrderStatus;
    public customer_remark!: string | null;
    public paid_at!: Date | null;
    public readonly created_at!: Date;
    public readonly updated_at!: Date;
  }

  Order.init(
    {
      id: {
        type: UUID,
        defaultValue: UUIDV4,
        primaryKey: true,
      },
      order_no: {
        type: STRING(32),
        allowNull: false,
        unique: true,
      },
      merchant_id: {
        type: UUID,
        allowNull: false,
        references: {
          model: 'merchants',
          key: 'id',
        },
      },
      table_id: {
        type: UUID,
        allowNull: false,
        references: {
          model: 'tables',
          key: 'id',
        },
      },
      session_id: {
        type: UUID,
        allowNull: false,
        references: {
          model: 'sessions',
          key: 'id',
        },
      },
      total_amount: {
        // Stored in cents (分), integer only
        type: INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      status: {
        type: ENUM('待支付', '已支付', '已接单', '已完成', '已取消', '已退款'),
        allowNull: false,
        defaultValue: '待支付',
      },
      customer_remark: {
        type: TEXT,
        allowNull: true,
        defaultValue: null,
      },
      paid_at: {
        type: DATE,
        allowNull: true,
        defaultValue: null,
      },
    },
    {
      sequelize: app.model,
      modelName: 'Order',
      tableName: 'orders',
      underscored: true,
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  );

  return Order;
};
