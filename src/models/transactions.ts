import { Sequelize, Model, DataTypes } from "sequelize";
import User from "./user";
require("dotenv").config();
const POSTGRES_NAME = process.env.POSTGRES_NAME || "checkout";
const POSTGRES_USER = process.env.POSTGRES_USER || "bunmi194";
const POSTGRES_PASSWORD = process.env.POSTGRES_PASSWORD || "bunmi194";
const POSTGRES_HOST = process.env.POSTGRES_HOST;
const sequelize = new Sequelize(`${POSTGRES_NAME}`, `${POSTGRES_USER}`, `${POSTGRES_PASSWORD}`, {
  host: `${POSTGRES_HOST}`,
  dialect: "postgres",
});

class Transactions extends Model {
  static find(arg0: {
    attributes: string[];
    where: { typeOfTransaction: string };
  }) {
    throw new Error("Method not implemented.");
  }
  declare userId: number;
  declare typeOfTransaction: string;
  declare amount: number;
  declare recipientId: string;
  declare status: string;
  declare currency: string;
  declare gateway: string;
  declare transactionReference: string;
  declare otp: string;
  declare secretKey: string;
  declare bankAccount: string;
  declare bank: string;
  declare nameOnAccount: string;
}

Transactions.init(
  {
    userId: {
      type: new DataTypes.INTEGER(),
      allowNull: false,
      references: {
        model: User,
        key: "id",
      },
    },
    typeOfTransaction: {
      type: new DataTypes.STRING(128),
      allowNull: false,
    },
    otp: {
      type: new DataTypes.STRING(128),
      allowNull: true,
    },
    secretKey: {
      type: new DataTypes.STRING(128),
      allowNull: true,
    },
    transactionReference: {
      type: new DataTypes.STRING(128),
      allowNull: false,
      unique: true,
    },
    currency: {
      type: new DataTypes.STRING(128),
      allowNull: false,
    },
    gateway: {
      type: new DataTypes.STRING(128),
      allowNull: false,
    },
    recipientId: {
      type: new DataTypes.INTEGER(),
      allowNull: true,
      references: {
        model: User,
        key: "id",
      },
    },
    status: {
      type: new DataTypes.STRING(128),
      allowNull: false,
    },
    amount: {
      type: new DataTypes.INTEGER(),
      allowNull: false,
    },
    bankAccount: {
      type: new DataTypes.STRING(),
      allowNull: true,
    },
    nameOnAccount: {
      type: new DataTypes.STRING(),
      allowNull: true,
    },
    bank: {
      type: new DataTypes.STRING(),
      allowNull: true,
    },
  },
  {
    tableName: "transactions",
    sequelize,
  }
);

Transactions.belongsTo(User, {
  foreignKey: "recipientId",
  foreignKeyConstraint: true,
});
export default Transactions;
