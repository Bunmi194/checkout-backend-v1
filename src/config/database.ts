import { Sequelize, DataTypes } from 'sequelize';
require("dotenv").config();
const POSTGRES_NAME = process.env.POSTGRES_NAME || "checkout";
const POSTGRES_USER = process.env.POSTGRES_USER || "bunmi194";
const POSTGRES_PASSWORD = process.env.POSTGRES_PASSWORD || "bunmi194";
const POSTGRES_HOST = process.env.POSTGRES_HOST;
export const sequelize = new Sequelize(`${POSTGRES_NAME}`, `${POSTGRES_USER}`, `${POSTGRES_PASSWORD}`, {
  host: `172.20.10.4`,
  dialect: "postgres",
});
