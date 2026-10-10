export type ThemeMode = 'dark' | 'light';

const STORAGE_KEY = 'theme-preference';

export function getInitialTheme(): ThemeMode {
	if (typeof document === 'undefined') return 'dark';
	const attr = document.documentElement.getAttribute('data-theme');
	return attr === 'light' ? 'light' : 'dark';
}

export function applyTheme(theme: ThemeMode): void {
	if (typeof document === 'undefined') return;
	document.documentElement.setAttribute('data-theme', theme);
	document.documentElement.style.colorScheme = theme;
	try {
		localStorage.setItem(STORAGE_KEY, theme);
	} catch {
		// Ignore storage restrictions
	}
}

export function toggleThemeMode(current: ThemeMode): ThemeMode {
	const next: ThemeMode = current === 'dark' ? 'light' : 'dark';
	applyTheme(next);
	return next;
}
