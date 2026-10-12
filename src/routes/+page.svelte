<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import type { Topology } from 'topojson-specification';
	import AnimatedLogo from '#lib/components/AnimatedLogo.svelte';
	import TacticalBackground from '#lib/components/TacticalBackground.svelte';
	import TacticalCursorHud from '#lib/components/TacticalCursorHud.svelte';
	import GlobeViz from '#lib/components/GlobeViz.svelte';
	import ScreenshotModal from '#lib/components/ScreenshotModal.svelte';
	import {
		CLIENTS,
		PROJECTS,
		EXPERTISE,
		SOCIAL_CHANNELS,
		PRELOAD_IMAGE_URLS,
		HOME_BASE,
		getInitialTheme,
		toggleThemeMode,
		type ThemeMode,
		type ClientId,
		type ProjectItem
	} from '#lib';
	import {
		Sun,
		Moon,
		ExternalLink,
		ArrowUpRight,
		Layers,
		Blocks,
		Globe,
		Brain,
		Mail,
		Briefcase,
		MessageSquare,
		Play,
		//Flame,
		Terminal,
		Clock,
		Sparkles,
		Funnel,
		Copy,
		Check,
		FileUser,
		Download
	} from '@lucide/svelte';

	// --- Loading & Preload State ---
	let loaderPhase = $state<'loading' | 'docking' | 'done'>('loading');
	let preloadProgress = $state(12);
	let loaderLogoWrapEl: HTMLDivElement | undefined = $state();
	let navLogoSlotEl: HTMLButtonElement | undefined = $state();
	let dockTransform = $state('');
	let worldTopology = $state<Topology | null>(null);

	// --- Theme State ---
	let theme = $state<ThemeMode>('dark');

	// --- Scroll & Logo Progress State ---
	let scrollProgress = $state(0);
	let activeSection = $state<'intro' | 'projects' | 'expertise' | 'connect'>('intro');
	let introHeadingEl: HTMLHeadingElement | undefined = $state();

	// --- Timezone Conversion State ---
	let myTimeText = $state('8:51 pm');
	let myIsDay = $state(false);
	let visitorTimeText = $state('8:51 pm');
	let visitorIsDay = $state(false);
	let visitorGmtLabel = $state('GMT+6');

	// --- Projects Filtering, Drag/Swipe Carousel, Slider Line & Modal State ---
	let selectedClient = $state<ClientId | null>(null);
	let activeModalProject = $state<ProjectItem | null>(null);
	let carouselTrackEl: HTMLDivElement | undefined = $state();
	let sliderTrackEl: HTMLDivElement | undefined = $state();
	let isCarouselPaused = $state(false);
	let isDraggingCarousel = $state(false);
	let isDraggingSlider = $state(false);
	let cardsPerPage = $state(3);
	let carouselScrollRatio = $state(0);
	let lastCarouselInteractionTime = 0;

	const filteredProjects = $derived(
		selectedClient ? PROJECTS.filter((p) => p.clientId === selectedClient) : PROJECTS
	);

	const hasCarouselOverflow = $derived(filteredProjects.length > cardsPerPage);
	const sliderThumbWidthPct = $derived(
		Math.max(14, Math.min(100, (cardsPerPage / Math.max(1, filteredProjects.length)) * 100))
	);
	const sliderThumbLeftPct = $derived(carouselScrollRatio * (100 - sliderThumbWidthPct));

	// --- Technical Expertise Mobile/Narrow Carousel State ---
	let expertiseTrackEl: HTMLDivElement | undefined = $state();
	let expertiseSliderTrackEl: HTMLDivElement | undefined = $state();
	let isDraggingExpertiseCarousel = $state(false);
	let isDraggingExpertiseSlider = $state(false);
	let expertiseScrollRatio = $state(0);

	const hasExpertiseOverflow = $derived(EXPERTISE.length > cardsPerPage);
	const expertiseThumbWidthPct = $derived(
		Math.max(20, Math.min(100, (cardsPerPage / Math.max(1, EXPERTISE.length)) * 100))
	);
	const expertiseThumbLeftPct = $derived(expertiseScrollRatio * (100 - expertiseThumbWidthPct));

	// --- Connect Section Discord Copy & Reveal State ---
	let isDiscordHovered = $state(false);
	let isDiscordClicked = $state(false);
	let isDiscordCopied = $state(false);
	let discordCopyTimeout: number | undefined;

	async function handleCopyDiscord(username: string) {
		isDiscordClicked = true;
		try {
			await navigator.clipboard.writeText(username);
		} catch {
			// Ignore clipboard write errors
		}
		isDiscordCopied = true;
		if (discordCopyTimeout !== undefined) {
			window.clearTimeout(discordCopyTimeout);
		}
		discordCopyTimeout = window.setTimeout(() => {
			isDiscordCopied = false;
		}, 2200);
	}

	const currentYear = new Date().getFullYear();

	function isDayTime(hour24: number): boolean {
		// Day between 6:00 AM and 5:59 PM, Night between 6:00 PM and 5:59 AM
		return hour24 >= 6 && hour24 < 18;
	}

	function formatTimeAndHour(date: Date, timeZone?: string): { formatted: string; hour24: number } {
		const parts = new Intl.DateTimeFormat('en-US', {
			hour: 'numeric',
			minute: '2-digit',
			hour12: true,
			...(timeZone ? { timeZone } : {})
		}).formatToParts(date);

		const hourStr = parts.find((p) => p.type === 'hour')?.value ?? '12';
		const minStr = parts.find((p) => p.type === 'minute')?.value ?? '00';
		const dayPeriod = (parts.find((p) => p.type === 'dayPeriod')?.value ?? 'AM').toLowerCase();

		const hour24Parts = new Intl.DateTimeFormat('en-GB', {
			hour: '2-digit',
			hour12: false,
			...(timeZone ? { timeZone } : {})
		}).formatToParts(date);
		const rawH = parseInt(hour24Parts.find((p) => p.type === 'hour')?.value ?? '12', 10);
		const hour24 = Number.isNaN(rawH) ? 12 : rawH % 24;

		return {
			formatted: `${hourStr}:${minStr} ${dayPeriod}`,
			hour24
		};
	}

	function formatVisitorGmtOffset(date: Date): string {
		// getTimezoneOffset() returns minutes behind UTC (e.g. -360 for GMT+6)
		const totalMinutes = -date.getTimezoneOffset();
		const sign = totalMinutes >= 0 ? '+' : '-';
		const absMinutes = Math.abs(totalMinutes);
		const hours = Math.floor(absMinutes / 60);
		const mins = absMinutes % 60;
		if (mins === 0) {
			return `GMT${sign}${hours}`;
		}
		return `GMT${sign}${hours}:${String(mins).padStart(2, '0')}`;
	}

	function updateClocks() {
		const now = new Date();
		const ash = formatTimeAndHour(now, HOME_BASE.timeZone);
		myTimeText = ash.formatted;
		myIsDay = isDayTime(ash.hour24);

		const visitor = formatTimeAndHour(now);
		visitorTimeText = visitor.formatted;
		visitorIsDay = isDayTime(visitor.hour24);
		visitorGmtLabel = formatVisitorGmtOffset(now);
	}

	function handleToggleTheme() {
		theme = toggleThemeMode(theme);
	}

	function scrollToTop() {
		window.scrollTo({ top: 0, behavior: 'smooth' });
		if (window.location.hash) {
			void goto(resolve('/'), { replace: true, shallow: true });
		}
		introHeadingEl?.focus({ preventScroll: true });
	}

	function syncCarouselScrollRatio() {
		if (!carouselTrackEl) return;
		const maxScroll = carouselTrackEl.scrollWidth - carouselTrackEl.clientWidth;
		carouselScrollRatio =
			maxScroll > 1 ? Math.min(1, Math.max(0, carouselTrackEl.scrollLeft / maxScroll)) : 0;
	}

	function syncExpertiseScrollRatio() {
		if (!expertiseTrackEl) return;
		const maxScroll = expertiseTrackEl.scrollWidth - expertiseTrackEl.clientWidth;
		expertiseScrollRatio =
			maxScroll > 1 ? Math.min(1, Math.max(0, expertiseTrackEl.scrollLeft / maxScroll)) : 0;
	}

	function getClosestCardSnapLeft(
		trackEl: HTMLElement,
		cardSelector: string,
		targetLeft: number
	): number {
		const maxScroll = Math.max(0, trackEl.scrollWidth - trackEl.clientWidth);
		if (maxScroll <= 2) return 0;
		const cards = Array.from(trackEl.querySelectorAll<HTMLElement>(cardSelector));
		if (cards.length === 0) return Math.min(maxScroll, Math.max(0, targetLeft));

		const baseOffset = cards[0].offsetLeft;
		const clampedTarget = Math.min(maxScroll, Math.max(0, targetLeft));
		let bestOffset = 0;
		let minDiff = Infinity;

		for (const card of cards) {
			const offset = Math.min(maxScroll, Math.max(0, card.offsetLeft - baseOffset));
			const diff = Math.abs(offset - clampedTarget);
			if (diff < minDiff) {
				minDiff = diff;
				bestOffset = offset;
			}
		}
		return bestOffset;
	}

	function handleSelectClient(clientId: ClientId | null) {
		selectedClient = clientId;
		carouselScrollRatio = 0;
		lastCarouselInteractionTime = performance.now();
		if (carouselTrackEl) {
			carouselTrackEl.scrollTo({ left: 0, behavior: 'smooth' });
		}
	}

	function getProjectCountForClient(clientId: ClientId): number {
		return PROJECTS.filter((p) => p.clientId === clientId).length;
	}

	// --- Pointer Drag / Swipe Gesture Handlers for Projects Carousel ---
	let dragStartX = 0;
	let dragLastX = 0;
	let dragLastTime = 0;
	let dragVelocityX = 0;
	let dragStartScrollLeft = 0;
	let hasDraggedCarousel = false;
	let suppressCardClick = false;
	let scrollSyncRaf = 0;

	function onCarouselPointerDown(e: PointerEvent) {
		if (e.button !== 0 || !carouselTrackEl) return;
		isDraggingCarousel = true;
		hasDraggedCarousel = false;
		lastCarouselInteractionTime = performance.now();
		dragStartX = e.clientX;
		dragLastX = e.clientX;
		dragLastTime = performance.now();
		dragVelocityX = 0;
		dragStartScrollLeft = carouselTrackEl.scrollLeft;
	}

	function onCarouselPointerMove(e: PointerEvent) {
		if (!isDraggingCarousel || !carouselTrackEl) return;
		const dx = e.clientX - dragStartX;

		if (!hasDraggedCarousel && Math.abs(dx) > 6) {
			hasDraggedCarousel = true;
			suppressCardClick = true;
			try {
				carouselTrackEl.setPointerCapture(e.pointerId);
			} catch {
				// Ignore capture errors
			}
		}

		if (hasDraggedCarousel) {
			const now = performance.now();
			const dt = Math.max(1, now - dragLastTime);
			dragVelocityX = (e.clientX - dragLastX) / dt;
			dragLastX = e.clientX;
			dragLastTime = now;
			lastCarouselInteractionTime = now;

			carouselTrackEl.scrollLeft = dragStartScrollLeft - dx;
			syncCarouselScrollRatio();
		}
	}

	function onCarouselPointerUp(e: PointerEvent) {
		if (!isDraggingCarousel) return;
		isDraggingCarousel = false;
		lastCarouselInteractionTime = performance.now();

		if (carouselTrackEl) {
			try {
				if (carouselTrackEl.hasPointerCapture(e.pointerId)) {
					carouselTrackEl.releasePointerCapture(e.pointerId);
				}
			} catch {
				// Ignore release errors
			}
		}

		if (hasDraggedCarousel && carouselTrackEl) {
			const projectedLeft = carouselTrackEl.scrollLeft - dragVelocityX * 220;
			const snappedLeft = getClosestCardSnapLeft(carouselTrackEl, '.project-card', projectedLeft);
			carouselTrackEl.scrollTo({
				left: snappedLeft,
				behavior: 'smooth'
			});

			window.setTimeout(() => {
				suppressCardClick = false;
			}, 60);
		} else {
			suppressCardClick = false;
		}

		hasDraggedCarousel = false;
	}

	function onCarouselClickCapture(e: MouseEvent) {
		if (suppressCardClick) {
			e.preventDefault();
			e.stopPropagation();
			suppressCardClick = false;
		}
	}

	function onCarouselScroll() {
		if (isDraggingCarousel || isDraggingSlider || scrollSyncRaf) return;
		scrollSyncRaf = requestAnimationFrame(() => {
			scrollSyncRaf = 0;
			if (!isDraggingCarousel && !isDraggingSlider) {
				syncCarouselScrollRatio();
			}
		});
	}

	// --- Draggable Slider Line Handlers (Projects) ---
	let sliderGrabOffsetPx = 0;

	function applySliderPointerPosition(clientX: number) {
		if (!sliderTrackEl || !carouselTrackEl) return;
		const rect = sliderTrackEl.getBoundingClientRect();
		const trackW = Math.max(1, rect.width);
		const thumbW = (sliderThumbWidthPct / 100) * trackW;
		const usableW = Math.max(1, trackW - thumbW);
		const pointerX = clientX - rect.left;
		const nextRatio = Math.min(1, Math.max(0, (pointerX - sliderGrabOffsetPx) / usableW));
		carouselScrollRatio = nextRatio;
		const maxScroll = Math.max(0, carouselTrackEl.scrollWidth - carouselTrackEl.clientWidth);
		carouselTrackEl.scrollLeft = nextRatio * maxScroll;
	}

	function onSliderPointerDown(e: PointerEvent) {
		if (e.button !== 0 || !sliderTrackEl || !carouselTrackEl) return;
		isDraggingSlider = true;
		lastCarouselInteractionTime = performance.now();

		const rect = sliderTrackEl.getBoundingClientRect();
		const trackW = Math.max(1, rect.width);
		const thumbW = (sliderThumbWidthPct / 100) * trackW;
		const usableW = Math.max(1, trackW - thumbW);
		const pointerX = e.clientX - rect.left;
		const currentThumbLeft = carouselScrollRatio * usableW;

		if (pointerX >= currentThumbLeft && pointerX <= currentThumbLeft + thumbW) {
			sliderGrabOffsetPx = pointerX - currentThumbLeft;
		} else {
			sliderGrabOffsetPx = thumbW / 2;
			applySliderPointerPosition(e.clientX);
		}

		try {
			sliderTrackEl.setPointerCapture(e.pointerId);
		} catch {
			// Ignore capture errors
		}
	}

	function onSliderPointerMove(e: PointerEvent) {
		if (!isDraggingSlider) return;
		lastCarouselInteractionTime = performance.now();
		applySliderPointerPosition(e.clientX);
	}

	function onSliderPointerUp(e: PointerEvent) {
		if (!isDraggingSlider) return;
		isDraggingSlider = false;
		lastCarouselInteractionTime = performance.now();
		if (sliderTrackEl) {
			try {
				if (sliderTrackEl.hasPointerCapture(e.pointerId)) {
					sliderTrackEl.releasePointerCapture(e.pointerId);
				}
			} catch {
				// Ignore release errors
			}
		}
	}

	function onSliderKeyDown(e: KeyboardEvent) {
		if (!carouselTrackEl) return;
		let nextRatio: number;
		if (e.key === 'ArrowRight') {
			nextRatio = Math.min(1, carouselScrollRatio + 0.12);
		} else if (e.key === 'ArrowLeft') {
			nextRatio = Math.max(0, carouselScrollRatio - 0.12);
		} else if (e.key === 'Home') {
			nextRatio = 0;
		} else if (e.key === 'End') {
			nextRatio = 1;
		} else {
			return;
		}
		e.preventDefault();
		lastCarouselInteractionTime = performance.now();
		carouselScrollRatio = nextRatio;
		const maxScroll = Math.max(0, carouselTrackEl.scrollWidth - carouselTrackEl.clientWidth);
		carouselTrackEl.scrollTo({ left: nextRatio * maxScroll, behavior: 'smooth' });
	}

	// --- Pointer Drag & Slider Handlers for Expertise Mobile Carousel ---
	let expDragStartX = 0;
	let expDragLastX = 0;
	let expDragLastTime = 0;
	let expDragVelocityX = 0;
	let expDragStartScrollLeft = 0;
	let hasDraggedExpertise = false;
	let expScrollSyncRaf = 0;
	let expSliderGrabOffsetPx = 0;

	function onExpertisePointerDown(e: PointerEvent) {
		if (e.button !== 0 || !expertiseTrackEl || !hasExpertiseOverflow) return;
		isDraggingExpertiseCarousel = true;
		hasDraggedExpertise = false;
		expDragStartX = e.clientX;
		expDragLastX = e.clientX;
		expDragLastTime = performance.now();
		expDragVelocityX = 0;
		expDragStartScrollLeft = expertiseTrackEl.scrollLeft;
	}

	function onExpertisePointerMove(e: PointerEvent) {
		if (!isDraggingExpertiseCarousel || !expertiseTrackEl) return;
		const dx = e.clientX - expDragStartX;

		if (!hasDraggedExpertise && Math.abs(dx) > 6) {
			hasDraggedExpertise = true;
			try {
				expertiseTrackEl.setPointerCapture(e.pointerId);
			} catch {
				// Ignore capture errors
			}
		}

		if (hasDraggedExpertise) {
			const now = performance.now();
			const dt = Math.max(1, now - expDragLastTime);
			expDragVelocityX = (e.clientX - expDragLastX) / dt;
			expDragLastX = e.clientX;
			expDragLastTime = now;

			expertiseTrackEl.scrollLeft = expDragStartScrollLeft - dx;
			syncExpertiseScrollRatio();
		}
	}

	function onExpertisePointerUp(e: PointerEvent) {
		if (!isDraggingExpertiseCarousel) return;
		isDraggingExpertiseCarousel = false;

		if (expertiseTrackEl) {
			try {
				if (expertiseTrackEl.hasPointerCapture(e.pointerId)) {
					expertiseTrackEl.releasePointerCapture(e.pointerId);
				}
			} catch {
				// Ignore release errors
			}
		}

		if (hasDraggedExpertise && expertiseTrackEl) {
			const projectedLeft = expertiseTrackEl.scrollLeft - expDragVelocityX * 200;
			const snappedLeft = getClosestCardSnapLeft(
				expertiseTrackEl,
				'.expertise-card',
				projectedLeft
			);
			expertiseTrackEl.scrollTo({
				left: snappedLeft,
				behavior: 'smooth'
			});
		}

		hasDraggedExpertise = false;
	}

	function onExpertiseScroll() {
		if (isDraggingExpertiseCarousel || isDraggingExpertiseSlider || expScrollSyncRaf) return;
		expScrollSyncRaf = requestAnimationFrame(() => {
			expScrollSyncRaf = 0;
			if (!isDraggingExpertiseCarousel && !isDraggingExpertiseSlider) {
				syncExpertiseScrollRatio();
			}
		});
	}

	function applyExpertiseSliderPosition(clientX: number) {
		if (!expertiseSliderTrackEl || !expertiseTrackEl) return;
		const rect = expertiseSliderTrackEl.getBoundingClientRect();
		const trackW = Math.max(1, rect.width);
		const thumbW = (expertiseThumbWidthPct / 100) * trackW;
		const usableW = Math.max(1, trackW - thumbW);
		const pointerX = clientX - rect.left;
		const nextRatio = Math.min(1, Math.max(0, (pointerX - expSliderGrabOffsetPx) / usableW));
		expertiseScrollRatio = nextRatio;
		const maxScroll = Math.max(0, expertiseTrackEl.scrollWidth - expertiseTrackEl.clientWidth);
		expertiseTrackEl.scrollLeft = nextRatio * maxScroll;
	}

	function onExpertiseSliderPointerDown(e: PointerEvent) {
		if (e.button !== 0 || !expertiseSliderTrackEl || !expertiseTrackEl) return;
		isDraggingExpertiseSlider = true;

		const rect = expertiseSliderTrackEl.getBoundingClientRect();
		const trackW = Math.max(1, rect.width);
		const thumbW = (expertiseThumbWidthPct / 100) * trackW;
		const usableW = Math.max(1, trackW - thumbW);
		const pointerX = e.clientX - rect.left;
		const currentThumbLeft = expertiseScrollRatio * usableW;

		if (pointerX >= currentThumbLeft && pointerX <= currentThumbLeft + thumbW) {
			expSliderGrabOffsetPx = pointerX - currentThumbLeft;
		} else {
			expSliderGrabOffsetPx = thumbW / 2;
			applyExpertiseSliderPosition(e.clientX);
		}

		try {
			expertiseSliderTrackEl.setPointerCapture(e.pointerId);
		} catch {
			// Ignore capture errors
		}
	}

	function onExpertiseSliderPointerMove(e: PointerEvent) {
		if (!isDraggingExpertiseSlider) return;
		applyExpertiseSliderPosition(e.clientX);
	}

	function onExpertiseSliderPointerUp(e: PointerEvent) {
		if (!isDraggingExpertiseSlider) return;
		isDraggingExpertiseSlider = false;
		if (expertiseSliderTrackEl) {
			try {
				if (expertiseSliderTrackEl.hasPointerCapture(e.pointerId)) {
					expertiseSliderTrackEl.releasePointerCapture(e.pointerId);
				}
			} catch {
				// Ignore release errors
			}
		}
	}

	function onExpertiseSliderKeyDown(e: KeyboardEvent) {
		if (!expertiseTrackEl) return;
		let nextRatio: number;
		if (e.key === 'ArrowRight') {
			nextRatio = Math.min(1, expertiseScrollRatio + 0.5);
		} else if (e.key === 'ArrowLeft') {
			nextRatio = Math.max(0, expertiseScrollRatio - 0.5);
		} else if (e.key === 'Home') {
			nextRatio = 0;
		} else if (e.key === 'End') {
			nextRatio = 1;
		} else {
			return;
		}
		e.preventDefault();
		expertiseScrollRatio = nextRatio;
		const maxScroll = Math.max(0, expertiseTrackEl.scrollWidth - expertiseTrackEl.clientWidth);
		expertiseTrackEl.scrollTo({ left: nextRatio * maxScroll, behavior: 'smooth' });
	}

	onMount(() => {
		// Sync initial theme from external theme module
		theme = getInitialTheme();
		lastCarouselInteractionTime = performance.now();

		// Initialize live timezone conversion clocks
		updateClocks();
		const clockTimer = window.setInterval(updateClocks, 15000);

		// --- Background Preloader during Centered Logo Animation ---
		const startTime = performance.now();
		const minDisplayMs = 1350; // Allow at least one fluid logo cycle before docking

		async function runPreloadSequence() {
			const totalTasks = PRELOAD_IMAGE_URLS.length + 1;
			let completed = 0;

			const bump = () => {
				completed += 1;
				preloadProgress = Math.min(100, Math.round((completed / totalTasks) * 100));
			};

			const geoPromise = fetch('/geo/countries-110m.json')
				.then((r) => (r.ok ? r.json() : null))
				.then((topo: Topology | null) => {
					if (topo) worldTopology = topo;
					bump();
				})
				.catch(() => bump());

			const imagePromises = PRELOAD_IMAGE_URLS.map(
				(src) =>
					new Promise<void>((resolve) => {
						const img = new Image();
						img.onload = () => {
							bump();
							resolve();
						};
						img.onerror = () => {
							bump();
							resolve();
						};
						img.src = src;
					})
			);

			await Promise.all([
				Promise.race([
					Promise.all([geoPromise, ...imagePromises]),
					new Promise<void>((r) => setTimeout(r, 2600))
				]),
				new Promise<void>((r) => {
					const elapsed = performance.now() - startTime;
					setTimeout(r, Math.max(0, minDisplayMs - elapsed));
				})
			]);

			preloadProgress = 100;

			// Compute exact FLIP transform from center loader logo to top-left navbar logo
			if (loaderLogoWrapEl && navLogoSlotEl) {
				const fromRect = loaderLogoWrapEl.getBoundingClientRect();
				const toRect = navLogoSlotEl.getBoundingClientRect();

				const fromCenterX = fromRect.left + fromRect.width / 2;
				const fromCenterY = fromRect.top + fromRect.height / 2;
				const toCenterX = toRect.left + toRect.width / 2;
				const toCenterY = toRect.top + toRect.height / 2;

				const dx = toCenterX - fromCenterX;
				const dy = toCenterY - fromCenterY;
				const scale = toRect.width / Math.max(1, fromRect.width);

				dockTransform = `translate3d(${dx.toFixed(1)}px, ${dy.toFixed(1)}px, 0) scale(${scale.toFixed(4)})`;
			}

			loaderPhase = 'docking';
			window.setTimeout(() => {
				loaderPhase = 'done';
			}, 640);
		}

		runPreloadSequence();

		// --- On-Demand Smooth Scroll Progress & Responsive Cards Per Page ---
		let targetScrollP = 0;
		let currentScrollP = 0;
		let scrollRafId = 0;

		function stepScrollProgress() {
			const diff = targetScrollP - currentScrollP;
			if (Math.abs(diff) > 0.0005) {
				currentScrollP += diff * 0.22;
				scrollProgress = currentScrollP;
				scrollRafId = requestAnimationFrame(stepScrollProgress);
			} else {
				currentScrollP = targetScrollP;
				scrollProgress = targetScrollP;
				scrollRafId = 0;
			}
		}

		function updateResponsiveCardsPerPage() {
			const w = window.innerWidth;
			const next = w <= 640 ? 1 : w <= 960 ? 2 : 3;
			if (next !== cardsPerPage) {
				cardsPerPage = next;
			}
		}

		function handleScrollOrResize() {
			updateResponsiveCardsPerPage();
			syncCarouselScrollRatio();
			syncExpertiseScrollRatio();
			const maxScroll = Math.max(
				1,
				document.documentElement.scrollHeight - document.documentElement.clientHeight - 2
			);
			targetScrollP = Math.min(1, Math.max(0, window.scrollY / maxScroll));
			if (!scrollRafId) {
				scrollRafId = requestAnimationFrame(stepScrollProgress);
			}
		}

		handleScrollOrResize();
		window.addEventListener('scroll', handleScrollOrResize, { passive: true });
		window.addEventListener('resize', handleScrollOrResize, { passive: true });

		// --- Delayed Auto-Scroll Timer for Projects Gallery (9.5s idle delay) ---
		const AUTO_SCROLL_IDLE_MS = 9500;
		let isCarouselVisible = false;

		const autoAdvanceTimer = window.setInterval(() => {
			const now = performance.now();
			if (
				!isCarouselVisible ||
				isCarouselPaused ||
				isDraggingCarousel ||
				isDraggingSlider ||
				activeModalProject ||
				!hasCarouselOverflow ||
				!carouselTrackEl ||
				now - lastCarouselInteractionTime < AUTO_SCROLL_IDLE_MS
			) {
				return;
			}

			const maxScroll = carouselTrackEl.scrollWidth - carouselTrackEl.clientWidth;
			if (maxScroll <= 4) return;

			const cards = Array.from(carouselTrackEl.querySelectorAll<HTMLElement>('.project-card'));
			if (cards.length === 0) return;
			const baseOffset = cards[0].offsetLeft;
			const currentLeft = carouselTrackEl.scrollLeft;

			let nextLeft = 0;
			if (currentLeft < maxScroll - 8) {
				let currentCardIdx = 0;
				let minDiff = Infinity;
				for (let i = 0; i < cards.length; i++) {
					const offset = cards[i].offsetLeft - baseOffset;
					const diff = Math.abs(offset - currentLeft);
					if (diff < minDiff) {
						minDiff = diff;
						currentCardIdx = i;
					}
				}
				const targetIdx = Math.min(
					Math.max(0, cards.length - cardsPerPage),
					currentCardIdx + cardsPerPage
				);
				nextLeft =
					targetIdx > currentCardIdx
						? Math.min(maxScroll, cards[targetIdx].offsetLeft - baseOffset)
						: maxScroll;
			}

			lastCarouselInteractionTime = now;
			carouselTrackEl.scrollTo({ left: nextLeft, behavior: 'smooth' });
		}, 1200);

		const carouselObserver = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					isCarouselVisible = entry.isIntersecting;
					if (entry.isIntersecting) {
						lastCarouselInteractionTime = performance.now();
					}
				}
			},
			{ threshold: 0.1 }
		);

		if (carouselTrackEl) {
			carouselObserver.observe(carouselTrackEl);
		}

		// Scrollspy fallback & aria-current synchronization
		const sections = Array.from(document.querySelectorAll<HTMLElement>('main section[id]'));
		const navObserver = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (entry.isIntersecting) {
						const id = entry.target.getAttribute('id') as
							'intro' | 'projects' | 'expertise' | 'connect' | null;
						if (id) {
							activeSection = id;
						}
					}
				}
			},
			{ rootMargin: '-35% 0px -50% 0px', threshold: 0 }
		);

		sections.forEach((sec) => navObserver.observe(sec));

		return () => {
			window.clearInterval(clockTimer);
			window.clearInterval(autoAdvanceTimer);
			if (discordCopyTimeout !== undefined) window.clearTimeout(discordCopyTimeout);
			window.removeEventListener('scroll', handleScrollOrResize);
			window.removeEventListener('resize', handleScrollOrResize);
			if (scrollRafId) cancelAnimationFrame(scrollRafId);
			if (scrollSyncRaf) cancelAnimationFrame(scrollSyncRaf);
			if (expScrollSyncRaf) cancelAnimationFrame(expScrollSyncRaf);
			carouselObserver.disconnect();
			navObserver.disconnect();
		};
	});
