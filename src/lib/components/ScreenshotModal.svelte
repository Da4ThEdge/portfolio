<script lang="ts">
	import { SvelteMap } from 'svelte/reactivity';
	import type { ProjectItem } from '#lib';
	import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCcw } from '@lucide/svelte';

	interface Props {
		project: ProjectItem | null;
		onClose: () => void;
	}

	let { project, onClose }: Props = $props();

	const MIN_SCALE = 1;
	const MAX_SCALE = 6;

	let currentIndex = $state(0);
	let scale = $state(1);
	let panX = $state(0);
	let panY = $state(0);
	let isGestureActive = $state(false);
	let isDraggingImage = $state(false);

	let stageEl: HTMLDivElement | undefined = $state();
	let imgEl: HTMLImageElement | undefined = $state();

	let stageW = $state(1280);
	let stageH = $state(800);
	let naturalW = $state(1920);
	let naturalH = $state(1080);

	const activePointers = new SvelteMap<number, { x: number; y: number }>();
	const screenshots = $derived(project?.screenshots ?? []);
	const zoomPercent = $derived(Math.round(scale * 100));

	// Compute the exact 1x fitted dimensions inside the stage so zooming scales
	// the actual layout width/height instead of stretching a low-res 1x mobile GPU texture.
	const baseDims = $derived.by(() => {
		const isMobile = stageW <= 640;
		const maxW = isMobile ? stageW * 0.94 : Math.min(stageW * 0.88, 1440);
		const maxH = isMobile ? stageH * 0.74 : stageH * 0.78;
		if (naturalW <= 0 || naturalH <= 0 || maxW <= 0 || maxH <= 0) {
			return { w: Math.max(1, maxW), h: Math.max(1, maxH) };
		}
		const ratio = Math.min(maxW / naturalW, maxH / naturalH);
		return {
			w: Math.max(1, naturalW * ratio),
			h: Math.max(1, naturalH * ratio)
		};
	});

	function syncNaturalDimensions() {
		if (imgEl && imgEl.complete && imgEl.naturalWidth > 0 && imgEl.naturalHeight > 0) {
			naturalW = imgEl.naturalWidth;
			naturalH = imgEl.naturalHeight;
		}
	}

	function resetZoom(animate = false) {
		isGestureActive = !animate;
		isDraggingImage = false;
		clearPendingLightDismiss();
		activePointers.clear();
		scale = 1;
		panX = 0;
		panY = 0;
	}

	$effect(() => {
		if (project) {
			currentIndex = 0;
			resetZoom(false);
		}
		return () => {
			clearPendingLightDismiss();
		};
	});

	// Track stage viewport dimensions for responsive 1x base sizing
	$effect(() => {
		const el = stageEl;
		if (!el || !project) return;

		const updateStageSize = () => {
			const rect = el.getBoundingClientRect();
			if (rect.width > 0 && rect.height > 0) {
				stageW = rect.width;
				stageH = rect.height;
			}
		};

		updateStageSize();
		const ro = new ResizeObserver(updateStageSize);
		ro.observe(el);
		return () => ro.disconnect();
	});

	// Sync natural dimensions when switching slides if image is already cached
	$effect(() => {
		if (screenshots[currentIndex]) {
			syncNaturalDimensions();
		}
	});

	// Lock background page scroll while the viewer is open
	$effect(() => {
		if (!project) return;
		const prevOverflow = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		return () => {
			document.body.style.overflow = prevOverflow;
		};
	});

	// Attach non-passive wheel listener so mouse scroll zooms without scrolling the page
	$effect(() => {
		const el = stageEl;
		if (!el || !project) return;

		function onWheel(e: WheelEvent) {
			e.preventDefault();
			const delta = -e.deltaY * (e.ctrlKey ? 0.01 : 0.0022);
			const factor = Math.exp(delta);
			zoomAtClientPoint(scale * factor, e.clientX, e.clientY, false);
		}

		el.addEventListener('wheel', onWheel, { passive: false });
		return () => {
			el.removeEventListener('wheel', onWheel);
		};
	});

	function clampPan(nextPanX: number, nextPanY: number, forScale: number) {
		if (forScale <= 1.001) {
			return { x: 0, y: 0 };
		}
		const maxPanX = ((forScale - 1) * baseDims.w) / 2;
		const maxPanY = ((forScale - 1) * baseDims.h) / 2;
		return {
			x: Math.min(maxPanX, Math.max(-maxPanX, nextPanX)),
			y: Math.min(maxPanY, Math.max(-maxPanY, nextPanY))
		};
	}

	function zoomAtClientPoint(
		targetScale: number,
		clientX: number,
		clientY: number,
		animate = false,
		fromClientX = clientX,
		fromClientY = clientY
	) {
		const nextScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, targetScale));
		isGestureActive = !animate;

		if (nextScale <= 1.001 || !stageEl) {
			scale = 1;
			panX = 0;
			panY = 0;
			return;
		}

		const rect = stageEl.getBoundingClientRect();
		const centerX = rect.left + rect.width / 2;
		const centerY = rect.top + rect.height / 2;

		const c1x = fromClientX - centerX;
		const c1y = fromClientY - centerY;
		const c2x = clientX - centerX;
		const c2y = clientY - centerY;

		const ratio = nextScale / scale;
		const rawPanX = c2x - ratio * (c1x - panX);
		const rawPanY = c2y - ratio * (c1y - panY);

		const clamped = clampPan(rawPanX, rawPanY, nextScale);
		scale = nextScale;
		panX = clamped.x;
		panY = clamped.y;
	}

	function zoomStep(delta: number) {
		if (!stageEl) return;
		const rect = stageEl.getBoundingClientRect();
		zoomAtClientPoint(scale + delta, rect.left + rect.width / 2, rect.top + rect.height / 2, true);
	}

	function selectSlide(idx: number) {
		if (!screenshots.length || idx === currentIndex) return;
		currentIndex = (idx + screenshots.length) % screenshots.length;
		resetZoom(false);
	}

	function prevSlide() {
		if (!screenshots.length) return;
		selectSlide(currentIndex - 1);
	}

	function nextSlide() {
		if (!screenshots.length) return;
		selectSlide(currentIndex + 1);
	}

	function handleKeydown(e: KeyboardEvent) {
		if (!project) return;
		if (e.key === 'Escape') {
			onClose();
		} else if (e.key === 'ArrowLeft') {
			prevSlide();
		} else if (e.key === 'ArrowRight') {
			nextSlide();
		} else if (e.key === '+' || e.key === '=') {
			e.preventDefault();
			zoomStep(0.5);
		} else if (e.key === '-' || e.key === '_') {
			e.preventDefault();
			zoomStep(-0.5);
		} else if (e.key === '0') {
			e.preventDefault();
			resetZoom(true);
		}
	}

	// --- Pointer & Multi-Touch Pinch/Pan Gesture State ---
	let dragOriginX = 0;
	let dragOriginY = 0;
	let dragStartPanX = 0;
	let dragStartPanY = 0;
	let pointerDownTarget: EventTarget | null = null;
	let hasPointerMoved = false;
	let wasMultiTouch = false;

	let prevPinchDist = 0;
	let prevPinchMidX = 0;
	let prevPinchMidY = 0;

	let lastTapTime = 0;
	let lastTapX = 0;
	let lastTapY = 0;
	let pendingLightDismiss = false;
	let lightDismissFallbackTimer: number | undefined;

	function clearPendingLightDismiss() {
		pendingLightDismiss = false;
		if (lightDismissFallbackTimer !== undefined) {
			window.clearTimeout(lightDismissFallbackTimer);
			lightDismissFallbackTimer = undefined;
		}
	}

	function getTwoPointers() {
		const pts = Array.from(activePointers.values());
		const p1 = pts[0];
		const p2 = pts[1];
		const dist = Math.max(1, Math.hypot(p2.x - p1.x, p2.y - p1.y));
		const midX = (p1.x + p2.x) / 2;
		const midY = (p1.y + p2.y) / 2;
		return { dist, midX, midY };
	}

	function onStagePointerDown(e: PointerEvent) {
		if (e.button !== 0 && e.pointerType === 'mouse') return;
		clearPendingLightDismiss();
		// Ignore clicks on floating buttons/thumbnails inside stage
		const targetEl = e.target as HTMLElement | null;
		if (targetEl?.closest('button')) return;

		activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
		try {
			stageEl?.setPointerCapture(e.pointerId);
		} catch {
			// Ignore capture errors
		}

		if (activePointers.size === 1) {
			pointerDownTarget = e.target;
			hasPointerMoved = false;
			wasMultiTouch = false;
			dragOriginX = e.clientX;
			dragOriginY = e.clientY;
			dragStartPanX = panX;
			dragStartPanY = panY;
			isDraggingImage = scale > 1;
		} else if (activePointers.size === 2) {
			wasMultiTouch = true;
			hasPointerMoved = true;
			isDraggingImage = false;
			const { dist, midX, midY } = getTwoPointers();
			prevPinchDist = dist;
			prevPinchMidX = midX;
			prevPinchMidY = midY;
		}
	}

	function onStagePointerMove(e: PointerEvent) {
		if (!activePointers.has(e.pointerId)) return;
		activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

		if (activePointers.size === 2) {
			const { dist, midX, midY } = getTwoPointers();
			if (prevPinchDist > 0) {
				const factor = dist / prevPinchDist;
				zoomAtClientPoint(scale * factor, midX, midY, false, prevPinchMidX, prevPinchMidY);
			}
			prevPinchDist = dist;
			prevPinchMidX = midX;
			prevPinchMidY = midY;
			return;
		}

		if (activePointers.size === 1) {
			const dx = e.clientX - dragOriginX;
			const dy = e.clientY - dragOriginY;

			if (!hasPointerMoved && Math.hypot(dx, dy) > 5) {
				hasPointerMoved = true;
			}

			if (hasPointerMoved && scale > 1) {
				isGestureActive = true;
				isDraggingImage = true;
				const clamped = clampPan(dragStartPanX + dx, dragStartPanY + dy, scale);
				panX = clamped.x;
				panY = clamped.y;
			}
		}
	}

	function onStagePointerUp(e: PointerEvent) {
		if (!activePointers.has(e.pointerId)) return;
		activePointers.delete(e.pointerId);

		try {
			if (stageEl?.hasPointerCapture(e.pointerId)) {
				stageEl.releasePointerCapture(e.pointerId);
			}
		} catch {
			// Ignore release errors
		}

		// If one finger remains after pinching, seamlessly transition to single-finger pan
		if (activePointers.size === 1) {
			const remaining = Array.from(activePointers.values())[0];
			dragOriginX = remaining.x;
			dragOriginY = remaining.y;
			dragStartPanX = panX;
			dragStartPanY = panY;
			prevPinchDist = 0;
			return;
		}

		if (activePointers.size === 0) {
			isDraggingImage = false;
			prevPinchDist = 0;

			if (!hasPointerMoved && !wasMultiTouch) {
				const clickedOnImage =
					pointerDownTarget instanceof HTMLElement &&
					Boolean(pointerDownTarget.closest('.stage-image'));

				if (!clickedOnImage) {
					// Defer unmounting until the synthesized click event fires on the stage
					// so mobile browsers don't dispatch the tap onto project cards underneath.
					pendingLightDismiss = true;
					lightDismissFallbackTimer = window.setTimeout(() => {
						if (pendingLightDismiss) {
							pendingLightDismiss = false;
							lightDismissFallbackTimer = undefined;
							onClose();
						}
					}, 120);
					return;
				}

				// Double-click / double-tap on screenshot toggles zoom in/out
				const now = performance.now();
				if (
					now - lastTapTime < 280 &&
					Math.hypot(e.clientX - lastTapX, e.clientY - lastTapY) < 30
				) {
					lastTapTime = 0;
					if (scale > 1.05) {
						resetZoom(true);
					} else {
						const targetZoom = stageW <= 640 ? 3 : 2.25;
						zoomAtClientPoint(targetZoom, e.clientX, e.clientY, true);
					}
				} else {
					lastTapTime = now;
					lastTapX = e.clientX;
					lastTapY = e.clientY;
				}
			} else if (hasPointerMoved && !wasMultiTouch && scale <= 1.02 && screenshots.length > 1) {
				// Horizontal swipe at 1x zoom browses left/right
				const dx = e.clientX - dragOriginX;
				const dy = e.clientY - dragOriginY;
				if (Math.abs(dx) > 54 && Math.abs(dx) > Math.abs(dy) * 1.4) {
					if (dx < 0) {
						nextSlide();
					} else {
						prevSlide();
					}
				}
			}
		}
	}

	function onStageClick(e: MouseEvent) {
		const targetEl = e.target as HTMLElement | null;
		if (targetEl?.closest('button')) return;

		if (pendingLightDismiss) {
			e.preventDefault();
			e.stopPropagation();
			clearPendingLightDismiss();
			onClose();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if project && screenshots.length > 0}
	<div
		class="lightbox-overlay"
		role="dialog"
		aria-modal="true"
		aria-label="{project.title} screenshot inspector"
		tabindex="-1"
	>
		<!-- Floating Top Bar: Minimal Title/Counter on Left, Zoom & Close Controls on Right -->
		<div class="lightbox-topbar">
			<div class="lightbox-meta glass-surface">
				<span class="lightbox-counter">
					{String(currentIndex + 1).padStart(2, '0')} / {String(screenshots.length).padStart(
						2,
						'0'
					)}
				</span>
				<span class="meta-divider" aria-hidden="true"></span>
				<h3 class="lightbox-title">{project.title}</h3>
			</div>

			<div class="lightbox-controls glass-surface">
				<button
					type="button"
					class="ctrl-btn"
					onclick={() => zoomStep(-0.5)}
					disabled={scale <= MIN_SCALE}
					aria-label="Zoom out"
					title="Zoom out (-)"
				>
					<ZoomOut size={16} />
				</button>

				<button
					type="button"
					class="zoom-readout-btn"
					onclick={() => resetZoom(true)}
					disabled={scale <= MIN_SCALE}
					aria-label="Reset zoom ({zoomPercent}%)"
					title="Reset zoom (0)"
				>
					{#if scale > 1.02}
						<RotateCcw size={11} />
					{/if}
					<span>{zoomPercent}%</span>
				</button>

				<button
					type="button"
					class="ctrl-btn"
					onclick={() => zoomStep(0.5)}
					disabled={scale >= MAX_SCALE}
					aria-label="Zoom in"
					title="Zoom in (+)"
				>
					<ZoomIn size={16} />
				</button>

				<span class="ctrl-divider" aria-hidden="true"></span>

				<button
					type="button"
					class="ctrl-btn close-btn"
					onclick={(e) => {
						e.stopPropagation();
						onClose();
					}}
					aria-label="Close screenshot viewer"
					title="Close (Esc)"
				>
					<X size={18} />
				</button>
			</div>
		</div>

		<!-- Full-Viewport Interactive Stage (Scroll / Pinch to Zoom, Drag to Pan) -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<div
			class="lightbox-stage {scale > 1 ? 'is-zoomed' : ''} {isDraggingImage ? 'is-dragging' : ''}"
			bind:this={stageEl}
			onpointerdown={onStagePointerDown}
			onpointermove={onStagePointerMove}
			onpointerup={onStagePointerUp}
			onpointercancel={onStagePointerUp}
			onclick={onStageClick}
		>
			{#if screenshots.length > 1}
				<button
					type="button"
					class="nav-arrow prev glass-surface"
					onclick={prevSlide}
					aria-label="Previous screenshot"
				>
					<ChevronLeft size={24} />
				</button>
			{/if}

			<img
				bind:this={imgEl}
				src={screenshots[currentIndex]}
				alt="{project.title} screenshot {currentIndex + 1}"
				draggable="false"
				decoding="async"
				onload={syncNaturalDimensions}
				class="stage-image {isGestureActive ? 'no-transition' : ''}"
				style="width: {(baseDims.w * scale).toFixed(1)}px; height: {(baseDims.h * scale).toFixed(
					1
				)}px; transform: translate({panX.toFixed(1)}px, {panY.toFixed(1)}px);"
			/>

			{#if screenshots.length > 1}
				<button
					type="button"
					class="nav-arrow next glass-surface"
					onclick={nextSlide}
					aria-label="Next screenshot"
				>
					<ChevronRight size={24} />
				</button>
			{/if}
		</div>

		<!-- Floating Bottom Dock: Thumbnails & Subtle Hint -->
		{#if screenshots.length > 1}
			<div class="lightbox-bottom-dock glass-surface">
				{#each screenshots as src, idx (src)}
					<button
						type="button"
						class="thumb-btn {idx === currentIndex ? 'is-active' : ''}"
						onclick={() => selectSlide(idx)}
						aria-label="View screenshot {idx + 1}"
						aria-current={idx === currentIndex ? 'true' : undefined}
					>
						<img {src} alt="Thumbnail {idx + 1}" draggable="false" />
					</button>
				{/each}
			</div>
		{/if}
	</div>
{/if}

<style>
	.lightbox-overlay {
		position: fixed;
		inset: 0;
		z-index: 200;
		background: oklch(7% 0.005 285.823 / 0.88);
		backdrop-filter: blur(18px);
		-webkit-backdrop-filter: blur(18px);
		display: flex;
		align-items: center;
		justify-content: center;
		overflow: hidden;
		user-select: none;
		animation: lightbox-fade 0.18s ease-out;
	}

	@keyframes lightbox-fade {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	/* --- Floating Top Bar --- */
	.lightbox-topbar {
		position: absolute;
		top: 1rem;
		left: 1.25rem;
		right: 1.25rem;
		z-index: 20;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		pointer-events: none;
	}

	.lightbox-meta {
		pointer-events: auto;
		display: inline-flex;
		align-items: center;
		gap: 0.65rem;
		padding: 0.45rem 0.9rem;
		border-radius: 999px;
		background: var(--bg-glass-strong);
		min-width: 0;
		max-width: calc(100vw - 220px);
	}

	.lightbox-counter {
		font-family: var(--font-mono);
		font-size: 0.72rem;
		font-weight: 600;
		letter-spacing: 0.06em;
		color: var(--accent-text);
		white-space: nowrap;
		font-variant-numeric: tabular-nums;
	}

	.meta-divider {
		width: 1px;
		height: 13px;
		background: var(--border-subtle);
		flex-shrink: 0;
	}

	.lightbox-title {
		font-size: 0.88rem;
		font-weight: 600;
		color: var(--fg-primary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.lightbox-controls {
		pointer-events: auto;
		display: inline-flex;
		align-items: center;
		gap: 0.2rem;
		padding: 0.25rem;
		border-radius: 999px;
		background: var(--bg-glass-strong);
		flex-shrink: 0;
	}

	.ctrl-btn {
		width: 34px;
		height: 34px;
		border-radius: 999px;
		border: 1px solid transparent;
		background: transparent;
		color: var(--fg-primary);
		display: inline-flex;
		align-items: center;
		justify-content: center;
		transition:
			background-color 0.15s ease,
			border-color 0.15s ease,
			color 0.15s ease,
			opacity 0.15s ease;
	}

	.ctrl-btn:hover:not(:disabled) {
		background: var(--bg-chip-hover);
		border-color: var(--border-subtle);
	}

	.ctrl-btn.close-btn:hover {
		background: var(--accent-soft);
		border-color: var(--accent);
		color: var(--accent-text);
	}

	.ctrl-btn:disabled,
	.zoom-readout-btn:disabled {
		opacity: 0.38;
	}

	.zoom-readout-btn {
		height: 34px;
		padding: 0 0.55rem;
		border-radius: 999px;
		border: 1px solid transparent;
		background: transparent;
		color: var(--fg-secondary);
		font-family: var(--font-mono);
		font-size: 0.72rem;
		font-variant-numeric: tabular-nums;
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		transition:
			background-color 0.15s ease,
			color 0.15s ease;
	}

	.zoom-readout-btn:hover:not(:disabled) {
		background: var(--bg-chip-hover);
		color: var(--fg-primary);
	}

	.ctrl-divider {
		width: 1px;
		height: 18px;
		background: var(--border-subtle);
		margin: 0 0.15rem;
	}

	/* --- Full-Viewport Interactive Stage --- */
	.lightbox-stage {
		position: relative;
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		touch-action: none;
		overflow: hidden;
	}

	.stage-image {
		max-width: none;
		max-height: none;
		flex-shrink: 0;
		object-fit: contain;
		border-radius: 8px;
		border: 1px solid var(--border-subtle);
		box-shadow: 0 24px 64px -12px oklch(0% 0 0 / 0.75);
		transition:
			width 0.2s cubic-bezier(0.22, 1, 0.36, 1),
			height 0.2s cubic-bezier(0.22, 1, 0.36, 1),
			transform 0.2s cubic-bezier(0.22, 1, 0.36, 1);
	}

	.stage-image.no-transition {
		transition: none;
	}

	/* --- Left & Right Browse Arrows --- */
	.nav-arrow {
		position: absolute;
		top: 50%;
		transform: translateY(-50%);
		z-index: 15;
		width: 46px;
		height: 46px;
		border-radius: 999px;
		border: 1px solid var(--border-strong);
		background: var(--bg-glass-strong);
		color: var(--fg-primary);
		display: inline-flex;
		align-items: center;
		justify-content: center;
		transition:
			border-color 0.2s ease,
			background-color 0.2s ease,
			transform 0.2s ease;
	}

	.nav-arrow:hover {
		border-color: var(--accent);
		background: var(--accent-soft);
		transform: translateY(-50%) scale(1.06);
	}

	.nav-arrow.prev {
		left: 1.25rem;
	}

	.nav-arrow.next {
		right: 1.25rem;
	}

	/* --- Floating Bottom Thumbnail Dock --- */
	.lightbox-bottom-dock {
		position: absolute;
		bottom: 1.15rem;
		left: 50%;
		transform: translateX(-50%);
		z-index: 20;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.4rem;
		border-radius: 12px;
		background: var(--bg-glass-strong);
		max-width: calc(100vw - 2rem);
		overflow-x: auto;
	}

	.thumb-btn {
		position: relative;
		width: 72px;
		height: 42px;
		border-radius: 7px;
		overflow: hidden;
		border: 1.5px solid transparent;
		background: var(--bg-surface);
		padding: 0;
		flex-shrink: 0;
		opacity: 0.52;
		transition:
			opacity 0.18s ease,
			border-color 0.18s ease,
			transform 0.18s ease;
	}

	.thumb-btn:hover {
		opacity: 0.85;
	}

	.thumb-btn.is-active {
		opacity: 1;
		border-color: var(--accent);
		box-shadow: 0 0 12px var(--accent-glow);
	}

	.thumb-btn img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}

	@media (max-width: 640px) {
		.lightbox-topbar {
			top: 0.75rem;
			left: 0.75rem;
			right: 0.75rem;
		}

		.lightbox-meta {
			padding: 0.38rem 0.7rem;
			max-width: calc(100vw - 190px);
		}

		.lightbox-title {
			font-size: 0.78rem;
		}

		.nav-arrow {
			width: 40px;
			height: 40px;
		}

		.nav-arrow.prev {
			left: 0.65rem;
		}

		.nav-arrow.next {
			right: 0.65rem;
		}

		.thumb-btn {
			width: 58px;
			height: 34px;
		}
	}
</style>
