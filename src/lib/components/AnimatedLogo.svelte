<script lang="ts">
	interface Props {
		mode?: 'loader' | 'scroll';
		progress?: number; // 0 to 1 when mode === 'scroll'
		size?: number;
		class?: string;
	}

	let { mode = 'loader', progress = 0, size = 36, class: className = '' }: Props = $props();

	const clampedProgress = $derived(Math.min(1, Math.max(0, progress)));

	function smoothStep(t: number): number {
		const c = Math.min(1, Math.max(0, t));
		return c * c * (3 - 2 * c);
	}

	function segment(p: number, start: number, end: number): number {
		if (p <= start) return 0;
		if (p >= end) return 1;
		return smoothStep((p - start) / (end - start));
	}

	// Pure 2D vector orthographic projection (scaleY(cos) / scaleX(cos))
	// Prevents browser 3D bitmap texture rasterization blur mid-animation!
	const scrollTransforms = $derived.by(() => {
		const p = clampedProgress;

		// Stage 1 (0.00 -> 0.16): f1 -> f2 (initial horizontal split)
		const s1 = segment(p, 0.0, 0.16);
		// Stage 2 (0.14 -> 0.34): f2 -> f3 (vertical flip around meeting edge)
		const s2 = segment(p, 0.14, 0.34);
		// Stage 3 (0.32 -> 0.50): f3 -> f4 (move further apart horizontally)
		const s3 = segment(p, 0.32, 0.5);
		// Stage 4 (0.48 -> 0.66): f4 -> f5 (vertical interlock offset)
		const s4 = segment(p, 0.48, 0.66);
		// Stage 5 (0.64 -> 0.82): f5 -> f6 (return horizontally to center)
		const s5 = segment(p, 0.64, 0.82);
		// Stage 6 (0.78 -> 1.00): f6 -> f7 (group 180deg horizontal flip)
		const s6 = segment(p, 0.78, 1.0);

		const topX = -1 * s1 - 2 * s3 + 3 * s5;
		const topY = -2 * s4;
		const flipScaleY = Math.cos(s2 * Math.PI);

		const botX = 1 * s1 + 2 * s3 - 3 * s5;
		const botY = 2 * s4;

		const groupScaleX = Math.cos(s6 * Math.PI);

		return {
			group: `scale(${groupScaleX.toFixed(4)}, 1)`,
			top: `translate(${topX.toFixed(2)}px, ${topY.toFixed(2)}px) scale(1, ${flipScaleY.toFixed(4)})`,
			bottom: `translate(${botX.toFixed(2)}px, ${botY.toFixed(2)}px) scale(1, ${flipScaleY.toFixed(4)})`
		};
	});

	// Stroke fill progress (0 -> 100)
	const dashOffset = $derived((1 - clampedProgress) * 100);
</script>

<div
	class="logo-wrapper {mode === 'loader' ? 'is-loader' : 'is-scroll'} {className}"
	style="width: {size}px; height: {size}px;"
