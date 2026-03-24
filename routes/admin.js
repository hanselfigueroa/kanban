const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { requireAuth, redirectIfAuth } = require('../middleware/auth');

// Controllers
const authCtrl         = require('../controllers/admin/authController');
const dashboardCtrl    = require('../controllers/admin/dashboardController');
const coursesCtrl      = require('../controllers/admin/coursesController');
const datesCtrl        = require('../controllers/admin/datesController');
const regsCtrl         = require('../controllers/admin/registrationsController');
const contentCtrl      = require('../controllers/admin/contentController');
const testimonialsCtrl = require('../controllers/admin/testimonialsController');

// Rate limit login attempts (5 per 15 min per IP)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many login attempts. Please try again in 15 minutes.'
});

// ── Auth ────────────────────────────────────────────────────────────────────
router.get('/login',  redirectIfAuth, authCtrl.showLogin);
router.post('/login', loginLimiter, redirectIfAuth, authCtrl.processLogin);
router.get('/logout', authCtrl.logout);

// All routes below require authentication
router.use(requireAuth);

// ── Dashboard ───────────────────────────────────────────────────────────────
router.get('/',           dashboardCtrl.showDashboard);
router.get('/dashboard',  dashboardCtrl.showDashboard);

// ── Courses ──────────────────────────────────────────────────────────────────
router.get('/courses',                    coursesCtrl.listCourses);
router.get('/courses/new',                coursesCtrl.newCourse);
router.get('/courses/:id/edit',           coursesCtrl.editCourse);
router.post('/courses',                   coursesCtrl.createCourse);
router.post('/courses/:id',               coursesCtrl.updateCourse);   // method-override PUT
router.post('/courses/:id/delete',        coursesCtrl.deleteCourse);

// Curriculum
router.get('/courses/:id/curriculum',     coursesCtrl.showCurriculum);
router.post('/courses/:id/curriculum',    coursesCtrl.addModule);

// ── Course Dates ─────────────────────────────────────────────────────────────
router.get('/dates',                      datesCtrl.listDates);
router.get('/dates/new',                  datesCtrl.newDate);
router.get('/dates/:id/edit',             datesCtrl.editDate);
router.post('/dates',                     datesCtrl.createDate);
router.post('/dates/:id',                 datesCtrl.updateDate);        // method-override PUT

// ── Registrations ─────────────────────────────────────────────────────────────
router.get('/registrations',              regsCtrl.listRegistrations);
router.get('/registrations/export',       regsCtrl.exportCSV);
router.get('/registrations/:id',          regsCtrl.showRegistration);
router.post('/registrations/:id',         regsCtrl.updateRegistration);  // method-override PUT

// ── Page Content ──────────────────────────────────────────────────────────────
router.get('/content',                    contentCtrl.showContent);

// ── Testimonials ──────────────────────────────────────────────────────────────
router.get('/testimonials',               testimonialsCtrl.listTestimonials);
router.post('/testimonials',              testimonialsCtrl.createTestimonial);
router.post('/testimonials/:id',          testimonialsCtrl.updateTestimonial);
router.post('/testimonials/:id/delete',   testimonialsCtrl.deleteTestimonial);

// ── API Endpoints (JSON) ─────────────────────────────────────────────────────
// Courses
router.post('/api/courses/:id/toggle',    coursesCtrl.apiToggleActive);

// Curriculum
router.post('/api/curriculum/:id',        coursesCtrl.updateModule);
router.delete('/api/curriculum/:id',      coursesCtrl.deleteModule);
router.post('/api/curriculum/reorder',    coursesCtrl.reorderModules);

// Dates
router.delete('/api/dates/:id',           datesCtrl.deleteDate);

// Registrations
router.delete('/api/registrations/:id',   regsCtrl.deleteRegistration);
router.post('/api/registrations/:id/status', async (req, res) => {
  req.body.admin_notes = ''; // status-only update
  return regsCtrl.updateRegistration(req, res);
});

// Content
router.post('/api/content/:key',          contentCtrl.updateContent);

// Testimonials
router.delete('/api/testimonials/:id',    testimonialsCtrl.deleteTestimonial);
router.post('/api/testimonials/:id/toggle', testimonialsCtrl.toggleActive);
router.post('/api/testimonials/reorder',  testimonialsCtrl.reorder);

module.exports = router;
