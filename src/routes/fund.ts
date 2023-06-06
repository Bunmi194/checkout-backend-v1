import express from "express";
import { fundWallet, validateFundWallet } from "../controllers/fund";

const route = express.Router();

route.post('/', fundWallet);
route.get('/verify/:referenceId', validateFundWallet);

const fundRouter = route;

export default fundRouter;