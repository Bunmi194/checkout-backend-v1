import { Sequelize, Model, DataTypes } from "sequelize";
import User from "./user";

const sequelize = new Sequelize("checkout", "bunmi194", "bunmi194", {
  host: 'localhost',
  dialect: "postgres",
});

//for each transaction, you need the user's id, amount, type of transaction, recipientId if any, status, 
class Transactions extends Model {
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
      type: new DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: User,
        key: "id"
      }
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
      type: new DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: User,
        key: "id"
      }
    },
    status: {
      type: new DataTypes.STRING(128),
      allowNull: false,
    },
    amount: {
      type: new DataTypes.INTEGER,
      allowNull: false,
    },
    bankAccount: {
      type: new DataTypes.STRING,
      allowNull: true,
    },
    nameOnAccount: {
      type: new DataTypes.STRING,
      allowNull: true,
    },
    bank: {
      type: new DataTypes.STRING,
      allowNull: true,
    }
  },
  {
    tableName: "transactions",
    sequelize, // passing the `sequelize` instance is required
  }
);

export default Transactions;