const AdminUser = require('../../models/adminUser');

exports.showLogin = (req, res) => {
  res.render('admin/login', {
    title: 'Admin Login - Kanban.UNO',
    error: req.session.loginError || null,
    currentPage: 'login'
  });
  delete req.session.loginError;
};

exports.processLogin = async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    req.session.loginError = 'Please enter username and password.';
    return res.redirect('/admin/login');
  }

  try {
    const admin = await AdminUser.findByUsername(username.trim());
    if (!admin) {
      req.session.loginError = 'Invalid username or password.';
      return res.redirect('/admin/login');
    }

    const valid = await AdminUser.verifyPassword(password, admin.password_hash);
    if (!valid) {
      req.session.loginError = 'Invalid username or password.';
      return res.redirect('/admin/login');
    }

    req.session.adminId = admin.id;
    req.session.adminUsername = admin.username;
    await AdminUser.updateLastLogin(admin.id);

    const returnTo = req.session.returnTo || '/admin/dashboard';
    delete req.session.returnTo;
    res.redirect(returnTo);
  } catch (err) {
    console.error('Login error:', err);
    req.session.loginError = 'Something went wrong. Please try again.';
    res.redirect('/admin/login');
  }
};

exports.logout = (req, res) => {
  req.session.destroy(() => {
    res.redirect('/admin/login');
  });
};
