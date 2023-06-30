import app from "./app";
require("dotenv").config();
const PORT = Number(process.env.PORT || 4000);

app.listen(PORT, "0.0.0.0", () => {
  console.log(`listening on port ${PORT}`);
});
