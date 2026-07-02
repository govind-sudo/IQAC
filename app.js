if(process.env.NODE_ENV != "production"){
    require("dotenv").config();
}


const express = require("express");
const app = express();

const mongoose = require("mongoose");

const path = require("path");
const methodOverride = require("method-override");
const ejsmate = require("ejs-mate")

// 1. MIDDLEWARE SETTINGS
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "/views"));
app.engine('ejs', ejsmate);

app.use(methodOverride("_method"));
app.use(express.static(path.join(__dirname, "/public")));
app.use(express.urlencoded({ extended: true }));


app.get("/students/dashboard", (req, res) => {
  res.render("students/dashboard", { currentPage: "dashboard" });
});

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