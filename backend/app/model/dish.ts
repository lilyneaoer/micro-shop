import { Application } from 'egg';
import { DataTypes, Model } from 'sequelize';

export interface DishAttributes {
  id: string;
  merchant_id: string;
  category_id: string;
  name: string;
  description: string | null;
  /** Price in cents (分) */
  price: number;
  image_url: string | null;
  is_available: boolean;
  has_sku: boolean;
  sort_order: number;
  created_at?: Date;
  updated_at?: Date;
}

export default (app: Application) => {
  const { STRING, TEXT, UUID, UUIDV4, BOOLEAN, INTEGER } = DataTypes;

  class Dish extends Model<DishAttributes> implements DishAttributes {
    public id!: string;
    public merchant_id!: string;
    public category_id!: string;
    public name!: string;
    public description!: string | null;
    public price!: number;
    public image_url!: string | null;
    public is_available!: boolean;
    public has_sku!: boolean;
    public sort_order!: number;
    public readonly created_at!: Date;
    public readonly updated_at!: Date;
  }

  Dish.init(
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
      category_id: {
        type: UUID,
        allowNull: false,
        references: {
          model: 'categories',
          key: 'id',
        },
      },
      name: {
        type: STRING(128),
        allowNull: false,
      },
      description: {
        type: TEXT,
        allowNull: true,
        defaultValue: null,
      },
      price: {
        // Stored in cents (分), integer only
        type: INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      image_url: {
        type: STRING(512),
        allowNull: true,
        defaultValue: null,
      },
      is_available: {
        type: BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      has_sku: {
        type: BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      sort_order: {
        type: INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
    },
    {
      sequelize: app.model,
      modelName: 'Dish',
      tableName: 'dishes',
      underscored: true,
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  );

  return Dish;
};
