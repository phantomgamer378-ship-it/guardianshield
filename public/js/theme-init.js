(function () {
    var saved = localStorage.getItem('gs-theme');
    document.documentElement.setAttribute('data-theme', saved === 'light' ? 'light' : 'dark');
})();
