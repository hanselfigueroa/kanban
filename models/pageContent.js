const { pool } = require('../config/database');

const PageContent = {
  // Default content fallbacks
  defaults: {
    hero_badge: 'Kanban University Accredited',
    hero_headline: 'Master the Art of Continuous Flow',
    hero_subheadline: 'Transform your chaotic workload into an architectural stream of productivity. Join professionals mastering the Kanban methodology at the highest level.',
    cta_headline: 'Ready to Transform Your Organization?',
    cta_description: 'Join hundreds of professionals who have mastered the Kanban Method through our accredited courses.',
    about_headline: 'Transforming the future of workflow education.',
    about_mission: 'We are dedicated to spreading the knowledge and practice of the Kanban Method to organizations worldwide. As an accredited Kanban University training provider, we deliver world-class education that transforms how teams and organizations deliver value.'
  },

  async getAll() {
    const result = await pool.query('SELECT * FROM page_content ORDER BY page, section_key');
    const content = { ...this.defaults };
    result.rows.forEach(row => {
      content[row.section_key] = row.content;
    });
    return content;
  },

  async getByKey(key) {
    const result = await pool.query(
      'SELECT * FROM page_content WHERE section_key = $1',
      [key]
    );
    return result.rows[0] || null;
  },

  async upsert(key, content, adminId) {
    const existing = await this.getByKey(key);
    if (existing) {
      await pool.query(
        'UPDATE page_content SET content = $1, updated_at = NOW(), updated_by = $2 WHERE section_key = $3',
        [content, adminId, key]
      );
    } else {
      await pool.query(
        'INSERT INTO page_content (section_key, content, updated_by) VALUES ($1, $2, $3)',
        [key, content, adminId]
      );
    }
    return this.getByKey(key);
  }
};

module.exports = PageContent;