</script>

<!-- 1. Centered Fast-Paint Loading Screen with FLIP Animation to Top-Left Navbar -->
{#if loaderPhase !== 'done'}
	<div
		class="initial-loader-screen {loaderPhase === 'docking' ? 'is-docking' : ''}"
		aria-label="Loading portfolio"
		aria-busy={loaderPhase === 'loading'}
	>
		<div
			class="loader-logo-stage"
			bind:this={loaderLogoWrapEl}
			style={loaderPhase === 'docking' && dockTransform
				? `transform: ${dockTransform};`
				: undefined}
		>
			<AnimatedLogo mode="loader" isDocking={loaderPhase === 'docking'} size={136} />
		</div>

		<div class="loader-telemetry {loaderPhase === 'docking' ? 'is-fading' : ''}">
			<div class="loader-bar-track">
				<div class="loader-bar-fill" style="width: {preloadProgress}%;"></div>
			</div>
			<div class="loader-status-row">
				<span>SYS_INIT // LOADING</span>
				<span>{preloadProgress}%</span>
			</div>
		</div>
	</div>
{/if}

<!-- 2. Deep Tactical Wireframe & Optical Focus-Hunting Background (z-index: 0, Background-Only Parallax) -->
<TacticalBackground />

<!-- 3. Sci-Fi HUD Lock-On Layer (z-index: 9998) & Custom Inverse Cursor Dot (z-index: 9999) -->
<TacticalCursorHud />

<!-- 4. Fixed Top Glass Navbar (z-index: 50) -->
<header class="top-navbar-wrapper">
	<div class="top-navbar glass-surface">
		<!-- Top-Left Scroll-Driven Animated Logo Button -->
		<button
			type="button"
			class="navbar-logo-btn {loaderPhase !== 'done' ? 'is-awaiting-dock' : ''}"
			bind:this={navLogoSlotEl}
			onclick={scrollToTop}
			aria-label="Scroll to top of page"
			title="Scroll to top ({Math.round(scrollProgress * 100)}%)"
		>
			<AnimatedLogo mode="scroll" progress={scrollProgress} size={36} />
			<span class="logo-scroll-readout"
				>{String(Math.round(scrollProgress * 100)).padStart(3, '0')}%</span
			>
		</button>

		<!-- Anchor Links with Scrollspy Active State -->
		<nav class="navbar-links" aria-label="Primary sections">
			<a
				href="#intro"
				class="nav-link {activeSection === 'intro' ? 'is-active' : ''}"
				aria-current={activeSection === 'intro' ? 'true' : 'false'}
			>
				<span class="nav-idx">01</span>
				<span>Intro</span>
			</a>
			<a
				href="#projects"
				class="nav-link {activeSection === 'projects' ? 'is-active' : ''}"
				aria-current={activeSection === 'projects' ? 'true' : 'false'}
			>
				<span class="nav-idx">02</span>
				<span>Projects</span>
			</a>
			<a
				href="#expertise"
				class="nav-link {activeSection === 'expertise' ? 'is-active' : ''}"
				aria-current={activeSection === 'expertise' ? 'true' : 'false'}
			>
				<span class="nav-idx">03</span>
				<span>Expertise</span>
			</a>
			<a
				href="#connect"
				class="nav-link {activeSection === 'connect' ? 'is-active' : ''}"
				aria-current={activeSection === 'connect' ? 'true' : 'false'}
			>
				<span class="nav-idx">04</span>
				<span>Connect</span>
			</a>
		</nav>

		<!-- Top-Right Dark / Light Theme Toggle -->
		<button
			type="button"
			class="theme-toggle-btn"
			onclick={handleToggleTheme}
			aria-pressed={theme === 'dark'}
			aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
			title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
		>
			{#if theme === 'dark'}
				<Sun size={16} />
				<span class="theme-label">LIGHT</span>
			{:else}
				<Moon size={16} />
				<span class="theme-label">DARK</span>
			{/if}
		</button>
	</div>
</header>

<!-- 5. Foreground Glass Content Plane (z-index: 10) -->
<main class="page-foreground-plane {loaderPhase === 'loading' ? 'is-preload-hidden' : ''}">
	<!-- ==================== SECTION 01: #intro ==================== -->
	<section id="intro" class="portfolio-section intro-section">
		<div class="intro-card glass-surface tactical-frame">
			<div class="section-hud-strip">
				<span class="hud-code">SEC_01 // IDENTITY_NODE</span>
				<span class="hud-status">
					<span class="pulse-dot"></span>
					AVAILABLE FOR COLLABORATION
				</span>
			</div>

			<div class="intro-body">
				<h1 id="intro-heading" bind:this={introHeadingEl} tabindex="-1" class="hero-title">
					Hi, I'm <span class="accent-highlight">Ash</span>
				</h1>

				<p class="hero-subtitle">
					Minecraft Bedrock Add-on Developer &amp; Full Stack Engineer, crafting custom game
					mechanics and high-performance web systems for global studios.
				</p>

				<!-- Timezone Conversion Widget with Day/Night Icons -->
				<div class="timezone-pill" aria-live="polite">
					<span class="tz-icon">
						<Clock size={15} />
					</span>
					<p class="tz-text">
						My <strong class="tz-time">{myTimeText}</strong>
						<span class="gcal-emoji" aria-hidden="true">
							{#if myIsDay}
								<Sun size={14} />
							{:else}
								<Moon size={14} />
							{/if}
						</span>
						in <span class="tz-loc">{HOME_BASE.city}</span> is your
						<strong class="tz-time">{visitorTimeText}</strong>
						<span class="gcal-emoji" aria-hidden="true">
							{#if visitorIsDay}
								<Sun size={14} />
							{:else}
								<Moon size={14} />
							{/if}
						</span>
						<span class="tz-gmt">{visitorGmtLabel}</span>
					</p>
				</div>

				<!-- Quick Navigation CTAs & Key Metrics -->
				<div class="intro-footer-row">
					<div class="intro-actions">
						<a href="#projects" class="btn-primary">
							<span>Explore Projects</span>
							<ArrowUpRight size={16} />
						</a>
						<a href="#connect" class="btn-secondary">
							<span>Let's Talk</span>
						</a>
					</div>

					<div class="intro-metrics">
						<div class="metric-item">
							<span class="metric-val">{CLIENTS.length}</span>
							<span class="metric-lbl">Global Clients</span>
						</div>
						<div class="metric-divider"></div>
						<div class="metric-item">
							<span class="metric-val">{PROJECTS.length}</span>
							<span class="metric-lbl">Shipped Projects</span>
						</div>
						<div class="metric-divider"></div>
						<div class="metric-item">
							<span class="metric-val">2020 – Now</span>
							<span class="metric-lbl">Remote Track</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	</section>

	<!-- ==================== SECTION 02: #projects ==================== -->
	<section id="projects" class="portfolio-section">
		<div class="section-header">
			<div class="section-eyebrow">
				<span class="eyebrow-code">SEC_02 // GEO_EXPERIENCE &amp; ARCHIVE</span>
			</div>
			<div class="section-title-row">
				<h2 class="section-title">Clients &amp; Projects</h2>
			</div>
		</div>

		<!-- 3D Interactive Wireframe Globe (D3.js) -->
		<GlobeViz {selectedClient} onSelectClient={handleSelectClient} {worldTopology} />

		<!-- Client Filter Bar (Synchronized with 3D Globe Selection) -->
		<div
			class="client-filter-bar glass-surface"
			role="toolbar"
			aria-label="Filter projects by client"
		>
			<div class="filter-label">
				<Funnel size={14} />
				<span>FILTER</span>
			</div>

			<div class="filter-buttons">
				<button
					type="button"
					class="filter-chip {selectedClient === null ? 'is-active' : ''}"
					onclick={() => handleSelectClient(null)}
					aria-pressed={selectedClient === null}
				>
					<span>All Clients</span>
					<span class="chip-count">{PROJECTS.length}</span>
				</button>

				{#each CLIENTS as client (client.id)}
					{@const isSelected = selectedClient === client.id}
					<button
						type="button"
						class="filter-chip {isSelected ? 'is-active' : ''}"
						onclick={() => handleSelectClient(isSelected ? null : client.id)}
						aria-pressed={isSelected}
					>
						<span class="chip-logo">
							{#if client.logoType === 'svg-mask'}
								<span
									class="chip-masked-logo"
									style="-webkit-mask-image: url('{client.logo}'); mask-image: url('{client.logo}');"
								></span>
							{:else}
								<img src={client.logo} alt="" />
							{/if}
						</span>
						<span>{client.name}</span>
						<span class="chip-count">{getProjectCountForClient(client.id)}</span>
					</button>
				{/each}
			</div>
		</div>

		<!-- Interactive Drag/Swipe Carousel Gallery with Paginated Dots -->
		<div
			class="projects-gallery-shell"
			onmouseenter={() => (isCarouselPaused = true)}
			onmouseleave={() => (isCarouselPaused = false)}
			onfocusin={() => (isCarouselPaused = true)}
			onfocusout={() => (isCarouselPaused = false)}
			role="group"
			aria-label="Projects carousel gallery"
		>
			<div
				class="projects-carousel-viewport {isDraggingCarousel ? 'is-dragging' : ''}"
				bind:this={carouselTrackEl}
				onpointerdown={onCarouselPointerDown}
				onpointermove={onCarouselPointerMove}
				onpointerup={onCarouselPointerUp}
				onpointercancel={onCarouselPointerUp}
				onclickcapture={onCarouselClickCapture}
				ondragstart={(e) => e.preventDefault()}
				onscroll={onCarouselScroll}
				role="region"
				aria-label="Draggable project cards track"
			>
				{#each filteredProjects as project (project.id)}
					{@const clientObj = CLIENTS.find((c) => c.id === project.clientId)}
					{#if project.externalUrl}
						<!-- External URL Project Card -->
						<a
							href={project.externalUrl}
							target="_blank"
							rel="noreferrer noopener nofollow"
							draggable="false"
							class="project-card glass-surface tactical-frame"
							aria-label="{project.title} — Open external link in new tab"
						>
							<div class="card-thumb-wrap">
								<img
									src={project.thumbnail}
									alt={project.title}
									loading="lazy"
									draggable="false"
									class="card-thumb"
								/>
								<div class="card-thumb-overlay">
									<span class="external-hover-badge">
										<ExternalLink size={16} />
										<span>OPEN LINK</span>
									</span>
								</div>
								{#if project.statusBadge}
									<span class="card-status-badge">{project.statusBadge}</span>
								{/if}
							</div>

							<div class="card-body">
								<h3 class="card-title">{project.title}</h3>

								<div class="card-meta-stack">
									<div class="card-client-tag">
										{#if clientObj}
											<span class="mini-client-logo">
												{#if clientObj.logoType === 'svg-mask'}
													<span
														class="chip-masked-logo"
														style="-webkit-mask-image: url('{clientObj.logo}'); mask-image: url('{clientObj.logo}');"
													></span>
												{:else}
													<img src={clientObj.logo} alt="" draggable="false" />
												{/if}
											</span>
										{/if}
										<span>{project.clientName}</span>
									</div>
									<div class="card-date">{project.dateLabel}</div>
								</div>

								<p class="card-publisher">Publisher: {project.publisher}</p>

								{#if project.stack && project.stack.length > 0}
									<div class="card-tags">
										{#each project.stack as tag (tag)}
											<span class="stack-pill">{tag}</span>
										{/each}
									</div>
								{/if}
							</div>
						</a>
					{:else if project.screenshots && project.screenshots.length > 0}
						<!-- Multi-Screenshot Showcase Card (Project) -->
						<button
							type="button"
							class="project-card glass-surface tactical-frame"
							onclick={() => (activeModalProject = project)}
							aria-label="Open {project.title} screenshot gallery ({project.screenshots
								.length} screenshots)"
						>
							<div class="card-thumb-wrap">
								<img
									src={project.thumbnail}
									alt={project.title}
									loading="lazy"
									draggable="false"
									class="card-thumb"
								/>
								<div class="card-thumb-overlay">
									<span class="external-hover-badge">
										<Layers size={16} />
										<span>VIEW {project.screenshots.length} SCREENSHOTS</span>
									</span>
								</div>
								{#if project.statusBadge}
									<span class="card-status-badge is-accent">{project.statusBadge}</span>
								{/if}
							</div>

							<div class="card-body">
								<h3 class="card-title">{project.title}</h3>

								<div class="card-meta-stack">
									<div class="card-client-tag">
										{#if clientObj}
											<span class="mini-client-logo">
												<span
													class="chip-masked-logo"
													style="-webkit-mask-image: url('{clientObj.logo}'); mask-image: url('{clientObj.logo}');"
												></span>
											</span>
										{/if}
										<span>{project.clientName}</span>
									</div>
									<div class="card-date">{project.dateLabel}</div>
								</div>

								{#if project.description}
									<p class="card-desc">{project.description}</p>
								{/if}

								{#if project.stack && project.stack.length > 0}
									<div class="card-tags">
										{#each project.stack as tag (tag)}
											<span class="stack-pill">{tag}</span>
										{/each}
									</div>
								{/if}
							</div>
						</button>
					{:else}
						<!-- Internal Project Card (Project) -->
						<article class="project-card glass-surface tactical-frame">
							<div class="card-thumb-wrap">
								<img
									src={project.thumbnail}
									alt="{project.title} system preview"
									loading="lazy"
									draggable="false"
									class="card-thumb"
								/>
							</div>

							<div class="card-body">
								<h3 class="card-title">{project.title}</h3>

								<div class="card-meta-stack">
									<div class="card-client-tag">
										{#if clientObj}
											<span class="mini-client-logo">
												<span
													class="chip-masked-logo"
													style="-webkit-mask-image: url('{clientObj.logo}'); mask-image: url('{clientObj.logo}');"
												></span>
											</span>
										{/if}
										<span>{project.clientName}</span>
									</div>
									<div class="card-date">{project.dateLabel}</div>
								</div>

								{#if project.description}
									<p class="card-desc">{project.description}</p>
								{/if}

								{#if project.stack && project.stack.length > 0}
									<div class="card-tags">
										{#each project.stack as tag (tag)}
											<span class="stack-pill">{tag}</span>
										{/each}
									</div>
								{/if}
							</div>
						</article>
					{/if}
				{/each}
			</div>

			{#if hasCarouselOverflow}
				<div
					class="carousel-slider-track {isDraggingSlider ? 'is-dragging' : ''}"
					bind:this={sliderTrackEl}
					role="slider"
					tabindex="0"
					aria-label="Scroll projects gallery"
					aria-valuemin={0}
					aria-valuemax={100}
					aria-valuenow={Math.round(carouselScrollRatio * 100)}
					onpointerdown={onSliderPointerDown}
					onpointermove={onSliderPointerMove}
					onpointerup={onSliderPointerUp}
					onpointercancel={onSliderPointerUp}
					onkeydown={onSliderKeyDown}
				>
					<div class="slider-rail">
						<div
							class="slider-thumb"
							style="width: {sliderThumbWidthPct}%; left: {sliderThumbLeftPct}%;"
						></div>
					</div>
				</div>
			{/if}
		</div>
	</section>

	<!-- ==================== SECTION 03: #expertise ==================== -->
	<section id="expertise" class="portfolio-section">
		<div class="section-header">
			<div class="section-eyebrow">
				<span class="eyebrow-code">SEC_03 // CAPABILITY_MATRIX</span>
			</div>
			<div class="section-title-row">
				<h2 class="section-title">Technical Expertise</h2>
			</div>
		</div>

		<div class="expertise-gallery-shell">
			<div
				class="expertise-carousel-viewport {isDraggingExpertiseCarousel ? 'is-dragging' : ''}"
				bind:this={expertiseTrackEl}
				onpointerdown={onExpertisePointerDown}
				onpointermove={onExpertisePointerMove}
				onpointerup={onExpertisePointerUp}
				onpointercancel={onExpertisePointerUp}
				onscroll={onExpertiseScroll}
				role="region"
				aria-label="Technical expertise domains"
			>
				{#each EXPERTISE as domain (domain.id)}
					<article class="expertise-card glass-surface tactical-frame">
						<div class="expertise-card-top">
							<span class="domain-code">{domain.code}</span>
							<span class="domain-icon">
								{#if domain.id === 'minecraft-bedrock'}
									<Blocks size={18} />
								{:else if domain.id === 'web'}
									<Globe size={18} />
								{:else}
									<Brain size={18} />
								{/if}
							</span>
						</div>

						<h3 class="domain-title">{domain.title}</h3>

						<ul class="domain-skill-list">
							{#each domain.items as skill (skill.name)}
								<li class="skill-row">
									<div class="skill-row-header">
										<span class="skill-name">
											<Sparkles size={12} class="skill-bullet" />
											{skill.name}
										</span>
										<span class="skill-tag">{skill.tag}</span>
									</div>
								</li>
							{/each}
						</ul>
					</article>
				{/each}
			</div>

			{#if hasExpertiseOverflow}
				<div
					class="carousel-slider-track {isDraggingExpertiseSlider ? 'is-dragging' : ''}"
					bind:this={expertiseSliderTrackEl}
					role="slider"
					tabindex="0"
					aria-label="Scroll technical expertise cards"
					aria-valuemin={0}
					aria-valuemax={100}
					aria-valuenow={Math.round(expertiseScrollRatio * 100)}
					onpointerdown={onExpertiseSliderPointerDown}
					onpointermove={onExpertiseSliderPointerMove}
					onpointerup={onExpertiseSliderPointerUp}
					onpointercancel={onExpertiseSliderPointerUp}
					onkeydown={onExpertiseSliderKeyDown}
				>
					<div class="slider-rail">
						<div
							class="slider-thumb"
							style="width: {expertiseThumbWidthPct}%; left: {expertiseThumbLeftPct}%;"
						></div>
					</div>
				</div>
			{/if}
		</div>
	</section>

	<!-- ==================== SECTION 04: #connect ==================== -->
	<section id="connect" class="portfolio-section connect-section">
		<div class="connect-shell glass-surface tactical-frame">
			<div class="connect-header">
				<span class="eyebrow-code">SEC_04 // TRANSMISSION_CHANNELS</span>
				<h2 class="connect-title">Let's talk</h2>
				<p class="connect-subtitle">
					Open for Minecraft Bedrock systems development, Full Stack engineering, and technical
					consulting.
				</p>
			</div>

			<div class="connect-channels-grid">
				{#each SOCIAL_CHANNELS as ch (ch.id)}
					{#if ch.copyValue}
						{@const showDiscordUser = isDiscordHovered || isDiscordClicked || isDiscordCopied}
						<button
							type="button"
							class="channel-card tactical-frame {isDiscordCopied ? 'is-copied' : ''}"
							aria-label="Copy {ch.label} username {ch.copyValue} to clipboard"
							onmouseenter={() => (isDiscordHovered = true)}
							onmouseleave={() => {
								isDiscordHovered = false;
								isDiscordClicked = false;
							}}
							onfocus={() => (isDiscordHovered = true)}
							onblur={() => {
								isDiscordHovered = false;
								isDiscordClicked = false;
							}}
							onclick={() => handleCopyDiscord(ch.copyValue!)}
						>
							<div class="channel-top">
								<span class="channel-code">{isDiscordCopied ? 'COPIED // CLIPBOARD' : ch.code}</span
								>
								{#if isDiscordCopied}
									<Check size={15} class="channel-arrow" />
								{:else}
									<Copy size={15} class="channel-arrow" />
								{/if}
							</div>

							<div class="channel-main">
								<span class="channel-icon-box">
									<MessageSquare size={18} />
								</span>
								<div class="channel-text">
									<span class="channel-name">{ch.label}</span>
									<span class="channel-handle {showDiscordUser ? 'is-username-visible' : ''}">
										{#if isDiscordCopied}
											{ch.copyValue} (Copied!)
										{:else if showDiscordUser}
											{ch.copyValue}
										{:else}
											{ch.handle}
										{/if}
									</span>
								</div>
							</div>
						</button>
					{:else}
						<a
							href={ch.href || undefined}
							download={ch.download ? '' : undefined}
							target={ch.href.startsWith('http') ? '_blank' : undefined}
							rel="external noreferrer noopener nofollow"
							class="channel-card tactical-frame"
							aria-label={ch.label}
							onclick={(e) => {
								if (!ch.href) e.preventDefault();
							}}
						>
							<div class="channel-top">
								<span class="channel-code">{ch.code}</span>
								{#if ch.download}
									<Download size={15} class="channel-arrow" />
								{:else}
									<ArrowUpRight size={15} class="channel-arrow" />
								{/if}
							</div>

							<div class="channel-main">
								<span class="channel-icon-box">
									{#if ch.id === 'email'}
										<Mail size={18} />
									{:else if ch.id === 'linkedin'}
										<Briefcase size={18} />
									{:else if ch.id === 'github'}
										<Terminal size={18} />
									{:else if ch.id === 'x'}
										<Globe size={18} />
										<!--{:else if ch.id === 'curseforge'}
										<Flame size={18} />-->
									{:else if ch.id === 'resume'}
										<FileUser size={18} />
									{:else}
										<Play size={18} />
									{/if}
								</span>
								<div class="channel-text">
									<span class="channel-name">{ch.label}</span>
									<span class="channel-handle">{ch.handle}</span>
								</div>
							</div>
						</a>
					{/if}
				{/each}
			</div>
		</div>
	</section>

	<!-- ==================== FOOTER ==================== -->
	<footer class="site-footer">
		<div class="footer-inner glass-surface">
			<span class="footer-copy">
				{currentYear} Ashfaqur Rahman Chowdhury. All rights reserved.
			</span>
			<button type="button" class="footer-top-link" onclick={scrollToTop}>
				<span>RETURN TO TOP</span>
				<ArrowUpRight size={13} />
			</button>
		</div>
	</footer>
</main>

<!-- Multi-Screenshot Lightbox Modal -->
<ScreenshotModal project={activeModalProject} onClose={() => (activeModalProject = null)} />

<style>
	/* --- 1. Fast-Paint Centered Loader & FLIP Docking --- */
	.initial-loader-screen {
		position: fixed;
		inset: 0;
		z-index: 500;
		background-color: var(--bg-base);
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 2.25rem;
		transition: background-color 0.56s cubic-bezier(0.22, 1, 0.36, 1);
	}

	.initial-loader-screen.is-docking {
		background-color: transparent;
		pointer-events: none;
	}

	.loader-logo-stage {
		transform: translate3d(0px, 0px, 0) scale(1);
		transform-origin: center center;
		will-change: transform;
		transition: transform 0.62s cubic-bezier(0.22, 1, 0.36, 1);
	}

	.loader-telemetry {
		width: 210px;
		display: flex;
		flex-direction: column;
		gap: 0.45rem;
		transition: opacity 0.25s ease;
	}

	.loader-telemetry.is-fading {
		opacity: 0;
	}

	.loader-bar-track {
		width: 100%;
		height: 2px;
		background: var(--border-subtle);
		border-radius: 999px;
		overflow: hidden;
	}

	.loader-bar-fill {
		height: 100%;
		background: var(--accent);
		box-shadow: 0 0 10px var(--accent);
		transition: width 0.2s ease-out;
	}

	.loader-status-row {
		display: flex;
		justify-content: space-between;
		font-family: var(--font-mono);
		font-size: 0.62rem;
		letter-spacing: 0.08em;
		color: var(--fg-muted);
	}

	/* --- 2. Top Navbar (High Clarity & Crisp Text Rendering) --- */
	.top-navbar-wrapper {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		z-index: 50;
		padding: 0.85rem 1.25rem;
		pointer-events: none;
	}

	.top-navbar {
		max-width: 1180px;
		margin: 0 auto;
		padding: 0.5rem 0.85rem;
		border-radius: 14px;
		background: var(--bg-glass-strong);
		border-color: var(--border-strong);
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		pointer-events: auto;
	}

	.navbar-logo-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.55rem;
		padding: 0.28rem 0.55rem;
		border-radius: 9px;
		border: 1px solid transparent;
		background: transparent;
		color: var(--fg-primary);
		flex-shrink: 0;
		transition:
			border-color 0.2s ease,
			background-color 0.2s ease,
			opacity 0.15s ease;
	}

	.navbar-logo-btn.is-awaiting-dock {
		opacity: 0;
	}

	.navbar-logo-btn:hover {
		border-color: var(--border-strong);
		background: var(--bg-chip-hover);
	}

	.logo-scroll-readout {
		font-family: var(--font-mono);
		font-size: 0.72rem;
		font-weight: 600;
		letter-spacing: 0.06em;
		color: var(--fg-secondary);
		font-variant-numeric: tabular-nums;
	}

	/* Scrollspy Nav Container */
	.navbar-links {
		display: flex;
		align-items: center;
		gap: 0.3rem;
		min-width: 0;
	}

	.nav-link {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.44rem 0.82rem;
		border-radius: 8px;
		font-family: var(--font-mono);
		font-size: 0.8rem;
		font-weight: 600;
		letter-spacing: 0.03em;
		text-decoration: none;
		color: var(--fg-primary);
		opacity: 0.86;
		border: 1px solid transparent;
		white-space: nowrap;
		transition:
			opacity 0.2s ease,
			color 0.2s ease,
			background-color 0.2s ease,
			border-color 0.2s ease;
	}

	.nav-link:hover {
		opacity: 1;
		background: var(--bg-chip-hover);
	}

	.nav-link.is-active {
		opacity: 1;
		color: var(--fg-primary);
		background: var(--accent-soft);
		border-color: var(--accent-border);
		font-weight: 700;
	}

	.nav-idx {
		font-size: 0.68rem;
		font-weight: 600;
		color: var(--fg-secondary);
	}

	.nav-link.is-active .nav-idx {
		color: var(--accent-text);
	}

	.theme-toggle-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.42rem;
		padding: 0.44rem 0.8rem;
		border-radius: 8px;
		border: 1px solid var(--border-strong);
		background: var(--bg-chip);
		color: var(--fg-primary);
		font-family: var(--font-mono);
		font-size: 0.72rem;
		font-weight: 600;
		letter-spacing: 0.08em;
		flex-shrink: 0;
		transition:
			border-color 0.2s ease,
			background-color 0.2s ease;
	}

	.theme-toggle-btn:hover {
		border-color: var(--accent);
		background: var(--accent-soft);
	}

	@media (max-width: 640px) {
		.top-navbar-wrapper {
			padding: 0.55rem 0.65rem;
		}

		.top-navbar {
			padding: 0.36rem 0.48rem;
			gap: 0.25rem;
			border-radius: 12px;
		}

		.navbar-logo-btn {
			padding: 0.18rem 0.24rem;
		}

		.navbar-logo-btn :global(.animated-logo-root) {
			width: 28px !important;
			height: 28px !important;
		}

		.logo-scroll-readout {
			display: none;
		}

		.navbar-links {
			flex: 1;
			justify-content: center;
			gap: 0.12rem;
		}

		.nav-idx {
			display: none;
		}

		.nav-link {
			padding: 0.34rem 0.44rem;
			font-size: 0.68rem;
			letter-spacing: 0.01em;
			border-radius: 6px;
		}

		.theme-toggle-btn {
			padding: 0.38rem;
		}

		.theme-label {
			display: none;
		}
	}

	@media (max-width: 380px) {
		.nav-link {
			padding: 0.3rem 0.32rem;
			font-size: 0.62rem;
		}
	}

	/* --- 3. Foreground Glass Plane --- */
	.page-foreground-plane {
		position: relative;
		z-index: 10;
		max-width: 1180px;
		margin: 0 auto;
		padding: 6.25rem 1.25rem 3rem;
		display: flex;
		flex-direction: column;
		gap: 5.5rem;
		transition: opacity 0.4s ease;
	}

	.page-foreground-plane.is-preload-hidden {
		opacity: 0;
	}

	.portfolio-section {
		scroll-margin-top: 5.5rem;
	}

	/* --- Section 01: #intro --- */
	.intro-section {
		min-height: calc(82dvh - 5rem);
		display: flex;
		align-items: center;
	}

	.intro-card {
		width: 100%;
		border-radius: 18px;
		overflow: hidden;
	}

	.section-hud-strip {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		padding: 0.75rem 1.5rem;
		border-bottom: 1px solid var(--border-subtle);
		background: var(--bg-chip);
		font-family: var(--font-mono);
		font-size: 0.68rem;
		letter-spacing: 0.08em;
		color: var(--fg-muted);
	}

	.hud-status {
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
		color: var(--fg-secondary);
	}

	.pulse-dot {
		width: 7px;
		height: 7px;
		border-radius: 50%;
		background: var(--accent);
		box-shadow: 0 0 10px var(--accent);
	}

	.intro-body {
		padding: clamp(2rem, 5vw, 4rem) clamp(1.5rem, 4vw, 3.5rem);
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 1.5rem;
	}

	.hero-title {
		font-size: clamp(2.65rem, 6.5vw, 4.75rem);
		font-weight: 700;
		letter-spacing: -0.03em;
		line-height: 1.05;
		color: var(--fg-primary);
	}

	.hero-title:focus {
		outline: none;
	}

	.accent-highlight {
		display: inline-block;
		padding: 0 0.22em;
		border-radius: 8px;
		background: var(--accent);
		color: var(--accent-ink);
		box-shadow: 0 0 28px var(--accent-glow);
	}

	.hero-subtitle {
		font-size: clamp(1rem, 1.8vw, 1.2rem);
		line-height: 1.65;
		color: var(--fg-secondary);
		max-width: 62ch;
	}

	/* Timezone Conversion Pill */
	.timezone-pill {
		display: inline-flex;
		align-items: center;
		gap: 0.65rem;
		padding: 0.7rem 1.1rem;
		border-radius: 12px;
		background: var(--bg-surface);
		border: 1px solid var(--border-strong);
		font-family: var(--font-mono);
		font-size: clamp(0.76rem, 1.4vw, 0.88rem);
		color: var(--fg-secondary);
		box-shadow: inset 3px 0 0 0 var(--accent);
	}

	.tz-icon {
		color: var(--accent-text);
		display: inline-flex;
		align-items: center;
		flex-shrink: 0;
	}

	.tz-text {
		line-height: 1.45;
	}

	.tz-time {
		color: var(--fg-primary);
		font-weight: 700;
		font-variant-numeric: tabular-nums;
	}

	.gcal-emoji {
		display: inline-flex;
		align-items: center;
		margin: 0 0.12rem;
		color: var(--accent-text);
		vertical-align: -2px;
	}

	.tz-loc {
		color: var(--fg-primary);
		text-decoration: underline;
		text-decoration-color: var(--border-strong);
		text-underline-offset: 3px;
	}

	.tz-gmt {
		display: inline-block;
		margin-left: 0.25rem;
		padding: 0.1rem 0.42rem;
		border-radius: 5px;
		background: var(--accent-soft);
		border: 1px solid var(--accent-border);
		color: var(--fg-primary);
		font-size: 0.76em;
		font-weight: 600;
	}

	.intro-footer-row {
		width: 100%;
		padding-top: 1.25rem;
		margin-top: 0.5rem;
		border-top: 1px solid var(--border-hairline);
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 1.5rem;
	}

	.intro-actions {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.75rem;
	}

	.btn-primary {
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
		padding: 0.72rem 1.25rem;
		border-radius: 10px;
		background: var(--accent-soft);
		border: 1px solid var(--accent-border);
		color: var(--fg-primary);
		font-family: var(--font-display);
		font-size: 0.88rem;
		font-weight: 700;
		text-decoration: none;
		transition:
			transform 0.18s ease,
			border-color 0.2s ease,
			background-color 0.2s ease,
			box-shadow 0.2s ease;
	}

	.btn-primary:hover {
		transform: translateY(-2px);
		border-color: var(--accent);
		box-shadow: 0 8px 24px -6px var(--accent-glow);
	}

	.btn-secondary {
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
		padding: 0.72rem 1.25rem;
		border-radius: 10px;
		border: 1px solid var(--border-strong);
		background: var(--bg-chip);
		color: var(--fg-primary);
		font-family: var(--font-display);
		font-size: 0.88rem;
		font-weight: 600;
		text-decoration: none;
		transition:
			border-color 0.2s ease,
			background-color 0.2s ease;
	}

	.btn-secondary:hover {
		border-color: var(--accent);
		background: var(--accent-soft);
	}

	.intro-metrics {
		display: flex;
		align-items: center;
		gap: 1.15rem;
	}

	.metric-item {
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
	}

	.metric-val {
		font-family: var(--font-display);
		font-size: 1.15rem;
		font-weight: 700;
		color: var(--fg-primary);
	}

	.metric-lbl {
		font-family: var(--font-mono);
		font-size: 0.65rem;
		letter-spacing: 0.06em;
		color: var(--fg-muted);
		text-transform: uppercase;
	}

	.metric-divider {
		width: 1px;
		height: 28px;
		background: var(--border-subtle);
	}

	/* --- Section Headers --- */
	.section-header {
		margin-bottom: 1.75rem;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.eyebrow-code {
		font-family: var(--font-mono);
		font-size: 0.7rem;
		letter-spacing: 0.1em;
		color: var(--fg-muted);
	}

	.section-title-row {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		justify-content: space-between;
		gap: 1rem;
	}

	.section-title {
		font-size: clamp(1.75rem, 3.5vw, 2.5rem);
		font-weight: 700;
		letter-spacing: -0.02em;
	}

	/* --- Client Filter Bar --- */
	.client-filter-bar {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 0.85rem;
		padding: 0.85rem 1.15rem;
		border-radius: 12px;
		margin-bottom: 1.35rem;
	}

	.filter-label {
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
		font-family: var(--font-mono);
		font-size: 0.75rem;
		letter-spacing: 0.06em;
		color: var(--fg-secondary);
		font-weight: 600;
	}

	.filter-buttons {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem;
	}

	.filter-chip {
		display: inline-flex;
		align-items: center;
		gap: 0.48rem;
		padding: 0.44rem 0.82rem;
		border-radius: 8px;
		border: 1px solid var(--border-subtle);
		background: var(--bg-chip);
		color: var(--fg-secondary);
		font-family: var(--font-sans);
		font-size: 0.78rem;
		font-weight: 600;
		transition:
			border-color 0.2s ease,
			background-color 0.2s ease,
			color 0.2s ease,
			transform 0.15s ease;
	}

	.filter-chip:hover {
		color: var(--fg-primary);
		border-color: var(--border-strong);
		background: var(--bg-chip-hover);
	}

	.filter-chip.is-active {
		color: var(--fg-primary);
		background: var(--accent-soft);
		border-color: var(--accent-border);
	}

	.chip-logo {
		width: 16px;
		height: 16px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
	}

	.chip-logo img {
		width: 100%;
		height: 100%;
		object-fit: contain;
		border-radius: 2px;
	}

	.chip-masked-logo {
		display: inline-block;
		width: 100%;
		height: 100%;
		background-color: currentColor;
		-webkit-mask-size: contain;
		mask-size: contain;
		-webkit-mask-repeat: no-repeat;
		mask-repeat: no-repeat;
		-webkit-mask-position: center;
		mask-position: center;
	}

	.chip-count {
		font-family: var(--font-mono);
		font-size: 0.65rem;
		padding: 0.05rem 0.35rem;
		border-radius: 4px;
		background: oklch(0% 0 0 / 0.15);
	}

	.filter-chip.is-active .chip-count {
		color: var(--accent-text);
		background: var(--bg-surface);
	}

	/* --- Drag/Swipe Projects Carousel Gallery & Slider Line --- */
	.projects-gallery-shell {
		display: flex;
		flex-direction: column;
		gap: 1.15rem;
	}

	.projects-carousel-viewport {
		position: relative;
		display: flex;
		align-items: stretch;
		gap: 1.25rem;
		overflow-x: auto;
		padding: 0.3rem 0 0.4rem;
		user-select: none;
		touch-action: pan-y;
		scrollbar-width: none;
		-ms-overflow-style: none;
	}

	.projects-carousel-viewport::-webkit-scrollbar {
		display: none;
	}

	.project-card {
		flex: 0 0 calc((100% - 2.5rem) / 3);
		min-width: 0;
		display: flex;
		flex-direction: column;
		border-radius: 14px;
		overflow: hidden;
		text-decoration: none;
		color: var(--fg-primary);
		text-align: left;
		padding: 0;
		transition:
			transform 0.24s cubic-bezier(0.22, 1, 0.36, 1),
			border-color 0.24s ease,
			box-shadow 0.24s ease;
	}

	@media (max-width: 960px) {
		.project-card {
			flex: 0 0 calc((100% - 1.25rem) / 2);
		}
	}

	@media (max-width: 640px) {
		.project-card {
			flex: 0 0 100%;
		}
	}

	.projects-carousel-viewport:not(.is-dragging) .project-card:hover {
		transform: translateY(-4px);
		border-color: var(--accent-border);
	}

	.carousel-slider-track {
		position: relative;
		width: 100%;
		padding: 0.55rem 0;
		user-select: none;
		touch-action: none;
		outline: none;
	}

	.slider-rail {
		position: relative;
		width: 100%;
		height: 3px;
		border-radius: 999px;
		background: var(--border-subtle);
		overflow: visible;
		transition:
			height 0.18s ease,
			background-color 0.18s ease;
	}

	.carousel-slider-track:hover .slider-rail,
	.carousel-slider-track.is-dragging .slider-rail,
	.carousel-slider-track:focus-visible .slider-rail {
		height: 5px;
		background: var(--border-strong);
	}

	.slider-thumb {
		position: absolute;
		top: 50%;
		transform: translateY(-50%);
		height: 100%;
		border-radius: 999px;
		background: var(--accent);
		box-shadow: 0 0 10px var(--accent-glow);
		transition:
			background-color 0.18s ease,
			box-shadow 0.18s ease;
	}

	.carousel-slider-track:hover .slider-thumb,
	.carousel-slider-track.is-dragging .slider-thumb,
	.carousel-slider-track:focus-visible .slider-thumb {
		box-shadow: 0 0 16px var(--accent-glow);
	}

	.card-thumb-wrap {
		position: relative;
		width: 100%;
		aspect-ratio: 16 / 9;
		background: var(--bg-surface);
		overflow: hidden;
		border-bottom: 1px solid var(--border-hairline);
	}

	.card-thumb {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
		pointer-events: none;
		transition: transform 0.45s cubic-bezier(0.22, 1, 0.36, 1);
	}

	.projects-carousel-viewport:not(.is-dragging) .project-card:hover .card-thumb {
		transform: scale(1.045);
	}

	.card-thumb-overlay {
		position: absolute;
		inset: 0;
		background: oklch(10% 0.005 285.823 / 0.55);
		backdrop-filter: blur(3px);
		-webkit-backdrop-filter: blur(3px);
		display: flex;
		align-items: center;
		justify-content: center;
		opacity: 0;
		transition: opacity 0.22s ease;
	}

	.projects-carousel-viewport:not(.is-dragging) .project-card:hover .card-thumb-overlay,
	.project-card:focus-visible .card-thumb-overlay {
		opacity: 1;
	}

	.external-hover-badge {
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
		padding: 0.5rem 0.9rem;
		border-radius: 8px;
		background: var(--accent);
		color: var(--accent-ink);
		font-family: var(--font-mono);
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		transform: translateY(6px);
		transition: transform 0.22s cubic-bezier(0.22, 1, 0.36, 1);
		box-shadow: 0 8px 20px oklch(0% 0 0 / 0.45);
	}

	.projects-carousel-viewport:not(.is-dragging) .project-card:hover .external-hover-badge,
	.project-card:focus-visible .external-hover-badge {
		transform: translateY(0);
	}

	.card-status-badge {
		position: absolute;
		top: 10px;
		right: 10px;
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		padding: 0.22rem 0.55rem;
		border-radius: 6px;
		background: oklch(12% 0.005 285.823 / 0.85);
		backdrop-filter: blur(8px);
		border: 1px solid oklch(100% 0 0 / 0.18);
		color: oklch(92% 0 0);
		font-family: var(--font-mono);
		font-size: 0.6rem;
		font-weight: 600;
		letter-spacing: 0.06em;
	}

	.card-status-badge.is-accent {
		background: var(--accent);
		color: var(--accent-ink);
		border-color: transparent;
		font-weight: 700;
	}

	.card-body {
		padding: 1.05rem 1.15rem 1.2rem;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		flex: 1;
	}

	.card-title {
		font-size: 1.08rem;
		font-weight: 700;
		color: var(--fg-primary);
		line-height: 1.25;
	}

	.card-meta-stack {
		display: flex;
		flex-direction: column;
		gap: 0.24rem;
		font-family: var(--font-mono);
		font-size: 0.68rem;
		color: var(--fg-muted);
	}

	.card-client-tag {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.8rem;
		color: var(--fg-secondary);
		font-weight: 500;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.mini-client-logo {
		width: 15px;
		height: 15px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.mini-client-logo img {
		width: 100%;
		height: 100%;
		object-fit: contain;
	}

	.card-date {
		color: var(--fg-muted);
	}

	.card-publisher {
		font-size: 0.78rem;
		color: var(--fg-secondary);
	}

	.card-desc {
		font-size: 0.8rem;
		line-height: 1.5;
		color: var(--fg-secondary);
	}

	.card-tags {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
		margin-top: auto;
		padding-top: 0.55rem;
	}

	.stack-pill {
		font-family: var(--font-mono);
		font-size: 0.62rem;
		padding: 0.18rem 0.48rem;
		border-radius: 5px;
		background: var(--bg-chip);
		border: 1px solid var(--border-hairline);
		color: var(--fg-secondary);
	}

	/* --- Section 03: #expertise --- */
	.expertise-gallery-shell {
		display: flex;
		flex-direction: column;
		gap: 1.15rem;
	}

	.expertise-carousel-viewport {
		position: relative;
		display: flex;
		align-items: stretch;
		gap: 1.25rem;
		overflow-x: auto;
		padding: 0.2rem 0 0.3rem;
		user-select: none;
		touch-action: pan-y;
		scrollbar-width: none;
		-ms-overflow-style: none;
	}

	.expertise-carousel-viewport::-webkit-scrollbar {
		display: none;
	}

	.expertise-card {
		flex: 0 0 calc((100% - 2.5rem) / 3);
		min-width: 0;
		border-radius: 16px;
		padding: 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 0.85rem;
	}

	@media (max-width: 960px) {
		.expertise-card {
			flex: 0 0 calc((100% - 1.25rem) / 2);
		}
	}

	@media (max-width: 640px) {
		.expertise-card {
			flex: 0 0 100%;
			padding: 1.2rem;
		}
	}

	.expertise-card-top {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding-bottom: 0.75rem;
		border-bottom: 1px solid var(--border-hairline);
	}

	.domain-code {
		font-family: var(--font-mono);
		font-size: 0.66rem;
		letter-spacing: 0.08em;
		color: var(--fg-muted);
	}

	.domain-icon {
		width: 34px;
		height: 34px;
		border-radius: 8px;
		background: var(--accent-soft);
		border: 1px solid var(--accent-border);
		color: var(--fg-primary);
		display: inline-flex;
		align-items: center;
		justify-content: center;
	}

	.domain-title {
		font-size: 1.35rem;
		font-weight: 700;
		color: var(--fg-primary);
	}

	.domain-skill-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 0.65rem;
	}

	.skill-row {
		padding: 0.7rem 0.85rem;
		border-radius: 10px;
		background: var(--bg-chip);
		border: 1px solid var(--border-hairline);
		transition:
			border-color 0.2s ease,
			background-color 0.2s ease;
	}

	.skill-row:hover {
		border-color: var(--accent-border);
		background: var(--bg-chip-hover);
	}

	.skill-row-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
	}

	.skill-name {
		font-family: var(--font-display);
		font-size: 0.88rem;
		font-weight: 600;
		color: var(--fg-primary);
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
	}

	:global(.skill-bullet) {
		color: var(--accent-text);
		flex-shrink: 0;
	}

	.skill-tag {
		font-family: var(--font-mono);
		font-size: 0.58rem;
		letter-spacing: 0.06em;
		padding: 0.1rem 0.38rem;
		border-radius: 4px;
		background: var(--bg-surface);
		border: 1px solid var(--border-subtle);
		color: var(--fg-muted);
	}

	/* --- Section 04: #connect --- */
	.connect-shell {
		border-radius: 18px;
		padding: clamp(1.75rem, 4vw, 3rem);
		display: flex;
		flex-direction: column;
		gap: 2rem;
	}

	.connect-header {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.connect-title {
		font-size: clamp(2rem, 4.5vw, 3.25rem);
		font-weight: 700;
		letter-spacing: -0.025em;
	}

	.connect-subtitle {
		font-size: 0.96rem;
		color: var(--fg-secondary);
		line-height: 1.55;
	}

	.connect-channels-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
		gap: 1rem;
	}

	.channel-card {
		display: flex;
		flex-direction: column;
		gap: 0.9rem;
		width: 100%;
		padding: 1.1rem 1.2rem;
		border-radius: 12px;
		background: var(--bg-surface);
		border: 1px solid var(--border-subtle);
		text-decoration: none;
		text-align: left;
		font: inherit;
		color: var(--fg-primary);
		transition:
			border-color 0.2s ease,
			background-color 0.2s ease,
			transform 0.2s cubic-bezier(0.22, 1, 0.36, 1);
	}

	.channel-card:hover,
	.channel-card.is-copied {
		border-color: var(--accent);
		background: var(--accent-soft);
		transform: translateY(-3px);
	}

	.channel-top {
		display: flex;
		align-items: center;
		justify-content: space-between;
		font-family: var(--font-mono);
		font-size: 0.62rem;
		letter-spacing: 0.08em;
		color: var(--fg-muted);
	}

	.channel-card.is-copied .channel-code {
		color: var(--accent-text);
		font-weight: 600;
	}

	.channel-main {
		display: flex;
		align-items: center;
		gap: 0.85rem;
	}

	.channel-icon-box {
		width: 40px;
		height: 40px;
		border-radius: 10px;
		background: var(--bg-chip);
		border: 1px solid var(--border-subtle);
		display: inline-flex;
		align-items: center;
		justify-content: center;
		color: var(--fg-primary);
		flex-shrink: 0;
		transition:
			background-color 0.2s ease,
			color 0.2s ease,
			border-color 0.2s ease;
	}

	.channel-card:hover .channel-icon-box,
	.channel-card.is-copied .channel-icon-box {
		background: var(--accent);
		color: var(--accent-ink);
		border-color: var(--accent);
	}

	.channel-text {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
	}

	.channel-name {
		font-family: var(--font-display);
		font-size: 1rem;
		font-weight: 700;
	}

	.channel-handle {
		font-family: var(--font-mono);
		font-size: 0.68rem;
		color: var(--fg-secondary);
		transition: color 0.18s ease;
	}

	.channel-handle.is-username-visible {
		color: var(--accent-text);
		font-weight: 600;
	}

	/* --- Footer --- */
	.site-footer {
		padding-top: 1rem;
	}

	.footer-inner {
		padding: 1.1rem 1.5rem;
		border-radius: 12px;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		font-family: var(--font-mono);
		font-size: 0.74rem;
		color: var(--fg-secondary);
	}

	.footer-top-link {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.35rem 0.7rem;
		border-radius: 6px;
		border: 1px solid var(--border-subtle);
		background: var(--bg-chip);
		color: var(--fg-primary);
		font-family: var(--font-mono);
		font-size: 0.66rem;
		letter-spacing: 0.08em;
		transition:
			border-color 0.2s ease,
			background-color 0.2s ease;
	}

	.footer-top-link:hover {
		border-color: var(--accent);
		background: var(--accent-soft);
	}

	/* --- Mobile Layout Refinements across Sections --- */
	@media (max-width: 640px) {
		.page-foreground-plane {
			padding: 4.85rem 0.85rem 2.25rem;
			gap: 3.5rem;
		}

		.intro-section {
			min-height: auto;
		}

		.section-hud-strip {
			padding: 0.6rem 0.95rem;
			font-size: 0.6rem;
		}

		.intro-body {
			padding: 1.35rem 1.1rem;
			gap: 1.15rem;
		}

		.timezone-pill {
			padding: 0.55rem 0.8rem;
			font-size: 0.74rem;
		}

		.intro-metrics {
			width: 100%;
			justify-content: space-between;
			gap: 0.5rem;
		}

		.metric-val {
			font-size: 1rem;
		}

		.metric-lbl {
			font-size: 0.58rem;
		}

		.client-filter-bar {
			padding: 0.65rem 0.85rem;
			gap: 0.6rem;
		}

		.filter-chip {
			padding: 0.38rem 0.68rem;
			font-size: 0.73rem;
		}

		.connect-shell {
			padding: 1.25rem 1rem;
			gap: 1.1rem;
		}

		.connect-title {
			font-size: 1.65rem;
		}

		.connect-subtitle {
			font-size: 0.84rem;
		}

		.connect-channels-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
			gap: 0.55rem;
		}

		.channel-card {
			padding: 0.6rem 0.7rem;
			border-radius: 10px;
			gap: 0;
		}

		.channel-card::before,
		.channel-card::after {
			display: none;
		}

		.channel-top {
			display: none;
		}

		.channel-main {
			gap: 0.55rem;
		}

		.channel-icon-box {
			width: 30px;
			height: 30px;
			border-radius: 7px;
		}

		.channel-name {
			font-size: 0.84rem;
		}

		.channel-handle {
			display: none;
		}

		.channel-handle.is-username-visible {
			display: block;
			font-size: 0.62rem;
		}

		.footer-inner {
			padding: 0.85rem 1rem;
			font-size: 0.68rem;
		}
	}
</style>
