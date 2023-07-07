import User from "../models/user";
import { Optional, SaveOptions } from "sequelize";

interface UserData extends Optional<any, string>, SaveOptions<any> {
  firstName?: string;
  lastName?: string;
  email: string;
  id?: number;
  balance?: number;
  password: string;
}

export const userExists = async (emailOrId: string | number) => {
  if (
    !emailOrId ||
    (typeof emailOrId !== "string" && typeof emailOrId !== "number")
  ) {
    return false;
  }
  //check if emailOrId is a number
  if (typeof emailOrId === "number" && !emailOrId.toString().includes("@")) {
    //you have an id
    return User.findOne({ where: { id: emailOrId } })
      .then((user) => {
        return user;
      })
      .catch((error) => {
        console.error("Error: ", error);
        return null;
      });
  }
  //check if emailOrId is a string
  if (typeof emailOrId === "string" && emailOrId.toString().includes("@")) {
    //you have an email address
    return User.findOne({ where: { email: emailOrId } })
      .then((user) => {
        return user;
      })
      .catch((error) => {
        console.error("Error: ", error);
        return null;
      });
  }
  return null;
};

export const writeUserToDatabase = async (user: UserData) => {
  return User.create(user)
    .then((user) => {
      return user;
    })
    .catch((error) => {
      console.error(error);
      return null;
    });
};

export const updateUserRecord = async (id: number, userRecord: UserData) => {
  if (!id || !userRecord) {
    return false;
  }
  const user = await userExists(id);
  if (!user) {
    return false;
  }
  user.isVerified = userRecord.isVerified;
  return user
    .save()
    .then((user) => {
      return user;
    })
    .catch((error) => {
      console.error(error);
      return false;
    });
};
