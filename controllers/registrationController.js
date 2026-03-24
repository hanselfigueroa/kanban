const xss = require('xss');
const nodemailer = require('nodemailer');
const Registration = require('../models/registration');
const courses = require('../config/courses');

// Configure email transporter
function getTransporter() {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT, 10),
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  });
}

// Send confirmation email to the user
async function sendUserConfirmation(registration, courseName) {
  const transporter = getTransporter();
  await transporter.sendMail({
    from: `"Kanban University Courses" <${process.env.EMAIL_USER}>`,
    to: registration.email,
    subject: `Registration Received: ${courseName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #1a1a1a; color: #f3f4f6; padding: 40px; border-radius: 8px;">
        <h1 style="color: #a855f7;">Thank You, ${registration.full_name}!</h1>
        <p>We've received your registration inquiry for <strong>${courseName}</strong>.</p>
        <p>Our team will review your request and get back to you within 1-2 business days with available dates and further details.</p>
        <hr style="border-color: #333;">
        <p style="color: #9ca3af; font-size: 14px;">If you have any questions, feel free to reply to this email.</p>
      </div>
    `
  });
}

// Send notification email to admin
async function sendAdminNotification(registration, courseName) {
  const transporter = getTransporter();
  await transporter.sendMail({
    from: `"Kanban Courses System" <${process.env.EMAIL_USER}>`,
    to: process.env.ADMIN_EMAIL,
    subject: `New Registration: ${registration.full_name} for ${courseName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2>New Course Registration</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 8px; font-weight: bold;">Name:</td><td style="padding: 8px;">${registration.full_name}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold;">Email:</td><td style="padding: 8px;">${registration.email}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold;">Phone:</td><td style="padding: 8px;">${registration.phone || 'N/A'}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold;">Company:</td><td style="padding: 8px;">${registration.company || 'N/A'}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold;">Course:</td><td style="padding: 8px;">${courseName}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold;">Format:</td><td style="padding: 8px;">${registration.preferred_format || 'N/A'}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold;">Message:</td><td style="padding: 8px;">${registration.message || 'N/A'}</td></tr>
        </table>
      </div>
    `
  });
}

// POST /api/register
async function createRegistration(req, res) {
  try {
    const { full_name, email, phone, company, course_selected, preferred_format, message } = req.body;

    // Validate required fields
    if (!full_name || !email || !course_selected) {
      return res.status(400).json({ success: false, message: 'Name, email, and course selection are required.' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
    }

    // Validate course exists
    if (!courses[course_selected]) {
      return res.status(400).json({ success: false, message: 'Invalid course selection.' });
    }

    // Sanitize inputs
    const sanitized = {
      full_name: xss(full_name.trim()),
      email: xss(email.trim().toLowerCase()),
      phone: phone ? xss(phone.trim()) : null,
      company: company ? xss(company.trim()) : null,
      course_selected: xss(course_selected),
      preferred_format: preferred_format ? xss(preferred_format) : null,
      message: message ? xss(message.trim()) : null
    };

    // Store in database
    const registration = await Registration.create(sanitized);

    const courseName = courses[course_selected].name;

    // Send emails (non-blocking - don't fail the request if email fails)
    try {
      await Promise.all([
        sendUserConfirmation(registration, courseName),
        sendAdminNotification(registration, courseName)
      ]);
    } catch (emailErr) {
      console.error('Email sending failed:', emailErr.message);
      // Registration still succeeds even if email fails
    }

    return res.status(201).json({
      success: true,
      message: 'Registration received! We\'ll be in touch soon.'
    });
  } catch (err) {
    console.error('Registration error:', err);
    return res.status(500).json({
      success: false,
      message: 'Something went wrong. Please try again later.'
    });
  }
}

// GET /api/registrations (admin)
async function getAllRegistrations(req, res) {
  try {
    const registrations = await Registration.getAll();
    return res.json({ success: true, data: registrations });
  } catch (err) {
    console.error('Fetch registrations error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch registrations.' });
  }
}

module.exports = { createRegistration, getAllRegistrations };
