// import { doStuffWithUserModel } from "../controllers/user";
import {
  validateUserSignUpInput,
  validateUserLogInInput,
  validatePasswordAndConfirmPassword,
  doesUserExistInDB,
  sendVerificationEmail,
  writeUserToDataBase,
  validateUserToken,
  decodeToken,
  doesUserExists,
  isUserVerified,
  verifyPassword,
  signUserUp,
  logUserIn,
  verifyEmail,
} from "../controllers/user";

import express from "express";

const route = express.Router();

route.post(
  "/register",
  validateUserSignUpInput,
  validatePasswordAndConfirmPassword,
  doesUserExistInDB,
  sendVerificationEmail,
  writeUserToDataBase,
  signUserUp
);

route.get(
  "/verify/:token",
  validateUserToken,
  decodeToken,
  doesUserExists,
  verifyEmail
);

route.post(
  "/login",
  validateUserLogInInput,
  isUserVerified,
  verifyPassword,
  logUserIn
);

const userRouter = route;
export default userRouter;
