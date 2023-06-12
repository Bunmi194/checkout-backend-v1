import { NextFunction, Request, Response } from "express";
import jwt, { Secret, JwtPayload } from "jsonwebtoken";
import { validateWithdrawalInputs } from "../auth/withdraw";
import {
  verifyAccountNumber,
  createTransferRecipient,
  initiateTransfer,
} from "../services/paystackWithdrawal";
import { writeTransactionToDatabase } from "../services/transaction";
import { generateOTP, verifyOTP } from "../utils/otp";
import { Optional, SaveOptions } from "sequelize";
import { sendMail } from "../services/email";
import { emailBroadcastFunction } from "../services/emailbroadcast";
import { userExists } from "../services/user";
import Transactions from "../models/transactions";
import { sequelize } from "../config/database";
import User from "../models/user";
import { withdrawalTransactionQuery } from "../services/userTransaction";
require("dotenv").config();

const { APPNAME, JWT_SECRET, SALT_ROUNDS } = process.env;

interface UserData extends Optional<any, string>, SaveOptions<any> {
  firstName?: string;
  lastName?: string;
  email?: string;
  id?: number;
  balance?: number;
  password?: string;
  currency?: string;
}

interface newJwtPayload extends JwtPayload {
  email?: string;
  id?: number;
}

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

export const verifyAccount = async (req: Request, res: Response) => {
  try {
    const errors = validateWithdrawalInputs.safeParse(req.body);
    if (errors.success === false) {
      return res.status(400).json({
        status: false,
        message: errors.error.issues[0].message,
      });
    }
    const { bankAccount, bank } = req.body;
    const { authorization } = req.headers;
    if (!authorization) {
      return res.status(401).json({
        status: false,
        message: "Bad request",
      });
    }
    const token = authorization.split(" ")[1];
    const userDetails = jwt.verify(
      token,
      JWT_SECRET!
    ) as unknown as newJwtPayload;
    if (!userDetails || !userDetails.id) {
      return res.status(401).json({
        status: false,
        message: "Bad request",
      });
    }
    verifyAccountNumber(
      `${bankAccount}`,
      `${bank}`,
      async (err: any, response: any) => {
        // console.log("err: ", err);
        // console.log("response: ", response.body);
        if (err) {
          return res.status(500).json({
            status: false,
            message: "Could not fetch bank details",
          });
        }
        return res.status(200).json({
          status: true,
          message: "Bank details retrieved successfully",
          response: JSON.parse(response.body),
        });
      }
    );
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Internal Server Error",
    });
  }
};

export const generateOTPForWithdrawal = async (req: Request, res: Response) => {
  //send otp and save in db
  try {
    //validate user input
    const error = validateWithdrawalInputs.safeParse(req.body);
    const { authorization } = req.headers;
    const idempotentKey = req.headers.idempotentkey;
    const { amount, bankAccount, bank, nameOnAccount } = req.body;
    console.log("idempotentKey: ", idempotentKey);
    if (!authorization || !idempotentKey) {
      return res.status(400).json({
        status: false,
        message: "Authorization token and Idempotent Key are required",
      });
    }
    const token = authorization?.split(" ")[1];
    if (error.success === false) {
      return res.status(400).json({
        status: false,
        message: error.error.issues[0].message,
      });
    }
    //verify token
    const senderDetails = jwt.verify(token, JWT_SECRET!) as newJwtPayload;

    if (!senderDetails || !senderDetails.id || !senderDetails.email) {
      return res.status(400).json({
        status: false,
        message: "Bad request",
      });
    }

    //generate OTP
    const otpDetails = generateOTP();
    //check if idempotentKey exists
    const newGeneratedTransaction = (await Transactions.findOne({
      where: { transactionReference: idempotentKey },
    })) as unknown as TransactionData;
    if (newGeneratedTransaction && newGeneratedTransaction.id) {
      return res.status(400).json({
        status: false,
        message:
          "Transaction reference already exists. Please edit your input and retry.",
      });
    }
    //save transaction details with OTP
    console.log("otpDetails: ", otpDetails);
    const transaction = {
      userId: senderDetails.id,
      typeOfTransaction: "withdrawal",
      amount,
      status: "pending",
      currency: "NGN",
      gateway: "paystack",
      transactionReference: `${idempotentKey}`,
      otp: otpDetails.otp,
      secretKey: otpDetails.secretKey,
      bank,
      bankAccount,
      nameOnAccount,
    };

    const generatedTransaction = (await writeTransactionToDatabase(
      transaction
    )) as unknown as TransactionData;

    if (!generatedTransaction || !generatedTransaction.id) {
      return res.status(500).json({
        status: false,
        message: "Internal Server Error",
      });
    }
    //send OTP to email
    const subject = "Checkout: OTP for Funds Withdrawal";
    const content = `Please use ${otpDetails.otp} as your OTP. This token expires in 10 minutes.`;
    const contentHTML = emailBroadcastFunction(APPNAME!, content);
    await sendMail(`${senderDetails.email}`, subject, contentHTML);
    return res.status(200).json({
      status: true,
      message: "OTP sent successfully",
    });
  } catch (error) {
    console.log(`Error: ${error}`);
    return res.status(500).json({
      status: false,
      message: "Internal Server Error",
    });
  }
};

