const express      = require('express');
const router       = express.Router();
const CourseDb     = require('../models/courseDb');
const CourseDate   = require('../models/courseDate');
const hardcoded    = require('../config/courses');
const SiteSettings = require('../models/siteSettings');

// Helper: get courses from DB, fall back to hardcoded config
async function getCourses() {
  try {
    const dbCourses = await CourseDb.getAll();
    if (dbCourses.length > 0) {
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
          price: c.price ? `$${c.price}` : 'Contact for pricing',
          curriculum: [] // loaded separately per-detail
        };
      }
      return map;
    }
  } catch (e) { /* DB not ready yet */ }
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
    paymentError: errorMap[req.query.error] || null
  });
});

module.exports = router;
