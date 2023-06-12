import User from "../models/user";
import { Request, response, Response } from "express";
import { validateUserInputOnSignup, validateUserInputOnLogin, validateToken, validateFundWalletDetails } from "../auth/user";
import { userExists, writeUserToDatabase, updateUserRecord } from "../services/user";
import { writeTransactionToDatabase } from "../services/transaction";
import { Optional, SaveOptions, UUID } from "sequelize";
import { sendMail } from "../services/email";
import { emailBroadcastFunction } from "../services/emailbroadcast";
import dotenv from "dotenv";
import jwt, { Secret, JwtPayload } from "jsonwebtoken";
import bcrypt from "bcrypt";
import { initializePaymentPaystack, verifyPaymentPaystack } from "../services/paystack";
import { v4 as uuidv4 } from "uuid";
import Transactions from "../models/transactions";
dotenv.config();

const { APPNAME, JWT_SECRET, SALT_ROUNDS } = process.env;

interface UserData extends Optional<any, string>, SaveOptions<any>{
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
    
  }
export const fundWallet = async (req: Request, res: Response) => {
    try {
      //validate input
    const error = validateFundWalletDetails.safeParse(req.body);
    if(error.success === false) {
      return res.status(400).json({
        status: false,
        message: error.error.issues[0].message
      })
    }
    //validate token
    const { authorization: rawToken  } = req.headers;
    console.log("auth: ", req.headers.authorization);
    let { gateway, amount, currency, typeOfTransaction, phoneNumber, booking, redirect_url } = req.body;
    amount = Number(amount);
    const token = rawToken?.split(" ")[1];
    if(!token || typeof token !== 'string'){
      return res.status(400).json({
        status: false,
        message: "Bad request"
      })
    }
    console.log("token: ", token);
    const fundDetails = jwt.verify(token, JWT_SECRET!) as newJwtPayload;
    console.log("fundDetails: ", fundDetails);
    if(!fundDetails || !fundDetails.id){
      return res.status(401).json({
        status: false,
        message: "Unauthorised"
      })
    }
    //get user id from token
    const user = await userExists(fundDetails.id) as unknown as UserData;
    // console.log("user: ", user)
    console.log("user previous data: ", user._previousDataValues)
    if (!user.id) return res.status(404).json({
      status: false,
      message: "User not found"
    });
  
    //check if user has already made a transaction
    if(user.currency && (user.currency.toLowerCase() !== currency.toLowerCase())) return res.status(400).json({
      status: false,
      message: `Your account currency is set to ${user.currency}`
    });
    //check user payment gateway
    const formData: any = {
      ...user._previousDataValues,
      amount: amount * 100,
      currency: currency.toUpperCase()
    }
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
    console.log("data: ", data);
    switch (gateway) {
      case "paystack":
        //write paystack logic
        //call the function and save record in database
        //uuidv4()
        initializePaymentPaystack(JSON.stringify(formData), async (error: any, body: any)=>{
          if(error) return res.status(500).json({
            status: false,
            message: "Internal Server Error",
          });
          console.log("formDataIN: ", formData);
          console.log("bodyHERE: ", body);
          const response = body;
          console.log("response: ", response);
          const newTransaction = {
            userId: user.id,
            typeOfTransaction,
            // status: '',
            amount: amount,
            status: "pending", 
            currency: currency.toUpperCase(),
            gateway,
            transactionReference: response.data.reference
          };
  
          //save record to database
          const createTransaction = await writeTransactionToDatabase(newTransaction) as unknown as TransactionData;
          if(!createTransaction.id){
            return res.status(500).json({
              status: false,
              message: "Internal Server Error"
            })
          }
          return res.status(201).json({
            status: true,
            message: "Transaction initiated",
            response
          })
        })
        break;
      case "flutterwave":
        console.log("USSD");
        // initializePaymentPaystackUSSD(formData, async (err: any, result: any) => {
        //   console.log("err: ", err);
        //   console.log("result: ", result);
        // });
        break;
      default:
        res.status(400).json({
          status: false,
          message: "Invalid payment method"
        })
        break;
    }
    } catch (error: any) {
      console.log(`Error: ${error}`);
      console.log(`Error: ${error.message}`);
      // if(error.message === "jwt malformed"){
      //   res.redirect("http://localhost:3000/");
      // }
      return res.status(500).json({
        status: false,
        message: "Internal Server Error"
      })
    }
  };
  
export const validateFundWallet = async (req: Request, res: Response) => {
  try {
    const { referenceId } = req.params;
    const { authorization } = req.headers;
    const token = `${authorization}`.split(" ")[1];
    console.log("token: ", token);
    if(!token || typeof token !== 'string'){
      return res.status(400).json({
        status: false,
        message: "Bad Request"
      })
    }
    const userDetails = jwt.verify(token, JWT_SECRET!) as newJwtPayload;
    console.log("referenceId: ", referenceId);
    if(!referenceId || typeof referenceId !== "string"){
      return res.status(400).json({
        status: false,
        message: "Bad Request"
      })
    }
  
    verifyPaymentPaystack(referenceId, async (error:any, body:any) => {
      if(error) return res.status(500).json({
        status: false,
        message: "Could not connect to Paystack"
      })
      console.log("body: ", body);
      const response = JSON.parse(body);
      console.log("response: ", response);
      console.log("status: ", response.status);
      if(!response || !response.status) return res.status(500).json({
        status: false,
        message: "Payment was not successful"
      });
      if(response.data.gateway_response !== "Successful"){
        return res.status(401).json({
          status: false,
          message: "Payment was not successful"
        })
      }
      const amount = response.data.amount/100;
      const currency = response.data.currency;
      //get user id from token
      const user = await userExists(userDetails.id!) as unknown as UserData;
      // console.log("user: ", user)
      // console.log("user previous data: ", user._previousDataValues)
      if (!user || !user.id) return res.status(404).json({
        status: false,
        message: "User not found"
      });
  
      //find transaction details and update
      const transactionDetails = await Transactions.findOne({ where: { transactionReference: referenceId, amount: amount } }) as unknown as TransactionData;
      console.log("transactionDetails: ", transactionDetails);
      if(!transactionDetails || !transactionDetails.id){
        return res.status(404).json({ message: "Transaction not found" });
      }
      if(transactionDetails && transactionDetails.status === "completed"){
        return 
        // res.status(200).json({ status: true, message: "Transaction has already been processed" });
      }
      // //update user's balance
      user.balance! += amount;
      user.currency = currency.toUpperCase();
      user.save()
        .then(async (user: UserData)=>{ 
        //send email notification
        transactionDetails!.status = "completed";
        transactionDetails.save();
        const content = `Your checkout wallet has been funded with ${currency.toUpperCase()} ${amount}`;
        const subject = "Checkout Wallet Funded"
        const emailContent = emailBroadcastFunction(APPNAME!, content);
        await sendMail(userDetails.email!, subject, emailContent);
        return res.status(201).json({
          status: true,
          message: "Checkout Wallet Funded",
          user,
          response
        })
    });
  })
  } catch (error) {
    console.log(`Error: ${error}`);
    return res.status(500).json({
      status: false,
      message: "Internal Server Error"
    })
  }
    
  
};