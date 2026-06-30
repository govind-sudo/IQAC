const express = require("express");
const app = express();

const path = require("path");
const ejsmate = require("ejs-mate")

// 1. MIDDLEWARE SETTINGS
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "/views"));
app.engine('ejs', ejsmate);



app.get("/students/dashboard",(req,res)=>{
    res.render("student/dashboard");
})


app.get("/students/profile",(req,res)=>{
    res.render("student/profile");
})




app.listen(3000,()=>{
    console.log("server is listing to 3000");
})