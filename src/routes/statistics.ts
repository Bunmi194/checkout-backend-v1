import express from "express";
import { giveStatistics, authorizeUser } from "../controllers/statistics";

const route = express.Router();

route.get("/", authorizeUser, giveStatistics);

const statisticsRouter = route;

export default statisticsRouter;
