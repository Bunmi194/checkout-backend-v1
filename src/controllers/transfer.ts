import { Request, response, Response } from "express";
import User from "../models/user";
import Transactions from "../models/transactions";
import { validateTransferDetails } from "../auth/transfer";
import jwt, { JwtPayload } from "jsonwebtoken";
import { Optional, SaveOptions, UUID } from "sequelize";
import { userExists } from "../services/user";
import { sendMail } from "../services/email";
import { emailBroadcastFunction } from "../services/emailbroadcast";
import { writeTransactionToDatabase, transferTransactionQuery } from "../services/transaction";
import { generateOTP, verifyOTP } from "../utils/otp";

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
    otp?: string;
    secretKey?: string;

}
  
export const checkForUserDetails = async (req: Request, res: Response) => {
    try {
        //validate user input
        const error = validateTransferDetails.safeParse(req.body);
        const { authorization } = req.headers;
        const idempotentkey  = `${req.headers.idempotentkey}`.trim();
        let { amount, accountNumber, currency } = req.body;
        amount = amount.trim();
        accountNumber = accountNumber.trim();
        currency = currency.trim();
        console.log("details: ", authorization, idempotentkey);
        console.log("headers: ", req.headers);

        if(!authorization || !idempotentkey){
            return res.status(400).json({
                status: false,
                message: "Authorization token and Idempotent Key are required"
            })
        }
        const token = `${authorization}`.split(" ")[1];
        if(error.success === false){
            return res.status(400).json({
                status: false,
                message: error.error.issues[0].message
            })
        }
        //verify token
        const senderDetails = jwt.verify(token, JWT_SECRET!) as newJwtPayload;

        if(!senderDetails || !senderDetails.id){
            return res.status(400).json({
                status: false,
                message: "Bad request"
            })
        }
        //check if recipient exists
        const recipientDetails = await userExists(Number(accountNumber)) as unknown as UserData;
        console.log("recipientDetails: ", recipientDetails)
        console.log("accountNumber: ", accountNumber)
        console.log("len: ", accountNumber.length)
        if(!recipientDetails || !recipientDetails.id){
            return res.status(400).json({
                status: false,
                message: "Recipient does not exist"
            })
        }
        if(recipientDetails.id === senderDetails.id){
            return res.status(400).json({
                status: false,
                message: "You cannot transfer to yourself"
            })
        }
        //check if recipient currency matches
        const recipientCurrency = `${recipientDetails.currency}`.toLowerCase();
        if(recipientDetails.currency && recipientCurrency !== currency.toLowerCase()) {
            return res.status(400).json({
                status: false,
                message: `Recipient currency is set to ${recipientDetails.currency}`
            })
        };
        //check transaction reference
        const transactionReferenceDetails = await Transactions.findOne({where: {transactionReference: idempotentkey}}) as unknown as TransactionData;
        if(transactionReferenceDetails && transactionReferenceDetails.id){
            return res.status(400).json({
                status: false,
                message: "Transaction with same reference has already been processed."
            });
        }
        //save idempotent key with transaction details
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
            secretKey: "1"
        };
        const createTransaction = await writeTransactionToDatabase(newTransaction) as unknown as TransactionData;

        if(!createTransaction || !createTransaction.id){
            return res.status(500).json({
                status: false,
                message: "Internal Server Error."
            });
        }
        //send recipient name and details as response for approval
        return res.status(201).json({
            status: true,
            message: "Transfer initiated",
            recipientDetails
        })

    } catch (error) {
        return res.status(500).json({
            status: false,
            message: "Internal Server Error"
        })
    }
}

export const generateOTPForDatabase = async (req: Request, res: Response) => {
   try {
     //validate user input
     const error = validateTransferDetails.safeParse(req.body);
     const { authorization } = req.headers;
     const idempotentkey  = req.headers.idempotentkey;
     const { amount, accountNumber, currency } = req.body;
 
     if(!authorization || !idempotentkey){
         return res.status(400).json({
             status: false,
             message: "Authorization token and Idempotent Key are required"
         })
     }
     const token = authorization?.split(" ")[1];
     if(error.success === false){
         return res.status(400).json({
             status: false,
             message: error.error.issues[0].message
         })
     }
     //verify token
     const senderDetails = jwt.verify(token, JWT_SECRET!) as newJwtPayload;
 
     if(!senderDetails || !senderDetails.id || !senderDetails.email){
         return res.status(400).json({
             status: false,
             message: "Bad request"
         })
     }
     
     //generate OTP
     const otpDetails = generateOTP();
     //update transaction details with OTP
     const generatedTransaction = await Transactions.findOne({
         where: {amount: amount, recipientId: Number(accountNumber), transactionReference: idempotentkey}
     }) as unknown as TransactionData;
 
     if(!generatedTransaction || !generatedTransaction.id){
         return res.status(404).json({
             status: false,
             message: "Transaction does not exist"
         })
     }
     //send OTP to email
     const subject = "Checkout: OTP for Funds Transfer";
     const content = `Please use ${otpDetails.otp} as your OTP. This token expires in 10 minutes.`;
     const contentHTML = emailBroadcastFunction(APPNAME!, content);
     //save otp and secretKey in database
     console.log("otp: ", otpDetails)
     console.log("generatedTransaction before: ", generatedTransaction)
     generatedTransaction.status = "otp sent";
     generatedTransaction.otp = otpDetails.otp;
     generatedTransaction.secretKey = otpDetails.secretKey;
    //  const newTransact = {
    //      ...generatedTransaction._previousDataValues,
    //      otp: otpDetails.otp,
    //      secretKey: otpDetails.secretKey
    // }
        console.log("newTransact after: ", generatedTransaction)
    generatedTransaction.save()
        .then(async () => {
             await sendMail(`${senderDetails.email}`, subject, contentHTML);
             return res.status(200).json({
                 status: true,
                 message: "OTP sent successfully"
             })
         })
   } catch (error) {
        console.log(`Error: ${error}`)
        return res.status(500).json({
            status: false,
            message: "Internal Server Error"
        });
   }
}

