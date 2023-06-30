import express from "express";
import {
  validateInput,
  fundWallet,
  validateFundWallet,
  authorizeUser,
  getUserId,
  checkCurrency,
} from "../controllers/fund";

const route = express.Router();

route.post(
  "/",
  validateInput,
  authorizeUser,
  getUserId,
  checkCurrency,
  fundWallet
);
route.get("/verify/:referenceId", authorizeUser, validateFundWallet);

const fundRouter = route;

export default fundRouter;
