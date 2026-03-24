const CourseDate = require('../../models/courseDate');
const CourseDb = require('../../models/courseDb');
const xss = require('xss');

exports.listDates = async (req, res) => {
  try {
    const { course, status } = req.query;
    const [dates, courses] = await Promise.all([
      CourseDate.getAll({ courseId: course, status, includeInactive: true }),
      CourseDb.getAll({ includeInactive: true })
    ]);
    res.render('admin/dates/index', {
      title: 'Course Dates - Kanban.UNO Admin',
      currentPage: 'dates',
      pageTitle: 'Course Dates',
      adminUsername: req.session.adminUsername,
      dates,
      courses,
      filters: { course: course || '', status: status || '' }
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error loading dates');
  }
};

exports.newDate = async (req, res) => {
  const courses = await CourseDb.getAll({ includeInactive: false }).catch(() => []);
  res.render('admin/dates/edit', {
    title: 'Add Course Date - Admin',
    currentPage: 'dates',
    pageTitle: 'Add Course Date',
    adminUsername: req.session.adminUsername,
    date: null,
    courses,
    isNew: true
  });
};

exports.editDate = async (req, res) => {
  try {
    const [date, courses] = await Promise.all([
      CourseDate.getById(req.params.id),
      CourseDb.getAll({ includeInactive: false })
    ]);
    if (!date) return res.status(404).send('Not found');
    res.render('admin/dates/edit', {
      title: 'Edit Course Date - Admin',
      currentPage: 'dates',
      pageTitle: 'Edit Course Date',
      adminUsername: req.session.adminUsername,
      date,
      courses,
      isNew: false
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error');
  }
};

exports.createDate = async (req, res) => {
  try {
    await CourseDate.create(sanitizeBody(req.body));
    res.redirect('/admin/dates?success=created');
  } catch (err) {
    console.error(err);
    res.redirect('/admin/dates/new?error=' + encodeURIComponent(err.message));
  }
};

exports.updateDate = async (req, res) => {
  try {
    await CourseDate.update(req.params.id, sanitizeBody(req.body));
    res.redirect('/admin/dates?success=saved');
  } catch (err) {
    console.error(err);
    res.redirect(`/admin/dates/${req.params.id}/edit?error=failed`);
  }
};

exports.deleteDate = async (req, res) => {
  try {
    await CourseDate.delete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

function sanitizeBody(body) {
  return {
    course_id: xss(body.course_id || ''),
    start_date: body.start_date || null,
    end_date: body.end_date || null,
    format: xss(body.format || 'Live Virtual'),
    location: xss(body.location || ''),
    timezone: xss(body.timezone || 'UTC'),
    max_participants: parseInt(body.max_participants) || null,
    status: xss(body.status || 'upcoming'),
    notes: xss(body.notes || ''),
    is_active: body.is_active === 'on',
    display_order: parseInt(body.display_order) || 0
  };
}
