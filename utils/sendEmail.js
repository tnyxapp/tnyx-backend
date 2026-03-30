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

const transporter = nodemailer.createTransport({
  host: "smtp-relay.brevo.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.BREVO_USER, // email
    pass: process.env.BREVO_PASS  // smtp key
  }
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
