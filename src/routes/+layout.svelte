<script lang="ts">
	import '../app.css';
	import favicon from '#lib/assets/favicon.svg';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>Ash // Portfolio</title>
	<link rel="canonical" href="https://da4thedge.com/" />
	<meta property="og:type" content="website" />
	<meta property="og:site_name" content="Ash // Portfolio" />
	<meta property="og:title" content="Ash // Portfolio" />
	<meta
		property="og:description"
		content="Ash - Minecraft Bedrock Add-on Developer, Full Stack Engineer, and AI Systems Integrator."
	/>
	<meta property="og:url" content="https://da4thedge.com/" />
	<meta property="og:image" content="https://da4thedge.com/social-icon.png" />
	<meta property="og:image:width" content="512" />
	<meta property="og:image:height" content="512" />
	<meta property="og:image:alt" content="Ash's portfolio logo" />
	<meta name="twitter:card" content="summary" />
	<meta name="twitter:image" content="https://da4thedge.com/social-icon.png" />
	<meta name="theme-color" content="#a2f0e2" />
</svelte:head>

{@render children()}
