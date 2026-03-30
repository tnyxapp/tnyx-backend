const nodemailer = require("nodemailer");

const sendEmail = async (to, otp) => {
  if (!process.env.BREVO_USER || !process.env.BREVO_PASS) {
    throw new Error("Email credentials not configured");
  }

const transporter = nodemailer.createTransport({
  host: "smtp-relay.brevo.com",
  port: 2525, // 👈 change this
  secure: false,
  auth: {
    user: process.env.BREVO_USER,
    pass: process.env.BREVO_PASS
  },
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 10000
});

  try {
    await transporter.sendMail({
  from: "TnyX <tnyxapp@gmail.com>",
  to,
  subject: "OTP Verification",
  html: `
    <h2>OTP Verification</h2>
    <p>Your OTP is:</p>
    <h1 style="letter-spacing: 3px;">${otp}</h1>
    <p>This OTP will expire in 5 minutes.</p>
  `
});

    console.log("Email sent successfully to", to);

  } catch (error) {
    console.error("Error sending email:", error.message);
    throw new Error("Failed to send OTP email");
  }
};

module.exports = sendEmail;
