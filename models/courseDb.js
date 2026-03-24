/**
 * Database-backed Course model
 * Handles all course CRUD operations in PostgreSQL
 */
const { pool } = require('../config/database');

const CourseDb = {
  async getAll({ includeInactive = false } = {}) {
    const where = includeInactive ? '' : 'WHERE is_active = true';
    const result = await pool.query(
      `SELECT * FROM courses ${where} ORDER BY display_order ASC, id ASC`
    );
    return result.rows;
  },

  async getById(courseId) {
    const result = await pool.query(
      'SELECT * FROM courses WHERE course_id = $1',
      [courseId]
    );
    return result.rows[0] || null;
  },

  async getByDbId(id) {
    const result = await pool.query(
      'SELECT * FROM courses WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  },

  async create(data) {
    const {
      course_id, name, acronym, tagline, level, duration,
      short_description, full_description, who_should_attend,
      learning_objectives, prerequisites, certification_info,
      price, is_active = true, display_order = 0
    } = data;

    const result = await pool.query(
      `INSERT INTO courses
        (course_id, name, acronym, tagline, level, duration,
         short_description, full_description, who_should_attend,
         learning_objectives, prerequisites, certification_info,
         price, is_active, display_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
       RETURNING *`,
      [course_id, name, acronym, tagline, level, duration,
       short_description, full_description, who_should_attend,
       learning_objectives, prerequisites, certification_info,
       price, is_active, display_order]
    );
    return result.rows[0];
  },

  async update(courseId, data) {
    const {
      name, acronym, tagline, level, duration,
      short_description, full_description, who_should_attend,
      learning_objectives, prerequisites, certification_info,
      price, is_active, display_order
    } = data;

    const result = await pool.query(
      `UPDATE courses SET
        name=$1, acronym=$2, tagline=$3, level=$4, duration=$5,
        short_description=$6, full_description=$7, who_should_attend=$8,
        learning_objectives=$9, prerequisites=$10, certification_info=$11,
        price=$12, is_active=$13, display_order=$14, updated_at=NOW()
       WHERE course_id=$15 RETURNING *`,
      [name, acronym, tagline, level, duration,
       short_description, full_description, who_should_attend,
       learning_objectives, prerequisites, certification_info,
       price, is_active, display_order, courseId]
    );
    return result.rows[0];
  },

  async toggleActive(courseId, isActive) {
    await pool.query(
      'UPDATE courses SET is_active = $1, updated_at = NOW() WHERE course_id = $2',
      [isActive, courseId]
    );
  },

  async delete(courseId) {
    await pool.query('DELETE FROM courses WHERE course_id = $1', [courseId]);
  },

  // Curriculum management
  async getCurriculum(courseId) {
    const result = await pool.query(
      'SELECT * FROM course_curriculum WHERE course_id = $1 ORDER BY display_order ASC, module_number ASC',
      [courseId]
    );
    return result.rows;
  },

  async addModule(courseId, { module_title, topics, duration, display_order }) {
    // Auto-increment module_number
    const countRes = await pool.query(
      'SELECT COALESCE(MAX(module_number), 0) + 1 AS next_num FROM course_curriculum WHERE course_id = $1',
      [courseId]
    );
    const module_number = countRes.rows[0].next_num;

    const result = await pool.query(
      `INSERT INTO course_curriculum (course_id, module_number, module_title, topics, duration, display_order)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [courseId, module_number, module_title, topics, duration, display_order || module_number]
    );
    return result.rows[0];
  },

  async updateModule(id, { module_title, topics, duration, display_order }) {
    const result = await pool.query(
      `UPDATE course_curriculum SET module_title=$1, topics=$2, duration=$3, display_order=$4
       WHERE id=$5 RETURNING *`,
      [module_title, topics, duration, display_order, id]
    );
    return result.rows[0];
  },

  async deleteModule(id) {
    await pool.query('DELETE FROM course_curriculum WHERE id = $1', [id]);
  },

  async reorderModules(orderedIds) {
    // orderedIds: array of {id, display_order}
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const { id, display_order } of orderedIds) {
        await client.query(
          'UPDATE course_curriculum SET display_order = $1 WHERE id = $2',
          [display_order, id]
        );
      }
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }
};

module.exports = CourseDb;
