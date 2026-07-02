if(process.env.NODE_ENV != "production"){
    require("dotenv").config();
}


const express = require("express");
const app = express();

const mongoose = require("mongoose");

const path = require("path");
const methodOverride = require("method-override");
const ejsmate = require("ejs-mate")
// const mongoose = require("mongoose");
const Student = require("./models/student");
// 1. MIDDLEWARE SETTINGS

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "/views"));
app.engine('ejs', ejsmate);

app.use(methodOverride("_method"));
app.use(express.static(path.join(__dirname, "/public")));
app.use(express.urlencoded({ extended: true }));
// Mongo Connection
const MONGO_URL = process.env.MONGO_URL;

main()
  .then(() => console.log("connected to db"))
  .catch((err) => console.log(err));

async function main() {
  await mongoose.connect(MONGO_URL);
}

app.get("/students/:id/dashboard", (req, res) => {
  res.render("students/dashboard", { currentPage: "dashboard" });
});
// app.get("/students/:id/dashboard", async (req, res) => {
//   try {
//     const { id } = req.params;
//     const student = await Student.findById(id);

//     if (!student) {
//       return res.status(404).send("Student not found");
//     }

//     res.render("students/dashboard", { currentPage: "dashboard", student });
//   } catch (err) {
//     console.log(err);
//     res.status(500).send("Something went wrong");
//   }
// });

app.get("/students/:id/profile", (req, res) => {
  res.render("students/profile", { currentPage: "profile" });
});

app.get("/students/forms", (req, res) => {
  res.render("students/forms", { currentPage: "forms" });
});

app.get("/students/documents", (req, res) => {
  res.render("students/documents", { currentPage: "documents" });
});

app.get("/students/notices", (req, res) => {
  res.render("students/notices", { currentPage: "notices" });
});

app.get("/students/messages", (req, res) => {
  res.render("students/messages", { currentPage: "messages" });
});

app.get("/students/settings", (req, res) => {
  res.render("students/settings", { currentPage: "settings" });
});

app.get("/students/help", (req, res) => {
  res.render("students/help", { currentPage: "help" });
});



app.listen(3000,()=>{
    console.log("server is listing to 3000");
})