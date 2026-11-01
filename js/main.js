/* The CSS only collapses the menu once this class is set, so the links stay
   visible if JavaScript doesn't run. */
document.documentElement.classList.add('js');

document.addEventListener('DOMContentLoaded', function () {
  var menuToggle = document.getElementById('menu-toggle');
  var navLinks = document.getElementById('nav-links');

  function setMenu(open) {
    navLinks.classList.toggle('open', open);
    menuToggle.setAttribute('aria-expanded', String(open));
    menuToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  }

  menuToggle.addEventListener('click', function () {
    setMenu(!navLinks.classList.contains('open'));
  });

  navLinks.addEventListener('click', function (event) {
    if (event.target.tagName === 'A') setMenu(false);
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && navLinks.classList.contains('open')) {
      setMenu(false);
      menuToggle.focus();
    }
  });
});

document.addEventListener('DOMContentLoaded', function () {
  var form = document.getElementById('contact-form');
  var statusBox = document.getElementById('form-status');
  var submitBtn = document.getElementById('contact-submit');
  var checkin = document.getElementById('checkin');
  var checkout = document.getElementById('checkout');

  if (!form || !statusBox || !submitBtn) return;

  var defaultLabel = submitBtn.textContent.trim();

  function showStatus(success, message) {
    statusBox.hidden = false;
    statusBox.className = success ? '' : 'error';
    statusBox.textContent = message;
    statusBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  /* Without JavaScript the form posts normally and contact.php redirects
     back here with the result in the query string. */
  var params = new URLSearchParams(window.location.search);
  if (params.get('status') && params.get('message')) {
    showStatus(params.get('status') === 'success', params.get('message'));
  }

  /* Check-out can't be on or before check-in */
  checkin.addEventListener('change', function () {
    if (!checkin.value) return;
    var next = new Date(checkin.value + 'T00:00:00Z');
    next.setUTCDate(next.getUTCDate() + 1);
    checkout.min = next.toISOString().slice(0, 10);
  });

  form.addEventListener('submit', function (event) {
    event.preventDefault();

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    statusBox.hidden = true;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending...';

    fetch('contact.php', {
      method: 'POST',
      body: new FormData(form),
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
        Accept: 'application/json',
      },
    })
      .then(function (response) {
        return response.text().then(function (text) {
          try {
            return JSON.parse(text);
          } catch (error) {
            return { success: false, message: 'Unexpected server response. Please try again.' };
          }
        });
      })
      .then(function (data) {
        showStatus(Boolean(data.success), data.message || 'Something went wrong. Please try again.');

        if (data.success) {
          form.reset();
        }
      })
      .catch(function () {
        showStatus(false, 'Could not send your enquiry. Please check your connection and try again.');
      })
      .finally(function () {
        submitBtn.disabled = false;
        submitBtn.textContent = defaultLabel;
      });
  });
});
