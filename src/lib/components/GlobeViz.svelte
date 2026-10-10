<script lang="ts">
	import { onMount } from 'svelte';
	import * as d3 from 'd3';
	import { feature } from 'topojson-client';
	import type { Topology, GeometryCollection } from 'topojson-specification';
	import type { FeatureCollection, Geometry } from 'geojson';
	import { CLIENTS, HOME_BASE, type ClientId, type ClientInfo } from '#lib';
	import { Globe, RotateCcw, MapPin, Sparkles, X } from '@lucide/svelte';

	interface Props {
		selectedClient: ClientId | null;
		onSelectClient: (clientId: ClientId | null) => void;
		worldTopology?: Topology | null;
	}

	let { selectedClient, onSelectClient, worldTopology = null }: Props = $props();

	const VIEW_W = 1120;
	const VIEW_H = 520;
	// Place center at Y=355 with radius 335 so ~3/4ths of the tilted globe is showcased
	const GLOBE_CENTER: [number, number] = [560, 355];
	const GLOBE_RADIUS = 335;
	const DEFAULT_PHI = -22; // Tilt northern hemisphere toward viewer
	const DEFAULT_GAMMA = -13; // Signature orbital axial tilt

	let shellEl: HTMLDivElement | undefined = $state();
	let canvasEl: HTMLCanvasElement | undefined = $state();

	let rotation = $state<[number, number, number]>([-18, DEFAULT_PHI, DEFAULT_GAMMA]);
	let isDragging = $state(false);
	let hoveredClient = $state<ClientId | null>(null);
	let landFeatures: FeatureCollection<Geometry> | null = null;
	let countryFeatures: FeatureCollection<Geometry> | null = null;

	let targetRotation = $state<[number, number, number] | null>(null);
	let lastInteractionTime = 0;

	const selectedClientObj = $derived(
		selectedClient ? (CLIENTS.find((c) => c.id === selectedClient) ?? null) : null
	);

	// Pre-build static GeoJSON geometries once
	const sphereGeometry: d3.GeoSphere = { type: 'Sphere' };
	const graticuleGeometry = d3.geoGraticule().step([15, 15])();
	const clientArcGeometries: Record<ClientId, GeoJSON.LineString> = {
		'honeyfrost-mt': {
			type: 'LineString',
			coordinates: [HOME_BASE.coordinates, CLIENTS[0].coordinates]
		},
		'honeyfrost-fr': {
			type: 'LineString',
			coordinates: [HOME_BASE.coordinates, CLIENTS[1].coordinates]
		},
		yeggs: {
			type: 'LineString',
			coordinates: [HOME_BASE.coordinates, CLIENTS[2].coordinates]
		},
		leadpro: {
			type: 'LineString',
			coordinates: [HOME_BASE.coordinates, CLIENTS[3].coordinates]
		}
	};

	const projection = d3.geoOrthographic().scale(GLOBE_RADIUS).translate(GLOBE_CENTER).clipAngle(90);

	function isPointVisible(coords: [number, number], rot: [number, number, number]): boolean {
		const viewCenter: [number, number] = [-rot[0], -rot[1]];
		return d3.geoDistance(coords, viewCenter) < Math.PI / 2 - 0.02;
	}

	const projectedClients = $derived.by(() => {
		const proj = d3
			.geoOrthographic()
			.scale(GLOBE_RADIUS)
			.translate(GLOBE_CENTER)
			.clipAngle(90)
			.rotate(rotation);

		return CLIENTS.map((client) => {
			const visible = isPointVisible(client.coordinates, rotation);
			const pos = proj(client.coordinates);
			const x = pos ? pos[0] : 0;
			const y = pos ? pos[1] : 0;
			const [dx, dy] = client.labelOffset;

			return {
				client,
				visible,
				x,
				y,
				badgeX: x + dx,
				badgeY: y + dy
			};
		});
	});

	function parseTopology(topo: Topology) {
		const objects = topo.objects as Record<string, GeometryCollection>;
		if (objects.land) {
			landFeatures = feature(topo, objects.land) as FeatureCollection<Geometry>;
		}
		if (objects.countries) {
			countryFeatures = feature(topo, objects.countries) as FeatureCollection<Geometry>;
		}
	}

	$effect(() => {
		if (worldTopology && !landFeatures && !countryFeatures) {
			parseTopology(worldTopology);
		}
	});

	// Rotate globe smoothly toward selected client when changed externally or via click
	$effect(() => {
		if (selectedClient) {
			const client = CLIENTS.find((c) => c.id === selectedClient);
			if (client) {
				const [lon, lat] = client.coordinates;
				// Position city in the upper-middle sweet spot of the 3/4 globe
				targetRotation = [-lon, Math.max(-38, Math.min(-8, -lat + 14)), DEFAULT_GAMMA];
				lastInteractionTime = performance.now();
			}
		} else {
			targetRotation = null;
		}
	});

	function handleClientClick(client: ClientInfo, e?: MouseEvent) {
		e?.stopPropagation();
		if (selectedClient === client.id) {
			onSelectClient(null);
		} else {
			onSelectClient(client.id);
		}
	}

	function resetGlobeView() {
		onSelectClient(null);
		targetRotation = [-18, DEFAULT_PHI, DEFAULT_GAMMA];
		lastInteractionTime = performance.now() - 2000;
	}

	let dragStartPos: [number, number] = [0, 0];
	let dragStartRot: [number, number, number] = [0, 0, 0];

	function onPointerDown(e: PointerEvent) {
		const target = e.target as HTMLElement | null;
		if (target?.closest('.globe-client-pin, .globe-hud-btn, .selected-client-card')) return;

		isDragging = true;
		targetRotation = null;
		dragStartPos = [e.clientX, e.clientY];
		dragStartRot = [...rotation] as [number, number, number];
		lastInteractionTime = performance.now();
		(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
	}

	function onPointerMove(e: PointerEvent) {
		if (!isDragging) return;
		const dx = e.clientX - dragStartPos[0];
		const dy = e.clientY - dragStartPos[1];

		const sensitivity = 0.28;
		const nextLambda = dragStartRot[0] + dx * sensitivity;
		const nextPhi = Math.max(-55, Math.min(25, dragStartRot[1] - dy * sensitivity));
		rotation = [nextLambda, nextPhi, DEFAULT_GAMMA];
		lastInteractionTime = performance.now();
	}

	function onPointerUp(e: PointerEvent) {
		if (!isDragging) return;
		isDragging = false;
		lastInteractionTime = performance.now();
		try {
			(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
		} catch {
			// Ignore if not captured
		}
	}

	onMount(() => {
		if (!worldTopology) {
			fetch('/geo/countries-110m.json')
				.then((r) => r.json())
				.then((topo: Topology) => parseTopology(topo))
				.catch(() => {
					// Fallback if countries fails
				});
		}

		const canvas = canvasEl;
		if (!canvas) return;
		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		const dpr = Math.min(window.devicePixelRatio || 1, 2);
		canvas.width = VIEW_W * dpr;
		canvas.height = VIEW_H * dpr;

		// Theme palette cache so getComputedStyle is never called per animation frame
		let palette = {
			bgBase: '#18181b',
			ocean: 'rgba(28, 28, 32, 0.78)',
			land: 'rgba(48, 48, 54, 0.85)',
			landStroke: 'rgba(170, 170, 175, 0.42)',
			graticule: 'rgba(255, 255, 255, 0.075)',
			rim: 'rgba(255, 255, 255, 0.24)',
			accent: '#9cf6e4',
			fgPrimary: '#f4f4f5',
			fgSecondary: '#a1a1aa',
			fgMuted: '#71717a',
			borderSubtle: 'rgba(255, 255, 255, 0.13)'
		};
		let dotPattern: CanvasPattern | null = null;

		function refreshPalette() {
			const styles = getComputedStyle(document.documentElement);
			const read = (prop: string, fallback: string) =>
				styles.getPropertyValue(prop).trim() || fallback;

			palette = {
				bgBase: read('--bg-base', '#18181b'),
				ocean: read('--globe-ocean', 'rgba(28, 28, 32, 0.78)'),
				land: read('--globe-land', 'rgba(48, 48, 54, 0.85)'),
				landStroke: read('--globe-land-stroke', 'rgba(170, 170, 175, 0.42)'),
				graticule: read('--globe-graticule', 'rgba(255, 255, 255, 0.075)'),
				rim: read('--globe-rim', 'rgba(255, 255, 255, 0.24)'),
				accent: read('--accent', '#9cf6e4'),
				fgPrimary: read('--fg-primary', '#f4f4f5'),
				fgSecondary: read('--fg-secondary', '#a1a1aa'),
				fgMuted: read('--fg-muted', '#71717a'),
				borderSubtle: read('--border-subtle', 'rgba(255, 255, 255, 0.13)')
			};

			// Build 6x6 dotted continent pattern matching the original SVG #land-dots
			const pCanvas = document.createElement('canvas');
			pCanvas.width = 6 * dpr;
			pCanvas.height = 6 * dpr;
			const pCtx = pCanvas.getContext('2d');
			if (pCtx) {
				pCtx.scale(dpr, dpr);
				pCtx.fillStyle = palette.fgPrimary;
				pCtx.globalAlpha = 0.22;
				pCtx.beginPath();
				pCtx.arc(1.5, 1.5, 0.85, 0, Math.PI * 2);
				pCtx.fill();
				dotPattern = ctx ? ctx.createPattern(pCanvas, 'repeat') : null;
			}
		}

		refreshPalette();

		const themeObserver = new MutationObserver(() => {
			refreshPalette();
		});
		themeObserver.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ['data-theme']
		});

		const canvasPath = d3.geoPath(projection, ctx);

		function drawFrame(now: number) {
			if (!ctx) return;
			ctx.save();
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
			ctx.clearRect(0, 0, VIEW_W, VIEW_H);

			projection.rotate(rotation);

			const [cx, cy] = GLOBE_CENTER;

			// 1. Tilted Orbital Ring Reference Behind Sphere
			ctx.save();
			ctx.translate(cx, cy);
			ctx.rotate((DEFAULT_GAMMA * Math.PI) / 180);
			ctx.beginPath();
			ctx.ellipse(0, 0, GLOBE_RADIUS + 36, (GLOBE_RADIUS + 36) * 0.34, 0, 0, Math.PI * 2);
			ctx.strokeStyle = palette.borderSubtle;
			ctx.lineWidth = 1;
			ctx.setLineDash([4, 8]);
			ctx.stroke();
			ctx.restore();

			// 2. Atmospheric Rim Halo
			const atmoGrad = ctx.createRadialGradient(
				cx,
				cy,
				GLOBE_RADIUS * 0.82,
				cx,
				cy,
				GLOBE_RADIUS + 20
			);
			atmoGrad.addColorStop(0, 'transparent');
			atmoGrad.addColorStop(0.75, palette.borderSubtle);
			atmoGrad.addColorStop(1, 'transparent');
			ctx.beginPath();
			ctx.arc(cx, cy, GLOBE_RADIUS + 20, 0, Math.PI * 2);
			ctx.fillStyle = atmoGrad;
			ctx.fill();

			// 3. Sphere Base
			const sphereGrad = ctx.createRadialGradient(
				cx - GLOBE_RADIUS * 0.18,
				cy - GLOBE_RADIUS * 0.35,
				GLOBE_RADIUS * 0.08,
				cx,
				cy,
				GLOBE_RADIUS
			);
			sphereGrad.addColorStop(0, palette.ocean);
			sphereGrad.addColorStop(0.74, palette.ocean);
			sphereGrad.addColorStop(1, palette.bgBase);

			ctx.beginPath();
			canvasPath(sphereGeometry);
			ctx.fillStyle = sphereGrad;
			ctx.fill();
			ctx.strokeStyle = palette.rim;
			ctx.lineWidth = 1.25;
			ctx.stroke();

			// 4. Wireframe Graticule Meridians & Parallels
			ctx.beginPath();
			canvasPath(graticuleGeometry);
			ctx.strokeStyle = palette.graticule;
			ctx.lineWidth = 0.75;
			ctx.stroke();

			// 5. World Continents & Country Wireframes
			const geoFeatures = countryFeatures ?? landFeatures;
			if (geoFeatures) {
				ctx.beginPath();
				canvasPath(geoFeatures);
				ctx.fillStyle = palette.land;
				ctx.fill();

				if (dotPattern) {
					ctx.fillStyle = dotPattern;
					ctx.fill();
				}

				ctx.strokeStyle = palette.landStroke;
				ctx.lineWidth = 0.7;
				ctx.lineJoin = 'round';
				ctx.stroke();
			}

			// 6. Geodesic Remote Connection Arcs from Dhaka to Clients
			for (const client of CLIENTS) {
				const isHighlighted = selectedClient === client.id || hoveredClient === client.id;
				const arcGeo = clientArcGeometries[client.id];
				ctx.save();
				ctx.beginPath();
				canvasPath(arcGeo);
				ctx.strokeStyle = isHighlighted ? palette.accent : palette.fgMuted;
				ctx.globalAlpha = isHighlighted ? 0.88 : 0.3;
				ctx.lineWidth = isHighlighted ? 1.85 : 1;
				if (isHighlighted) {
					ctx.setLineDash([5, 4]);
					ctx.lineDashOffset = -((now * 0.014) % 18);
				} else {
					ctx.setLineDash([2, 5]);
				}
				ctx.stroke();
				ctx.restore();
			}

			// 7. Home Base Marker (Dhaka, Bangladesh)
			if (isPointVisible(HOME_BASE.coordinates, rotation)) {
				const homePos = projection(HOME_BASE.coordinates);
				if (homePos) {
					const [hx, hy] = homePos;
					ctx.save();
					ctx.translate(hx, hy);
					ctx.beginPath();
					ctx.arc(0, 0, 10, 0, Math.PI * 2);
					ctx.strokeStyle = palette.fgMuted;
					ctx.globalAlpha = 0.4;
					ctx.setLineDash([2, 2]);
					ctx.lineWidth = 1;
					ctx.stroke();

					ctx.setLineDash([]);
					ctx.globalAlpha = 1;
					ctx.beginPath();
					ctx.arc(0, 0, 3, 0, Math.PI * 2);
					ctx.fillStyle = palette.fgPrimary;
					ctx.fill();

					ctx.font = '500 10px "JetBrains Mono", monospace';
					ctx.fillStyle = palette.fgSecondary;
					ctx.fillText('HQ // DHAKA, BD', 13, 3.5);
					ctx.restore();
				}
			}

			// 8. Client Surface Pins & Leader Lines
			const pulseScale = 1 + 0.14 * Math.sin(now * 0.0024);
			for (const item of projectedClients) {
				if (!item.visible) continue;
				const active = selectedClient === item.client.id || hoveredClient === item.client.id;

				ctx.save();
				// Leader line from surface coordinate to logo callout
				ctx.beginPath();
				ctx.moveTo(item.x, item.y);
				ctx.lineTo(item.badgeX, item.badgeY);
				ctx.strokeStyle = active ? palette.accent : palette.fgMuted;
				ctx.lineWidth = active ? 1.5 : 1.05;
				ctx.globalAlpha = active ? 0.95 : 0.58;
				ctx.stroke();

				// Pulsing surface ring at exact city coordinate
				const ringR = (active ? 11 : 7) * pulseScale;
				ctx.beginPath();
				ctx.arc(item.x, item.y, ringR, 0, Math.PI * 2);
				ctx.strokeStyle = active ? palette.accent : palette.fgPrimary;
				ctx.globalAlpha = active ? 0.85 : 0.42;
				ctx.lineWidth = 1.25;
				ctx.stroke();

				// Solid center pin dot
				ctx.beginPath();
				ctx.arc(item.x, item.y, active ? 4.2 : 3.2, 0, Math.PI * 2);
				ctx.fillStyle = active ? palette.accent : palette.fgPrimary;
				ctx.globalAlpha = 1;
				ctx.fill();
				ctx.restore();
			}

			ctx.restore();
		}

		let rafId = 0;
		let prevTime = performance.now();
		let isVisibleInViewport = true;

		function animate(now: number) {
			if (!isVisibleInViewport) {
				rafId = 0;
				return;
			}

			const dt = Math.min(64, now - prevTime);
			prevTime = now;

			if (!isDragging) {
				if (targetRotation) {
					// Smooth spring interpolation toward selected client city
					const dLambda = ((((targetRotation[0] - rotation[0]) % 360) + 540) % 360) - 180;
					const dPhi = targetRotation[1] - rotation[1];
					const dGamma = targetRotation[2] - rotation[2];

					if (Math.abs(dLambda) < 0.15 && Math.abs(dPhi) < 0.15) {
						rotation = [targetRotation[0], targetRotation[1], targetRotation[2]];
						if (!selectedClient) {
							targetRotation = null;
						}
					} else {
						const factor = 1 - Math.pow(0.0015, dt / 1000);
						rotation = [
							rotation[0] + dLambda * factor,
							rotation[1] + dPhi * factor,
							rotation[2] + dGamma * factor
						];
					}
				} else if (!selectedClient && now - lastInteractionTime > 1400) {
					// Idle auto-rotation around tilted axis
					const speed = 0.011; // deg per ms
					const nextLambda = (rotation[0] + dt * speed) % 360;
					const nextPhi = rotation[1] + (DEFAULT_PHI - rotation[1]) * 0.03;
					rotation = [nextLambda, nextPhi, DEFAULT_GAMMA];
				}
			}

			drawFrame(now);
			rafId = requestAnimationFrame(animate);
		}

		const visibilityObserver = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					isVisibleInViewport = entry.isIntersecting;
					if (isVisibleInViewport && !rafId) {
						prevTime = performance.now();
						rafId = requestAnimationFrame(animate);
					}
				}
			},
			{ threshold: 0.01 }
		);

		if (shellEl) {
			visibilityObserver.observe(shellEl);
		}

		rafId = requestAnimationFrame(animate);

		return () => {
			if (rafId) cancelAnimationFrame(rafId);
			themeObserver.disconnect();
			visibilityObserver.disconnect();
		};
	});
