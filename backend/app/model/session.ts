import { Application } from 'egg';
import { DataTypes, Model } from 'sequelize';

export interface SessionAttributes {
  id: string;
  open_id: string;
  table_id: string;
  session_token: string;
  expires_at: Date;
  created_at?: Date;
}

export default (app: Application) => {
  const { STRING, UUID, UUIDV4, DATE } = DataTypes;

  class Session extends Model<SessionAttributes> implements SessionAttributes {
    public id!: string;
    public open_id!: string;
    public table_id!: string;
    public session_token!: string;
    public expires_at!: Date;
    public readonly created_at!: Date;
  }

  Session.init(
    {
      id: {
        type: UUID,
        defaultValue: UUIDV4,
        primaryKey: true,
      },
      open_id: {
        type: STRING(128),
        allowNull: false,
      },
      table_id: {
        type: UUID,
        allowNull: false,
        references: {
          model: 'tables',
          key: 'id',
        },
      },
      session_token: {
        type: UUID,
        allowNull: false,
        unique: true,
      },
      expires_at: {
        type: DATE,
        allowNull: false,
      },
    },
    {
      sequelize: app.model,
      modelName: 'Session',
      tableName: 'sessions',
      underscored: true,
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: false,
    },
  );

  return Session;
};
