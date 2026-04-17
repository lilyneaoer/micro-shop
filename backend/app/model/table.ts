import { Application } from 'egg';
import { DataTypes, Model } from 'sequelize';

export interface TableAttributes {
  id: string;
  merchant_id: string;
  table_no: string;
  seat_count: number;
  area: string | null;
  qr_token: string;
  is_active: boolean;
  created_at?: Date;
  updated_at?: Date;
}

export default (app: Application) => {
  const { STRING, UUID, UUIDV4, BOOLEAN, INTEGER } = DataTypes;

  class Table extends Model<TableAttributes> implements TableAttributes {
    public id!: string;
    public merchant_id!: string;
    public table_no!: string;
    public seat_count!: number;
    public area!: string | null;
    public qr_token!: string;
    public is_active!: boolean;
    public readonly created_at!: Date;
    public readonly updated_at!: Date;
  }

  Table.init(
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
      table_no: {
        type: STRING(32),
        allowNull: false,
      },
      seat_count: {
        type: INTEGER,
        allowNull: false,
        defaultValue: 2,
      },
      area: {
        type: STRING(64),
        allowNull: true,
        defaultValue: null,
      },
      qr_token: {
        type: UUID,
        allowNull: false,
        unique: true,
      },
      is_active: {
        type: BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
    },
    {
      sequelize: app.model,
      modelName: 'Table',
      tableName: 'tables',
      underscored: true,
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  );

  return Table;
};
