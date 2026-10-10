<script lang="ts">
	import { onMount } from 'svelte';

	let cursorEl: HTMLDivElement | undefined = $state();
	let hudSurfaceEl: HTMLDivElement | undefined = $state();
	let hudBoxEl: HTMLDivElement | undefined = $state();
	let hudBracketsEl: HTMLDivElement | undefined = $state();
	let dotEl: HTMLDivElement | undefined = $state();

	let isFinePointer = $state(false);
	let displayX = $state('0000');
	let displayY = $state('0000');

	onMount(() => {
		const mediaQuery = window.matchMedia('(pointer: fine)');
		isFinePointer = mediaQuery.matches;

		if (!isFinePointer) return;

		document.body.classList.add('custom-cursor-ready');

		let targetX = window.innerWidth / 2;
		let targetY = window.innerHeight / 2;
		let hudX = targetX;
		let hudY = targetY;
		let idleTimer: number | undefined;
		let rafId = 0;
		let isHudRunning = false;
		let lastDisplayedX = -1;
		let lastDisplayedY = -1;
		let wasInteractive = false;

		function startHudLoop() {
			if (!isHudRunning) {
				isHudRunning = true;
				rafId = requestAnimationFrame(animateHud);
			}
		}

		function animateHud() {
			const dx = targetX - hudX;
			const dy = targetY - hudY;
			hudX += dx * 0.28;
			hudY += dy * 0.28;

			if (hudBoxEl) {
				hudBoxEl.style.transform = `translate3d(${hudX.toFixed(1)}px, ${hudY.toFixed(1)}px, 0)`;
			}

			if (Math.abs(dx) > 0.15 || Math.abs(dy) > 0.15) {
				rafId = requestAnimationFrame(animateHud);
			} else {
				isHudRunning = false;
			}
		}

		function handleMouseMove(e: MouseEvent) {
			targetX = e.clientX;
			targetY = e.clientY;

			if (cursorEl) {
				cursorEl.style.transform = `translate3d(${targetX}px, ${targetY}px, 0)`;
			}

			const rx = Math.round(targetX);
			const ry = Math.round(targetY);
			if (rx !== lastDisplayedX) {
				displayX = String(rx).padStart(4, '0');
				lastDisplayedX = rx;
			}
			if (ry !== lastDisplayedY) {
				displayY = String(ry).padStart(4, '0');
				lastDisplayedY = ry;
			}

			hudSurfaceEl?.classList.add('is-active');
			startHudLoop();

			const targetNode = e.target as HTMLElement | null;
			const interactive = Boolean(
				targetNode?.closest('a, button, [role="button"], input, .interactive-target')
			);
			if (interactive !== wasInteractive) {
				wasInteractive = interactive;
				dotEl?.classList.toggle('is-interactive', interactive);
			}

			if (idleTimer !== undefined) {
				window.clearTimeout(idleTimer);
			}
			idleTimer = window.setTimeout(() => {
				hudSurfaceEl?.classList.remove('is-active');
			}, 600);
		}

		function handleMouseDown() {
			dotEl?.classList.add('is-pressed');
			cursorEl?.classList.add('is-pressed-anchor');
			hudBracketsEl?.classList.add('is-laser');
			hudSurfaceEl?.classList.add('is-active');
		}

		function handleMouseUp() {
			dotEl?.classList.remove('is-pressed');
			cursorEl?.classList.remove('is-pressed-anchor');
			hudBracketsEl?.classList.remove('is-laser');
		}

		function handleMouseLeave() {
			hudSurfaceEl?.classList.remove('is-active');
			handleMouseUp();
		}

		window.addEventListener('mousemove', handleMouseMove, { passive: true });
		window.addEventListener('mousedown', handleMouseDown, { passive: true });
		window.addEventListener('mouseup', handleMouseUp, { passive: true });
		document.addEventListener('mouseleave', handleMouseLeave);

		return () => {
			document.body.classList.remove('custom-cursor-ready');
			window.removeEventListener('mousemove', handleMouseMove);
			window.removeEventListener('mousedown', handleMouseDown);
			window.removeEventListener('mouseup', handleMouseUp);
			document.removeEventListener('mouseleave', handleMouseLeave);
			if (idleTimer !== undefined) window.clearTimeout(idleTimer);
			cancelAnimationFrame(rafId);
		};
	});
</script>

