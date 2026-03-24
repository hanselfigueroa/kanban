const Testimonial = require('../../models/testimonial');
const xss = require('xss');

exports.listTestimonials = async (req, res) => {
  try {
    const testimonials = await Testimonial.getAll({ includeInactive: true });
    res.render('admin/testimonials/index', {
      title: 'Testimonials - Kanban.UNO Admin',
      currentPage: 'testimonials',
      pageTitle: 'Testimonials',
      adminUsername: req.session.adminUsername,
      testimonials
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error');
  }
};

exports.createTestimonial = async (req, res) => {
  try {
    await Testimonial.create(sanitizeBody(req.body));
    res.redirect('/admin/testimonials?success=created');
  } catch (err) {
    console.error(err);
    res.redirect('/admin/testimonials?error=failed');
  }
};

exports.updateTestimonial = async (req, res) => {
  try {
    await Testimonial.update(req.params.id, sanitizeBody(req.body));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.deleteTestimonial = async (req, res) => {
  try {
    await Testimonial.delete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.toggleActive = async (req, res) => {
  try {
    const t = await Testimonial.getById(req.params.id);
    if (!t) return res.status(404).json({ success: false });
    await Testimonial.toggleActive(req.params.id, !t.is_active);
    res.json({ success: true, is_active: !t.is_active });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.reorder = async (req, res) => {
  try {
    const { order } = req.body;
    await Testimonial.reorder(order);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

function sanitizeBody(body) {
  return {
    client_name: xss(body.client_name || ''),
    client_title: xss(body.client_title || ''),
    client_company: xss(body.client_company || ''),
    testimonial_text: xss(body.testimonial_text || ''),
    rating: Math.min(5, Math.max(1, parseInt(body.rating) || 5)),
    photo_url: xss(body.photo_url || ''),
    is_active: body.is_active === 'on' || body.is_active === true,
    display_order: parseInt(body.display_order) || 0
  };
}
