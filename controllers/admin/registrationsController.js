const { pool } = require('../../config/database');
const CourseDb = require('../../models/courseDb');
const xss = require('xss');

exports.listRegistrations = async (req, res) => {
  try {
    const { search, course, status, page: pg } = req.query;
    const page = parseInt(pg) || 1;
    const perPage = 20;
    const offset = (page - 1) * perPage;

    let conditions = [];
    let params = [];
    let i = 1;

    if (search) {
      conditions.push(`(r.full_name ILIKE $${i} OR r.email ILIKE $${i})`);
      params.push(`%${search}%`); i++;
    }
    if (course) {
      conditions.push(`r.course_selected = $${i++}`);
      params.push(course);
    }
    if (status) {
      conditions.push(`r.status = $${i++}`);
      params.push(status);
    }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

    const [regsResult, countResult, courses] = await Promise.all([
      pool.query(
        `SELECT r.*, c.name as course_name, c.acronym,
                cd.start_date as preferred_date, cd.format as date_format
         FROM registrations r
         LEFT JOIN courses c ON r.course_selected = c.course_id
         LEFT JOIN course_dates cd ON r.course_date_id = cd.id
         ${where}
         ORDER BY r.created_at DESC
         LIMIT $${i} OFFSET $${i+1}`,
        [...params, perPage, offset]
      ),
      pool.query(`SELECT COUNT(*) FROM registrations r ${where}`, params),
      CourseDb.getAll({ includeInactive: true })
    ]);

    const total = parseInt(countResult.rows[0].count);

    res.render('admin/registrations/index', {
      title: 'Registrations - Kanban.UNO Admin',
      currentPage: 'registrations',
      pageTitle: 'Registrations',
      adminUsername: req.session.adminUsername,
      registrations: regsResult.rows,
      courses,
      filters: { search: search || '', course: course || '', status: status || '' },
      pagination: { page, total, perPage, totalPages: Math.ceil(total / perPage) }
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error loading registrations');
  }
};

exports.showRegistration = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT r.*, c.name as course_name, c.acronym,
              cd.start_date as preferred_date, cd.format as date_format, cd.location as date_location
       FROM registrations r
       LEFT JOIN courses c ON r.course_selected = c.course_id
       LEFT JOIN course_dates cd ON r.course_date_id = cd.id
       WHERE r.id = $1`,
      [req.params.id]
    );
    if (!result.rows[0]) return res.status(404).send('Not found');
    res.render('admin/registrations/detail', {
      title: `Registration #${req.params.id} - Admin`,
      currentPage: 'registrations',
      pageTitle: `Registration #${req.params.id}`,
      adminUsername: req.session.adminUsername,
      registration: result.rows[0]
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error');
  }
};

exports.updateRegistration = async (req, res) => {
  try {
    const { status, admin_notes } = req.body;
    await pool.query(
      'UPDATE registrations SET status = $1, admin_notes = $2 WHERE id = $3',
      [xss(status), xss(admin_notes || ''), req.params.id]
    );
    // JSON response for AJAX calls
    if (req.xhr || req.headers.accept?.includes('json')) {
      return res.json({ success: true });
    }
    res.redirect(`/admin/registrations/${req.params.id}?success=saved`);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.deleteRegistration = async (req, res) => {
  try {
    await pool.query('DELETE FROM registrations WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.exportCSV = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT r.id, r.full_name, r.email, r.phone, r.company,
              r.course_selected, r.preferred_format, r.message,
              r.status, r.created_at,
              cd.start_date as preferred_date
       FROM registrations r
       LEFT JOIN course_dates cd ON r.course_date_id = cd.id
       ORDER BY r.created_at DESC`
    );

    const headers = ['ID', 'Name', 'Email', 'Phone', 'Company', 'Course', 'Format', 'Message', 'Status', 'Submitted', 'Preferred Date'];
    const rows = result.rows.map(r => [
      r.id, r.full_name, r.email, r.phone || '', r.company || '',
      r.course_selected, r.preferred_format || '', (r.message || '').replace(/,/g, ';'),
      r.status, new Date(r.created_at).toLocaleDateString(),
      r.preferred_date ? new Date(r.preferred_date).toLocaleDateString() : ''
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="registrations-${Date.now()}.csv"`);
    res.send(csv);
  } catch (err) {
    console.error(err);
    res.status(500).send('Export failed');
  }
};
