import express from 'express';
import { Sequelize } from 'sequelize';
import userRouter from "./routes/users";
import fundRouter from "./routes/fund";
import transferRouter from "./routes/transfer";
import withdrawRouter from "./routes/withdraw";
import morgan from "morgan";
import dotenv from "dotenv";
import cors from "cors";
dotenv.config();

const app = express();
app.use(cors({
    origin: "*"
}));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(morgan("tiny"));
const port = process.env.PORT || 4000;

const sequelize = new Sequelize("checkout", "bunmi194", "bunmi194", {
    host: 'localhost',
    dialect: "postgres",
});
const connectDatabase = async () => {
    try {
        await sequelize.authenticate();
        console.log(`Database connection established`);
    } catch (error) {
        console.log("Error: ", error);
    }
}
connectDatabase();
app.use("/v1/users", userRouter);
app.use("/v1/fund", fundRouter);
app.use("/v1/transfer", transferRouter);
app.use("/v1/withdraw", withdrawRouter);

app.listen(port, ()=>{
    console.log(`listening on port ${port}`);
});