{#if isFinePointer}
	<!--
		Sci-Fi HUD Lock-On Frame & Dynamic X/Y Telemetry (z-index: 9998),
		at the same top elevation level as the custom cursor dot (z-index: 9999).
	-->
	<div class="hud-lockon-surface" bind:this={hudSurfaceEl} aria-hidden="true">
		<div class="hud-lockon-anchor" bind:this={hudBoxEl}>
			<div class="hud-brackets" bind:this={hudBracketsEl}>
				<span class="corner tl"></span>
				<span class="corner tr"></span>
				<span class="corner bl"></span>
				<span class="corner br"></span>
				<span class="tick top"></span>
				<span class="tick bottom"></span>
				<span class="tick left"></span>
				<span class="tick right"></span>
			</div>

			<div class="hud-coords">
				<div class="coord-row">
					<span class="coord-axis">X</span>
					<span class="coord-val">{displayX}</span>
				</div>
				<div class="coord-row">
					<span class="coord-axis">Y</span>
					<span class="coord-val">{displayY}</span>
				</div>
			</div>
		</div>
	</div>

	<!-- Custom Inverse Square Cursor Dot (Turns into Accent Laser Glow on Click) -->
	<div class="custom-cursor-anchor" bind:this={cursorEl} aria-hidden="true">
		<div class="cursor-square-dot" bind:this={dotEl}></div>
	</div>
{/if}

<style>
	.hud-lockon-surface {
		position: fixed;
		inset: 0;
		z-index: 9998;
		pointer-events: none;
		overflow: hidden;
	}

	.hud-lockon-anchor {
		position: absolute;
		top: 0;
		left: 0;
		will-change: transform;
	}

	.hud-brackets {
		position: absolute;
		top: -28px;
		left: -28px;
		width: 56px;
		height: 56px;
		transform: scale(1.42);
		opacity: 0;
		transition:
			transform 0.28s cubic-bezier(0.22, 1, 0.36, 1),
			opacity 0.24s ease;
	}

	.hud-lockon-surface:global(.is-active) .hud-brackets {
		transform: scale(1);
		opacity: 1;
	}

	.hud-brackets:global(.is-laser) {
		transform: scale(0.84) !important;
	}

	.corner {
		position: absolute;
		width: 10px;
		height: 10px;
		border-color: var(--hud-stroke);
		transition: border-color 0.15s ease;
	}

	.hud-brackets:global(.is-laser) .corner {
		border-color: var(--accent);
	}

	.corner.tl {
		top: 0;
		left: 0;
		border-top: 1.25px solid;
		border-left: 1.25px solid;
	}

	.corner.tr {
		top: 0;
		right: 0;
		border-top: 1.25px solid;
		border-right: 1.25px solid;
	}

	.corner.bl {
		bottom: 0;
		left: 0;
		border-bottom: 1.25px solid;
		border-left: 1.25px solid;
	}

	.corner.br {
		bottom: 0;
		right: 0;
		border-bottom: 1.25px solid;
		border-right: 1.25px solid;
	}

	.tick {
		position: absolute;
		background-color: var(--hud-stroke);
	}

	.tick.top,
	.tick.bottom {
		left: 50%;
		width: 1px;
		height: 4px;
		transform: translateX(-50%);
	}
	.tick.top {
		top: -2px;
	}
	.tick.bottom {
		bottom: -2px;
	}

	.tick.left,
	.tick.right {
		top: 50%;
		height: 1px;
		width: 4px;
		transform: translateY(-50%);
	}
	.tick.left {
		left: -2px;
	}
	.tick.right {
		right: -2px;
	}

	.hud-coords {
		position: absolute;
		top: -26px;
		left: 36px;
		display: flex;
		flex-direction: column;
		gap: 2px;
		font-family: var(--font-mono);
		font-size: 0.64rem;
		line-height: 1.1;
		letter-spacing: 0.08em;
		color: var(--hud-text);
		opacity: 0;
		transform: translateX(6px);
		transition:
			opacity 0.22s ease,
			transform 0.24s cubic-bezier(0.22, 1, 0.36, 1);
		white-space: nowrap;
	}

	.hud-lockon-surface:global(.is-active) .hud-coords {
		opacity: 1;
		transform: translateX(0);
	}

	.coord-row {
		display: flex;
		align-items: center;
		gap: 5px;
	}

	.coord-axis {
		opacity: 0.6;
	}

	.coord-val {
		font-variant-numeric: tabular-nums;
	}

	/* Topmost custom cursor dot */
	.custom-cursor-anchor {
		position: fixed;
		top: 0;
		left: 0;
		z-index: 9999;
		pointer-events: none;
		will-change: transform;
		mix-blend-mode: difference;
	}

	.custom-cursor-anchor:global(.is-pressed-anchor) {
		mix-blend-mode: normal;
	}

	.cursor-square-dot {
		width: 8px;
		height: 8px;
		margin-left: -4px;
		margin-top: -4px;
		background-color: #ffffff;
		transition:
			width 0.14s cubic-bezier(0.22, 1, 0.36, 1),
			height 0.14s cubic-bezier(0.22, 1, 0.36, 1),
			margin 0.14s cubic-bezier(0.22, 1, 0.36, 1),
			background-color 0.1s ease,
			box-shadow 0.14s ease,
			transform 0.14s cubic-bezier(0.22, 1, 0.36, 1);
	}

	.cursor-square-dot:global(.is-interactive) {
		width: 11px;
		height: 11px;
		margin-left: -5.5px;
		margin-top: -5.5px;
		transform: rotate(45deg);
	}

	.cursor-square-dot:global(.is-pressed) {
		background-color: oklch(91% 0.096 180.426);
		box-shadow:
			0 0 8px 2px oklch(91% 0.096 180.426 / 0.72),
			0 0 18px 4px oklch(91% 0.096 180.426 / 0.28);
		transform: scale(0.92);
	}
</style>
