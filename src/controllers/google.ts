import User from "../models/user";
import jwt from "jsonwebtoken";
const { userExists, writeUserToDatabase } = require("../services/user");
require("dotenv").config();

const jwtSecret = process.env.JWT_SECRET;

export const createUserOrLogin = async (profile: any) => {
  try {
    const email = profile.emails[0].value;
    if (!profile || typeof email !== "string") {
      return "Please provide a valid email address";
    }
    const userExist = await userExists(email);
    if (!userExist) {
      //register user
      const newUser = {
        firstName: profile.name.givenName,
        lastName: profile.name.familyName,
        email,
        password: "google",
        isVerified: true,
        balance: 0,
      };
      const user = await writeUserToDatabase(newUser);
      return user;
    }
    //login user
    const userId = userExist.id;
    const token = jwt.sign(
      {
        email,
        id: userId,
      },
      jwtSecret!,
      { expiresIn: "24h" }
    );
    return {
      token,
      userExist,
    };
  } catch (error) {
    console.log(`Error: ${error}`);
    return null;
  }
};
