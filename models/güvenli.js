const mongoose = require("mongoose");

let database = new mongoose.Schema({
    guildID: String,
    userID: String,
    Puan: String
});

const AyarlarModel = (module.exports = mongoose.model("güvenli", database));