import Transactions from "../models/transactions";
import { Optional, SaveOptions, Sequelize, Transaction } from "sequelize";
import User from "../models/user";

require("dotenv").config();
const POSTGRES_NAME = process.env.POSTGRES_NAME || "";
const POSTGRES_USER = process.env.POSTGRES_USER || "";
const POSTGRES_PASSWORD = process.env.POSTGRES_PASSWORD || "";
const POSTGRES_HOST = process.env.POSTGRES_HOST;
const sequelize = new Sequelize(`${POSTGRES_NAME}`, `${POSTGRES_USER}`, `${POSTGRES_PASSWORD}`, {
  host: `${POSTGRES_HOST}`,
  dialect: "postgres",
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false, // Use this option if you encounter certificate verification issues
    },
  },
});

export const withdrawalTransactionQuery = async (
  userId: number,
  amount: number
) => {
  try {
    const result = await sequelize.transaction(async (t) => {
      const recipient = await User.findByPk(userId, {
        transaction: t,
        lock: true,
        skipLocked: true,
      });
      if (!recipient) {
        throw new Error(`User with account: ${userId} does not exist`);
      }
      recipient.balance -= Number(amount);
      recipient.save();
      return true;
    });

    return result;
  } catch (error) {
    console.log(`Error: ${error}`);
    return false;
  }
};
