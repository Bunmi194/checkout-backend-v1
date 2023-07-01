import Transactions from "../models/transactions";
import { Optional, SaveOptions, Sequelize, Transaction, Op } from "sequelize";
import User from "../models/user";

require("dotenv").config();
const POSTGRES_NAME = process.env.POSTGRES_NAME || "checkout";
const POSTGRES_USER = process.env.POSTGRES_USER || "bunmi194";
const POSTGRES_PASSWORD = process.env.POSTGRES_PASSWORD || "bunmi194";
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

interface TransactionData extends Optional<any, string>, SaveOptions<any> {
  userId?: number;
  typeOfTransaction?: string;
  amount?: number;
  recipientId?: number;
  status?: string;
  currency?: string;
  gateway?: string;
  transactionReference?: string;
  id?: number;
  otp?: string;
  secretKey?: string;
  bank?: string;
  bankAccount?: string;
  nameOnAccount?: string;
}

export const writeTransactionToDatabase = async (
  transaction: TransactionData
) => {
  return Transactions.create(transaction)
    .then((transaction) => {
      return transaction;
    })
    .catch((error) => {
      console.error(error);
      return null;
    });
};
const t = sequelize.transaction();

export const transferTransactionQuery = async (
  recipientId: number,
  senderId: number,
  amount: number,
  currency: string
) => {
  try {
    const result = await sequelize.transaction(async (t) => {
      const recipient = await User.findByPk(recipientId, {
        transaction: t,
        lock: true,
        skipLocked: true,
      });
      if (!recipient) {
        throw new Error(`User with account: ${recipientId} does not exist`);
      }
      recipient.balance += Number(amount);
      recipient.currency = currency.toUpperCase();
      recipient.save();

      const sender = await User.findByPk(senderId, {
        transaction: t,
        lock: true,
        skipLocked: true,
      });
      if (!sender) {
        throw new Error(`Sender: ${senderId} does not exist`);
      }
      sender.balance -= amount;
      sender.save();
      return true;
    });

    return result;
  } catch (error) {
    console.log(`Error: ${error}`);
    return false;
  }
};

//get all transfer amounts - expenditure
export const getAllTransferAmount = async (id: number) => {
  return Transactions.findAll({
    attributes: ["amount"],
    where: {
      userId: id,
      typeOfTransaction: "transfer",
      status: "completed",
    },
  })
    .then((transfers) => {
      return transfers;
    })
    .catch((error) => {
      console.log("Error: ", error);
      return;
    });
};
//get all withdrawal amounts - expenditure
export const getAllWithdrawalAmount = async (id: number) => {
  return Transactions.findAll({
    attributes: ["amount"],
    where: {
      typeOfTransaction: "withdrawal",
      status: "completed",
      userId: id,
    },
  })
    .then((withdrawals) => {
      return withdrawals;
    })
    .catch((error) => {
      console.log("Error: ", error);
      return;
    });
};
//get all funding amounts - income
export const getAllFundingAmount = async (id: number) => {
  return Transactions.findAll({
    attributes: ["amount"],
    where: {
      typeOfTransaction: "fund",
      status: "completed",
      userId: id,
    },
  })
    .then((fund) => {
      return fund;
    })
    .catch((error) => {
      console.log("Error: ", error);
      return;
    });
};
//get last 3 transactions
export const getLastThreeTransactions = async (id: number) => {
  return Transactions.findAll({
    where: {
      [Op.or]: [{ userId: { [Op.eq]: id } }, { recipientId: { [Op.eq]: id } }],
    },
    order: [["createdAt", "DESC"]],
    limit: 3,
    include: User,
  })
    .then((lastThree) => {
      return lastThree;
    })
    .catch((error) => {
      console.log("Error: ", error);
      return;
    });
};
