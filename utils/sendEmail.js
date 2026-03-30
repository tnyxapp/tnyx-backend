const nodemailer = require("nodemailer");
const dns = require("dns");

// Force IPv4
dns.setDefaultResultOrder("ipv4first");

const sendEmail = async (to, otp) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error("Email credentials not configured");
  }

  // Updated Config
const nodemailer = require("nodemailer");
const dns = require("dns");

// 🔥 Force IPv4 globally (IMPORTANT)
dns.setDefaultResultOrder("ipv4first");

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 10000
});

  try {
    // Verify hata kar direct email send kar rahe hain
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to,
      subject: "Your OTP Code",
      text: `Your OTP is ${otp}`
    });
    console.log("Email sent successfully to", to);
  } catch (error) {
    console.error("Error sending email:", error.message);
    throw new Error("Failed to send OTP email"); 
  }
};

module.exports = sendEmail;
