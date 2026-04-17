import { Application } from 'egg';
import { DataTypes, Model } from 'sequelize';

export type PaymentStatus = 'pending' | 'paid' | 'refunded' | 'failed';

export interface PaymentAttributes {
  id: string;
  order_id: string;
  wx_prepay_id: string | null;
  wx_transaction_id: string | null;
  /** Payment amount in cents (分) */
  amount: number;
  status: PaymentStatus;
  paid_at: Date | null;
  created_at?: Date;
}

export default (app: Application) => {
  const { STRING, UUID, UUIDV4, INTEGER, DATE, ENUM } = DataTypes;

  class Payment extends Model<PaymentAttributes> implements PaymentAttributes {
    public id!: string;
    public order_id!: string;
    public wx_prepay_id!: string | null;
    public wx_transaction_id!: string | null;
    public amount!: number;
    public status!: PaymentStatus;
    public paid_at!: Date | null;
    public readonly created_at!: Date;
  }

  Payment.init(
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
      wx_prepay_id: {
        type: STRING(128),
        allowNull: true,
        defaultValue: null,
      },
      wx_transaction_id: {
        type: STRING(128),
        allowNull: true,
        defaultValue: null,
      },
      amount: {
        // Stored in cents (分), integer only
        type: INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      status: {
        type: ENUM('pending', 'paid', 'refunded', 'failed'),
        allowNull: false,
        defaultValue: 'pending',
      },
      paid_at: {
        type: DATE,
        allowNull: true,
        defaultValue: null,
      },
    },
    {
      sequelize: app.model,
      modelName: 'Payment',
      tableName: 'payments',
      underscored: true,
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: false,
    },
  );

  return Payment;
};
