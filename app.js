// if (process.env.NODE_ENV != "production") {
//   require("dotenv").config();
// }

// const express = require("express");
// const app = express();

// const mongoose = require("mongoose");
// const session = require("express-session");
// const passport = require("./config/passport");

// const path = require("path");
// const methodOverride = require("method-override");
// const ejsmate = require("ejs-mate");

// // 1. MIDDLEWARE SETTINGS

// app.set("view engine", "ejs");
// app.set("views", path.join(__dirname, "/views"));
// app.engine('ejs', ejsmate);

// app.use(methodOverride("_method"));
// app.use(express.static(path.join(__dirname, "/public")));
// app.use(express.urlencoded({ extended: true }));

// // Session + Passport — must come BEFORE any route that uses
// // req.session or passport.authenticate()

// app.set("trust proxy", 1);
// app.use(
//   session({
//     secret: process.env.SESSION_SECRET || 'change-this-in-production',
//     resave: false,
//     saveUninitialized: true,
//   })
// );
// app.use(passport.initialize());

// // Mongo Connection
// const MONGO_URL = process.env.MONGO_URL;

// main()
//   .then(() => console.log("connected to db"))
//   .catch((err) => console.log(err));

// async function main() {
//   await mongoose.connect(MONGO_URL);
// }

// // ---------------- Auth routes ----------------
// // These handle: GET/POST /login, GET /logout,
// // POST /auth/enrollment-check, GET /auth/google, GET /auth/google/callback
// // app.use(require("./routes/authRoutes"));
// // app.use(require("./routes/googleAuthRoutes"));
// // app.use("/admin", require("./routes/adminRoutes"));

// app.use(require("./routes/authRoutes"));
// app.use(require("./routes/googleAuthRoutes"));
// app.use("/admin", require("./routes/adminRoutes"));   // keep
// app.use(require("./routes/registrationRoutes"));

// app.get('/', (req, res)=>{
//   return res.redirect('/login');
// });



// // ---------------- Student routes ----------------
// // Handles GET /students/dashboard with REAL data + auth check.
// // This must be mounted BEFORE the leftover static routes below,
// // so it wins the /students/dashboard match instead of the old one.
// app.use("/students", require("./routes/studentRoutes"));

// // ---------------- Remaining static pages (not yet wired to real data) ----------------
// // NOTE: the old app.get("/students/dashboard", ...) line has been
// // REMOVED here on purpose — it's now handled by studentRoutes.js
// // with real database data instead of a blank render.

// // app.get("/students/personal", (req, res) => {
// //   res.render("students/personal", { currentPage: "personal" });
// // });

// // app.get("/students/academic", (req, res) => {
// //   res.render("students/academic", { currentPage: "academic" });
// // });

// // app.get("/students/documents", (req, res) => {
// //   res.render("students/documents", { currentPage: "documents" });
// // });

// // app.get("/students/addresses", (req, res) => {
// //   res.render("students/addresses", { currentPage: "addresses" });
// // });


// // app.get("/students/contact", (req, res) => {
// //   res.render("students/contact", { currentPage: "contact" });
// // });


// app.get("/students/help", (req, res) => {
//   res.render("students/help", { currentPage: "help" });
// });


// app.listen(3000, () => {
//   console.log("server is listening on 3000");
// });


if (process.env.NODE_ENV != "production") {
  require("dotenv").config();
}

const express = require("express");
const app = express();

const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("./config/passport");

const path = require("path");
const methodOverride = require("method-override");
const ejsmate = require("ejs-mate");

// 1. MIDDLEWARE SETTINGS

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "/views"));
app.engine('ejs', ejsmate);

app.use(methodOverride("_method"));
app.use(express.static(path.join(__dirname, "/public")));
app.use(express.urlencoded({ extended: true }));

// Session + Passport — must come BEFORE any route that uses
// req.session or passport.authenticate()

if (process.env.NODE_ENV === "production" && !process.env.SESSION_SECRET) {
  // Fail loudly rather than silently running production with a
  // well-known, hardcoded session secret.
  throw new Error(
    "SESSION_SECRET environment variable is required in production."
  );
}

app.set("trust proxy", 1);
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'change-this-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000, // 24h
    },
  })
);
app.use(passport.initialize());

// Mongo Connection
const MONGO_URL = process.env.MONGO_URL;

main()
  .then(() => console.log("connected to db"))
  .catch((err) => console.log(err));

async function main() {
  await mongoose.connect(MONGO_URL);
}

// ---------------- Auth routes ----------------
// These handle: GET/POST /login, GET /logout,
// POST /auth/enrollment-check, GET /auth/google, GET /auth/google/callback
app.use(require("./routes/authRoutes"));
app.use(require("./routes/googleAuthRoutes"));
app.use("/admin", require("./routes/adminRoutes"));   // keep
app.use(require("./routes/registrationRoutes"));

app.get('/', (req, res) => {
  return res.redirect('/login');
});

<<<<<<< Updated upstream
=======

// Example Router setup in your controllers:



>>>>>>> Stashed changes
// ---------------- Student routes ----------------
// Handles GET /students/dashboard with REAL data + auth check.
// This must be mounted BEFORE the leftover static routes below,
// so it wins the /students/dashboard match instead of the old one.
app.use("/students", require("./routes/studentRoutes"));

<<<<<<< Updated upstream
=======



// ---------------- Remaining static pages (not yet wired to real data) ----------------
// NOTE: the old app.get("/students/dashboard", ...) line has been
// REMOVED here on purpose — it's now handled by studentRoutes.js
// with real database data instead of a blank render.

// app.get("/students/personal", (req, res) => {
//   res.render("students/personal", { currentPage: "personal" });
// });

// app.get("/students/academic", (req, res) => {
//   res.render("students/academic", { currentPage: "academic" });
// });

// app.get("/students/documents", (req, res) => {
//   res.render("students/documents", { currentPage: "documents" });
// });

// app.get("/students/addresses", (req, res) => {
//   res.render("students/addresses", { currentPage: "addresses" });
// });


// app.get("/students/contact", (req, res) => {
//   res.render("students/contact", { currentPage: "contact" });
// });


>>>>>>> Stashed changes
app.get("/students/help", (req, res) => {
  res.render("students/help", { currentPage: "help" });
});

// ---------------- 404 ----------------
app.use((req, res) => {
  res.status(404).send("Not Found");
});

// ---------------- Central error handler ----------------
// Catches anything thrown/next(err)'d that individual routes didn't
// already handle, so a stack trace never leaks to the client.
app.use((err, req, res, next) => {
  console.error(err);
  if (res.headersSent) return next(err);
  res.status(err.status || 500).send("Something went wrong.");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`server is listening on ${PORT}`);
});