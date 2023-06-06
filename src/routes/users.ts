// import { doStuffWithUserModel } from "../controllers/user";
import { signUserUp, logUserIn, verifyEmail } from "../controllers/user";
// import { initializePayment } from "../test";
// import { verifyPaymentPaystackTest } from "../services/paystack";

import express from "express";

const route = express.Router();

route.post('/register', signUserUp);
route.get('/verify/:token', verifyEmail);
route.post('/login', logUserIn);

const userRouter = route;
export default userRouter;