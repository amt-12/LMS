const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const connectDB = require("./config/db.js");
const routes = require("./routes");

dotenv.config();

connectDB();

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(cors({
  origin: "http://localhost:8080",
  credentials: true
}));




app.use(routes);

app.get("/", (req, res) => {
  res.send("Law LMS API Running");
});

const PORT = process.env.PORT || 5000;


app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
