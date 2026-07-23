require("dotenv").config();

const mongoose = require("mongoose");

const Admin = require("../models/admin");
const fakeAdmins = require("./admin");
const MONGO_URL = process.env.MONGO_URL;
mongoose
  .connect(MONGO_URL)
  .then(() => console.log("MongoDB Connected"))
  .catch(console.error);

async function initDB() {
  try {
    await Admin.deleteMany({});

    // Insert first admin
    const mainAdmin = await Admin.create(fakeAdmins[0]);

    // Assign creator to every subadmin
    const subAdmins = fakeAdmins.slice(1).map((admin) => ({
      ...admin,
      createdBy: mainAdmin._id,
    }));

    await Admin.insertMany(subAdmins);

    console.log("Admin collection initialized successfully.");
  } catch (err) {
    console.error(err);
  } finally {
    mongoose.connection.close();
  }
}

initDB();