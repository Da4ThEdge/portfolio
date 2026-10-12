<script lang="ts">
	import { onMount } from 'svelte';

	interface EphemeralGlyph {
		id: number;
		x: number;
		y: number;
		text: string;
		kind: 'hex' | 'bin' | 'code' | 'sym';
		opacity: number;
	}

	const GLYPH_POOL: { text: string; kind: EphemeralGlyph['kind'] }[] = [
		{ text: '0x7F4A::9C02', kind: 'hex' },
		{ text: '0x00E4::18AF', kind: 'hex' },
		{ text: '0x91B0::44D1', kind: 'hex' },
		{ text: '0x3C8E::FF01', kind: 'hex' },
		{ text: '01101001 01000001', kind: 'bin' },
		{ text: '10110010 00101101', kind: 'bin' },
		{ text: '01000001 01010011', kind: 'bin' },
		{ text: 'SYS_TICK // 20.0Hz', kind: 'code' },
		{ text: 'MEM_ALLOC(0x0400)', kind: 'code' },
		{ text: 'AF_C // Z:+80.0mm', kind: 'code' },
		{ text: 'VEC3<f32>::NORM()', kind: 'code' },
		{ text: 'CRC32 // VERIFIED', kind: 'code' },
		{ text: '⊕', kind: 'sym' },
		{ text: '⌖', kind: 'sym' },
		{ text: '◈', kind: 'sym' },
		{ text: '⌬', kind: 'sym' },
		{ text: '⏣', kind: 'sym' }
	];

	let bgLayerEl: HTMLDivElement | undefined = $state();
	let stageEl: HTMLDivElement | undefined = $state();
	let glyphs = $state<EphemeralGlyph[]>([]);

	onMount(() => {
		const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		let rafId = 0;
		let glyphCounter = 0;

		function spawnGlyph() {
			const pick = GLYPH_POOL[Math.floor(Math.random() * GLYPH_POOL.length)];
			const col = Math.floor(Math.random() * 11) + 1;
			const row = Math.floor(Math.random() * 9) + 1;
			const id = ++glyphCounter;
			const item: EphemeralGlyph = {
				id,
				x: col * 8.2 + (Math.random() * 2 - 1),
				y: row * 9.5 + (Math.random() * 2 - 1),
				text: pick.text,
				kind: pick.kind,
				opacity: pick.kind === 'sym' ? 0.44 : 0.32
			};

			glyphs = [...glyphs.slice(-6), item];
		}

		for (let i = 0; i < 5; i++) {
			spawnGlyph();
		}

		const glyphInterval = window.setInterval(() => {
			if (document.hidden) return;
			if (glyphs.length > 0 && Math.random() < 0.35) {
				glyphs = glyphs.slice(1);
			}
			spawnGlyph();
		}, 2200);

		if (prefersReducedMotion) {
			return () => {
				window.clearInterval(glyphInterval);
			};
		}

		let targetX = 0;
		let targetY = 0;
		let smoothX = 0;
		let smoothY = 0;

		function onMouseMove(e: MouseEvent) {
			targetX = (e.clientX / Math.max(1, window.innerWidth) - 0.5) * 2;
			targetY = (e.clientY / Math.max(1, window.innerHeight) - 0.5) * 2;
		}

		window.addEventListener('mousemove', onMouseMove, { passive: true });

		// Optical Focus-Hunting & 3D Background Parallax Engine
		const BASE_STAGE_OPACITY = 0.48;
		let isHunting = false;
		let huntStartTime = 0;
		let huntDuration = 3100;
		let maxBlurTarget = 16;
		let nextHuntTimestamp = performance.now() + 4500 + Math.random() * 4500;
		let lastAppliedBlur = -1;
		let lastAppliedTx = -999;
		let lastAppliedTy = -999;

		function tick(now: number) {
			if (document.hidden) {
				rafId = requestAnimationFrame(tick);
				return;
			}

			smoothX += (targetX - smoothX) * 0.085;
			smoothY += (targetY - smoothY) * 0.085;

			if (!isHunting && now >= nextHuntTimestamp) {
				isHunting = true;
				huntStartTime = now;
				huntDuration = 2900 + Math.random() * 800;
				maxBlurTarget = 14 + Math.random() * 5;
			}

			let blur = 0;
			let scale = 1.0;
			let brightness = 100;
			let stageOpacity = BASE_STAGE_OPACITY;

			if (isHunting) {
				const p = (now - huntStartTime) / huntDuration;
				if (p >= 1) {
					isHunting = false;
					nextHuntTimestamp = now + 6800 + Math.random() * 6200;
				} else if (p < 0.36) {
					// Phase 1: Defocusing & Brightening tactical elements
					const t = p / 0.36;
					const eased = Math.sin(t * (Math.PI / 2));
					blur = eased * maxBlurTarget;
					scale = 1.0 + eased * 0.034;
					brightness = 100 + eased * 32;
					stageOpacity = BASE_STAGE_OPACITY + eased * (1 - BASE_STAGE_OPACITY);
				} else if (p < 0.64) {
					// Phase 2: Hunting Overshoot
					const t = (p - 0.36) / 0.28;
					const overshootCurve = Math.sin(t * Math.PI);
					blur = Math.max(1.2, (1 - t) * maxBlurTarget * 0.5 + overshootCurve * 5.2);
					scale = 1.034 - t * 0.026 + overshootCurve * 0.008;
					const normBlur = Math.min(1, blur / maxBlurTarget);
					brightness = 100 + normBlur * 30;
					stageOpacity = BASE_STAGE_OPACITY + normBlur * (1 - BASE_STAGE_OPACITY);
				} else if (p < 0.86) {
					// Phase 3: Hunting Back-step correction
					const t = (p - 0.64) / 0.22;
					const microOsc = Math.cos(t * Math.PI * 2) * (1 - t) * 2.2;
					blur = Math.max(0.2, (1 - t) * 4.0 + microOsc);
					scale = 1.008 - t * 0.008;
					const normBlur = Math.min(1, blur / maxBlurTarget);
					brightness = 100 + normBlur * 26;
					stageOpacity = BASE_STAGE_OPACITY + normBlur * (1 - BASE_STAGE_OPACITY);
				} else {
					// Phase 4: Final Pin-Point Lock
					const t = (p - 0.86) / 0.14;
					blur = (1 - t) * 0.6;
					scale = 1.0;
					brightness = 100 + (1 - t) * 5;
					stageOpacity = BASE_STAGE_OPACITY + (1 - t) * 0.06;
				}
			}

			if (bgLayerEl) {
				// Subtle continuous handheld "shaky cam" drift layered on top of cursor parallax
				const tSec = now * 0.001;
				const camShakeX =
					Math.sin(tSec * 1.7) * 4.2 +
					Math.cos(tSec * 3.1 + 1.3) * 2.1 +
					Math.sin(tSec * 6.7 + 0.7) * 0.85;
				const camShakeY =
					Math.cos(tSec * 1.45 + 0.5) * 3.8 +
					Math.sin(tSec * 2.85 + 2.1) * 1.9 +
					Math.cos(tSec * 6.1 + 1.8) * 0.8;
				const camRollDeg = Math.sin(tSec * 1.1 + 0.9) * 0.14 + Math.cos(tSec * 2.5 + 0.3) * 0.06;

				const bgTx = -smoothX * 30 + camShakeX;
				const bgTy = -smoothY * 30 + camShakeY;
				const totalScale = scale * (1 + (Math.abs(smoothX) + Math.abs(smoothY)) * 0.01);

				if (
					Math.abs(bgTx - lastAppliedTx) > 0.03 ||
					Math.abs(bgTy - lastAppliedTy) > 0.03 ||
					isHunting ||
					lastAppliedBlur > 0
				) {
					bgLayerEl.style.transform = `translate3d(${bgTx.toFixed(2)}px, ${bgTy.toFixed(2)}px, 0) rotate(${camRollDeg.toFixed(3)}deg) scale(${totalScale.toFixed(4)})`;
					lastAppliedTx = bgTx;
					lastAppliedTy = bgTy;
				}

				if (blur > 0.08) {
					bgLayerEl.style.filter = `blur(${blur.toFixed(1)}px) brightness(${brightness.toFixed(0)}%)`;
					if (stageEl) stageEl.style.opacity = stageOpacity.toFixed(3);
					lastAppliedBlur = blur;
				} else if (lastAppliedBlur !== 0) {
					bgLayerEl.style.filter = 'none';
					if (stageEl) stageEl.style.opacity = String(BASE_STAGE_OPACITY);
					lastAppliedBlur = 0;
				}
			}

			rafId = requestAnimationFrame(tick);
		}

		rafId = requestAnimationFrame(tick);

		return () => {
			cancelAnimationFrame(rafId);
			window.clearInterval(glyphInterval);
			window.removeEventListener('mousemove', onMouseMove);
		};
	});
