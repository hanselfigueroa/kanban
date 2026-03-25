const PageContent = require('../../models/pageContent');
const xss = require('xss');

exports.showContent = async (req, res) => {
  try {
    const content = await PageContent.getAll();
    res.render('admin/content/index', {
      title: 'Page Content - Kanban.UNO Admin',
      currentPage: 'content',
      pageTitle: 'Page Content',
      adminUsername: req.session.adminUsername,
      content
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error');
  }
};

exports.updateContent = async (req, res) => {
  try {
    const key = xss(req.params.key);
    const content = xss(req.body.value || req.body.content || '');
    await PageContent.upsert(key, content, req.session.adminId);
    res.json({ success: true, message: 'Content saved.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
};
