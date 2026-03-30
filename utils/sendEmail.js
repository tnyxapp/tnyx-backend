const nodemailer = require("nodemailer");
const dns = require("dns");

// 👇 IMPORTANT FIX (force IPv4)
dns.setDefaultResultOrder("ipv4first");

const sendEmail = async (to, otp) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error("Email credentials not configured");
  }

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    family: 4,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

  // ✅ optional but important check
  await transporter.verify();

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to,
    subject: "Your OTP Code",
    text: `Your OTP is ${otp}`
  });
};

module.exports = sendEmail;