export const validateWithdrawalInputsFunction = () => {
  //validate inputs
  //check token
  //check idempotent key
  //verify otp
  //check balance
  //process withdrawal
  //on success, debit user account
  //send response
};
export const createTransferRecipientMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  //validate inputs
  try {
    const errors = validateWithdrawalInputs.safeParse(req.body);
    if (errors.success === false) {
      return res.status(400).json({
        status: false,
        message: errors.error.issues[0].message,
      });
    }
    const idempotentKey = req.headers.idempotentkey;
    console.log("idempotentKey: ", idempotentKey);
    const { bankAccount, bank, nameOnAccount, amount, otp } = req.body;
    const { authorization } = req.headers;
    //check idempotent key
    if (!authorization || !idempotentKey) {
      return res.status(401).json({
        status: false,
        message: "Bad request",
      });
    }
    //check token
    const token = authorization.split(" ")[1];
    const userDetails = jwt.verify(
      token,
      JWT_SECRET!
    ) as unknown as newJwtPayload;
    if (!userDetails || !userDetails.id) {
      return res.status(401).json({
        status: false,
        message: "Bad request",
      });
    }
    //fetch user's complete information
    const completeUserDetails = (await userExists(
      Number(userDetails.id)
    )) as unknown as UserData;
    if (!completeUserDetails || !completeUserDetails.id) {
      return res.status(404).json({
        status: false,
        message: "User does not exist",
      });
    }
    const generatedTransaction = (await Transactions.findOne({
      where: { amount: amount, transactionReference: idempotentKey },
    })) as unknown as TransactionData;

    if (!generatedTransaction || !generatedTransaction.id) {
      return res.status(404).json({
        status: false,
        message: "Transaction does not exist",
      });
    }
    if (!generatedTransaction.otp || !generatedTransaction.secretKey) {
      return res.status(400).json({
        status: false,
        message: "Error fetching transaction OTP",
      });
    }
    //verify otp
    console.log("generatedTransaction: ", generatedTransaction.otp, otp);
    console.log("generatedTransaction: ", generatedTransaction.secretKey);
    if (generatedTransaction.otp !== otp) {
      return res.status(400).json({
        status: false,
        message: "Invalid OTP. Please type most recent OTP",
      });
    }
    const isOTPValid = verifyOTP(otp, `${generatedTransaction.secretKey}`);
    if (!isOTPValid) {
      return res.status(401).json({
        status: false,
        message: "Invalid OTP. Time constraint of 10 minutes might have passed",
      });
    }
    //check balance
    if (completeUserDetails.balance! < Number(amount)) {
      return res.status(400).json({
        status: false,
        message: "Insufficient balance",
      });
    }
    //process withdrawal

    //process to create recipient code
    const formData = {
      type: "nuban",
      name: `${nameOnAccount}`,
      account_number: `${bankAccount}`,
      bank_code: `${bank}`,
      currency: "NGN",
    };
    // console.log("formData: ", formData)
    createTransferRecipient(formData, async (err: any, result: any) => {
      if (err) return res.status(500).json({ status: false, message: err });
      // console.log("result: ", result);
      req.body.result = JSON.parse(result.body);
      next();
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Internal Server Error",
    });
  }
};

