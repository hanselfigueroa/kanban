const { pool } = require('../config/database');

const CourseDate = {
  async getAll({ courseId, status, includeInactive = false } = {}) {
    let conditions = [];
    let params = [];
    let i = 1;

    if (!includeInactive) {
      conditions.push(`cd.is_active = true`);
    }
    if (courseId) {
      conditions.push(`cd.course_id = $${i++}`);
      params.push(courseId);
    }
    if (status) {
      conditions.push(`cd.status = $${i++}`);
      params.push(status);
    }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
    const result = await pool.query(
      `SELECT cd.*, c.name as course_name, c.acronym
       FROM course_dates cd
       JOIN courses c ON cd.course_id = c.course_id
       ${where}
       ORDER BY cd.start_date ASC`,
      params
    );
    return result.rows;
  },

  async getUpcoming(limit = 5) {
    const result = await pool.query(
      `SELECT cd.*, c.name as course_name, c.acronym
       FROM course_dates cd
       JOIN courses c ON cd.course_id = c.course_id
       WHERE cd.start_date >= CURRENT_DATE AND cd.status = 'upcoming' AND cd.is_active = true
       ORDER BY cd.start_date ASC
       LIMIT $1`,
      [limit]
    );
    return result.rows;
  },

  async getForCourse(courseId, limit = 3) {
    const result = await pool.query(
      `SELECT * FROM course_dates
       WHERE course_id = $1 AND start_date >= CURRENT_DATE AND status = 'upcoming' AND is_active = true
       ORDER BY start_date ASC
       LIMIT $2`,
      [courseId, limit]
    );
    return result.rows;
  },

  async getById(id) {
    const result = await pool.query(
      `SELECT cd.*, c.name as course_name FROM course_dates cd
       JOIN courses c ON cd.course_id = c.course_id
       WHERE cd.id = $1`,
      [id]
    );
    return result.rows[0] || null;
  },

  async create(data) {
    const {
      course_id, start_date, end_date, format, location,
      timezone, max_participants, status = 'upcoming',
      notes, is_active = true, display_order = 0
    } = data;
    const result = await pool.query(
      `INSERT INTO course_dates
        (course_id, start_date, end_date, format, location, timezone,
         max_participants, status, notes, is_active, display_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [course_id, start_date, end_date, format, location, timezone,
       max_participants, status, notes, is_active, display_order]
    );
    return result.rows[0];
  },

  async update(id, data) {
    const {
      course_id, start_date, end_date, format, location,
      timezone, max_participants, status, notes, is_active, display_order
    } = data;
    const result = await pool.query(
      `UPDATE course_dates SET
        course_id=$1, start_date=$2, end_date=$3, format=$4, location=$5,
        timezone=$6, max_participants=$7, status=$8, notes=$9,
        is_active=$10, display_order=$11
       WHERE id=$12 RETURNING *`,
      [course_id, start_date, end_date, format, location,
       timezone, max_participants, status, notes, is_active, display_order, id]
    );
    return result.rows[0];
  },

  async delete(id) {
    await pool.query('DELETE FROM course_dates WHERE id = $1', [id]);
  },

  async incrementParticipants(id) {
    await pool.query(
      'UPDATE course_dates SET current_participants = current_participants + 1 WHERE id = $1',
      [id]
    );
  }
};

module.exports = CourseDate;
