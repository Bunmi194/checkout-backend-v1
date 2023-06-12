import passport from "passport";
import express, { Request, Response, NextFunction } from "express";
import { Optional, SaveOptions } from "sequelize";

const route = express.Router();
require("../auth/google");

interface UserData extends Optional<any, string>, SaveOptions<any>{
    token?: string;
    userExists?: [{
        firstName?: string;
        lastName?: string;
        email?: string;
        id?: number;
        balance?: number;
        password?: string;
        currency?: string;
    }]
}

const GOOGLE_REDIRECT = process.env.GOOGLE_REDIRECT;

route.get(
  "/auth/google",
  function (req: Request, res: Response, next: NextFunction) {
    console.log("GOOGLE_REDIRECT: ", GOOGLE_REDIRECT);
    console.log(`Loading API library`);
    next();
  },
  passport.authenticate("google", { scope: ["profile", "email"] })
);

route.get(
  "/google",
  function (req: Request, res: Response, next: NextFunction) {
    console.log("Handling Google callback URL...");
    next();
  },
  passport.authenticate("google", { failureRedirect: "http://localhost:3000/" }),
  function (req: Request, res: Response) {
    try {
        // Successful authentication, redirect home.
      console.log("Request: ", req.user);
      const newUser = req.user as UserData;
      const token = newUser.token || "";
      //userExists = req.user.userExists;
      const email = newUser.userExist.email || "";
      const firstName = newUser.userExist.firstName || "";
      const lastName = newUser.userExist.lastName || "";
      const id = newUser.userExist.id || "";
      const currency = newUser.userExist.currency || "";
      const balance = newUser.userExist.balance || "";
      const isVerified = newUser.userExist.isVerified || false;
      // console.log("Response: ", res);
      //token and some other details
      if(token){
          return res.redirect(`${GOOGLE_REDIRECT}/?token=${token}&email=${email}&firstName=${firstName}&lastName=${lastName}&id=${id}&currency=${currency}&balance=${balance}&isVerified=${isVerified}`);
      }
      return res.redirect(`${GOOGLE_REDIRECT}`);

    } catch (error) {
      console.log(error)
    }
  }
);

const googleRoute = route;
export default googleRoute;
