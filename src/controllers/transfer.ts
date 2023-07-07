import { Request, NextFunction, Response } from "express";
import User from "../models/user";
import Transactions from "../models/transactions";
import { validateTransferDetails } from "../auth/transfer";
import jwt, { JwtPayload } from "jsonwebtoken";
import { Optional, SaveOptions, UUID } from "sequelize";
import { userExists } from "../services/user";
import { sendMail } from "../services/email";
import { emailBroadcastFunction } from "../services/emailbroadcast";
import {
  writeTransactionToDatabase,
  transferTransactionQuery,
} from "../services/transaction";
import { generateOTP, verifyOTP } from "../utils/otp";
import { StatusCodes } from "http-status-codes";

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
}

export const validateInput = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    //validate user input
    const error = validateTransferDetails.safeParse(req.body);
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

export const authenticateUser = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { authorization } = req.headers;
    const idempotentkey = `${req.headers.idempotentkey}`.trim();

    if (!authorization || !idempotentkey) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        status: false,
        message: "User not authorized",
      });
    }
    const token = `${authorization}`.split(" ")[1];
    //verify token
    const senderDetails = jwt.verify(token, JWT_SECRET!) as newJwtPayload;
    if (!senderDetails || !senderDetails.id) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        status: false,
        message: "Please try again",
      });
    }
    req.body.senderDetails = senderDetails;
    next();
  } catch (error) {
    console.log(`Error: ${error}`);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      status: false,
      message: "Please try again",
    });
  }
};

export const doesRecipientExist = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let { senderDetails, accountNumber } = req.body;
  accountNumber = accountNumber.trim();
  try {
    //check if recipient exists
    const recipientDetails = (await userExists(
      Number(accountNumber)
    )) as unknown as UserData;
    if (!recipientDetails || !recipientDetails.id) {
      return res.status(StatusCodes.NOT_FOUND).json({
        status: false,
        message: "Recipient does not exist",
      });
    }
    if (recipientDetails.id === senderDetails.id) {
      return res.status(StatusCodes.FORBIDDEN).json({
        status: false,
        message: "You cannot transfer to yourself",
      });
    }
    req.body.accountNumber = accountNumber;
    req.body.recipientDetails = recipientDetails;
    next();
  } catch (error) {
    console.log(`Error: ${error}`);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      status: false,
      message: "Please try again",
    });
  }
};

export const doesCurrencyMatch = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { recipientDetails, currency } = req.body;
  try {
    //check if recipient currency matches
    const recipientCurrency = `${recipientDetails.currency}`.toLowerCase();
    if (
      recipientDetails.currency &&
      recipientCurrency !== currency.toLowerCase()
    ) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        status: false,
        message: `Recipient currency is set to ${recipientDetails.currency}`,
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

export const checkTransactionReference = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const idempotentkey = `${req.headers.idempotentkey}`.trim();
  try {
    //check transaction reference
    const transactionReferenceDetails = (await Transactions.findOne({
      where: { transactionReference: idempotentkey },
    })) as unknown as TransactionData;
    if (transactionReferenceDetails && transactionReferenceDetails.id) {
      return res.status(StatusCodes.CONFLICT).json({
        status: false,
        message: "Transaction with same reference has already been processed.",
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

export const checkForUserDetails = async (req: Request, res: Response) => {
  let { senderDetails, recipientDetails, amount, currency } = req.body;
  const idempotentkey = `${req.headers.idempotentkey}`.trim();
  amount = amount.trim();
  currency = currency.trim();
  const newTransaction: TransactionData = {
    userId: senderDetails.id,
    typeOfTransaction: "transfer",
    amount,
    recipientId: recipientDetails.id,
    status: "initiated",
    currency: `${currency}`.toUpperCase(),
    gateway: "checkout",
    transactionReference: `${idempotentkey}`,
    otp: "1",
    secretKey: "1",
  };
  try {
    //save idempotent key with transaction details
    const createTransaction = (await writeTransactionToDatabase(
      newTransaction
    )) as unknown as TransactionData;

    if (!createTransaction || !createTransaction.id) {
      return res.status(StatusCodes.FAILED_DEPENDENCY).json({
        status: false,
        message: "Please try again later.",
      });
    }
    //send recipient name and details as response for approval
    return res.status(StatusCodes.CREATED).json({
      status: true,
      message: "Transfer initiated",
      recipientDetails,
    });
  } catch (error) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      status: false,
      message: "Please try again later",
    });
  }
};

export const createOTPAndSave = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { amount, accountNumber } = req.body;
  const idempotentkey = req.headers.idempotentkey;
  try {
    //generate OTP
    const otpDetails = generateOTP();
    //update transaction details with OTP
    const generatedTransaction = (await Transactions.findOne({
      where: {
        amount: amount,
        recipientId: Number(accountNumber),
        transactionReference: idempotentkey,
      },
    })) as unknown as TransactionData;

    if (!generatedTransaction || !generatedTransaction.id) {
      return res.status(StatusCodes.NOT_FOUND).json({
        status: false,
        message: "Transaction does not exist",
      });
    }
    req.body.otpDetails = otpDetails;
    req.body.generatedTransaction = generatedTransaction;
    next();
  } catch (error) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      status: false,
      message: "Please try again later",
    });
  }
};