</script>

<div class="globe-experience-shell glass-surface tactical-frame" bind:this={shellEl}>
	<!-- Top Telemetry Header Bar -->
	<div class="globe-telemetry-bar">
		<div class="telemetry-left">
			<span class="status-dot"></span>
			<Globe size={14} />
			<span class="mono-label">GEO_VIS // CLIENTS &amp; STUDIOS [ORTHO_3D]</span>
		</div>

		<div class="telemetry-right">
			<span class="coord-readout">
				AXIS: {rotation[0].toFixed(1)}° / {rotation[1].toFixed(1)}° / TILT {DEFAULT_GAMMA}°
			</span>
			{#if selectedClient || targetRotation}
				<button
					type="button"
					class="globe-hud-btn"
					onclick={resetGlobeView}
					title="Reset globe orbit and clear filter"
				>
					<RotateCcw size={12} />
					<span>AUTO-ORBIT</span>
				</button>
			{/if}
		</div>
	</div>

	<!-- Full-Width 3/4 Tilted D3 Wireframe Globe Viewport -->
	<div
		class="globe-viewport {isDragging ? 'is-dragging' : ''}"
		onpointerdown={onPointerDown}
		onpointermove={onPointerMove}
		onpointerup={onPointerUp}
		onpointercancel={onPointerUp}
		role="region"
		aria-label="Interactive 3D globe showing remote client locations"
	>
		<canvas class="globe-canvas" bind:this={canvasEl}></canvas>

		<!-- HTML Overlay for Larger Interactive Client Node Cards on Globe -->
		<div class="globe-markers-overlay">
			{#each projectedClients as item (item.client.id)}
				{@const isSelected = selectedClient === item.client.id}
				{@const isHovered = hoveredClient === item.client.id}
				{#if item.visible}
					<button
						type="button"
						class="globe-client-pin {isSelected ? 'is-selected' : ''} {isHovered
							? 'is-hovered'
							: ''}"
						style="left: {(item.badgeX / VIEW_W) * 100}%; top: {(item.badgeY / VIEW_H) * 100}%;"
						onclick={(e) => handleClientClick(item.client, e)}
						onmouseenter={() => (hoveredClient = item.client.id)}
						onmouseleave={() => (hoveredClient = null)}
						aria-pressed={isSelected}
						title="Filter projects by {item.client.name} ({item.client.location})"
					>
						<span class="pin-logo-box">
							{#if item.client.logoType === 'svg-mask'}
								<span
									class="masked-svg-logo"
									style="-webkit-mask-image: url('{item.client.logo}'); mask-image: url('{item
										.client.logo}');"
								></span>
							{:else}
								<img
									src={item.client.logo}
									alt=""
									class="client-pin-img {item.client.id === 'yeggs' ? 'is-rounded' : ''}"
								/>
							{/if}
						</span>
						<span class="pin-meta">
							<span class="pin-name">
								{item.client.name}
								{#if item.client.isCurrent}
									<span class="live-pill">NOW</span>
								{/if}
							</span>
							<span class="pin-city">{item.client.location}</span>
						</span>
					</button>
				{/if}
			{/each}
		</div>

		<!-- Bottom-Left Selected Client Detailed Card -->
		{#if selectedClientObj}
			<aside
				class="selected-client-card tactical-frame"
				aria-label="Selected client details: {selectedClientObj.detailName}"
			>
				<div class="detail-card-main">
					<div class="detail-logo-wrap">
						{#if selectedClientObj.logoType === 'svg-mask'}
							<span
								class="masked-svg-logo"
								style="-webkit-mask-image: url('{selectedClientObj.logo}'); mask-image: url('{selectedClientObj.logo}');"
							></span>
						{:else}
							<img
								src={selectedClientObj.logo}
								alt="{selectedClientObj.name} logo"
								class="client-pin-img {selectedClientObj.id === 'yeggs' ? 'is-rounded' : ''}"
							/>
						{/if}
					</div>

					<div class="detail-info">
						<div class="detail-top-line">
							<span class="detail-company">{selectedClientObj.detailName}</span>
							<div class="detail-actions">
								{#if selectedClientObj.isCurrent}
									<span class="active-badge">
										<Sparkles size={10} />
										CURRENT
									</span>
								{/if}
								<button
									type="button"
									class="detail-close-btn"
									onclick={() => onSelectClient(null)}
									aria-label="Close client details and clear filter"
									title="Close details"
								>
									<X size={13} />
								</button>
							</div>
						</div>

						<div class="detail-roles">
							{selectedClientObj.roles.join(' · ')}
						</div>

						<div class="detail-meta-row">
							<span class="detail-loc">
								<MapPin size={12} />
								{selectedClientObj.location}
							</span>
							<span class="detail-period">{selectedClientObj.period}</span>
						</div>
					</div>
				</div>
			</aside>
		{/if}

		<div class="globe-bottom-fade" aria-hidden="true"></div>
		<div class="globe-drag-hint">
			<span>DRAG TO ORBIT // CLICK NODE TO FILTER</span>
		</div>
	</div>
</div>

<style>
	.globe-experience-shell {
		border-radius: 16px;
		overflow: hidden;
		margin-bottom: 1.75rem;
	}

	.globe-telemetry-bar {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		padding: 0.75rem 1.25rem;
		border-bottom: 1px solid var(--border-subtle);
		background: var(--bg-chip);
		font-family: var(--font-mono);
		font-size: 0.7rem;
		letter-spacing: 0.08em;
		color: var(--fg-secondary);
	}

	.telemetry-left,
	.telemetry-right {
		display: flex;
		align-items: center;
		gap: 0.55rem;
	}

	.status-dot {
		width: 7px;
		height: 7px;
		border-radius: 50%;
		background-color: var(--accent);
		box-shadow: 0 0 8px var(--accent);
	}

	.coord-readout {
		color: var(--fg-muted);
		font-variant-numeric: tabular-nums;
	}

	.globe-hud-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.25rem 0.6rem;
		border-radius: 6px;
		border: 1px solid var(--border-strong);
		background: var(--bg-surface);
		color: var(--fg-primary);
		font-family: var(--font-mono);
		font-size: 0.65rem;
		letter-spacing: 0.06em;
		transition:
			border-color 0.2s ease,
			background-color 0.2s ease;
	}

	.globe-hud-btn:hover {
		border-color: var(--accent);
		background: var(--accent-soft);
	}

	.globe-viewport {
		position: relative;
		width: 100%;
		aspect-ratio: 1120 / 520;
		min-height: 380px;
		overflow: hidden;
		user-select: none;
		touch-action: pan-y;
	}

	.globe-canvas {
		width: 100%;
		height: 100%;
		display: block;
	}

	.globe-markers-overlay {
		position: absolute;
		inset: 0;
		pointer-events: none;
	}

	/* Larger, high-clarity Geo-Vis Node Cards */
	.globe-client-pin {
		position: absolute;
		transform: translate(-50%, -50%);
		pointer-events: auto;
		display: inline-flex;
		align-items: center;
		gap: 0.65rem;
		padding: 0.48rem 0.85rem 0.48rem 0.52rem;
		border-radius: 10px;
		background: var(--bg-glass-strong);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		border: 1px solid var(--border-strong);
		color: var(--fg-primary);
		box-shadow: 0 10px 28px -6px oklch(0% 0 0 / 0.55);
		text-align: left;
		transition:
			transform 0.2s cubic-bezier(0.22, 1, 0.36, 1),
			border-color 0.2s ease,
			box-shadow 0.2s ease,
			background-color 0.2s ease;
	}

	.globe-client-pin:hover,
	.globe-client-pin.is-hovered {
		transform: translate(-50%, -50%) scale(1.05);
		border-color: var(--accent);
	}

	.globe-client-pin.is-selected {
		border-color: var(--accent);
		background: var(--bg-surface);
		box-shadow:
			0 0 0 1px var(--accent),
			0 12px 32px -6px var(--accent-glow);
	}

	.pin-logo-box {
		width: 34px;
		height: 34px;
		border-radius: 7px;
		background: var(--bg-chip);
		border: 1px solid var(--border-subtle);
		display: inline-flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		padding: 4px;
	}

	.masked-svg-logo {
		display: inline-block;
		width: 100%;
		height: 100%;
		background-color: var(--fg-primary);
		-webkit-mask-size: contain;
		mask-size: contain;
		-webkit-mask-repeat: no-repeat;
		mask-repeat: no-repeat;
		-webkit-mask-position: center;
		mask-position: center;
		transition: background-color 0.2s ease;
	}

	.globe-client-pin.is-selected .masked-svg-logo,
	.selected-client-card .masked-svg-logo {
		background-color: var(--accent-text);
	}

	.client-pin-img {
		width: 100%;
		height: 100%;
		object-fit: contain;
	}

	.client-pin-img.is-rounded {
		border-radius: 4px;
	}

	.pin-meta {
		display: flex;
		flex-direction: column;
		gap: 2px;
		line-height: 1.2;
	}

	.pin-name {
		font-family: var(--font-display);
		font-size: 0.86rem;
		font-weight: 700;
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		white-space: nowrap;
	}

	.live-pill {
		font-family: var(--font-mono);
		font-size: 0.6rem;
		padding: 2px 5px;
		border-radius: 4px;
		background: var(--accent);
		color: var(--accent-ink);
		font-weight: 700;
	}

	.pin-city {
		font-family: var(--font-mono);
		font-size: 0.7rem;
		color: var(--fg-secondary);
		white-space: nowrap;
	}

	/* Bottom-Left Selected Client Detailed Card */
	.selected-client-card {
		position: absolute;
		bottom: 16px;
		left: 16px;
		z-index: 5;
		width: min(390px, calc(100% - 32px));
		padding: 0.9rem 1rem;
		border-radius: 12px;
		border: 1px solid var(--accent-border);
		background: var(--bg-glass-strong);
		backdrop-filter: blur(16px);
		-webkit-backdrop-filter: blur(16px);
		box-shadow:
			inset 3px 0 0 0 var(--accent),
			0 16px 38px -8px oklch(0% 0 0 / 0.6);
		color: var(--fg-primary);
		pointer-events: auto;
	}

	.detail-card-main {
		display: flex;
		align-items: flex-start;
		gap: 0.85rem;
	}

	.detail-logo-wrap {
		width: 40px;
		height: 40px;
		border-radius: 9px;
		background: var(--bg-surface);
		border: 1px solid var(--border-subtle);
		padding: 6px;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.detail-info {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.detail-top-line {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
	}

	.detail-company {
		font-family: var(--font-display);
		font-size: 0.94rem;
		font-weight: 700;
		color: var(--fg-primary);
	}

	.detail-actions {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		flex-shrink: 0;
	}

	.active-badge {
		display: inline-flex;
		align-items: center;
		gap: 0.22rem;
		font-family: var(--font-mono);
		font-size: 0.58rem;
		font-weight: 700;
		padding: 0.14rem 0.44rem;
		border-radius: 999px;
		background: var(--accent);
		color: var(--accent-ink);
	}

	.detail-close-btn {
		width: 22px;
		height: 22px;
		border-radius: 6px;
		border: 1px solid var(--border-subtle);
		background: var(--bg-chip);
		color: var(--fg-secondary);
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0;
		transition:
			border-color 0.2s ease,
			color 0.2s ease,
			background-color 0.2s ease;
	}

	.detail-close-btn:hover {
		border-color: var(--accent);
		color: var(--fg-primary);
		background: var(--accent-soft);
	}

	.detail-roles {
		font-size: 0.8rem;
		color: var(--fg-secondary);
		font-weight: 500;
	}

	.detail-meta-row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		margin-top: 0.2rem;
		font-family: var(--font-mono);
		font-size: 0.68rem;
		color: var(--fg-muted);
	}

	.detail-loc {
		display: inline-flex;
		align-items: center;
		gap: 0.28rem;
		color: var(--fg-secondary);
	}

	.globe-bottom-fade {
		position: absolute;
		inset: auto 0 0 0;
		height: 54px;
		background: linear-gradient(to top, var(--bg-surface) 0%, transparent 100%);
		pointer-events: none;
		opacity: 0.65;
	}

	/* Control instruction moved to bottom-right */
	.globe-drag-hint {
		position: absolute;
		bottom: 14px;
		right: 18px;
		z-index: 3;
		font-family: var(--font-mono);
		font-size: 0.64rem;
		letter-spacing: 0.08em;
		color: var(--fg-secondary);
		pointer-events: none;
	}

	@media (max-width: 640px) {
		.globe-viewport {
			aspect-ratio: 4 / 3;
			min-height: 360px;
		}

		.globe-client-pin {
			padding: 0.36rem 0.62rem 0.36rem 0.4rem;
			gap: 0.45rem;
		}

		.pin-logo-box {
			width: 26px;
			height: 26px;
		}

		.pin-name {
			font-size: 0.75rem;
		}

		.pin-city {
			font-size: 0.6rem;
		}

		.globe-drag-hint {
			display: none;
		}
	}
</style>
