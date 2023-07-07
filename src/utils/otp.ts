import speakeasy from "speakeasy";

const secret = speakeasy.generateSecret({ length: 20 });
const secretKey = secret.base32;

export const generateOTP = () => {
  const timestamp = Math.floor(Date.now() / 1000);
  const counter = Math.floor(timestamp / 30);
  const otp = speakeasy.totp({
    secret: secretKey,
    // counter: counter,
    digits: 6,
    encoding: "base32",
    step: 600,
  });
  return {
    otp,
    secretKey,
  };
};


export const verifyOTP = (token: string, newSecretKey: string) => {
  const val = speakeasy.totp.verify({
    secret: newSecretKey,
    encoding: "base32",
    token: token,
    step: 600,
  });
  return val;
};

// generateOTP();
// verifyOTP('600496', "LBSSC3K6FQ3GCUTPNNHHIPDEGJNWCZJE");
