import Transactions from "../models/transactions";
import { Optional, SaveOptions, Sequelize, Transaction } from "sequelize";
import User from "../models/user";

const sequelize = new Sequelize("checkout", "bunmi194", "bunmi194", {
  host: 'localhost',
  dialect: "postgres",
});

interface TransactionData extends Optional<any, string>, SaveOptions<any>{
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

export const writeTransactionToDatabase = async (transaction: TransactionData) => {
    return Transactions.create(transaction)
              .then(transaction => {
                return transaction;
              })
              .catch(error=> {
                console.error(error);
                return null;
              });
  };
const t = sequelize.transaction()

export const transferTransactionQuery = async (recipientId: number, senderId: number, amount:number, currency: string) => {
  try {

    const result = await sequelize.transaction(async (t) => {
      const recipient = await User.findByPk(recipientId, { transaction: t, lock: true, skipLocked: true });
      if (!recipient){
        throw new Error(`User with account: ${recipientId} does not exist`)
      }
      recipient.balance += Number(amount);
      recipient.currency = currency.toUpperCase();
      recipient.save();
  
      const sender = await User.findByPk(senderId, { transaction: t, lock: true, skipLocked: true });
      if (!sender){
        throw new Error(`Sender: ${senderId} does not exist`)
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
}