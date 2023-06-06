import { Sequelize, DataTypes } from 'sequelize';

export const sequelize = new Sequelize("checkout", "bunmi194", "bunmi194", {
    host: 'localhost',
    dialect: "postgres",
});