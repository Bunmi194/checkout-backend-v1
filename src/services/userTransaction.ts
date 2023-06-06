import Transactions from "../models/transactions";
import { Optional, SaveOptions, Sequelize, Transaction } from "sequelize";
import User from "../models/user";

const sequelize = new Sequelize("checkout", "bunmi194", "bunmi194", {
    host: 'localhost',
    dialect: "postgres",
});

export const withdrawalTransactionQuery = async (userId: number, amount:number) => {
    try {
  
      const result = await sequelize.transaction(async (t) => {
        const recipient = await User.findByPk(userId, { transaction: t, lock: true, skipLocked: true });
        if (!recipient){
          throw new Error(`User with account: ${userId} does not exist`)
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
  }