import { Application } from 'egg';
import { DataTypes, Model } from 'sequelize';

export interface SkuAttributes {
  id: string;
  dish_id: string;
  name: string;
  /** Price delta in cents (分), can be negative for discounts */
  price_delta: number;
  is_available: boolean;
}

export default (app: Application) => {
  const { STRING, UUID, UUIDV4, BOOLEAN, INTEGER } = DataTypes;

  class Sku extends Model<SkuAttributes> implements SkuAttributes {
    public id!: string;
    public dish_id!: string;
    public name!: string;
    public price_delta!: number;
    public is_available!: boolean;
  }

  Sku.init(
    {
      id: {
        type: UUID,
        defaultValue: UUIDV4,
        primaryKey: true,
      },
      dish_id: {
        type: UUID,
        allowNull: false,
        references: {
          model: 'dishes',
          key: 'id',
        },
      },
      name: {
        type: STRING(64),
        allowNull: false,
      },
      price_delta: {
        // Stored in cents (分), integer only
        type: INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      is_available: {
        type: BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
    },
    {
      sequelize: app.model,
      modelName: 'Sku',
      tableName: 'skus',
      underscored: true,
      timestamps: false,
    },
  );

  return Sku;
};