</script>

<div id="lens-background-layer" bind:this={bgLayerEl} aria-hidden="true">
	<div class="tactical-elements-stage" bind:this={stageEl}>
		<!-- Architectural Grid Lines & Micro Dots -->
		<div class="grid-plane"></div>
		<div class="dots-plane"></div>

		<!-- Tactical Cyber Wireframe & Circuitry SVG -->
		<svg
			class="circuit-svg"
			viewBox="0 0 1920 1080"
			preserveAspectRatio="xMidYMid slice"
			xmlns="http://www.w3.org/2000/svg"
		>
			<!-- Optical calibration rings -->
			<circle
				cx="960"
				cy="540"
				r="340"
				fill="none"
				stroke="currentColor"
				stroke-opacity="0.21"
				stroke-width="1.25"
				stroke-dasharray="4 8"
			/>
			<circle
				cx="960"
				cy="540"
				r="560"
				fill="none"
				stroke="currentColor"
				stroke-opacity="0.16"
				stroke-width="1"
			/>
			<circle
				cx="960"
				cy="540"
				r="780"
				fill="none"
				stroke="currentColor"
				stroke-opacity="0.12"
				stroke-width="1"
				stroke-dasharray="2 14"
			/>

			<!-- Wireframe Circuit Traces (45-deg tactical routing) -->
			<g class="circuit-traces" stroke="currentColor" stroke-width="1.25" fill="none">
				<path d="M 120 180 L 340 180 L 410 250 L 680 250" stroke-opacity="0.28" />
				<circle cx="120" cy="180" r="3" fill="currentColor" fill-opacity="0.42" />
				<circle cx="680" cy="250" r="3" fill="currentColor" fill-opacity="0.42" />

				<path d="M 1800 220 L 1540 220 L 1460 300 L 1220 300" stroke-opacity="0.28" />
				<circle cx="1800" cy="220" r="3" fill="currentColor" fill-opacity="0.42" />
				<circle cx="1220" cy="300" r="3" fill="currentColor" fill-opacity="0.42" />

				<path d="M 180 860 L 420 860 L 500 780 L 760 780 L 810 830" stroke-opacity="0.25" />
				<circle cx="180" cy="860" r="3" fill="currentColor" fill-opacity="0.42" />
				<circle cx="810" cy="830" r="3" fill="currentColor" fill-opacity="0.42" />

				<path d="M 1740 840 L 1480 840 L 1410 770 L 1160 770" stroke-opacity="0.25" />
				<circle cx="1740" cy="840" r="3" fill="currentColor" fill-opacity="0.42" />
				<circle cx="1160" cy="770" r="3" fill="currentColor" fill-opacity="0.42" />

				<path d="M 300 540 L 460 540 L 510 490 L 640 490" stroke-opacity="0.22" />
				<path d="M 1620 540 L 1460 540 L 1410 590 L 1280 590" stroke-opacity="0.22" />
			</g>

			<!-- Subtle crosshair ticks at quadrants -->
			<g stroke="currentColor" stroke-opacity="0.34" stroke-width="1.2">
				<path d="M 475 540 H 485 M 480 535 V 545" />
				<path d="M 1435 540 H 1445 M 1440 535 V 545" />
				<path d="M 960 265 V 275 M 955 270 H 965" />
				<path d="M 960 805 V 815 M 955 810 H 965" />
			</g>
		</svg>

		<!-- Ephemeral Hex, Binary, Code & Symbol Popups -->
		<div class="glyph-layer">
			{#each glyphs as g (g.id)}
				<span
					class="ephemeral-glyph kind-{g.kind}"
					style="left: {g.x.toFixed(1)}%; top: {g.y.toFixed(1)}%; --max-op: {g.opacity};"
				>
					{g.text}
				</span>
			{/each}
		</div>
	</div>
</div>

<style>
	#lens-background-layer {
		position: fixed;
		inset: -60px;
		z-index: 0;
		pointer-events: none;
		transform-origin: center center;
		color: var(--fg-secondary);
		overflow: hidden;
	}

	.tactical-elements-stage {
		position: absolute;
		inset: 0;
		opacity: 0.48;
	}

	.grid-plane {
		position: absolute;
		inset: 0;
		background-image:
			linear-gradient(to right, var(--grid-line) 1px, transparent 1px),
			linear-gradient(to bottom, var(--grid-line) 1px, transparent 1px);
		background-size: 120px 120px;
		background-position: center center;
	}

	.dots-plane {
		position: absolute;
		inset: 0;
		background-image: radial-gradient(circle, var(--grid-dot) 1.15px, transparent 1.15px);
		background-size: 30px 30px;
		background-position: center center;
		mask-image: radial-gradient(ellipse 80% 75% at 50% 50%, #000 35%, transparent 100%);
		-webkit-mask-image: radial-gradient(ellipse 80% 75% at 50% 50%, #000 35%, transparent 100%);
	}

	.circuit-svg {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
	}

	.glyph-layer {
		position: absolute;
		inset: 60px;
	}

	.ephemeral-glyph {
		position: absolute;
		font-family: var(--font-mono);
		font-size: 0.72rem;
		letter-spacing: 0.08em;
		color: var(--fg-secondary);
		white-space: nowrap;
		user-select: none;
		animation: glyph-lifecycle 4.2s cubic-bezier(0.22, 1, 0.36, 1) forwards;
	}

	.ephemeral-glyph.kind-sym {
		font-size: 0.94rem;
		letter-spacing: 0;
	}

	@keyframes glyph-lifecycle {
		0% {
			opacity: 0;
			transform: translateY(3px);
		}
		18% {
			opacity: var(--max-op, 0.24);
			transform: translateY(0px);
		}
		78% {
			opacity: var(--max-op, 0.24);
			transform: translateY(0px);
		}
		100% {
			opacity: 0;
			transform: translateY(-2px);
		}
	}
</style>
