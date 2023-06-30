import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import { Optional, SaveOptions } from "sequelize";
import { userExists } from "../services/user";
import { StatusCodes } from "http-status-codes";
import {
  getAllTransferAmount,
  getAllWithdrawalAmount,
  getAllFundingAmount,
  getLastThreeTransactions,
} from "../services/transaction";

const jwtSecret = process.env.JWT_SECRET;

interface newJwtPayload extends JwtPayload {
  id?: string;
}
interface UserData extends Optional<any, string>, SaveOptions<any> {
  firstName?: string;
  lastName?: string;
  email: string;
  id?: number;
  balance?: number;
  password: string;
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

export const authorizeUser = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { authorization } = req.headers;
  const token = authorization!.split(" ")[1];
  if (!token || typeof token !== "string") {
    return res.status(StatusCodes.UNAUTHORIZED).json({
      status: false,
      message: "User not authorized",
    });
  }
  try {
    const userDetails = jwt.verify(token, jwtSecret!) as newJwtPayload;
    // console.log("userDetails: ", userDetails);
    if (!userDetails.id)
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json({ status: false, message: "User not authorized" });
    req.body.userDetails = userDetails;
    next();
  } catch (error) {
    console.log(`Error: ${error}`);
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ status: false, message: "Please try again later" });
  }
};

export const giveStatistics = async (req: Request, res: Response) => {
  const { userDetails } = req.body;
  try {
    const getTransferDetails = (await getAllTransferAmount(
      Number(userDetails.id)
    )) as unknown as Array<TransactionData>;
    const getWithdrawalDetails = (await getAllWithdrawalAmount(
      Number(userDetails.id)
    )) as unknown as Array<TransactionData>;
    const getFundingDetails = (await getAllFundingAmount(
      Number(userDetails.id)
    )) as unknown as Array<TransactionData>;
    const getLastThreeTransactionDetails = (await getLastThreeTransactions(
      Number(userDetails.id)
    )) as unknown as Array<TransactionData>;
    const user = (await userExists(userDetails.id)) as unknown as UserData;
    console.log("user: ", user);
    let transferTotal = 0;
    getTransferDetails.forEach(
      (transfer: any) => (transferTotal += transfer.amount)
    );
    let fundingTotal = 0;
    getFundingDetails.forEach(
      (funding: any) => (fundingTotal += funding.amount)
    );
    let withdrawTotal = 0;
    getWithdrawalDetails.forEach(
      (withdrawal: any) => (withdrawTotal += withdrawal.amount)
    );
    console.log("userDetails: ", userDetails);
    return res.status(StatusCodes.OK).json({
      status: true,
      message: "Statistics sent successfully",
      transferTotal,
      fundingTotal,
      withdrawTotal,
      getLastThreeTransactionDetails,
      getTransferDetailsLength: getTransferDetails.length,
      getWithdrawalDetailsLength: getWithdrawalDetails.length,
      getFundingDetailsLength: getFundingDetails.length,
      transferRecord: getTransferDetails,
      withdrawalRecord: getWithdrawalDetails,
      fundingRecord: getFundingDetails,
      balance: user.balance,
    });
  } catch (error) {
    console.log(error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      status: false,
      message: "Internal Server Error",
    });
  }
};
