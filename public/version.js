(function () {
  fetch('/api/version')
    .then(function (r) {
      return r.json();
    })
    .then(function (d) {
      if (!d || !d.version) return;
      var label = 'v' + d.version;
      document.querySelectorAll('.product-version').forEach(function (el) {
        el.textContent = label;
      });
    })
    .catch(function () {});
})();
