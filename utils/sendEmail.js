const sgMail = require("@sendgrid/mail");

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const sendEmail = async (to, otp) => {
  const msg = {
    to,
    from: process.env.EMAIL_USER, // verified email
    subject: "Your OTP Code",
    text: `Your OTP is ${otp}`,
  };

  await sgMail.send(msg);
};

module.exports = sendEmail;
