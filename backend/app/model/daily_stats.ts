import { Application } from 'egg';
import { DataTypes, Model } from 'sequelize';

export interface TopDishEntry {
  dish_id: string;
  dish_name: string;
  quantity: number;
  revenue: number;
}

export interface DailyStatsAttributes {
  id: string;
  merchant_id: string;
  stat_date: string; // DATEONLY: 'YYYY-MM-DD'
  /** Total revenue in cents (分) */
  total_revenue: number;
  order_count: number;
  /** Top dishes as JSONB array */
  top_dishes: TopDishEntry[] | null;
  created_at?: Date;
}

export default (app: Application) => {
  const { UUID, UUIDV4, INTEGER, DATEONLY, JSONB } = DataTypes;

  class DailyStats extends Model<DailyStatsAttributes> implements DailyStatsAttributes {
    public id!: string;
    public merchant_id!: string;
    public stat_date!: string;
    public total_revenue!: number;
    public order_count!: number;
    public top_dishes!: TopDishEntry[] | null;
    public readonly created_at!: Date;
  }

  DailyStats.init(
    {
      id: {
        type: UUID,
        defaultValue: UUIDV4,
        primaryKey: true,
      },
      merchant_id: {
        type: UUID,
        allowNull: false,
        references: {
          model: 'merchants',
          key: 'id',
        },
      },
      stat_date: {
        type: DATEONLY,
        allowNull: false,
      },
      total_revenue: {
        // Stored in cents (分), integer only
        type: INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      order_count: {
        type: INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      top_dishes: {
        type: JSONB,
        allowNull: true,
        defaultValue: null,
      },
    },
    {
      sequelize: app.model,
      modelName: 'DailyStats',
      tableName: 'daily_stats',
      underscored: true,
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: false,
      indexes: [
        {
          unique: true,
          fields: ['merchant_id', 'stat_date'],
          name: 'daily_stats_merchant_id_stat_date_unique',
        },
      ],
    },
  );

  return DailyStats;
};
