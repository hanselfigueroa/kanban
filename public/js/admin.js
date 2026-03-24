/**
 * KANBAN.UNO — Admin Panel JavaScript
 * Handles: toasts, modals, AJAX, filters, sortable, date pickers, inline edits, CSV
 */

'use strict';

/* ============================================================
   CDN DEPENDENCIES — loaded once on DOMContentLoaded
   ============================================================ */
(function loadAdminDeps() {
  // Flatpickr CSS
  if (!document.querySelector('link[href*="flatpickr"]')) {
    const link = document.createElement('link');
    link.rel  = 'stylesheet';
    link.href = 'https://cdn.jsdelivr.net/npm/flatpickr/dist/flatpickr.min.css';
    document.head.appendChild(link);
  }

  // Flatpickr JS
  function loadFlatpickr(cb) {
    if (window.flatpickr) { cb && cb(); return; }
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/flatpickr';
    s.onload = cb;
    document.head.appendChild(s);
  }

  // Sortable.js
  function loadSortable(cb) {
    if (window.Sortable) { cb && cb(); return; }
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/sortablejs@1.15.0/Sortable.min.js';
    s.onload = cb;
    document.head.appendChild(s);
  }

  document.addEventListener('DOMContentLoaded', function () {
    loadFlatpickr(function () { Admin.initDatePickers(); });
    loadSortable(function ()  { Admin.initSortable(); });
  });
})();


/* ============================================================
   ADMIN NAMESPACE
   ============================================================ */
