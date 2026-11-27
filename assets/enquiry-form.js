/* Villa enquiry form — AJAX submit to contact.php with a confirmation panel.
   Without JS the form still posts normally and contact.php redirects back
   here with ?status=…&message=…, which this script also understands. */
document.addEventListener('DOMContentLoaded', function () {
  var form = document.getElementById('enquiry-form');
  var statusBox = document.getElementById('form-status');
  var submitBtn = document.getElementById('enquiry-submit');
  var confirmBox = document.getElementById('enquiry-confirm');
  var againBtn = document.getElementById('enquiry-again');
  if (!form || !statusBox || !submitBtn) return;

  var defaultLabel = submitBtn.textContent.trim();
  var checkIn = form.elements.checkIn;
  var checkOut = form.elements.checkOut;
  var nightsHint = document.getElementById('nights-hint');
  var PHONE = '+94 77 7 327 993';

  /* ---- dates: no past check-in, check-out at least one night later ---- */
  function ymd(d) {
    var m = d.getMonth() + 1, day = d.getDate();
    return d.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (day < 10 ? '0' : '') + day;
  }
  function addDays(value, n) {
    var p = value.split('-');
    var d = new Date(+p[0], +p[1] - 1, +p[2]);
    d.setDate(d.getDate() + n);
    return ymd(d);
  }
  function nightsBetween(a, b) {
    var pa = a.split('-'), pb = b.split('-');
    return Math.round((Date.UTC(+pb[0], +pb[1] - 1, +pb[2]) - Date.UTC(+pa[0], +pa[1] - 1, +pa[2])) / 86400000);
  }
  var today = ymd(new Date());
  checkIn.min = today;
  checkOut.min = addDays(today, 1);

  function syncDates() {
    if (checkIn.value) checkOut.min = addDays(checkIn.value, 1);
    checkOut.setCustomValidity('');
    if (checkIn.value && checkOut.value && checkOut.value <= checkIn.value) {
      checkOut.setCustomValidity('Choose a check-out date after your check-in date.');
    }
    if (!nightsHint) return;
    if (checkIn.value && checkOut.value && checkOut.value > checkIn.value) {
      var n = nightsBetween(checkIn.value, checkOut.value);
      nightsHint.textContent = n + (n === 1 ? ' night' : ' nights') + ' · up to 15 guests.';
    } else {
      nightsHint.textContent = 'Up to 15 guests.';
    }
  }
  checkIn.addEventListener('change', syncDates);
  checkOut.addEventListener('change', syncDates);

  function showStatus(success, message) {
    statusBox.hidden = false;
    statusBox.className = 'form-feedback form-feedback--' + (success ? 'success' : 'error');
    statusBox.textContent = message;
    statusBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  function hideStatus() {
    statusBox.hidden = true;
    statusBox.textContent = '';
  }
  function showConfirmation() {
    if (!confirmBox) { showStatus(true, 'Thank you! Your enquiry has been sent.'); return; }
    form.hidden = true;
    confirmBox.hidden = false;
    confirmBox.focus({ preventScroll: true });
    confirmBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  if (againBtn) {
    againBtn.addEventListener('click', function () {
      confirmBox.hidden = true;
      form.hidden = false;
      hideStatus();
      syncDates();
      form.elements.fullName.focus();
    });
  }

  /* ---- non-JS fallback round trip: ./?status=…&message=… ---- */
  try {
    var qs = new URLSearchParams(window.location.search);
    if (qs.get('status') === 'success') showConfirmation();
    else if (qs.get('status') === 'error' && qs.get('message')) showStatus(false, qs.get('message'));
  } catch (e) { /* URLSearchParams unsupported — nothing to show */ }

  /* mark invalid fields for assistive tech as people correct them */
  form.addEventListener('input', function (e) {
    if (e.target.hasAttribute('aria-invalid') && e.target.checkValidity()) e.target.removeAttribute('aria-invalid');
  });

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    hideStatus();
    syncDates();

    if (!form.checkValidity()) {
      Array.prototype.forEach.call(form.elements, function (el) {
        if (el.willValidate && !el.checkValidity()) el.setAttribute('aria-invalid', 'true');
      });
      form.reportValidity();
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending…';

    fetch(form.getAttribute('action') || 'contact.php', {
      method: 'POST',
      body: new FormData(form),
      headers: { 'X-Requested-With': 'XMLHttpRequest', Accept: 'application/json' }
    })
      .then(function (response) {
        return response.text().then(function (text) {
          try { return JSON.parse(text); }
          catch (err) { return { success: false, message: 'Unexpected server response. Please try again, or call us on ' + PHONE + '.' }; }
        });
      })
      .then(function (data) {
        if (data && data.success) {
          form.reset();
          syncDates();
          showConfirmation();
        } else {
          showStatus(false, (data && data.message) || 'Something went wrong. Please try again.');
        }
      })
      .catch(function () {
        showStatus(false, 'Could not send your enquiry. Please check your connection and try again, or WhatsApp us on ' + PHONE + '.');
      })
      .finally(function () {
        submitBtn.disabled = false;
        submitBtn.textContent = defaultLabel;
      });
  });
});