export const generateOTPForDatabase = async (req: Request, res: Response) => {
  const { otpDetails, senderDetails, generatedTransaction } = req.body;
  try {
    const { amount, accountNumber, currency } = req.body;

    //send OTP to email
    const subject = "Checkout: OTP for Funds Transfer";
    const content = `Please use ${otpDetails.otp} as your OTP. This token expires in 10 minutes.`;
    const contentHTML = emailBroadcastFunction(APPNAME!, content);
    //save otp and secretKey in database
    generatedTransaction.status = "otp sent";
    generatedTransaction.otp = otpDetails.otp;
    generatedTransaction.secretKey = otpDetails.secretKey;
    generatedTransaction.save().then(async () => {
      await sendMail(`${senderDetails.email}`, subject, contentHTML);
      return res.status(StatusCodes.OK).json({
        status: true,
        message: "OTP sent successfully",
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

export const authenticateOTP = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { otp } = req.body;
    const { authorization } = req.headers;
    const idempotentkey = `${req.headers.idempotentkey}`.trim();

    if (!authorization || !idempotentkey) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        status: false,
        message: "User not authorized",
      });
    }
    if (!otp || typeof otp !== "string") {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        status: false,
        message: "Please enter otp",
      });
    }
    const token = `${authorization}`.split(" ")[1];
    //verify token
    const senderDetails = jwt.verify(token, JWT_SECRET!) as newJwtPayload;
    if (!senderDetails || !senderDetails.id) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        status: false,
        message: "Please try again",
      });
    }
    req.body.senderDetails = senderDetails;
    next();
  } catch (error) {
    console.log(`Error: ${error}`);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      status: false,
      message: "Please try again",
    });
  }
};

export const checkUserBalance = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { senderDetails, amount } = req.body;
  try {
    //fetch sender details
    const senderFullDetails = (await userExists(
      Number(senderDetails.id)
    )) as unknown as UserData;
    if (!senderFullDetails || !senderFullDetails.id) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        status: false,
        message: "User not authorized",
      });
    }
    //check if user has sufficient balance
    if (
      senderFullDetails.balance &&
      senderFullDetails.balance < Number(amount)
    ) {
      return res.status(StatusCodes.FORBIDDEN).json({
        status: false,
        message: "Insufficient balance",
      });
    }
    req.body.senderFullDetails = senderFullDetails;
    next();
  } catch (error) {
    console.log(`Error: ${error}`);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      status: false,
      message: "Please try again",
    });
  }
};

