import passport from "passport";
import { createUserOrLogin } from "../controllers/google";
require("dotenv").config();
import { Strategy as GoogleStrategy } from "passport-google-oauth20";

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
passport.use(new GoogleStrategy({
    clientID: `${CLIENT_ID}`,
    clientSecret: `${CLIENT_SECRET}`,
    callbackURL: `${process.env.APP_URL}/v1/strategy/google`
  },
  async function(accessToken, refreshToken, profile, done) {
    try {
      const result = await createUserOrLogin(profile);
      //check if user exists in the database
      //if user exists in the database create token and send
      return done(null, result);
    } catch (error) {
      console.log(error);
    }
  }
));

passport.serializeUser(function(user: any, done) {
  done(null, user);
});

passport.deserializeUser(function(user: any, done) {
  done(null, user);
});


//check end
