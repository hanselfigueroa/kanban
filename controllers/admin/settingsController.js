const SiteSettings = require('../../models/siteSettings');
const xss = require('xss');

exports.showSettings = async (req, res) => {
  try {
    const settings = await SiteSettings.getCheckoutSettings();
    res.render('admin/settings/index', {
      title: 'Checkout Settings - Admin',
      currentPage: 'settings',
      pageTitle: 'Checkout Settings',
      adminUsername: req.session.adminUsername,
      settings,
      success: req.query.success,
      error: req.query.error
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error loading settings');
  }
};

exports.updateSettings = async (req, res) => {
  try {
    const body = req.body;
    const settings = {
      checkout_enabled: body.checkout_enabled === 'on' ? 'true' : 'false',
      checkout_currency: xss((body.checkout_currency || 'GTQ').toUpperCase().trim()),
      checkout_tax_rate: xss(body.checkout_tax_rate || '0.12'),
      paggo_api_url: xss((body.paggo_api_url || '').trim()),
      paggo_api_key: xss((body.paggo_api_key || '').trim()),
      paggo_merchant_id: xss((body.paggo_merchant_id || '').trim()),
      checkout_success_message: xss(body.checkout_success_message || ''),
      checkout_terms: xss(body.checkout_terms || ''),
      show_registration_form: body.show_registration_form === 'on' ? 'true' : 'false'
    };
    await SiteSettings.setMultiple(settings);
    res.redirect('/admin/settings?success=saved');
  } catch (err) {
    console.error(err);
    res.redirect('/admin/settings?error=failed');
  }
};