const Admin = (function () {

  /* ----------------------------------------------------------
     TOAST NOTIFICATION SYSTEM
     showAdminToast(message, type)
     type: 'success' | 'error' | 'info' | 'warning'
  ---------------------------------------------------------- */
  const TOAST_ICONS = {
    success: '✓',
    error:   '✕',
    info:    'ℹ',
    warning: '⚠',
  };

  function getOrCreateToastContainer() {
    let container = document.getElementById('admin-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'admin-toast-container';
      container.className = 'admin-toast-container';
      document.body.appendChild(container);
    }
    return container;
  }

  function showAdminToast(message, type = 'info') {
    const container = getOrCreateToastContainer();
    const toast = document.createElement('div');
    toast.className = `admin-toast toast-${type}`;

    toast.innerHTML = `
      <span class="admin-toast-icon">${TOAST_ICONS[type] || 'ℹ'}</span>
      <span class="admin-toast-message">${escapeHtml(message)}</span>
      <button class="admin-toast-close" aria-label="Close">×</button>
    `;

    container.appendChild(toast);

    // Close button
    toast.querySelector('.admin-toast-close').addEventListener('click', function () {
      dismissToast(toast);
    });

    // Auto-dismiss after 4s
    const timer = setTimeout(function () {
      dismissToast(toast);
    }, 4000);

    toast._dismissTimer = timer;

    return toast;
  }

  function dismissToast(toast) {
    if (!toast || !toast.parentNode) return;
    clearTimeout(toast._dismissTimer);
    toast.classList.add('toast-out');
    setTimeout(function () {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 280);
  }


  /* ----------------------------------------------------------
     MODAL CONFIRMATION SYSTEM
     showConfirmModal(title, message, onConfirm, danger=true)
  ---------------------------------------------------------- */
  function showConfirmModal(title, message, onConfirm, danger = true) {
    // Remove any existing confirm modal
    const existing = document.getElementById('admin-confirm-modal-overlay');
    if (existing) existing.parentNode.removeChild(existing);

    const overlay = document.createElement('div');
    overlay.id = 'admin-confirm-modal-overlay';
    overlay.className = 'admin-modal-overlay';

    const confirmBtnClass = danger ? 'btn-admin-danger' : 'btn-admin-primary';
    const confirmBtnText  = danger ? 'Delete' : 'Confirm';
    const modalModifier   = danger ? 'modal-danger' : '';

    overlay.innerHTML = `
      <div class="admin-modal modal-sm ${modalModifier}" role="dialog" aria-modal="true" aria-labelledby="confirm-modal-title">
        <div class="admin-modal-header">
          <span class="admin-modal-title" id="confirm-modal-title">${escapeHtml(title)}</span>
          <button class="admin-modal-close" data-close-modal aria-label="Close">×</button>
        </div>
        <div class="admin-modal-body">
          <p>${escapeHtml(message)}</p>
        </div>
        <div class="admin-modal-footer">
          <button class="btn-admin btn-admin-secondary" data-close-modal>Cancel</button>
          <button class="btn-admin ${confirmBtnClass}" id="admin-confirm-btn">${confirmBtnText}</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';

    function close() {
      overlay.parentNode && overlay.parentNode.removeChild(overlay);
      document.body.style.overflow = '';
    }

    overlay.querySelectorAll('[data-close-modal]').forEach(function (btn) {
      btn.addEventListener('click', close);
    });

    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) close();
    });

    document.getElementById('admin-confirm-btn').addEventListener('click', function () {
      close();
      if (typeof onConfirm === 'function') onConfirm();
    });

    document.addEventListener('keydown', function escHandler(e) {
      if (e.key === 'Escape') { close(); document.removeEventListener('keydown', escHandler); }
    });

    return overlay;
  }


  /* ----------------------------------------------------------
     AJAX HELPER
     adminFetch(url, method='GET', data=null)
     Returns: Promise<any> — parsed JSON or throws Error
  ---------------------------------------------------------- */
  async function adminFetch(url, method = 'GET', data = null) {
    const options = {
      method: method.toUpperCase(),
      headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
      credentials: 'same-origin',
    };

    // Include CSRF token if present (meta tag or cookie)
    const csrfMeta = document.querySelector('meta[name="csrf-token"]');
    if (csrfMeta) options.headers['X-CSRF-Token'] = csrfMeta.getAttribute('content');

    if (data !== null && options.method !== 'GET') {
      options.body = JSON.stringify(data);
    }

    let response;
    try {
      response = await fetch(url, options);
    } catch (networkErr) {
      throw new Error('Network error: ' + networkErr.message);
    }

    if (!response.ok) {
      let errorMsg = `Server error (${response.status})`;
      try {
        const errBody = await response.json();
        errorMsg = errBody.message || errBody.error || errorMsg;
      } catch (_) { /* ignore */ }
      throw new Error(errorMsg);
    }

    const text = await response.text();
    if (!text) return null;

    try {
      return JSON.parse(text);
    } catch (_) {
      return text;
    }
  }


  /* ----------------------------------------------------------
     DELETE HANDLERS
     Buttons with [data-delete-url] trigger confirm modal
     then issue DELETE request, then reload page
  ---------------------------------------------------------- */
  function initDeleteHandlers() {
    document.addEventListener('click', function (e) {
      const btn = e.target.closest('[data-delete-url]');
      if (!btn) return;

      const url   = btn.dataset.deleteUrl;
      const label = btn.dataset.deleteLabel || 'this item';

      showConfirmModal(
        'Confirm Delete',
        `Are you sure you want to delete ${label}? This action cannot be undone.`,
        async function () {
          try {
            btn.disabled = true;
            await adminFetch(url, 'DELETE');
            showAdminToast('Deleted successfully.', 'success');
            setTimeout(function () { window.location.reload(); }, 600);
          } catch (err) {
            showAdminToast('Delete failed: ' + err.message, 'error');
            btn.disabled = false;
          }
        },
        true
      );
    });
  }


  /* ----------------------------------------------------------
     STATUS UPDATE — auto-save on change
     Selects/inputs with [data-status-url] issue PUT on change
  ---------------------------------------------------------- */
  function initStatusUpdates() {
    document.addEventListener('change', async function (e) {
      const el = e.target.closest('[data-status-url]');
      if (!el) return;

      const url   = el.dataset.statusUrl;
      const field = el.dataset.statusField || 'status';
      const value = el.value;
      const prev  = el.dataset.prevValue;

      try {
        await adminFetch(url, 'PUT', { [field]: value });
        el.dataset.prevValue = value;
        showAdminToast('Status updated.', 'success');
      } catch (err) {
        showAdminToast('Failed to update status: ' + err.message, 'error');
        if (prev !== undefined) el.value = prev;
      }
    });
  }


  /* ----------------------------------------------------------
     TOGGLE ACTIVE
     Buttons with [data-toggle-active-url] do AJAX and update UI
  ---------------------------------------------------------- */
  function initToggleActive() {
    document.addEventListener('click', async function (e) {
      const btn = e.target.closest('[data-toggle-active-url]');
      if (!btn) return;

      const url      = btn.dataset.toggleActiveUrl;
      const field    = btn.dataset.toggleField || 'active';
      const isActive = btn.dataset.currentState === 'true';

      btn.disabled = true;
      try {
        const result = await adminFetch(url, 'PUT', { [field]: !isActive });
        const newState = result && result[field] !== undefined ? result[field] : !isActive;

        btn.dataset.currentState = newState ? 'true' : 'false';
        btn.classList.toggle('is-inactive', !newState);
        btn.textContent = newState ? 'Active' : 'Inactive';

        // Update sibling badge if present
        const row = btn.closest('tr');
        if (row) {
          const badge = row.querySelector('.admin-badge');
          if (badge) {
            badge.className = `admin-badge ${newState ? 'badge-active' : 'badge-inactive'}`;
            badge.querySelector('span') && (badge.querySelector('span').textContent = newState ? 'Active' : 'Inactive');
          }
        }

        showAdminToast(newState ? 'Activated.' : 'Deactivated.', 'success');
      } catch (err) {
        showAdminToast('Toggle failed: ' + err.message, 'error');
      } finally {
        btn.disabled = false;
      }
    });
  }


  /* ----------------------------------------------------------
     FORM SUBMISSION — loading state on submit button
  ---------------------------------------------------------- */
  function initFormLoadingState() {
    document.addEventListener('submit', function (e) {
      const form = e.target.closest('form.admin-form, [data-admin-form]');
      if (!form) return;

      const submitBtn = form.querySelector('[type="submit"]');
      if (submitBtn && !submitBtn.disabled) {
        const originalText = submitBtn.textContent;
        submitBtn.classList.add('loading');
        submitBtn.disabled = true;

        // Restore state in case of page stay (e.g. validation errors)
        window.addEventListener('pageshow', function () {
          submitBtn.classList.remove('loading');
          submitBtn.disabled = false;
          submitBtn.textContent = originalText;
        }, { once: true });
      }
    });
  }


  /* ----------------------------------------------------------
     INLINE EDIT SAVE
     Forms with [data-inline-save] submit via AJAX and show toast
  ---------------------------------------------------------- */
  function initInlineEditSave() {
    document.addEventListener('submit', async function (e) {
      const form = e.target.closest('[data-inline-save]');
      if (!form) return;

      e.preventDefault();

      const url    = form.action || form.dataset.inlineSave;
      const method = (form.dataset.method || form.method || 'POST').toUpperCase();
      const data   = formToObject(form);

      const submitBtn = form.querySelector('[type="submit"]');
      if (submitBtn) { submitBtn.classList.add('loading'); submitBtn.disabled = true; }

      try {
        await adminFetch(url, method, data);
        showAdminToast('Saved successfully.', 'success');

        // Optionally trigger a custom event on the form
        form.dispatchEvent(new CustomEvent('admin:saved', { bubbles: true }));
      } catch (err) {
        showAdminToast('Save failed: ' + err.message, 'error');
      } finally {
        if (submitBtn) { submitBtn.classList.remove('loading'); submitBtn.disabled = false; }
      }
    });
  }


  /* ----------------------------------------------------------
     REGISTRATION FILTERS
     Search input filters table rows client-side
     Status/course dropdowns filter via data attributes
  ---------------------------------------------------------- */
  function initRegistrationFilters() {
    const searchInput  = document.getElementById('admin-filter-search');
    const statusSelect = document.getElementById('admin-filter-status');
    const courseSelect = document.getElementById('admin-filter-course');
    const tableBody    = document.querySelector('[data-filterable-table]');

    if (!tableBody) return;

    function applyFilters() {
      const query  = (searchInput  ? searchInput.value.toLowerCase()  : '');
      const status = (statusSelect ? statusSelect.value.toLowerCase() : '');
      const course = (courseSelect ? courseSelect.value.toLowerCase() : '');

      const rows = tableBody.querySelectorAll('tr[data-row]');
      let visibleCount = 0;

      rows.forEach(function (row) {
        const rowText   = row.textContent.toLowerCase();
        const rowStatus = (row.dataset.status || '').toLowerCase();
        const rowCourse = (row.dataset.course || '').toLowerCase();

        const matchSearch = !query  || rowText.includes(query);
        const matchStatus = !status || rowStatus === status;
        const matchCourse = !course || rowCourse.includes(course);

        const visible = matchSearch && matchStatus && matchCourse;
        row.style.display = visible ? '' : 'none';
        if (visible) visibleCount++;
      });

      // Show empty state if all rows hidden
      const emptyState = tableBody.querySelector('[data-empty-row]');
      if (emptyState) {
        emptyState.style.display = visibleCount === 0 ? '' : 'none';
      }
    }

    if (searchInput)  searchInput.addEventListener('input', applyFilters);
    if (statusSelect) statusSelect.addEventListener('change', applyFilters);
    if (courseSelect) courseSelect.addEventListener('change', applyFilters);
  }


  /* ----------------------------------------------------------
     CHARACTER COUNTER
     Inputs/textareas with [data-max-length] show counter below
  ---------------------------------------------------------- */
  function initCharCounters() {
    document.querySelectorAll('[data-max-length]').forEach(function (el) {
      const max     = parseInt(el.dataset.maxLength, 10);
      const counter = document.createElement('div');
      counter.className = 'admin-char-counter';

      el.parentNode.insertBefore(counter, el.nextSibling);

      function update() {
        const len = el.value.length;
        counter.textContent = `${len} / ${max}`;
        counter.classList.toggle('over', len > max);
      }

      el.addEventListener('input', update);
      update();
    });
  }


  /* ----------------------------------------------------------
     FLATPICKR DATE PICKERS
     Initialize all [data-datepicker] inputs
  ---------------------------------------------------------- */
  function initDatePickers() {
    if (!window.flatpickr) return;

    document.querySelectorAll('[data-datepicker]').forEach(function (el) {
      if (el._flatpickr) return; // already initialised

      const options = {
        dateFormat:  el.dataset.dateFormat  || 'Y-m-d',
        minDate:     el.dataset.minDate     || null,
        maxDate:     el.dataset.maxDate     || null,
        enableTime:  el.dataset.enableTime  === 'true',
        time_24hr:   true,
        disableMobile: false,
        onChange: function (selectedDates, dateStr) {
          // Trigger auto-end-date calculation if this is a start-date input
          el.dispatchEvent(new CustomEvent('datepicker:change', {
            bubbles: true, detail: { date: selectedDates[0], dateStr }
          }));
        },
      };

      if (el.dataset.mode) options.mode = el.dataset.mode;
      flatpickr(el, options);
    });
  }


  /* ----------------------------------------------------------
     AUTO-CALCULATE END DATE FROM DURATION
     When start date changes on a date form, compute end date
     Requires: [data-start-date], [data-end-date], [data-duration-days]
  ---------------------------------------------------------- */
  function initAutoEndDate() {
    document.addEventListener('datepicker:change', function (e) {
      const startInput = e.target.closest('[data-start-date]');
      if (!startInput) return;

      const form = startInput.closest('form');
      if (!form) return;

      const endInput       = form.querySelector('[data-end-date]');
      const durationInput  = form.querySelector('[data-duration-days]');

      if (!endInput || !durationInput) return;

      const days = parseInt(durationInput.value, 10);
      if (isNaN(days) || days <= 0) return;

      const startDate = e.detail.date;
      if (!startDate) return;

      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + days - 1);

      if (endInput._flatpickr) {
        endInput._flatpickr.setDate(endDate);
      } else {
        endInput.value = formatDateISO(endDate);
      }
    });

    // Also recalculate when duration manually changes
    document.addEventListener('change', function (e) {
      const durationInput = e.target.closest('[data-duration-days]');
      if (!durationInput) return;

      const form = durationInput.closest('form');
      if (!form) return;

      const startInput = form.querySelector('[data-start-date]');
      const endInput   = form.querySelector('[data-end-date]');
      if (!startInput || !endInput) return;

      const days = parseInt(durationInput.value, 10);
      if (isNaN(days) || days <= 0) return;

      const startVal = startInput._flatpickr
        ? startInput._flatpickr.selectedDates[0]
        : new Date(startInput.value);

      if (!startVal || isNaN(startVal.getTime())) return;

      const endDate = new Date(startVal);
      endDate.setDate(endDate.getDate() + days - 1);

      if (endInput._flatpickr) {
        endInput._flatpickr.setDate(endDate);
      } else {
        endInput.value = formatDateISO(endDate);
      }
    });
  }


  /* ----------------------------------------------------------
     SORTABLE LISTS (Sortable.js)
     [data-sortable] lists save order via AJAX POST
     Each item needs [data-id]
  ---------------------------------------------------------- */
  function initSortable() {
    if (!window.Sortable) return;

    document.querySelectorAll('[data-sortable]').forEach(function (list) {
      if (list._sortable) return;

      list._sortable = Sortable.create(list, {
        animation: 150,
        ghostClass: 'sortable-ghost',
        handle: '.admin-drag-handle',
        onEnd: async function () {
          const saveUrl = list.dataset.sortable;
          if (!saveUrl) return;

          const items = list.querySelectorAll('[data-id]');
          const order = Array.from(items).map(function (item, idx) {
            return { id: item.dataset.id, position: idx };
          });

          try {
            await adminFetch(saveUrl, 'POST', { order });
            showAdminToast('Order saved.', 'success');
          } catch (err) {
            showAdminToast('Failed to save order: ' + err.message, 'error');
          }
        },
      });
    });
  }


  /* ----------------------------------------------------------
     MOBILE SIDEBAR TOGGLE
  ---------------------------------------------------------- */
  function initSidebarToggle() {
    const sidebar = document.querySelector('.admin-sidebar');
    const hamburger = document.querySelector('.admin-hamburger');
    if (!sidebar || !hamburger) return;

    // Create overlay if not present
    let overlay = document.querySelector('.admin-sidebar-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'admin-sidebar-overlay';
      document.body.appendChild(overlay);
    }

    function openSidebar() {
      sidebar.classList.add('sidebar-open');
      overlay.classList.add('visible');
      document.body.style.overflow = 'hidden';
    }

    function closeSidebar() {
      sidebar.classList.remove('sidebar-open');
      overlay.classList.remove('visible');
      document.body.style.overflow = '';
    }

    hamburger.addEventListener('click', function () {
      sidebar.classList.contains('sidebar-open') ? closeSidebar() : openSidebar();
    });

    overlay.addEventListener('click', closeSidebar);

    // Close on nav item click (mobile)
    sidebar.querySelectorAll('.admin-nav-item').forEach(function (item) {
      item.addEventListener('click', function () {
        if (window.innerWidth < 769) closeSidebar();
      });
    });
  }


  /* ----------------------------------------------------------
     TABS
     [data-tab-target] buttons switch tab content panels
  ---------------------------------------------------------- */
  function initTabs() {
    document.addEventListener('click', function (e) {
      const tab = e.target.closest('[data-tab-target]');
      if (!tab) return;

      const target  = tab.dataset.tabTarget;
      const tabBar  = tab.closest('.admin-tabs');
      const content = document.querySelector('.admin-tab-panels');

      if (tabBar) {
        tabBar.querySelectorAll('.admin-tab').forEach(function (t) {
          t.classList.toggle('active', t === tab);
        });
      }

      if (content) {
        content.querySelectorAll('.admin-tab-content').forEach(function (panel) {
          panel.classList.toggle('active', panel.id === target);
        });
      } else {
        // fallback: look globally
        document.querySelectorAll('.admin-tab-content').forEach(function (panel) {
          panel.classList.toggle('active', panel.id === target);
        });
      }
    });
  }


  /* ----------------------------------------------------------
     MODAL CLOSE
     Buttons with [data-modal-close] close parent modal overlay
  ---------------------------------------------------------- */
  function initModalClose() {
    document.addEventListener('click', function (e) {
      // Close via [data-modal-close] attribute
      if (e.target.closest('[data-modal-close]')) {
        const overlay = e.target.closest('.admin-modal-overlay');
        if (overlay) closeModal(overlay);
        return;
      }

      // Close on overlay backdrop click
      if (e.target.classList.contains('admin-modal-overlay')) {
        closeModal(e.target);
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        const overlay = document.querySelector('.admin-modal-overlay:not(#admin-confirm-modal-overlay)');
        if (overlay) closeModal(overlay);
      }
    });
  }

  function openModal(modalOrId) {
    const modal = typeof modalOrId === 'string'
      ? document.getElementById(modalOrId)
      : modalOrId;
    if (!modal) return;
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }

  function closeModal(modalOrId) {
    const modal = typeof modalOrId === 'string'
      ? document.getElementById(modalOrId)
      : modalOrId;
    if (!modal) return;
    modal.style.display = 'none';
    document.body.style.overflow = '';
  }


  /* ----------------------------------------------------------
     CSV EXPORT
     exportToCSV(data, filename)
     data: array of objects or 2D array
  ---------------------------------------------------------- */
  function exportToCSV(data, filename = 'export.csv') {
    if (!data || !data.length) {
      showAdminToast('No data to export.', 'warning');
      return;
    }

    let csvContent;

    if (Array.isArray(data[0])) {
      // 2D array
      csvContent = data.map(function (row) {
        return row.map(csvEscapeCell).join(',');
      }).join('\n');
    } else {
      // Array of objects
      const headers = Object.keys(data[0]);
      const rows    = data.map(function (obj) {
        return headers.map(function (h) { return csvEscapeCell(obj[h]); }).join(',');
      });
      csvContent = [headers.map(csvEscapeCell).join(','), ...rows].join('\n');
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href     = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // Wire [data-export-csv] buttons
  function initCSVExportButtons() {
    document.addEventListener('click', function (e) {
      const btn = e.target.closest('[data-export-csv]');
      if (!btn) return;

      const tableId = btn.dataset.exportCsv;
      const table   = tableId ? document.getElementById(tableId) : document.querySelector('table');
      if (!table) { showAdminToast('No table found to export.', 'warning'); return; }

      const filename = btn.dataset.exportFilename || 'export.csv';
      const rows     = Array.from(table.querySelectorAll('tr'));
      const data     = rows.map(function (tr) {
        return Array.from(tr.querySelectorAll('th, td')).map(function (cell) {
          return cell.textContent.trim();
        });
      }).filter(function (row) { return row.length > 0; });

      exportToCSV(data, filename);
      showAdminToast('CSV exported.', 'success');
    });
  }


  /* ----------------------------------------------------------
     PRIVATE UTILITIES
  ---------------------------------------------------------- */
  function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function csvEscapeCell(val) {
    const str = (val == null ? '' : String(val)).replace(/"/g, '""');
    return /[,"\n\r]/.test(str) ? `"${str}"` : str;
  }

  function formToObject(form) {
    const data = {};
    new FormData(form).forEach(function (val, key) {
      if (data[key] !== undefined) {
        data[key] = [].concat(data[key], val);
      } else {
        data[key] = val;
      }
    });
    return data;
  }

  function formatDateISO(date) {
    const y  = date.getFullYear();
    const m  = String(date.getMonth() + 1).padStart(2, '0');
    const d  = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }


  /* ----------------------------------------------------------
     INIT — wire everything up
  ---------------------------------------------------------- */
  function init() {
    initDeleteHandlers();
    initStatusUpdates();
    initToggleActive();
    initFormLoadingState();
    initInlineEditSave();
    initRegistrationFilters();
    initCharCounters();
    initAutoEndDate();
    initSidebarToggle();
    initTabs();
    initModalClose();
    initCSVExportButtons();

    // Mark active nav item based on current URL
    highlightActiveNav();
  }

  function highlightActiveNav() {
    const path = window.location.pathname;
    document.querySelectorAll('.admin-nav-item[href]').forEach(function (link) {
      const href = link.getAttribute('href');
      if (href && path.startsWith(href) && href !== '/') {
        link.classList.add('active');
      } else if (href === path) {
        link.classList.add('active');
      }
    });
  }

  /* DOMContentLoaded entry point */
  document.addEventListener('DOMContentLoaded', init);

  /* ----------------------------------------------------------
     PUBLIC API
  ---------------------------------------------------------- */
  return {
    showAdminToast,
    showConfirmModal,
    adminFetch,
    exportToCSV,
    openModal,
    closeModal,
    initDatePickers,
    initSortable,
  };

})();

/* Make key functions globally accessible for inline HTML usage */
window.showAdminToast   = Admin.showAdminToast;
window.showConfirmModal = Admin.showConfirmModal;
window.adminFetch       = Admin.adminFetch;
window.exportToCSV      = Admin.exportToCSV;
window.adminOpenModal   = Admin.openModal;
window.adminCloseModal  = Admin.closeModal;