>
	<svg
		viewBox="0 0 33 33"
		fill="none"
		xmlns="http://www.w3.org/2000/svg"
		shape-rendering="geometricPrecision"
		aria-hidden="true"
	>
		<g
			class="loader-group"
			style={mode === 'scroll' ? `transform: ${scrollTransforms.group};` : undefined}
		>
			<!-- Base track paths -->
			<path
				class="top-shape base-stroke"
				d="M16.5 14V5L5 17.5H19"
				vector-effect="non-scaling-stroke"
				style={mode === 'scroll' ? `transform: ${scrollTransforms.top};` : undefined}
			/>
			<path
				class="bottom-shape base-stroke"
				d="M14 15.5H28L16.5 28V19"
				vector-effect="non-scaling-stroke"
				style={mode === 'scroll' ? `transform: ${scrollTransforms.bottom};` : undefined}
			/>

			{#if mode === 'scroll'}
				<!-- Progressive accent color-fill paths driven by scroll progress -->
				<path
					class="top-shape accent-fill-stroke"
					d="M16.5 14V5L5 17.5H19"
					pathLength="100"
					stroke-dasharray="100"
					stroke-dashoffset={dashOffset}
					vector-effect="non-scaling-stroke"
					style="transform: {scrollTransforms.top}; opacity: {clampedProgress > 0.005 ? 1 : 0};"
				/>
				<path
					class="bottom-shape accent-fill-stroke"
					d="M14 15.5H28L16.5 28V19"
					pathLength="100"
					stroke-dasharray="100"
					stroke-dashoffset={dashOffset}
					vector-effect="non-scaling-stroke"
					style="transform: {scrollTransforms.bottom}; opacity: {clampedProgress > 0.005 ? 1 : 0};"
				/>
			{/if}
		</g>
	</svg>
</div>

<style>
	.logo-wrapper {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		user-select: none;
	}

	svg {
		width: 100%;
		height: 100%;
		overflow: visible;
	}

	.loader-group {
		transform-origin: 16.5px 16.5px;
		stroke-linejoin: round;
		stroke-linecap: round;
	}

	.top-shape {
		transform-origin: 16.5px 17.5px;
	}

	.bottom-shape {
		transform-origin: 16.5px 15.5px;
	}

	/* Scroll mode stroke colors: crisp vector strokes with high legibility */
	.is-scroll .base-stroke {
		stroke: var(--fg-secondary);
		stroke-width: 2.2;
		transition: stroke 0.2s ease;
	}

	.is-scroll:hover .base-stroke {
		stroke: var(--fg-primary);
	}

	.accent-fill-stroke {
		stroke: var(--accent);
		stroke-width: 2.4;
	}

	/* Loader mode: pure 2D vector orthographic projection so it stays 100% sharp */
	.is-loader .base-stroke {
		stroke: var(--accent);
		stroke-width: 7;
	}

	.is-loader .loader-group {
		animation: organic-group-spin 2.1s cubic-bezier(0.45, 0.05, 0.2, 0.99) infinite;
	}

	.is-loader .top-shape {
		animation: organic-top-move 2.1s cubic-bezier(0.33, 1, 0.68, 1) infinite;
	}

	.is-loader .bottom-shape {
		animation: organic-bot-move 2.1s cubic-bezier(0.33, 1, 0.68, 1) infinite;
	}

	@keyframes organic-top-move {
		0% {
			transform: translate(0px, 0px) scale(1, 1);
			animation-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
		}
		12% {
			transform: translate(-1.25px, 0.15px) scale(1, 0.98);
			animation-timing-function: cubic-bezier(0.34, 1.35, 0.64, 1);
		}
		30% {
			transform: translate(-1.1px, 0px) scale(1, -1);
			animation-timing-function: cubic-bezier(0.34, 1.4, 0.64, 1);
		}
		46% {
			transform: translate(-3.15px, -0.15px) scale(1, -1);
			animation-timing-function: cubic-bezier(0.25, 1, 0.5, 1);
		}
		62% {
			transform: translate(-2.95px, -2.1px) scale(1, -1);
			animation-timing-function: cubic-bezier(0.34, 1.3, 0.64, 1);
		}
		80%,
		100% {
			transform: translate(0px, -2px) scale(1, -1);
		}
	}

	@keyframes organic-bot-move {
		0% {
			transform: translate(0px, 0px) scale(1, 1);
			animation-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
		}
		12% {
			transform: translate(1.25px, -0.15px) scale(1, 0.98);
			animation-timing-function: cubic-bezier(0.34, 1.35, 0.64, 1);
		}
		30% {
			transform: translate(1.1px, 0px) scale(1, -1);
			animation-timing-function: cubic-bezier(0.34, 1.4, 0.64, 1);
		}
		46% {
			transform: translate(3.15px, 0.15px) scale(1, -1);
			animation-timing-function: cubic-bezier(0.25, 1, 0.5, 1);
		}
		62% {
			transform: translate(2.95px, 2.1px) scale(1, -1);
			animation-timing-function: cubic-bezier(0.34, 1.3, 0.64, 1);
		}
		80%,
		100% {
			transform: translate(0px, 2px) scale(1, -1);
		}
	}

	@keyframes organic-group-spin {
		0%,
		68% {
			transform: scale(1, 1);
			animation-timing-function: cubic-bezier(0.34, 1.28, 0.64, 1);
		}
		92%,
		100% {
			transform: scale(-1, 1);
		}
	}
</style>
