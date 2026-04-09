const mongoose = require("mongoose");

const deviceSchema = new mongoose.Schema({
    deviceId: {
        type: String,
        unique: true,
        index: true
    },
    trialUsed: {
        type: Boolean,
        default: false
    },
    referralUsed: {
        type: Boolean,
        default: false
    }
});

module.exports = mongoose.model("Device", deviceSchema);