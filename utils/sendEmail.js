const nodemailer = require("nodemailer");

// ✅ transporter को global बनाओ (performance)
const transporter = nodemailer.createTransport({
  host: "smtp-relay.brevo.com",
  port: 2525,
  secure: false,
  auth: {
    user: process.env.BREVO_USER,
    pass: process.env.BREVO_PASS
  },
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 10000
});


// ✅ retry function
const sendWithRetry = async (mailOptions, retries = 2) => {
  try {
    return await transporter.sendMail(mailOptions);
  } catch (error) {
    if (retries > 0) {
      console.log("Retrying email...", retries);
      return sendWithRetry(mailOptions, retries - 1);
    }
    throw error;
  }
};


// ✅ main function
const sendEmail = async (to, otp) => {

  if (!process.env.BREVO_USER || !process.env.BREVO_PASS) {
    throw new Error("Email credentials not configured");
  }

  const mailOptions = {
    from: "TnyX <tnyxapp@gmail.com>",
    to,
    subject: "Your OTP Code",
    html: `
      <div style="font-family: Arial; padding: 20px;">
        <h2>🔐 OTP Verification</h2>
        <p>Your one-time password is:</p>
        <h1 style="letter-spacing: 5px; color: #333;">${otp}</h1>
        <p>This OTP will expire in <b>5 minutes</b>.</p>
        <hr/>
        <p style="font-size: 12px; color: gray;">
          If you did not request this, please ignore this email.
        </p>
      </div>
    `
  };

  try {
    await sendWithRetry(mailOptions);

    console.log(`✅ Email sent to ${to}`);

  } catch (error) {
    console.error("❌ Email error:", error.message);
    throw new Error("Failed to send OTP email");
  }
};

module.exports = sendEmail;