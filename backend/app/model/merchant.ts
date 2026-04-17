import { Application } from 'egg';
import { DataTypes, Model } from 'sequelize';

export interface MerchantAttributes {
  id: string;
  username: string;
  password_hash: string;
  shop_name: string;
  is_locked: boolean;
  failed_login_count: number;
  locked_until: Date | null;
  created_at?: Date;
  updated_at?: Date;
}

export default (app: Application) => {
  const { STRING, UUID, UUIDV4, BOOLEAN, INTEGER, DATE } = DataTypes;

  class Merchant extends Model<MerchantAttributes> implements MerchantAttributes {
    public id!: string;
    public username!: string;
    public password_hash!: string;
    public shop_name!: string;
    public is_locked!: boolean;
    public failed_login_count!: number;
    public locked_until!: Date | null;
    public readonly created_at!: Date;
    public readonly updated_at!: Date;
  }

  Merchant.init(
    {
      id: {
        type: UUID,
        defaultValue: UUIDV4,
        primaryKey: true,
      },
      username: {
        type: STRING(64),
        allowNull: false,
        unique: true,
      },
      password_hash: {
        type: STRING(255),
        allowNull: false,
      },
      shop_name: {
        type: STRING(128),
        allowNull: false,
      },
      is_locked: {
        type: BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      failed_login_count: {
        type: INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      locked_until: {
        type: DATE,
        allowNull: true,
        defaultValue: null,
      },
    },
    {
      sequelize: app.model,
      modelName: 'Merchant',
      tableName: 'merchants',
      underscored: true,
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  );

  return Merchant;
};
