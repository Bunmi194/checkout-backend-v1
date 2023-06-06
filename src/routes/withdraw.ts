import express from "express";
import { generateOTPForWithdrawal, processWithdrawal, verifyAccount, createTransferRecipientMiddleware, initiateTransferMiddleware } from "../controllers/withdraw";

const route = express.Router();

route.post('/', verifyAccount);
route.post('/otp', generateOTPForWithdrawal);
route.post('/initiate', createTransferRecipientMiddleware, initiateTransferMiddleware);
// route.post('/transfer', initiateTransferMiddleware);

const withdrawRouter = route;


export default withdrawRouter;