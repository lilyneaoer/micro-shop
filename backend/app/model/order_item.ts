import { Application } from 'egg';
import { DataTypes, Model } from 'sequelize';

export interface OrderItemAttributes {
  id: string;
  order_id: string;
  dish_id: string;
  sku_id: string | null;
  /** Snapshot: dish name at the time of order creation */
  dish_name: string;
  /** Snapshot: SKU name at the time of order creation (null if no SKU) */
  sku_name: string | null;
  /** Snapshot: unit price in cents (分) at the time of order creation */
  unit_price: number;
  quantity: number;
  /** Subtotal in cents (分): unit_price × quantity */
  subtotal: number;
}

export default (app: Application) => {
  const { STRING, UUID, UUIDV4, INTEGER } = DataTypes;

  class OrderItem extends Model<OrderItemAttributes> implements OrderItemAttributes {
    public id!: string;
    public order_id!: string;
    public dish_id!: string;
    public sku_id!: string | null;
    public dish_name!: string;
    public sku_name!: string | null;
    public unit_price!: number;
    public quantity!: number;
    public subtotal!: number;
  }

  OrderItem.init(
    {
      id: {
        type: UUID,
        defaultValue: UUIDV4,
        primaryKey: true,
      },
      order_id: {
        type: UUID,
        allowNull: false,
        references: {
          model: 'orders',
          key: 'id',
        },
      },
      dish_id: {
        type: UUID,
        allowNull: false,
        references: {
          model: 'dishes',
          key: 'id',
        },
      },
      sku_id: {
        type: UUID,
        allowNull: true,
        defaultValue: null,
        references: {
          model: 'skus',
          key: 'id',
        },
      },
      dish_name: {
        // Snapshot field: copied from Dish.name at order creation time
        type: STRING(128),
        allowNull: false,
      },
      sku_name: {
        // Snapshot field: copied from Sku.name at order creation time
        type: STRING(64),
        allowNull: true,
        defaultValue: null,
      },
      unit_price: {
        // Snapshot field: copied from Dish.price + Sku.price_delta at order creation time, in cents (分)
        type: INTEGER,
        allowNull: false,
      },
      quantity: {
        type: INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      subtotal: {
        // unit_price × quantity, in cents (分)
        type: INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
    },
    {
      sequelize: app.model,
      modelName: 'OrderItem',
      tableName: 'order_items',
      underscored: true,
      timestamps: false,
    },
  );

  return OrderItem;
};
