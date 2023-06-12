import User from "../models/user";
import { Request, response, Response } from "express";
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

console.log("Details: ", APPNAME, JWT_SECRET, SALT_ROUNDS);

export const signUserUp = async (req: Request, res: Response) => {
  // console.log("body: ", req.body);
  try {
    //validate user input
    const error = validateUserInputOnSignup.safeParse(req.body);
    console.log("error: ", error);
    if (error.success === false) {
      console.log("error: ", JSON.stringify(error.error));
      return res.status(400).json({
        status: false,
        message: error.error.issues[0].message,
      });
    }
    const { email, password, confirmPassword, firstName, lastName } = req.body;
    //validate password and confirm password
    if (password !== confirmPassword) {
      return res.status(400).json({
        status: false,
        message: "Passwords do not match",
      });
    }
    //check if user exists
    const user = await userExists(email);
    console.log("user: ", user);
    if (user && user.email) {
      return res.status(400).json({
        status: false,
        message: "User already exists",
      });
    }
    const token = await jwt.sign(
      {
        email,
      },
      JWT_SECRET!
    );
    //send email for validation with token
    const html = emailContentFunction(APPNAME!, token);
    const subject = "Checkout Email Verification";
    const sendEmailWithToken = await sendMail(email, subject, html);
    console.log("sendEmailWithToken: ", sendEmailWithToken);
    //save user record in database
    if (sendEmailWithToken?.accepted[0]) {
      const salt = await bcrypt.genSalt(Number(SALT_ROUNDS!));
      // console.log("salt: ", salt);
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
      // console.log("saveUser: ", saveUser);
      if (!saveUser) {
        return res.status(500).json({
          status: false,
          message: "Internal Server Error",
        });
      }
      return res.status(201).json({
        status: true,
        message: "Signup successful",
        saveUser,
      });
    }

    return res.status(500).json({
      status: false,
      message: "Internal server error",
    });
  } catch (error) {
    console.log("Error: ", error);
    return res.status(500).json({
      status: false,
      message: "Internal server error",
    });
  }
};

export const logUserIn = async (req: Request, res: Response) => {
  try {
    //validate user input
    const error = validateUserInputOnLogin.safeParse(req.body);
    if (error.success === false) {
      return res.status(400).json({
        status: false,
        message: error.error.issues[0].message,
      });
    }
    const { email, password } = req.body;
    //check if user exists
    const user = (await userExists(email)) as unknown as UserData;
    if (!user) {
      return res.status(404).json({
        status: false,
        message: "Invalid email or password",
      });
    }
    //check if account is verified
    if (user && !user.isVerified) {
      return res.status(403).json({
        status: false,
        message: "Please verify your account",
      });
    }
    //check password
    const passwordValid = await bcrypt.compare(password, user.password!);
    if (!passwordValid) {
      return res.status(500).json({
        status: false,
        message: "Invalid email or password",
      });
    }
    //send a token
    const token = await jwt.sign(
      {
        email,
        id: user.id!,
      },
      JWT_SECRET!
    );
    if (!token) {
      return res.status(500).json({
        status: false,
        message: "Internal Server Error",
      });
    }
    return res.status(200).json({
      status: true,
      message: "Login successful",
      token,
      user,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Internal Server Error",
    });
  }
};

export const verifyEmail = async (req: Request, res: Response) => {
  try {
    //validate input parameter
    const token = req.params.token;
    console.log("token: ", token);
    const error = validateToken.safeParse({ token: token });
    if (error.success === false) {
      return res.status(400).json({
        status: false,
        message: error.error.issues[0].message,
      });
    }
    //decode jwt token
    const userEmail = jwt.verify(
      token,
      JWT_SECRET!
    ) as unknown as newJwtPayload;
    if (!userEmail || (userEmail && !userEmail.email!)) {
      return res.status(403).send({
        status: false,
        message: "Invalid JWT token",
      });
    }
    //check if user exists
    const user = (await userExists(userEmail.email!)) as unknown as UserData;
    // console.log("user: ", user);
    if (!user) {
      return res.status(404).json({
        status: false,
        message: "User does not exist",
      });
    }
    //update user record in database
    const updatedUserRec = {
      ...user._previousDataValues,
      isVerified: true,
    };
    // console.log("updatedUserRec: ", updatedUserRec);
    const updatedUser = (await updateUserRecord(
      user.id!,
      updatedUserRec
    )) as unknown as UserData;
    // console.log("updatedUser: ", updatedUser);
    if (!updatedUser) {
      return res.status(500).json({
        status: false,
        message: "Internal Server Error",
      });
    }
    return res.status(200).json({
      status: true,
      message: "User verified successfully",
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Internal Server Error",
    });
  }
};
