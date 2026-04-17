import { Application } from 'egg';
import { DataTypes, Model } from 'sequelize';

export interface CategoryAttributes {
  id: string;
  merchant_id: string;
  name: string;
  sort_order: number;
  created_at?: Date;
  updated_at?: Date;
}

export default (app: Application) => {
  const { STRING, UUID, UUIDV4, INTEGER } = DataTypes;

  class Category extends Model<CategoryAttributes> implements CategoryAttributes {
    public id!: string;
    public merchant_id!: string;
    public name!: string;
    public sort_order!: number;
    public readonly created_at!: Date;
    public readonly updated_at!: Date;
  }

  Category.init(
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
      name: {
        type: STRING(64),
        allowNull: false,
      },
      sort_order: {
        type: INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
    },
    {
      sequelize: app.model,
      modelName: 'Category',
      tableName: 'categories',
      underscored: true,
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  );

  return Category;
};
