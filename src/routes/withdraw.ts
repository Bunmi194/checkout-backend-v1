import express from "express";
import {
  validateInput,
  authorizeUser,
  authorizeUserForOTP,
  verifyToken,
  fetchUserDetails,
  validateOTPForWithdrawal,
  checkBalance,
  generateOTPForWithdrawal,
  processWithdrawal,
  verifyAccount,
  createTransferRecipientMiddleware,
  initiateTransferMiddleware,
} from "../controllers/withdraw";

const route = express.Router();

route.post("/", validateInput, authorizeUser, verifyAccount);

route.post(
  "/otp",
  validateInput,
  authorizeUserForOTP,
  verifyToken,
  generateOTPForWithdrawal
);

route.post(
  "/initiate",
  validateInput,
  authorizeUserForOTP,
  verifyToken,
  fetchUserDetails,
  validateOTPForWithdrawal,
  checkBalance,
  createTransferRecipientMiddleware,
  initiateTransferMiddleware
);

const withdrawRouter = route;

export default withdrawRouter;
