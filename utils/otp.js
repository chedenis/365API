const generateOTP = async () => {
  // generate 6 digit OTP
  const generate = () => Math.floor(100000 + Math.random() * 900000);

  const otp = generate();
  return otp;
};

module.exports = generateOTP;