export const processTransfer = async (req: Request, res: Response) => {
    //validate user input
    try {
        const error = validateTransferDetails.safeParse(req.body);
        const { authorization } = req.headers;
        const idempotentkey  = req.headers.idempotentkey;
        const { amount, accountNumber, currency, otp } = req.body;

        if(!otp || typeof otp !== 'string'){
            return res.status(401).json({
                status: false,
                message: "Please enter otp"
            })
        }
        if(!authorization || !idempotentkey){
            return res.status(400).json({
                status: false,
                message: "Authorization token and Idempotent Key are required"
            })
        }
        const token = authorization?.split(" ")[1];
        if(error.success === false){
            return res.status(400).json({
                status: false,
                message: error.error.issues[0].message
            })
        }
        //verify token
        const senderDetails = jwt.verify(token, JWT_SECRET!) as newJwtPayload;

        if(!senderDetails || !senderDetails.id){
            return res.status(400).json({
                status: false,
                message: "Bad request"
            })
        }
        //fetch sender details
        const senderFullDetails = await userExists(Number(senderDetails.id)) as unknown as UserData;
        if(!senderFullDetails || !senderFullDetails.id){
            return res.status(401).json({
                status: false,
                message: "Authorization not allowed"
            })
        }
        //check if user has sufficient balance
        if(senderFullDetails.balance && (senderFullDetails.balance < Number(amount))){
            return res.status(400).json({
                status: false,
                message: "Insufficient balance"
            })
        }
        //check if recipient exists
        const recipientDetails = await userExists(Number(accountNumber)) as unknown as UserData;
        if(!recipientDetails || !recipientDetails.id || !recipientDetails.email){
            return res.status(400).json({
                status: false,
                message: "Recipient does not exist"
            })
        }
        //check if recipient has verified account
        if(!recipientDetails.isVerified){
            return res.status(400).json({
                status: false,
                message: "Recipient account is inactive"
            })
        }
        //check if recipient currency matches
        const recipientCurrency = `${recipientDetails.currency}`.toLowerCase();
        if(recipientDetails.currency && recipientCurrency !== currency.toLowerCase()) {
            return res.status(400).json({
                status: false,
                message: `Recipient currency is set to ${recipientDetails.currency}`
            })
        };
        const generatedTransaction = await Transactions.findOne({
            where: {amount: amount, recipientId: Number(accountNumber), transactionReference: idempotentkey}
        }) as unknown as TransactionData;

        if(!generatedTransaction || !generatedTransaction.id){
            return res.status(404).json({
                status: false,
                message: "Transaction does not exist"
            })
        }
        if(!generatedTransaction.otp || !generatedTransaction.secretKey){
            return res.status(400).json({
                status: false,
                message: "OTP yet to be generated"
            })
        }
        //check for duplicate transactions
        if(generatedTransaction.otp && generatedTransaction.secretKey && (generatedTransaction.status === "completed")){
            return res.status(400).json({
                status: false,
                message: "Transaction has already been processed"
            })
        }

        //verify OTP
        if(otp !== generatedTransaction.otp){
            return res.status(400).json({
                status: false,
                message: "Invalid OTP. Please enter most recent OTP"
            });
        }
        const isOTPValid = verifyOTP(otp, `${generatedTransaction.secretKey}`);
        if(!isOTPValid){
            return res.status(400).json({
                status: false,
                message: "Bad or expired OTP. Please retry"
            })
        }
        //run transaction to credit recipient and debit sender
        const updateRecords = transferTransactionQuery(accountNumber, senderDetails.id, amount, currency);
        if (!updateRecords) {
            return res.status(500).json({
                status: false,
                message: "Error updating records"
            })
        }
        //update transaction record
        generatedTransaction.status = "completed";
        generatedTransaction.save()
            .then(()=> {
                //send notification emails
                const subject = "Checkout: New Transaction on your account";
                const contentForRecipient = `You just received ${currency.toUpperCase()} ${amount} from ${senderFullDetails.firstName} ${senderFullDetails.lastName} with account number ${senderDetails.id}`;
                const contentForSender = `You just sent ${currency.toUpperCase()} ${amount} to ${recipientDetails.firstName} ${recipientDetails.lastName} with account number ${recipientDetails.id}`;

                const emailContentForRecipient = emailBroadcastFunction(APPNAME!, contentForRecipient);

                const emailContentForSender = emailBroadcastFunction(APPNAME!, contentForSender);

                sendMail(recipientDetails.email!, subject, emailContentForRecipient);
                sendMail(senderDetails.email!, subject, emailContentForSender);
                return res.status(200).json({
                    status: true,
                    message: "Transfer successful"
                })
            }).catch((error: any) => {
                console.log(`Error: ${error}`);
                return res.status(500).json({
                    status: false,
                    message: "Transfer failed"
                });
            });
        //send email to both on success

    } catch (error) {
        return res.status(500).json({
            status: false,
            message: "Internal Server Error"
        })
    }
}