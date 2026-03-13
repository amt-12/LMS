/**
 * OTP Service for generating secure 6-digit OTPs
 */

const generateOtp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const isValidOtp = (otp) => {
  return /^\d{6}$/.test(otp);
};

module.exports = {
  generateOtp,
  isValidOtp
};

