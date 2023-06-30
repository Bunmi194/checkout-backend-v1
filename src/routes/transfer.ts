import express from "express";
import {
  validateInput,
  authenticateUser,
  checkForUserDetails,
  doesRecipientExist,
  doesCurrencyMatch,
  createOTPAndSave,
  authenticateOTP,
  checkTransactionReference,
  checkUserBalance,
  checkRecipientStatus,
  checkTransaction,
  verifyOTPDetails,
  generateOTPForDatabase,
  processTransfer,
} from "../controllers/transfer";

const route = express.Router();

route.post(
  "/",
  validateInput,
  authenticateUser,
  doesRecipientExist,
  doesCurrencyMatch,
  checkTransactionReference,
  checkForUserDetails
);

route.post(
  "/otp",
  validateInput,
  authenticateUser,
  createOTPAndSave,
  generateOTPForDatabase
);

route.post(
  "/process",
  validateInput,
  authenticateUser,
  authenticateOTP,
  checkUserBalance,
  checkRecipientStatus,
  checkTransaction,
  verifyOTPDetails,
  processTransfer
);

const transferRouter = route;

export default transferRouter;
