(function () {
	try {
		var stored = localStorage.getItem('theme-preference');
		var prefersLight =
			window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
		var theme =
			stored === 'light' || stored === 'dark' ? stored : prefersLight ? 'light' : 'dark';
		document.documentElement.setAttribute('data-theme', theme);
		document.documentElement.style.colorScheme = theme;
	} catch {
		document.documentElement.setAttribute('data-theme', 'dark');
	}
})();
