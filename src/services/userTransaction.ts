import Transactions from "../models/transactions";
import { Optional, SaveOptions, Sequelize, Transaction } from "sequelize";
import User from "../models/user";

require("dotenv").config();
const POSTGRES_NAME = process.env.POSTGRES_NAME || "checkout";
const POSTGRES_USER = process.env.POSTGRES_USER || "bunmi194";
const POSTGRES_PASSWORD = process.env.POSTGRES_PASSWORD || "bunmi194";
const POSTGRES_HOST = process.env.POSTGRES_HOST;
const sequelize = new Sequelize(`${POSTGRES_NAME}`, `${POSTGRES_USER}`, `${POSTGRES_PASSWORD}`, {
  host: `172.20.10.4`,
  dialect: "postgres",
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
