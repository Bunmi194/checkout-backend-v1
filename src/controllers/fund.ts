import User from "../models/user";
import { NextFunction, Request, response, Response } from "express";
import {
  validateUserInputOnSignup,
  validateUserInputOnLogin,
  validateToken,
  validateFundWalletDetails,
} from "../auth/user";
import {
  userExists,
  writeUserToDatabase,
  updateUserRecord,
} from "../services/user";
import { writeTransactionToDatabase } from "../services/transaction";
import { Optional, SaveOptions, UUID } from "sequelize";
import { sendMail } from "../services/email";
import { emailBroadcastFunction } from "../services/emailbroadcast";
import dotenv from "dotenv";
import jwt, { Secret, JwtPayload } from "jsonwebtoken";
import bcrypt from "bcrypt";
import {
  initializePaymentPaystack,
  verifyPaymentPaystack,
} from "../services/paystack";
import { v4 as uuidv4 } from "uuid";
import Transactions from "../models/transactions";
import { StatusCodes } from "http-status-codes";
dotenv.config();

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
}
export const validateInput = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  //validate input
  try {
    const error = validateFundWalletDetails.safeParse(req.body);
    if (error.success === false) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        status: false,
        message: error.error.issues[0].message,
      });
    }
    next();
  } catch (error) {
    console.log(`Error: ${error}`);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      status: false,
      message: "Please try again",
    });
  }
};

export const authorizeUser = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { authorization: rawToken } = req.headers;
  try {
    //validate token
    let { amount } = req.body;
    amount = Number(amount);
    const token = rawToken?.split(" ")[1];
    if (!token || typeof token !== "string") {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        status: false,
        message: "Permission denied",
      });
    }
    const fundDetails = jwt.verify(token, JWT_SECRET!) as newJwtPayload;
    if (!fundDetails || !fundDetails.id) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        status: false,
        message: "Permission denied",
      });
    }
    req.body.fundDetails = fundDetails;
    next();
  } catch (error) {
    console.log(`Error: ${error}`);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      status: false,
      message: "Please try again",
    });
  }
};

export const getUserId = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { fundDetails } = req.body;
  try {
    //get user id from token
    const user = (await userExists(fundDetails.id)) as unknown as UserData;
    if (!user.id)
      return res.status(StatusCodes.NOT_FOUND).json({
        status: false,
        message: "User not found",
      });
    req.body.user = user;
    next();
  } catch (error) {
    console.log(`Error: ${error}`);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      status: false,
      message: "Please try again",
    });
  }
};

export const checkCurrency = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { currency } = req.body;
  const { user } = req.body;
  try {
    //check if user has already made a transaction
    if (user.currency && user.currency.toLowerCase() !== currency.toLowerCase())
      return res.status(StatusCodes.BAD_REQUEST).json({
        status: false,
        message: `Your account currency is set to ${user.currency}`,
      });

    next();
  } catch (error) {
    console.log(`Error: ${error}`);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      status: false,
      message: "Please try again",
    });
  }
};

export const fundWallet = async (req: Request, res: Response) => {
  const { user, fundDetails } = req.body;
  const {
    amount,
    currency,
    booking,
    typeOfTransaction,
    gateway,
    phoneNumber,
    redirect_url,
  } = req.body;
  try {
    const formData: any = {
      ...user._previousDataValues,
      amount: amount * 100,
      currency: currency.toUpperCase(),
    };
    const data = {
      tx_ref: "12346678987654",
      Booking: booking,
      amount,
      currency: currency.toUpperCase(),
      redirect_url,
      payment_options: "card",
      customer: {
        email: fundDetails.email,
        phone_number: phoneNumber,
        name: `${user._previousDataValues.firstName} ${user._previousDataValues.lastName}`,
      },
    };
    switch (gateway) {
      case "paystack":
        initializePaymentPaystack(
          JSON.stringify(formData),
          async (error: any, body: any) => {
            if (error)
              return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                status: false,
                message: "Please try again later",
              });
            const response = body;
            const newTransaction = {
              userId: user.id,
              typeOfTransaction,
              // status: '',
              amount: amount,
              status: "pending",
              currency: currency.toUpperCase(),
              gateway,
              transactionReference: response.data.reference,
            };

            //save record to database
            const createTransaction = (await writeTransactionToDatabase(
              newTransaction
            )) as unknown as TransactionData;
            if (!createTransaction.id) {
              return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                status: false,
                message: "Please try again later",
              });
            }
            return res.status(StatusCodes.CREATED).json({
              status: true,
              message: "Transaction initiated",
              response,
            });
          }
        );
        break;
      case "flutterwave":
        break;
      default:
        res.status(StatusCodes.BAD_REQUEST).json({
          status: false,
          message: "Invalid payment method",
        });
        break;
    }
  } catch (error: any) {
    console.log(`Error: ${error}`);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      status: false,
      message: "Please try again later",
    });
  }
};

export const validateFundWallet = async (req: Request, res: Response) => {
  try {
    const { referenceId } = req.params;
    const { fundDetails: userDetails } = req.body;

    verifyPaymentPaystack(referenceId, async (error: any, body: any) => {
      if (error)
        return res.status(StatusCodes.FAILED_DEPENDENCY).json({
          status: false,
          message: "Could not connect to Paystack",
        });
      const response = JSON.parse(body);
      if (!response || !response.status)
        return res.status(StatusCodes.EXPECTATION_FAILED).json({
          status: false,
          message: "Payment was not successful",
        });
      if (response.data.gateway_response !== "Successful") {
        return res.status(StatusCodes.FORBIDDEN).json({
          status: false,
          message: "Payment was not successful",
        });
      }
      const amount = response.data.amount / 100;
      const currency = response.data.currency;
      //get user id from token
      const user = (await userExists(userDetails.id!)) as unknown as UserData;
      if (!user || !user.id)
        return res.status(404).json({
          status: false,
          message: "User not found",
        });

      //find transaction details and update
      const transactionDetails = (await Transactions.findOne({
        where: { transactionReference: referenceId, amount: amount },
      })) as unknown as TransactionData;
      if (!transactionDetails || !transactionDetails.id) {
        return res
          .status(StatusCodes.NOT_FOUND)
          .json({ message: "Transaction not found" });
      }
      if (transactionDetails && transactionDetails.status === "completed") {
        return;
      }
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
        await sendMail(userDetails.email!, subject, emailContent);
        return res.status(StatusCodes.CREATED).json({
          status: true,
          message: "Checkout Wallet Funded",
          user,
          response,
        });
      });
    });
  } catch (error) {
    console.log(`Error: ${error}`);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      status: false,
      message: "Please try again later",
    });
  }
};
