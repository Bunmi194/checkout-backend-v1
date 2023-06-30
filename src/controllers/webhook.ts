import { Request, Response } from "express";
import { Optional, SaveOptions } from "sequelize";
import * as crypto from "crypto";
import { verifyPaymentPaystack } from "../services/paystack";
import Transactions from "../models/transactions";
import { userExists } from "../services/user";
import { emailBroadcastFunction } from "../services/emailbroadcast";
import { sendMail } from "../services/email";
import { StatusCodes } from "http-status-codes";
require("dotenv").config();

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
}

interface UserData extends Optional<any, string>, SaveOptions<any> {
  firstName?: string;
  lastName?: string;
  email?: string;
  id?: number;
  balance?: number;
  password?: string;
  currency?: string;
}
const APPNAME = process.env.APPNAME || "Ckeckout";
const secret = "sk_test_1c6935580e77aee5f31ad70219030a3ea7dd09ab";
export const paystackWebhook = (req: Request, res: Response) => {
  try {
    const hash = crypto
      .createHmac("sha512", secret)
      .update(JSON.stringify(req.body))
      .digest("hex");
    if (hash === req.headers["x-paystack-signature"]) {
      const event = req.body;
      console.log("event: ", event);
      if (event.event === "charge.success") {
        const referenceId = event.data.reference;
        verifyPaymentPaystack(referenceId, async (error: any, body: any) => {
          if (error) return;
          console.log("body: ", body);
          const response = JSON.parse(body);
          console.log("response: ", response);
          console.log("status: ", response.status);
          if (!response || !response.status) return;
          if (response.data.gateway_response !== "Successful") return;
          const amount = response.data.amount / 100;
          const currency = response.data.currency;

          //find transaction details and update
          const transactionDetails = (await Transactions.findOne({
            where: { transactionReference: referenceId, amount: amount },
          })) as unknown as TransactionData;
          console.log("transactionDetails: ", transactionDetails);
          if (
            !transactionDetails ||
            !transactionDetails.id ||
            !transactionDetails.userId
          )
            return;
          if (transactionDetails && transactionDetails.status === "completed")
            return;
          const user = (await userExists(
            transactionDetails.userId!
          )) as unknown as UserData;
          // //update user's balance
          user.balance! += amount;
          user.currency = currency.toUpperCase();
          user.save().then(async (user: UserData) => {
            //send email notification
            transactionDetails!.status = "completed";
            transactionDetails.save();
            const content = `Your checkout wallet has been funded with ${currency.toUpperCase()} ${amount}`;
            const subject = "Checkout Wallet Funded";
            const emailContent = emailBroadcastFunction(APPNAME!, content);
            await sendMail(user.email!, subject, emailContent);
          });
        });
      }
    }
    return res.send(StatusCodes.OK);
  } catch (error) {
    console.log("Error-webhook: ", error);
    return;
  }
};
