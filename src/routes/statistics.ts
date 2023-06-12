import express from "express";
import { giveStatistics } from "../controllers/statistics";

const route = express.Router();

route.get('/', giveStatistics);

const statisticsRouter = route;

export default statisticsRouter;