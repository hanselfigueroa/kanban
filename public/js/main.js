/* ========================================
   Kanban University - Main JavaScript
   ======================================== */

document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  initSmoothScroll();
  initMobileMenu();
  initScrollAnimations();
  initTestimonialCarousel();
  initTabs();
  initForms();
});

/* ---- Sticky Navbar ---- */
function initNavbar() {
  const navbar = document.getElementById('navbar');
  if (!navbar) return;
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 50);
  });
}

/* ---- Smooth Scroll ---- */
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const target = document.querySelector(anchor.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

/* ---- Mobile Menu ---- */
function initMobileMenu() {
  const hamburger = document.getElementById('hamburger');
  const navLinks = document.getElementById('navLinks');
  if (!hamburger || !navLinks) return;

  hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('active');
    navLinks.classList.toggle('active');
  });

  // Close menu on link click
  navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      hamburger.classList.remove('active');
      navLinks.classList.remove('active');
    });
  });
}

/* ---- Scroll Animations (fade-in) ---- */
function initScrollAnimations() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

  document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));
}

/* ---- Testimonial Carousel ---- */
function initTestimonialCarousel() {
  const track = document.getElementById('testimonialTrack');
  const dotsContainer = document.getElementById('carouselDots');
  const prevBtn = document.getElementById('carouselPrev');
  const nextBtn = document.getElementById('carouselNext');
  if (!track) return;

  const cards = track.querySelectorAll('.testimonial-card');
  const total = cards.length;
  let current = 0;
  let autoplayTimer;

  // Create dots
  for (let i = 0; i < total; i++) {
    const dot = document.createElement('button');
    dot.classList.add('carousel-dot');
    dot.setAttribute('aria-label', `Go to testimonial ${i + 1}`);
    if (i === 0) dot.classList.add('active');
    dot.addEventListener('click', () => goTo(i));
    dotsContainer.appendChild(dot);
  }

  function goTo(index) {
    current = index;
    track.style.transform = `translateX(-${current * 100}%)`;
    dotsContainer.querySelectorAll('.carousel-dot').forEach((d, i) => {
      d.classList.toggle('active', i === current);
    });
    resetAutoplay();
  }

  function next() { goTo((current + 1) % total); }
  function prev() { goTo((current - 1 + total) % total); }

  prevBtn.addEventListener('click', prev);
  nextBtn.addEventListener('click', next);

  function resetAutoplay() {
    clearInterval(autoplayTimer);
    autoplayTimer = setInterval(next, 5000);
  }
  resetAutoplay();
}

/* ---- Tabs (Course Detail) ---- */
function initTabs() {
  const tabs = document.querySelectorAll('.tab');
  if (!tabs.length) return;

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;

      // Deactivate all
      document.querySelectorAll('.tab').forEach(t => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

      // Activate selected
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');
      document.getElementById(`tab-${target}`).classList.add('active');
    });
  });
}

/* ---- Form Handling ---- */
function initForms() {
  // Registration form (course detail page)
  const regForm = document.getElementById('registrationForm');
  if (regForm) {
    regForm.addEventListener('submit', (e) => handleFormSubmit(e, regForm, '/api/register'));
    // Real-time email validation
    const emailInput = regForm.querySelector('#email');
    if (emailInput) {
      emailInput.addEventListener('blur', () => validateEmail(emailInput, 'error-email'));
    }
  }

  // Contact form
  const contactForm = document.getElementById('contactForm');
  if (contactForm) {
    contactForm.addEventListener('submit', (e) => handleContactSubmit(e, contactForm));
  }
}

async function handleFormSubmit(e, form, url) {
  e.preventDefault();
  clearErrors(form);

  // Validate
  const name = form.querySelector('[name="full_name"]');
  const email = form.querySelector('[name="email"]');
  let valid = true;

  if (!name.value.trim()) {
    showError('error-full_name', 'Name is required'); valid = false;
  }
  if (!email.value.trim() || !isValidEmail(email.value)) {
    showError('error-email', 'Valid email is required'); valid = false;
  }
  if (!valid) return;

  // Show loading
  const btn = form.querySelector('button[type="submit"]');
  btn.querySelector('.btn-text').style.display = 'none';
  btn.querySelector('.btn-loading').style.display = 'inline';
  btn.disabled = true;

  try {
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const result = await res.json();

    if (result.success) {
      if (result.checkout_url) {
        showToast(result.message, 'success');
        setTimeout(function() { window.location.href = result.checkout_url; }, 800);
        return;
      }
      showToast(result.message, 'success');
      form.reset();
    } else {
      showToast(result.message || 'Something went wrong', 'error');
    }
  } catch {
    showToast('Network error. Please try again.', 'error');
  } finally {
    btn.querySelector('.btn-text').style.display = 'inline';
    btn.querySelector('.btn-loading').style.display = 'none';
    btn.disabled = false;
  }
}

async function handleContactSubmit(e, form) {
  e.preventDefault();
  clearErrors(form);

  const name = form.querySelector('#contact_name');
  const email = form.querySelector('#contact_email');
  const message = form.querySelector('#contact_message');
  let valid = true;

  if (!name.value.trim()) { showError('error-contact_name', 'Name is required'); valid = false; }
  if (!email.value.trim() || !isValidEmail(email.value)) { showError('error-contact_email', 'Valid email is required'); valid = false; }
  if (!message.value.trim()) { showError('error-contact_message', 'Message is required'); valid = false; }
  if (!valid) return;

  const btn = form.querySelector('button[type="submit"]');
  btn.querySelector('.btn-text').style.display = 'none';
  btn.querySelector('.btn-loading').style.display = 'inline';
  btn.disabled = true;

  try {
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    // Use the same registration endpoint with a general course indicator
    if (!data.course_selected) data.course_selected = 'tkp';

    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const result = await res.json();

    if (result.success) {
      showToast('Message sent! We\'ll be in touch soon.', 'success');
      form.reset();
    } else {
      showToast(result.message || 'Something went wrong', 'error');
    }
  } catch {
    showToast('Network error. Please try again.', 'error');
  } finally {
    btn.querySelector('.btn-text').style.display = 'inline';
    btn.querySelector('.btn-loading').style.display = 'none';
    btn.disabled = false;
  }
}

/* ---- Helpers ---- */
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validateEmail(input, errorId) {
  if (input.value && !isValidEmail(input.value)) {
    showError(errorId, 'Please enter a valid email address');
  } else {
    const el = document.getElementById(errorId);
    if (el) el.textContent = '';
  }
}

function showError(id, msg) {
  const el = document.getElementById(id);
  if (el) el.textContent = msg;
}

function clearErrors(form) {
  form.querySelectorAll('.form-error').forEach(el => el.textContent = '');
}

/* ---- Toast Notifications ---- */
function showToast(message, type = 'success') {
  // Remove existing toast
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
    <span>${message}</span>
    <button class="toast-close" aria-label="Close notification">&times;</button>
  `;

  document.body.appendChild(toast);

  // Trigger animation
  requestAnimationFrame(() => toast.classList.add('show'));

  toast.querySelector('.toast-close').addEventListener('click', () => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  });

  // Auto-dismiss
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 5000);
}
