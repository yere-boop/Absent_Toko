/* ═══════════════════════════════════════════════════════════
   TOKO MASARANG — Client-side JavaScript
   ═══════════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', function () {

  // ─── Lucide Icons Init ───────────────────────────────────
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }

  // ─── Current Date Display ────────────────────────────────
  const dateEl = document.getElementById('currentDate');
  if (dateEl) {
    const now = new Date();
    dateEl.textContent = now.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }

  // ─── Sidebar Toggle (Mobile) ─────────────────────────────
  const hamburger = document.getElementById('hamburgerBtn');
  const sidebar = document.getElementById('sidebar');
  const sidebarClose = document.getElementById('sidebarClose');
  const sidebarOverlay = document.getElementById('sidebarOverlay');

  function openSidebar() {
    sidebar && sidebar.classList.add('open');
    sidebarOverlay && sidebarOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeSidebar() {
    sidebar && sidebar.classList.remove('open');
    sidebarOverlay && sidebarOverlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  hamburger && hamburger.addEventListener('click', openSidebar);
  sidebarClose && sidebarClose.addEventListener('click', closeSidebar);
  sidebarOverlay && sidebarOverlay.addEventListener('click', closeSidebar);

  // Close sidebar on escape key
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeSidebar();
  });

  // ─── Auto-dismiss Flash Messages ─────────────────────────
  const flashMessages = document.querySelectorAll('#flash-success, #flash-error');
  flashMessages.forEach(function (el) {
    setTimeout(function () {
      el.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
      el.style.opacity = '0';
      el.style.transform = 'translateY(-8px)';
      setTimeout(function () { el.remove(); }, 400);
    }, 4000);
  });

  // ─── Delete Confirmation Modal ────────────────────────────
  const deleteModal = document.getElementById('deleteModal');
  const deleteForm = document.getElementById('deleteForm');
  const deleteMessage = document.getElementById('deleteMessage');

  window.confirmDelete = function (url, message) {
    if (deleteModal && deleteForm) {
      deleteForm.action = url + '?_method=DELETE';
      if (deleteMessage && message) {
        deleteMessage.innerHTML = message;
      }
      deleteModal.classList.add('active');
    }
  };

  window.closeDeleteModal = function () {
    deleteModal && deleteModal.classList.remove('active');
  };

  // Close modal when clicking overlay
  deleteModal && deleteModal.addEventListener('click', function (e) {
    if (e.target === deleteModal) {
      closeDeleteModal();
    }
  });

  // Close modal on Escape
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && deleteModal && deleteModal.classList.contains('active')) {
      closeDeleteModal();
    }
  });

  // ─── Progress Bar Color Init ──────────────────────────────
  document.querySelectorAll('.progress-bar-fill').forEach(function (bar) {
    const color = bar.getAttribute('data-color');
    if (color === 'warning') bar.style.background = 'var(--warning)';
    else if (color === 'danger') bar.style.background = 'var(--danger)';
    // else default success color from CSS
  });

  // ─── Form Validation ──────────────────────────────────────
  const forms = document.querySelectorAll('form[novalidate]');
  forms.forEach(function (form) {
    form.addEventListener('submit', function (e) {
      let valid = true;
      const required = form.querySelectorAll('[required]');
      
      // Clear previous errors
      form.querySelectorAll('.field-error').forEach(el => el.remove());
      form.querySelectorAll('.form-control.error').forEach(el => el.classList.remove('error'));

      required.forEach(function (field) {
        if (!field.value.trim()) {
          valid = false;
          field.classList.add('error');
          const hint = document.createElement('span');
          hint.className = 'field-error';
          hint.textContent = 'Field ini wajib diisi';
          field.parentNode.appendChild(hint);
        }
      });

      if (!valid) {
        e.preventDefault();
        const firstError = form.querySelector('.form-control.error');
        if (firstError) {
          firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
          firstError.focus();
        }
      }
    });
  });

  // ─── Filter form: Submit on select change ─────────────────
  const filterSelects = document.querySelectorAll('.filter-form select');
  filterSelects.forEach(function (sel) {
    sel.addEventListener('change', function () {
      // Don't auto-submit, let user click filter button
    });
  });

  // ─── Table row highlight on hover ────────────────────────
  // Already handled by CSS :hover

  // ─── Smooth page transitions ──────────────────────────────
  document.querySelectorAll('a[href]:not([target="_blank"])').forEach(function (link) {
    // Skip anchor links, mailto, tel
    if (link.href.startsWith('#') || link.href.startsWith('mailto:') || link.href.startsWith('tel:')) return;
    // Handled by browser natively
  });

  console.log('✅ Toko Masarang initialized successfully');
});

// ─── CSS error state ──────────────────────────────────────
const style = document.createElement('style');
style.textContent = `
  .form-control.error {
    border-color: var(--danger) !important;
    box-shadow: 0 0 0 3px rgba(239,68,68,0.1) !important;
  }
  .field-error {
    display: block;
    color: var(--danger);
    font-size: 0.75rem;
    margin-top: 0.25rem;
    font-weight: 500;
  }
`;
document.head.appendChild(style);
