(function () {
  try {
    var seen = {};
    var MAX_LEN = 150;

    function truncate(msg) {
      var s = String(msg == null ? '' : msg);
      return s.length > MAX_LEN ? s.slice(0, MAX_LEN) : s;
    }

    function report(errorMessage, errorSource) {
      try {
        var msg = truncate(errorMessage);
        if (!msg || seen[msg]) return;
        seen[msg] = true;
        if (typeof gtag !== 'function') return;
        gtag('event', 'js_error', {
          error_message: msg,
          error_source: String(errorSource == null ? '' : errorSource),
          page: location.pathname
        });
      } catch (e) {}
    }

    window.addEventListener('error', function (event) {
      try {
        var source = event.filename || '';
        if (event.lineno) source += (source ? ':' : '') + event.lineno;
        var message = event.message;
        if (!message && event.error && event.error.message) message = event.error.message;
        report(message, source);
      } catch (e) {}
    });

    window.addEventListener('unhandledrejection', function (event) {
      try {
        var reason = event.reason;
        var msg = reason && reason.message ? reason.message : String(reason);
        report(msg, 'unhandledrejection');
      } catch (e) {}
    });
  } catch (e) {}
})();
