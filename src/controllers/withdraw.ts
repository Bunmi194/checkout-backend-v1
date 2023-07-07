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
import { StatusCodes } from "http-status-codes";
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

export const validateInput = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const errors = validateWithdrawalInputs.safeParse(req.body);
    if (errors.success === false) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        status: false,
        message: errors.error.issues[0].message,
      });
    }
    next();
  } catch (error) {
    console.error(`Error: ${error}`);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      status: false,
      message: "Please try again.",
    });
  }
};

export const authorizeUser = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { authorization } = req.headers;
  try {
    if (!authorization) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        status: false,
        message: "Unauthorized",
      });
    }
    const token = authorization.split(" ")[1];
    const userDetails = jwt.verify(
      token,
      JWT_SECRET!
    ) as unknown as newJwtPayload;
    if (!userDetails || !userDetails.id) {
      return res.status(StatusCodes.FORBIDDEN).json({
        status: false,
        message: "Forbidden",
      });
    }
    next();
  } catch (error) {
    console.error(`Error: ${error}`);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      status: false,
      message: "Please try again.",
    });
  }
};

export const verifyAccount = async (req: Request, res: Response) => {
  const { bankAccount, bank } = req.body;
  try {
    verifyAccountNumber(
      `${bankAccount}`,
      `${bank}`,
      async (err: any, response: any) => {
        if (err) {
          return res.status(StatusCodes.FAILED_DEPENDENCY).json({
            status: false,
            message: "Could not fetch bank details",
          });
        }
        return res.status(StatusCodes.OK).json({
          status: true,
          message: "Bank details retrieved successfully",
          response: JSON.parse(response.body),
        });
      }
    );
  } catch (error) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      status: false,
      message: "Internal Server Error",
    });
  }
};

export const authorizeUserForOTP = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { authorization } = req.headers;
  const idempotentKey = req.headers.idempotentkey;
  if (!authorization || !idempotentKey) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      status: false,
      message: "Authorization token and Idempotent Key are required",
    });
  }
  const token = authorization?.split(" ")[1];
  req.body.token = token;
  next();
};

export const verifyToken = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { token } = req.body;
  try {
    //verify token
    const senderDetails = jwt.verify(token, JWT_SECRET!) as newJwtPayload;
    if (!senderDetails || !senderDetails.id || !senderDetails.email) {
      return res.status(StatusCodes.NOT_FOUND).json({
        status: false,
        message: "User not found",
      });
    }
    req.body.senderDetails = senderDetails;
    next();
  } catch (error) {
    console.error(`Error: ${error}`);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      status: false,
      message: "Internal Server Error",
    });
  }
};

export const generateOTPForWithdrawal = async (req: Request, res: Response) => {
  const idempotentKey = req.headers.idempotentkey;
  const { amount, bankAccount, bank, nameOnAccount, senderDetails } = req.body;
  try {
    //generate OTP
    const otpDetails = generateOTP();
    //check if idempotentKey exists
    const newGeneratedTransaction = (await Transactions.findOne({
      where: { transactionReference: idempotentKey },
    })) as unknown as TransactionData;
    if (newGeneratedTransaction && newGeneratedTransaction.id) {
      return res.status(StatusCodes.CONFLICT).json({
        status: false,
        message:
          "Transaction reference already exists. Please edit your input and retry.",
      });
    }
    //save transaction details with OTP
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
      return res.status(StatusCodes.FAILED_DEPENDENCY).json({
        status: false,
        message: "Please try again.",
      });
    }
    //send OTP to email
    const subject = "Checkout: OTP for Funds Withdrawal";
    const content = `Please use ${otpDetails.otp} as your OTP. This token expires in 10 minutes.`;
    const contentHTML = emailBroadcastFunction(APPNAME!, content);
    await sendMail(`${senderDetails.email}`, subject, contentHTML);
    return res.status(StatusCodes.OK).json({
      status: true,
      message: "OTP sent successfully",
    });
  } catch (error) {
    console.log(`Error: ${error}`);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
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

export const fetchUserDetails = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { senderDetails: userDetails } = req.body;
  try {
    //fetch user's complete information
    const completeUserDetails = (await userExists(
      Number(userDetails.id)
    )) as unknown as UserData;
    if (!completeUserDetails || !completeUserDetails.id) {
      return res.status(StatusCodes.NOT_FOUND).json({
        status: false,
        message: "User does not exist",
      });
    }
    req.body.completeUserDetails = completeUserDetails;
    next();
  } catch (error) {
    console.error(`Error: ${error}`);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      status: false,
      message: "Internal Server Error",
    });
  }
};

