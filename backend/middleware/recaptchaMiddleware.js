import axios from 'axios';

/**
 * Middleware to verify Google reCAPTCHA v2/v3 tokens.
 * Expects 'captchaToken' in the request body.
 */
export const verifyRecaptcha = async (req, res, next) => {
  const { captchaToken } = req.body;

  // For development, if RECAPTCHA_SECRET is not set, skip verification
  if (!process.env.RECAPTCHA_SECRET || process.env.RECAPTCHA_SECRET === 'your-recaptcha-secret-key') {
    console.warn('RECAPTCHA_SECRET not found or is default. Skipping verification.');
    return next();
  }

  if (!captchaToken) {
    return res.status(400).json({ 
      success: false, 
      message: 'Please complete the reCAPTCHA verification.' 
    });
  }

  try {
    const response = await axios.post(
      `https://www.google.com/recaptcha/api/siteverify?secret=${process.env.RECAPTCHA_SECRET}&response=${captchaToken}`
    );

    const { success, score } = response.data;

    if (!success) {
      return res.status(401).json({ 
        success: false, 
        message: 'reCAPTCHA verification failed. Please try again.' 
      });
    }

    // Support for reCAPTCHA v3 score-based validation
    if (score !== undefined) {
      console.log(`🛡️ [Recaptcha] Verification Score: ${score} (Action: ${req.body.captchaAction || 'unknown'})`);
      if (score < 0.5) {
        console.warn('[Recaptcha] Low trust score:', score);
        return res.status(401).json({ 
          success: false, 
          message: 'Security check failed. Our system detects suspicious activity.' 
        });
      }
    }

    next();
  } catch (error) {
    console.error('reCAPTCHA Verification Error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Internal server error during bot verification.' 
    });
  }
};
