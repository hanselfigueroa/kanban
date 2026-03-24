const CourseDb = require('../../models/courseDb');
const xss = require('xss');

exports.listCourses = async (req, res) => {
  try {
    const courses = await CourseDb.getAll({ includeInactive: true });
    res.render('admin/courses/index', {
      title: 'Courses - Kanban.UNO Admin',
      currentPage: 'courses',
      pageTitle: 'Courses',
      adminUsername: req.session.adminUsername,
      courses
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error loading courses');
  }
};

exports.newCourse = (req, res) => {
  res.render('admin/courses/edit', {
    title: 'New Course - Kanban.UNO Admin',
    currentPage: 'courses',
    pageTitle: 'New Course',
    adminUsername: req.session.adminUsername,
    course: null,
    isNew: true,
    error: null
  });
};

exports.editCourse = async (req, res) => {
  try {
    const course = await CourseDb.getById(req.params.id);
    if (!course) return res.status(404).send('Course not found');
    res.render('admin/courses/edit', {
      title: `Edit ${course.name} - Kanban.UNO Admin`,
      currentPage: 'courses',
      pageTitle: `Edit: ${course.acronym}`,
      adminUsername: req.session.adminUsername,
      course,
      isNew: false,
      error: null
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error loading course');
  }
};

exports.createCourse = async (req, res) => {
  try {
    const data = sanitizeBody(req.body);
    data.is_active = req.body.is_active === 'on';
    await CourseDb.create(data);
    res.redirect('/admin/courses?success=created');
  } catch (err) {
    console.error(err);
    res.render('admin/courses/edit', {
      title: 'New Course - Kanban.UNO Admin',
      currentPage: 'courses',
      pageTitle: 'New Course',
      adminUsername: req.session.adminUsername,
      course: req.body,
      isNew: true,
      error: err.message
    });
  }
};

exports.updateCourse = async (req, res) => {
  try {
    const data = sanitizeBody(req.body);
    data.is_active = req.body.is_active === 'on';
    await CourseDb.update(req.params.id, data);
    res.redirect(`/admin/courses/${req.params.id}/edit?success=saved`);
  } catch (err) {
    console.error(err);
    const course = await CourseDb.getById(req.params.id).catch(() => req.body);
    res.render('admin/courses/edit', {
      title: 'Edit Course - Kanban.UNO Admin',
      currentPage: 'courses',
      pageTitle: 'Edit Course',
      adminUsername: req.session.adminUsername,
      course: { ...course, ...req.body },
      isNew: false,
      error: err.message
    });
  }
};

exports.deleteCourse = async (req, res) => {
  try {
    await CourseDb.toggleActive(req.params.id, false);
    res.redirect('/admin/courses?success=deactivated');
  } catch (err) {
    console.error(err);
    res.redirect('/admin/courses?error=delete_failed');
  }
};

// Curriculum
exports.showCurriculum = async (req, res) => {
  try {
    const [course, modules] = await Promise.all([
      CourseDb.getById(req.params.id),
      CourseDb.getCurriculum(req.params.id)
    ]);
    if (!course) return res.status(404).send('Course not found');
    res.render('admin/courses/curriculum', {
      title: `Curriculum: ${course.name} - Admin`,
      currentPage: 'courses',
      pageTitle: `Curriculum: ${course.acronym}`,
      adminUsername: req.session.adminUsername,
      course,
      modules
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error');
  }
};

exports.addModule = async (req, res) => {
  try {
    const { module_title, topics, duration, display_order } = req.body;
    await CourseDb.addModule(req.params.id, {
      module_title: xss(module_title),
      topics: xss(topics),
      duration: xss(duration || ''),
      display_order: parseInt(display_order) || 0
    });
    res.redirect(`/admin/courses/${req.params.id}/curriculum?success=added`);
  } catch (err) {
    console.error(err);
    res.redirect(`/admin/courses/${req.params.id}/curriculum?error=failed`);
  }
};

exports.updateModule = async (req, res) => {
  try {
    const { module_title, topics, duration, display_order } = req.body;
    await CourseDb.updateModule(req.params.id, {
      module_title: xss(module_title),
      topics: xss(topics),
      duration: xss(duration || ''),
      display_order: parseInt(display_order) || 0
    });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.deleteModule = async (req, res) => {
  try {
    await CourseDb.deleteModule(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.reorderModules = async (req, res) => {
  try {
    const { order } = req.body; // array of {id, display_order}
    await CourseDb.reorderModules(order);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// API: toggle active
exports.apiToggleActive = async (req, res) => {
  try {
    const course = await CourseDb.getById(req.params.id);
    if (!course) return res.status(404).json({ success: false, error: 'Not found' });
    await CourseDb.toggleActive(req.params.id, !course.is_active);
    res.json({ success: true, is_active: !course.is_active });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

function sanitizeBody(body) {
  return {
    course_id: xss((body.course_id || '').toLowerCase().trim()),
    name: xss(body.name || ''),
    acronym: xss((body.acronym || '').toUpperCase().trim()),
    tagline: xss(body.tagline || ''),
    level: xss(body.level || ''),
    duration: xss(body.duration || ''),
    short_description: xss(body.short_description || ''),
    full_description: xss(body.full_description || ''),
    who_should_attend: xss(body.who_should_attend || ''),
    learning_objectives: xss(body.learning_objectives || ''),
    prerequisites: xss(body.prerequisites || ''),
    certification_info: xss(body.certification_info || ''),
    price: parseFloat(body.price) || null,
    display_order: parseInt(body.display_order) || 0
  };
}
