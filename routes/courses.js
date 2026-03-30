const express      = require('express');
const router       = express.Router();
const CourseDb     = require('../models/courseDb');
const CourseDate   = require('../models/courseDate');
const hardcoded    = require('../config/courses');
const SiteSettings = require('../models/siteSettings');

// Helper: get courses from DB, fall back to hardcoded config
async function getCourses() {
  try {
    // Use includeInactive to check if DB has any courses at all
    const allDbCourses = await CourseDb.getAll({ includeInactive: true });
    if (allDbCourses.length > 0) {
      // DB is authoritative — only show active ones (may be empty if all deactivated)
      const dbCourses = allDbCourses.filter(c => c.is_active);
      // Normalise DB rows to match the shape public views expect
      const map = {};
      for (const c of dbCourses) {
        let audience = [], outcomes = [];
        try { audience = JSON.parse(c.who_should_attend || '[]'); } catch { audience = (c.who_should_attend || '').split('\n').filter(Boolean); }
        try { outcomes = JSON.parse(c.learning_objectives || '[]'); } catch { outcomes = (c.learning_objectives || '').split('\n').filter(Boolean); }
        map[c.course_id] = {
          id: c.course_id, course_id: c.course_id, name: c.name, acronym: c.acronym,
          level: c.level, duration: c.duration,
          shortDescription: c.short_description || c.tagline || '',
          description: c.full_description || c.short_description || '',
          audience, outcomes,
          color: hardcoded[c.course_id]?.color || '#6b46c1',
          icon:  hardcoded[c.course_id]?.icon  || 'fa-book',
          rawPrice: c.price ? parseFloat(c.price) : null,
          price: c.price ? `$${c.price}` : 'Contact for pricing',
          curriculum: [] // loaded separately per-detail
        };
      }
      return map;
    }
  } catch (e) { /* DB not ready yet — fall back to hardcoded */ }
  return hardcoded;
}

// Helper: get curriculum for one course
async function getCurriculum(courseId) {
  try {
    const modules = await CourseDb.getCurriculum(courseId);
    return modules.map(m => ({
      title: m.module_title,
      topics: (m.topics || '').split('\n').filter(Boolean)
    }));
  } catch { return hardcoded[courseId]?.curriculum || []; }
}

// GET /courses
router.get('/', async (req, res) => {
  const courses = await getCourses();
  res.render('courses', {
    title: 'Our Courses - Kanban.UNO',
    currentPage: 'courses',
    courses
  });
});

// GET /courses/:courseId
router.get('/:courseId', async (req, res) => {
  const courses    = await getCourses();
  const course     = courses[req.params.courseId];
  if (!course) return res.status(404).render('404', { title: '404', currentPage: '' });

  // Fetch curriculum, upcoming dates, and site settings in parallel
  const [curriculum, upcomingDates, siteSettings] = await Promise.all([
    getCurriculum(req.params.courseId),
    CourseDate.getForCourse(req.params.courseId, 3).catch(() => []),
    SiteSettings.getCheckoutSettings().catch(() => ({}))
  ]);
  course.curriculum = curriculum;

  // Default to showing the form if the setting hasn't been set yet
  const showRegistrationForm = siteSettings.show_registration_form !== 'false';

  // Calculate the price shown to the user — must match what Paggo charges
  const rawPrice  = course.rawPrice || 0;
  const taxRate   = parseFloat(siteSettings.checkout_tax_rate) || 0;
  const currency  = siteSettings.checkout_currency || 'GTQ';
  const symbol    = currency === 'GTQ' ? 'Q' : '$';
  let priceDisplay;
  if (!course.rawPrice) {
    priceDisplay = 'Contact for pricing';
  } else if (taxRate > 0) {
    const total = Math.round(rawPrice * (1 + taxRate) * 100) / 100;
    priceDisplay = `${symbol}${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (IVA included)`;
  } else {
    priceDisplay = `${symbol}${rawPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  const errorMap = {
    payment: 'There was a problem starting the payment. Please try again or contact us.',
    config:  'Payment is not configured yet. Please contact us to complete your registration.'
  };

  res.render('course-detail', {
    title: `${course.name} (${course.acronym}) - Kanban.UNO`,
    currentPage: 'courses',
    course,
    courses,
    upcomingDates,
    showRegistrationForm,
    priceDisplay,
    paymentError: errorMap[req.query.error] || null
  });
});

module.exports = router;
