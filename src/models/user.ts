import { Sequelize, Model, DataTypes } from "sequelize";

const sequelize = new Sequelize("checkout", "bunmi194", "bunmi194", {
  host: 'localhost',
  dialect: "postgres",
});

class User extends Model {
  declare firstName: string;
  declare lastName: string;
  declare email: string;
  declare password: string;
  declare isVerified: boolean;
  declare balance: number;
  declare currency: string;
}

User.init(
  {
    firstName: {
      type: new DataTypes.STRING(128),
      allowNull: false,
    },
    lastName: {
      type: new DataTypes.STRING(128),
      allowNull: false,
    },
    email: {
      type: new DataTypes.STRING(128),
      allowNull: false,
      unique: true,
    },
    password: {
      type: new DataTypes.STRING(128),
      allowNull: false,
    },
    currency: {
      type: new DataTypes.STRING(128),
      allowNull: true,
    },
    balance: {
      type: new DataTypes.INTEGER,
    },
    isVerified: {
      type: new DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    tableName: "users",
    sequelize, // passing the `sequelize` instance is required
  }
);

export default User;