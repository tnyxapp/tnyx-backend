// models/Chat.js

const mongoose = require("mongoose");

const chatSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        index: true,
        required: true // 🔥 Ensure करता है कि बिना user के chat ना बने
    },

    // 🔥 Future-ready field: पुरानी चैट को समराइज करके रखने के लिए
    summary: {
        type: String,
        default: ""
    },

    messages: [
        {
            role: {
                type: String,
                enum: ["user", "assistant"],
                required: true
            },
            content: {
                type: String,
                required: true // 🔥 Empty messages को ब्लॉक करेगा
            },
            createdAt: {
                type: Date,
                default: Date.now
            }
        }
    ]

}, { timestamps: true });

module.exports = mongoose.model("Chat", chatSchema);