export const checkRecipientStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { accountNumber, currency } = req.body;
  try {
    //check if recipient exists
    const recipientDetails = (await userExists(
      Number(accountNumber)
    )) as unknown as UserData;
    if (!recipientDetails || !recipientDetails.id || !recipientDetails.email) {
      return res.status(StatusCodes.NOT_FOUND).json({
        status: false,
        message: "Recipient does not exist",
      });
    }
    //check if recipient has verified account
    if (!recipientDetails.isVerified) {
      return res.status(StatusCodes.FORBIDDEN).json({
        status: false,
        message: "Recipient account is inactive",
      });
    }
    //check if recipient currency matches
    const recipientCurrency = `${recipientDetails.currency}`.toLowerCase();
    if (
      recipientDetails.currency &&
      recipientCurrency !== currency.toLowerCase()
    ) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        status: false,
        message: `Recipient currency is set to ${recipientDetails.currency}`,
      });
    }
    req.body.recipientDetails = recipientDetails;
    next();
  } catch (error) {
    console.log(`Error: ${error}`);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      status: false,
      message: "Please try again",
    });
  }
};

export const checkTransaction = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { accountNumber, amount } = req.body;
  const idempotentkey = req.headers.idempotentkey;
  try {
    const generatedTransaction = (await Transactions.findOne({
      where: {
        amount: amount,
        recipientId: Number(accountNumber),
        transactionReference: idempotentkey,
      },
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
        message: "OTP yet to be generated",
      });
    }
    //check for duplicate transactions
    if (
      generatedTransaction.otp &&
      generatedTransaction.secretKey &&
      generatedTransaction.status === "completed"
    ) {
      return res.status(StatusCodes.CONFLICT).json({
        status: false,
        message: "Transaction has already been processed",
      });
    }
    req.body.generatedTransaction = generatedTransaction;
    next();
  } catch (error) {
    console.log(`Error: ${error}`);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      status: false,
      message: "Please try again",
    });
  }
};

export const verifyOTPDetails = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { otp, generatedTransaction } = req.body;
  const idempotentkey = req.headers.idempotentkey;
  try {
    //verify OTP
    if (otp !== generatedTransaction.otp) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        status: false,
        message: "Invalid OTP. Please enter most recent OTP",
      });
    }
    const isOTPValid = verifyOTP(otp, `${generatedTransaction.secretKey}`);
    if (!isOTPValid) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        status: false,
        message: "Bad or expired OTP. Please retry",
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

export const processTransfer = async (req: Request, res: Response) => {
  //validate user input
  const {
    accountNumber,
    senderDetails,
    amount,
    currency,
    generatedTransaction,
    senderFullDetails,
    recipientDetails,
  } = req.body;
  try {
    //run transaction to credit recipient and debit sender
    const updateRecords = transferTransactionQuery(
      accountNumber,
      senderDetails.id,
      amount,
      currency
    );
    if (!updateRecords) {
      return res.status(StatusCodes.FAILED_DEPENDENCY).json({
        status: false,
        message: "Error updating records",
      });
    }
    //update transaction record
    generatedTransaction.status = "completed";
    generatedTransaction
      .save()
      .then(() => {
        //send notification emails
        const subject = "Checkout: New Transaction on your account";
        const contentForRecipient = `You just received ${currency.toUpperCase()} ${amount} from ${
          senderFullDetails.firstName
        } ${senderFullDetails.lastName} with account number ${
          senderDetails.id
        }`;
        const contentForSender = `You just sent ${currency.toUpperCase()} ${amount} to ${
          recipientDetails.firstName
        } ${recipientDetails.lastName} with account number ${
          recipientDetails.id
        }`;

        const emailContentForRecipient = emailBroadcastFunction(
          APPNAME!,
          contentForRecipient
        );

        const emailContentForSender = emailBroadcastFunction(
          APPNAME!,
          contentForSender
        );

        sendMail(recipientDetails.email!, subject, emailContentForRecipient);
        sendMail(senderDetails.email!, subject, emailContentForSender);
        return res.status(StatusCodes.OK).json({
          status: true,
          message: "Transfer successful",
        });
      })
      .catch((error: any) => {
        console.log(`Error: ${error}`);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
          status: false,
          message: "Transfer failed",
        });
      });
  } catch (error) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      status: false,
      message: "Please try again",
    });
  }
};
