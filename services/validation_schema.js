const Joi = require('joi');

const registerSchema = Joi.object({
  name: Joi.string().min(2).max(50).required().messages({
    'string.base': 'Name must be a string',
    'string.min': 'Name must be at least 2 characters',
    'string.max': 'Name cannot exceed 50 characters',
    'any.required': 'Name is required'
  }),
  email: Joi.string().email().lowercase().required().messages({
    'string.email': 'Valid email is required',
    'any.required': 'Email is required'
  }),
  password: Joi.string().min(6).required().messages({
    'string.min': 'Password must be at least 6 characters',
    'any.required': 'Password is required'
  })
});

const loginSchema = Joi.object({
  email: Joi.string().email().lowercase().required().messages({
    'string.email': 'Valid email is required',
    'any.required': 'Email is required'
  }),
  password: Joi.string().min(6).required().messages({
    'any.required': 'Password is required'
  })
});

const verifyOtpSchema = Joi.object({
  email: Joi.string().email().lowercase().required().messages({
    'string.email': 'Valid email is required',
    'any.required': 'Email is required'
  }),
  otp: Joi.string().length(6).pattern(/^\d{6}$/).required().messages({
    'string.base': 'OTP must be a string',
    'string.length': 'OTP must be exactly 6 digits',
    'string.pattern.base': 'OTP must contain only digits',
    'any.required': 'OTP is required'
  })
});

module.exports = {
  registerSchema,
  loginSchema,
  verifyOtpSchema
};