export const validateOTPForWithdrawal = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { amount, otp } = req.body;
  const idempotentKey = req.headers.idempotentkey;
  try {
    const generatedTransaction = (await Transactions.findOne({
      where: { amount: amount, transactionReference: idempotentKey },
    })) as unknown as TransactionData;

    if (!generatedTransaction || !generatedTransaction.id) {
      return res.status(StatusCodes.NOT_FOUND).json({
        status: false,
        message: "Transaction does not exist",
      });
    }
    if (!generatedTransaction.otp || !generatedTransaction.secretKey) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        status: false,
        message: "Error fetching transaction OTP",
      });
    }
    //verify otp
    if (generatedTransaction.otp !== otp) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        status: false,
        message: "Invalid OTP. Please type most recent OTP",
      });
    }
    const isOTPValid = verifyOTP(otp, `${generatedTransaction.secretKey}`);
    if (!isOTPValid) {
      return res.status(StatusCodes.FORBIDDEN).json({
        status: false,
        message: "Invalid OTP. Time constraint of 10 minutes might have passed",
      });
    }
    req.body.generatedTransaction = generatedTransaction;
    next();
  } catch (error) {
    console.error(`Error: ${error}`);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      status: false,
      message: "Internal Server Error",
    });
  }
};

export const checkBalance = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { amount, completeUserDetails } = req.body;
  try {
    //check balance
    if (completeUserDetails.balance! < Number(amount)) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        status: false,
        message: "Insufficient balance",
      });
    }
    next();
  } catch (error) {
    console.error(`Error: ${error}`);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      status: false,
      message: "Internal Server Error",
    });
  }
};

export const createTransferRecipientMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { bankAccount, bank, nameOnAccount } = req.body;
  try {
    //process withdrawal

    //process to create recipient code
    const formData = {
      type: "nuban",
      name: `${nameOnAccount}`,
      account_number: `${bankAccount}`,
      bank_code: `${bank}`,
      currency: "NGN",
    };
    createTransferRecipient(formData, async (err: any, result: any) => {
      if (err)
        return res
          .status(StatusCodes.FAILED_DEPENDENCY)
          .json({ status: false, message: err });
      req.body.result = JSON.parse(result.body);
      next();
    });
  } catch (error) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      status: false,
      message: "Internal Server Error",
    });
  }
};

export const hasIdempotentKeyBeenUsed = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { amount } = req.body;
  const idempotentKey = req.headers.idempotentkey;
  try {
    //check if idempotentKey has been used
    const generatedTransaction = (await Transactions.findOne({
      where: { amount: amount, transactionReference: idempotentKey },
    })) as unknown as TransactionData;
    if (!generatedTransaction || !generatedTransaction.id) {
      return res.status(StatusCodes.NOT_FOUND).json({
        status: false,
        message: "Transaction not found",
      });
    }
    if (generatedTransaction.status === "completed") {
      return res.status(StatusCodes.CONFLICT).json({
        status: false,
        message: "Transaction has already been completed",
      });
    }
    req.body.generatedTransaction = generatedTransaction;
    next();
  } catch (error) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      status: false,
      message: "Internal Server Error",
    });
  }
};

export const initiateTransferMiddleware = async (
  req: Request,
  res: Response
) => {
  const idempotentKey = req.headers.idempotentkey;
  const {
    amount,
    generatedTransaction,
    completeUserDetails,
    result: recipientObj,
  } = req.body;
  const recipientId = recipientObj.data.recipient_code;
  try {
    const transaction = await sequelize.transaction();

    if (completeUserDetails.balance < Number(amount)) {
      return res.status(StatusCodes.BAD_REQUEST).json({
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
      if (err)
        return res.status(StatusCodes.FAILED_DEPENDENCY).json({
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
          return res.status(StatusCodes.FAILED_DEPENDENCY).json({
            status: false,
            message: "Please try again",
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
        return res.status(StatusCodes.OK).json({
          status: true,
          message: "Withdrawal completed successfully",
          response: JSON.parse(result.body),
        });
      }
    });
  } catch (error) {
    console.log(`Error: ${error}`);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
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
