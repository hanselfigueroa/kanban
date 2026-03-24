const { pool } = require('../../config/database');
const CourseDate = require('../../models/courseDate');

exports.showDashboard = async (req, res) => {
  try {
    const [totalRes, pendingRes, activeCourses, upcomingDatesCount, recentRegs, upcomingDates] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM registrations'),
      pool.query("SELECT COUNT(*) FROM registrations WHERE status = 'pending'"),
      pool.query('SELECT COUNT(*) FROM courses WHERE is_active = true'),
      pool.query("SELECT COUNT(*) FROM course_dates WHERE start_date >= CURRENT_DATE AND status = 'upcoming' AND is_active = true"),
      pool.query(`
        SELECT r.*, c.name as course_name, c.acronym
        FROM registrations r
        LEFT JOIN courses c ON r.course_selected = c.course_id
        ORDER BY r.created_at DESC LIMIT 10
      `),
      CourseDate.getUpcoming(5)
    ]);

    res.render('admin/dashboard', {
      title: 'Dashboard - Kanban.UNO Admin',
      currentPage: 'dashboard',
      pageTitle: 'Dashboard',
      adminUsername: req.session.adminUsername,
      stats: {
        totalRegistrations: parseInt(totalRes.rows[0].count),
        pendingRegistrations: parseInt(pendingRes.rows[0].count),
        activeCourses: parseInt(activeCourses.rows[0].count),
        upcomingDates: parseInt(upcomingDatesCount.rows[0].count)
      },
      recentRegistrations: recentRegs.rows,
      upcomingDates
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).render('500', { title: 'Error', currentPage: '' });
  }
};
