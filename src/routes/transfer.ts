import express from "express";
import { checkForUserDetails, generateOTPForDatabase, processTransfer } from "../controllers/transfer";

const route = express.Router();

route.post('/', checkForUserDetails);
route.post('/otp', generateOTPForDatabase);
route.post('/process', processTransfer);

const transferRouter = route;


export default transferRouter;