import axios from 'axios';

/**
 * Middleware to verify Google reCAPTCHA v2/v3 tokens.
 * Expects 'captchaToken' in the request body.
 */
/**
 * Standalone helper to verify Google reCAPTCHA tokens.
 */
export const verifyRecaptchaToken = async (captchaToken) => {
  if (!process.env.RECAPTCHA_SECRET || process.env.RECAPTCHA_SECRET === 'your-recaptcha-secret-key') {
    console.warn('RECAPTCHA_SECRET not found or is default. Skipping verification.');
    return { success: true };
  }

  if (!captchaToken) {
    return { success: false, message: 'reCAPTCHA token is missing.' };
  }

  try {
    const response = await axios.post(
      `https://www.google.com/recaptcha/api/siteverify?secret=${process.env.RECAPTCHA_SECRET}&response=${captchaToken}`
    );

    const { success, score } = response.data;

    if (!success) {
      return { success: false, message: 'reCAPTCHA verification failed.' };
    }

    if (score !== undefined && score < 0.5) {
      return { success: false, message: 'Low trust score detected.' };
    }

    return { success: true };
  } catch (error) {
    console.error('reCAPTCHA Verification Error:', error);
    return { success: false, message: 'Internal server error during verification.' };
  }
};

/**
 * Middleware to verify Google reCAPTCHA v2/v3 tokens.
 * Expects 'captchaToken' in the request body.
 */
export const verifyRecaptcha = async (req, res, next) => {
  const { captchaToken } = req.body;
  const result = await verifyRecaptchaToken(captchaToken);

  if (!result.success) {
    return res.status(result.message === 'reCAPTCHA token is missing.' ? 400 : 401).json({
      success: false,
      message: result.message === 'reCAPTCHA verification failed.' 
        ? 'reCAPTCHA verification failed. Please try again.' 
        : result.message
    });
  }

  next();
};
