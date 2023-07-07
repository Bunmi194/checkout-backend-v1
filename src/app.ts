import express from "express";
import { Sequelize } from "sequelize";
import userRouter from "./routes/users";
import fundRouter from "./routes/fund";
import transferRouter from "./routes/transfer";
import withdrawRouter from "./routes/withdraw";
import statisticsRouter from "./routes/statistics";
import webhookRouter from "./routes/webhook";
import googleRoute from "./routes/google";
import morgan from "morgan";
import dotenv from "dotenv";
import cors from "cors";
import session from "express-session";
dotenv.config();

const app = express();

app.use(
  session({
    secret: "chat",
    resave: false,
    saveUninitialized: false,
  })
);
app.use(
  cors({
    origin: "*",
  })
);
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(morgan("tiny"));
const port = process.env.PORT || 4000;
const POSTGRES_NAME = process.env.POSTGRES_NAME || "checkout";
const POSTGRES_USER = process.env.POSTGRES_USER || "bunmi194";
const POSTGRES_PASSWORD = process.env.POSTGRES_PASSWORD || "bunmi194";
const POSTGRES_HOST = process.env.POSTGRES_HOST;
console.log("details: ", POSTGRES_NAME, POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_HOST)
const sequelize = new Sequelize(`${POSTGRES_NAME}`, `${POSTGRES_USER}`, `${POSTGRES_PASSWORD}`, {
  host: `${POSTGRES_HOST}`,
  dialect: "postgres",
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false, // Use this option if you encounter certificate verification issues
    },
  },
});
const connectDatabase = async () => {
  try {
    await sequelize.authenticate();
    console.log(`Database connection established`);
  } catch (error) {
    console.log("Error: ", error);
  }
};
connectDatabase();
app.use("/v1/users", userRouter);
app.use("/v1/fund", fundRouter);
app.use("/v1/transfer", transferRouter);
app.use("/v1/withdraw", withdrawRouter);
app.use("/v1/statistics", statisticsRouter);
app.use("/v1/strategy", googleRoute);
app.use("/v1/webhook", webhookRouter);

export default app;