export const initiateTransferMiddleware = async (
  req: Request,
  res: Response
) => {
  try {
    const transaction = await sequelize.transaction();

    const errors = validateWithdrawalInputs.safeParse(req.body);
    if (errors.success === false) {
      return res.status(400).json({
        status: false,
        message: errors.error.issues[0].message,
      });
    }
    const idempotentKey = req.headers.idempotentkey;
    const { bankAccount, bank, nameOnAccount, amount } = req.body;
    const recipientObj = req.body.result;
    const recipientId = recipientObj.data.recipient_code;
    console.log("recipientObj: ", recipientObj);
    console.log("recipientId: ", recipientId);
    const { authorization } = req.headers;
    if (!authorization) {
      return res.status(401).json({
        status: false,
        message: "Bad request",
      });
    }
    const token = authorization.split(" ")[1];
    const userDetails = jwt.verify(
      token,
      JWT_SECRET!
    ) as unknown as newJwtPayload;
    if (!userDetails || !userDetails.id) {
      return res.status(401).json({
        status: false,
        message: "Bad request",
      });
    }
    //check if idempotentKey has been used
    const generatedTransaction = (await Transactions.findOne({
      where: { amount: amount, transactionReference: idempotentKey },
    })) as unknown as TransactionData;
    if (!generatedTransaction || !generatedTransaction.id) {
      return res.status(404).json({
        status: false,
        message: "Transaction not found",
      });
    }
    if (generatedTransaction.status === "completed") {
      return res.status(400).json({
        status: false,
        message: "Transaction has already been completed",
      });
    }

    //fetch user's complete information
    const completeUserDetails = (await User.findOne({
      where: { id: userDetails.id },
    })) as unknown as UserData;
    if (
      !completeUserDetails ||
      !completeUserDetails.id ||
      !completeUserDetails.balance
    ) {
      return res.status(404).json({
        status: false,
        message: "User does not exist",
      });
    }
    if (completeUserDetails.balance < Number(amount)) {
      return res.status(400).json({
        status: false,
        message: "Insufficient funds",
      });
    }

    const formData = {
      source: "balance",
      amount: `${amount}`,
      reference: `${idempotentKey}`,
      recipient: `${recipientId}`,
      reason: "Checkout Withdrawal",
    };

    initiateTransfer(formData, async (err: any, result: any) => {
      console.log("err: ", err);
      // console.log("result: ", result)
      if (err)
        return res
          .status(500)
          .json({
            status: false,
            message: "Failed to complete withdrawal request",
          });
      const response = JSON.parse(result.body);
      if (response) {
        //on success, debit user account
        const withdraw = withdrawalTransactionQuery(
          completeUserDetails.id!,
          Number(amount)
        );
        if (!withdraw) {
          return res.status(500).json({
            status: false,
            message: "Internal Server Error",
          });
        }
        generatedTransaction.status = "completed";
        generatedTransaction.save();
        //send email notification
        const subject = `${APPNAME}: Withdrawal On Your Account`;
        const content = `You have withdrawn NGN ${amount} from your ${APPNAME} wallet balance.`;
        const contentHTML = emailBroadcastFunction(APPNAME!, content);
        await sendMail(`${completeUserDetails.email}`, subject, contentHTML);
        //send response
        return res.status(200).json({
          status: true,
          message: "Withdrawal completed successfully",
          response: JSON.parse(result.body),
        });
      }
    });
  } catch (error) {
    console.log(`Error: ${error}`);
    return res.status(500).json({
      status: false,
      message: "Internal Server Error",
    });
  }
};

export const processWithdrawal = () => {
  //validate inputs
  //check token
  //check idempotent key
  //verify otp
  //check balance
  //process withdrawal
  //on success, debit user account
  //send response
};
//implement webhook that reverses transaction on failure
