import express from "express";
import { paystackWebhook } from "../controllers/webhook";

const route = express.Router();

route.post("/", paystackWebhook);

const webhookRouter = route;

export default webhookRouter;
