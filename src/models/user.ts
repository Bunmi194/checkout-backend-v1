import { Sequelize, Model, DataTypes } from "sequelize";

require("dotenv").config();
const POSTGRES_NAME = process.env.POSTGRES_NAME || "checkout";
const POSTGRES_USER = process.env.POSTGRES_USER || "bunmi194";
const POSTGRES_PASSWORD = process.env.POSTGRES_PASSWORD || "bunmi194";
const POSTGRES_HOST = process.env.POSTGRES_HOST;
const sequelize = new Sequelize(`${POSTGRES_NAME}`, `${POSTGRES_USER}`, `${POSTGRES_PASSWORD}`, {
  host: `${POSTGRES_HOST}`,
  dialect: "postgres",
});

class User extends Model {
  declare firstName: string;
  declare lastName: string;
  declare email: string;
  declare password: string;
  declare isVerified: boolean;
  declare balance: number;
  declare currency: string;
}

User.init(
  {
    firstName: {
      type: new DataTypes.STRING(128),
      allowNull: false,
    },
    lastName: {
      type: new DataTypes.STRING(128),
      allowNull: false,
    },
    email: {
      type: new DataTypes.STRING(128),
      allowNull: false,
      unique: true,
    },
    password: {
      type: new DataTypes.STRING(128),
      allowNull: false,
    },
    currency: {
      type: new DataTypes.STRING(128),
      allowNull: true,
    },
    balance: {
      type: new DataTypes.INTEGER(),
    },
    isVerified: {
      type: new DataTypes.BOOLEAN(),
      defaultValue: false,
    },
  },
  {
    tableName: "users",
    sequelize,
  }
);

export default User;
