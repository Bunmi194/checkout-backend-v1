import passport from "passport";
import { createUserOrLogin } from "../controllers/google";
require("dotenv").config();
import { Strategy as GoogleStrategy } from "passport-google-oauth20";

passport.use(new GoogleStrategy({
    clientID: '438019500256-bedaq8kmin6s0inlm66s7tge856fkq8k.apps.googleusercontent.com',
    clientSecret: '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',
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
