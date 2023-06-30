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
import { emailContentFunction } from "../services/emailContent";
import { emailBroadcastFunction } from "../services/emailbroadcast";
import dotenv from "dotenv";
import jwt, { Secret, JwtPayload } from "jsonwebtoken";
import bcrypt from "bcrypt";
import { StatusCodes } from "http-status-codes";
import {
  initializePaymentPaystack,
  verifyPaymentPaystack,
} from "../services/paystack";
// import { initializePaymentFlutterwave, verifyPaymentFlutterwave, encrypt, payWithUSSD } from "../services/flutterwave";
import { initializePaymentStripe } from "../services/stripe";
import { v4 as uuidv4 } from "uuid";
import Transactions from "../models/transactions";
dotenv.config();
import Flutterwave from "flutterwave-node-v3";

const FLWTOKEN =
  process.env.FLUTTERWAVE_API_SECRET_KEY_TEST ||
  "FLWSECK_TEST-25f9d923e1d66d20670c2846f88e4cdb-X";
const publicKey = "FLWPUBK_TEST-61f4488e423858da2fe2f35dae6010cf-X";
const encryptionKey: string = "FLWSECK_TESTe843f37d9496";

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

const { APPNAME, JWT_SECRET, SALT_ROUNDS } = process.env;

export const validateUserSignUpInput = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    //validate user input
    const error = validateUserInputOnSignup.safeParse(req.body);
    console.log("error: ", error);
    if (error.success === false) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        status: false,
        message: error.error.issues[0].message,
      });
    }
    next();
  } catch (error) {
    console.error(`Error: ${error}`);
    return res.status(StatusCodes.BAD_REQUEST).json({
      status: false,
      message: "Please try again",
    });
  }
};

export const validateUserLogInInput = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    console.log("STAGE 1");
    //validate user input
    const error = validateUserInputOnLogin.safeParse(req.body);
    if (error.success === false) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        status: false,
        message: error.error.issues[0].message,
      });
    }
    next();
  } catch (error) {
    console.error(`Error: ${error}`);
    return res.status(StatusCodes.BAD_REQUEST).json({
      status: false,
      message: "Please try again",
    });
  }
};

export const validatePasswordAndConfirmPassword = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { password, confirmPassword } = req.body;
  //validate password and confirm password
  if (password !== confirmPassword) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      status: false,
      message: "Passwords do not match",
    });
  }
  next();
};

export const doesUserExistInDB = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { email } = req.body;
  try {
    //check if user exists
    const user = await userExists(email);
    console.log("user: ", user);
    if (user && user.email) {
      return res.status(StatusCodes.CONFLICT).json({
        status: false,
        message: "User already exists",
      });
    }
    const token = jwt.sign(
      {
        email,
      },
      JWT_SECRET!
    );
    req.body.token = token;
    next();
  } catch (error) {
    console.error(`Error: ${error}`);
    return res.status(StatusCodes.BAD_REQUEST).json({
      status: false,
      message: "Please try again",
    });
  }
};

export const sendVerificationEmail = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { email, token } = req.body;
  try {
    //send email for validation with token
    const html = emailContentFunction(APPNAME!, token);
    const subject = "Checkout Email Verification";
    const sendEmailWithToken = await sendMail(email, subject, html);
    console.log("sendEmailWithToken: ", sendEmailWithToken);
    next();
  } catch (error) {
    console.error(`Error: ${error}`);
    return res.status(StatusCodes.FAILED_DEPENDENCY).json({
      status: false,
      message: "Please try again",
    });
  }
};

export const writeUserToDataBase = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { email, password, firstName, lastName } = req.body;
  try {
    const salt = await bcrypt.genSalt(Number(SALT_ROUNDS!));
    const encryptedPassword = await bcrypt.hash(password, salt);
    const newUser = {
      firstName,
      lastName,
      email,
      password: encryptedPassword,
      isVerified: false,
      balance: 0,
    };
    const saveUser = await writeUserToDatabase(newUser);
    if (!saveUser) {
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        status: false,
        message: "Please try again later",
      });
    }
    req.body.saveUser = saveUser;
    next();
  } catch (error) {
    console.error(`Error: ${error}`);
    return res.status(StatusCodes.FAILED_DEPENDENCY).json({
      status: false,
      message: "Please try again",
    });
  }
};

export const signUserUp = async (req: Request, res: Response) => {
  const { saveUser } = req.body;
  return res.status(StatusCodes.CREATED).json({
    status: true,
    message: "Signup successful",
    saveUser,
  });
};

export const isUserVerified = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { email } = req.body;
  console.log("STAGE 2");
  try {
    //check if user exists
    const user = (await userExists(email)) as unknown as UserData;
    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json({
        status: false,
        message: "Invalid email or password",
      });
    }
    //check if account is verified
    if (user && !user.isVerified) {
      return res.status(StatusCodes.FORBIDDEN).json({
        status: false,
        message: "Please verify your account",
      });
    }
    req.body.user = user;
    next();
  } catch (error) {
    console.error(`Error: ${error}`);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      status: false,
      message: "Please try again.",
    });
  }
};

export const verifyPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { password, user } = req.body;
  console.log("STAGE 3");
  try {
    //check password
    const passwordValid = await bcrypt.compare(password, user.password!);
    if (!passwordValid) {
      return res.status(StatusCodes.FORBIDDEN).json({
        status: false,
        message: "Invalid email or password",
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
export const logUserIn = async (req: Request, res: Response) => {
  const { email, user } = req.body;
  console.log("STAGE 4");
  try {
    //send a token
    const token = jwt.sign(
      {
        email,
        id: user.id!,
      },
      JWT_SECRET!
    );
    if (!token) {
      return res.status(StatusCodes.FAILED_DEPENDENCY).json({
        status: false,
        message: "Please try again later",
      });
    }
    return res.status(StatusCodes.OK).json({
      status: true,
      message: "Login successful",
      token,
      user,
    });
  } catch (error) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      status: false,
      message: "Please try again.",
    });
  }
};

export const validateUserToken = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    //validate input parameter
    const token = req.params.token;
    const error = validateToken.safeParse({ token: token });
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

export const decodeToken = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const token = req.params.token;
  try {
    //decode jwt token
    const userEmail = jwt.verify(
      token,
      JWT_SECRET!
    ) as unknown as newJwtPayload;
    if (!userEmail || (userEmail && !userEmail.email!)) {
      return res.status(StatusCodes.FORBIDDEN).send({
        status: false,
        message: "Unauthorized",
      });
    }
    req.body.userEmail = userEmail;
    next();
  } catch (error) {
    console.log(`Error: ${error}`);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      status: false,
      message: "Please try again",
    });
  }
};

export const doesUserExists = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { userEmail } = req.body;
  try {
    //check if user exists
    const user = (await userExists(userEmail.email!)) as unknown as UserData;
    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json({
        status: false,
        message: "User does not exist",
      });
    }
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

export const verifyEmail = async (req: Request, res: Response) => {
  const { user } = req.body;
  const updatedUserRec = {
    ...user._previousDataValues,
    isVerified: true,
  };
  try {
    const updatedUser = (await updateUserRecord(
      user.id!,
      updatedUserRec
    )) as unknown as UserData;
    if (!updatedUser) {
      return res.status(StatusCodes.FAILED_DEPENDENCY).json({
        status: false,
        message: "Please try again later",
      });
    }
    return res.status(StatusCodes.OK).json({
      status: true,
      message: "User verified successfully",
    });
  } catch (error) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      status: false,
      message: "Please try again.",
    });
  }
};
