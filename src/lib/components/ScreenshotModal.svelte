<script lang="ts">
	import type { ProjectItem } from '#lib';
	import { X, ChevronLeft, ChevronRight, Layers } from '@lucide/svelte';

	interface Props {
		project: ProjectItem | null;
		onClose: () => void;
	}

	let { project, onClose }: Props = $props();

	let currentIndex = $state(0);

	const screenshots = $derived(project?.screenshots ?? []);

	$effect(() => {
		if (project) {
			currentIndex = 0;
		}
	});

	function prevSlide() {
		if (!screenshots.length) return;
		currentIndex = (currentIndex - 1 + screenshots.length) % screenshots.length;
	}

	function nextSlide() {
		if (!screenshots.length) return;
		currentIndex = (currentIndex + 1) % screenshots.length;
	}

	function handleKeydown(e: KeyboardEvent) {
		if (!project) return;
		if (e.key === 'Escape') {
			onClose();
		} else if (e.key === 'ArrowLeft') {
			prevSlide();
		} else if (e.key === 'ArrowRight') {
			nextSlide();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if project && screenshots.length > 0}
	<div
		class="modal-backdrop"
		role="dialog"
		aria-modal="true"
		aria-label="{project.title} screenshots gallery"
		tabindex="-1"
		onclick={(e) => {
			if (e.target === e.currentTarget) onClose();
		}}
		onkeydown={(e) => {
			if (e.key === 'Escape') onClose();
		}}
	>
		<div class="modal-window glass-surface tactical-frame">
			<!-- Header -->
			<div class="modal-header">
				<div class="modal-title-group">
					<span class="modal-tag">
						<Layers size={13} />
						GALLERY // {String(currentIndex + 1).padStart(2, '0')} OF {String(
							screenshots.length
						).padStart(2, '0')}
					</span>
					<h3 class="modal-title">{project.title}</h3>
					{#if project.description}
						<p class="modal-desc">{project.description}</p>
					{/if}
				</div>

				<button type="button" class="modal-close-btn" onclick={onClose} aria-label="Close gallery">
					<X size={18} />
				</button>
			</div>

			<!-- Main Image Stage -->
			<div class="modal-stage">
				<button
					type="button"
					class="stage-nav-btn prev"
					onclick={prevSlide}
					aria-label="Previous screenshot"
				>
					<ChevronLeft size={22} />
				</button>

				<div class="stage-image-container">
					<img
						src={screenshots[currentIndex]}
						alt="{project.title} screenshot {currentIndex + 1}"
						class="stage-image"
					/>
				</div>

				<button
					type="button"
					class="stage-nav-btn next"
					onclick={nextSlide}
					aria-label="Next screenshot"
				>
					<ChevronRight size={22} />
				</button>
			</div>

			<!-- Thumbnail Strip -->
			<div class="modal-thumbs">
				{#each screenshots as src, idx (src)}
					<button
						type="button"
						class="thumb-btn {idx === currentIndex ? 'is-active' : ''}"
						onclick={() => (currentIndex = idx)}
						aria-label="View screenshot {idx + 1}"
					>
						<img {src} alt="Thumbnail {idx + 1}" />
						<span class="thumb-idx">{String(idx + 1).padStart(2, '0')}</span>
					</button>
				{/each}
			</div>
		</div>
	</div>
{/if}

<style>
	.modal-backdrop {
		position: fixed;
		inset: 0;
		z-index: 200;
		background: oklch(8% 0.005 285.823 / 0.82);
		backdrop-filter: blur(14px);
		-webkit-backdrop-filter: blur(14px);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1.25rem;
		animation: modal-fade 0.2s ease-out;
	}

	@keyframes modal-fade {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	.modal-window {
		width: 100%;
		max-width: 1040px;
		max-height: 92dvh;
		border-radius: 16px;
		background: var(--bg-glass-strong);
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.modal-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
		padding: 1rem 1.35rem;
		border-bottom: 1px solid var(--border-subtle);
	}

	.modal-title-group {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.modal-tag {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		font-family: var(--font-mono);
		font-size: 0.68rem;
		letter-spacing: 0.08em;
		color: var(--accent-text);
	}

	.modal-title {
		font-size: 1.15rem;
		font-weight: 700;
		color: var(--fg-primary);
	}

	.modal-desc {
		font-size: 0.82rem;
		color: var(--fg-secondary);
		max-width: 65ch;
	}

	.modal-close-btn {
		width: 36px;
		height: 36px;
		border-radius: 8px;
		border: 1px solid var(--border-subtle);
		background: var(--bg-chip);
		color: var(--fg-primary);
		display: inline-flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		transition:
			border-color 0.2s ease,
			background-color 0.2s ease;
	}

	.modal-close-btn:hover {
		border-color: var(--accent);
		background: var(--accent-soft);
	}

	.modal-stage {
		position: relative;
		flex: 1;
		min-height: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		background: oklch(0% 0 0 / 0.28);
		padding: 1rem 3.5rem;
	}

	@media (max-width: 640px) {
		.modal-stage {
			padding: 0.75rem 2.5rem;
		}
	}

	.stage-image-container {
		width: 100%;
		max-height: 58dvh;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.stage-image {
		max-width: 100%;
		max-height: 58dvh;
		object-fit: contain;
		border-radius: 8px;
		border: 1px solid var(--border-subtle);
		box-shadow: 0 18px 40px -10px oklch(0% 0 0 / 0.6);
	}

	.stage-nav-btn {
		position: absolute;
		top: 50%;
		transform: translateY(-50%);
		width: 40px;
		height: 40px;
		border-radius: 10px;
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

	.stage-nav-btn:hover {
		border-color: var(--accent);
		background: var(--accent-soft);
		transform: translateY(-50%) scale(1.06);
	}

	.stage-nav-btn.prev {
		left: 0.75rem;
	}

	.stage-nav-btn.next {
		right: 0.75rem;
	}

	.modal-thumbs {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.65rem;
		padding: 0.85rem 1.25rem;
		border-top: 1px solid var(--border-subtle);
		overflow-x: auto;
	}

	.thumb-btn {
		position: relative;
		width: 96px;
		height: 54px;
		border-radius: 6px;
		overflow: hidden;
		border: 1.5px solid var(--border-subtle);
		background: var(--bg-surface);
		padding: 0;
		flex-shrink: 0;
		opacity: 0.58;
		transition:
			opacity 0.2s ease,
			border-color 0.2s ease,
			transform 0.2s ease;
	}

	.thumb-btn:hover {
		opacity: 0.85;
	}

	.thumb-btn.is-active {
		opacity: 1;
		border-color: var(--accent);
		transform: translateY(-2px);
		box-shadow: 0 0 12px var(--accent-glow);
	}

	.thumb-btn img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}

	.thumb-idx {
		position: absolute;
		bottom: 2px;
		right: 4px;
		font-family: var(--font-mono);
		font-size: 0.56rem;
		padding: 0 3px;
		border-radius: 3px;
		background: oklch(0% 0 0 / 0.72);
		color: #fff;
	}
</style>
