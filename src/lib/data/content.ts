export type ClientId = 'honeyfrost-mt' | 'honeyfrost-fr' | 'yeggs' | 'leadpro';

export type ProjectClientId = ClientId | 'confidential';

export interface ClientInfo {
	id: ClientId;
	name: string;
	detailName: string;
	location: string;
	country: string;
	coordinates: [number, number]; // [longitude, latitude]
	period: string;
	isCurrent?: boolean;
	roles: string[];
	logo: string;
	logoType: 'svg-mask' | 'svg' | 'webp';
	labelOffset: [number, number]; // [dx, dy] on globe screen space to avoid overlap
}

export interface ProjectItem {
	id: string;
	title: string;
	clientId: ProjectClientId;
	clientName: string;
	publisher: string;
	dateLabel?: string;
	sortDate: string; // ISO YYYY-MM-DD for sorting by latest
	thumbnail?: string;
	externalUrl?: string;
	screenshots?: string[];
	description?: string;
	role?: string;
	stack?: string[];
	statusBadge?: string;
}

export interface ExpertiseCategory {
	id: string;
	code: string;
	title: string;
	items: {
		name: string;
		tag: string;
	}[];
}

export interface SocialChannel {
	id: string;
	label: string;
	handle: string;
	href: string;
	code: string;
	copyValue?: string;
	download?: boolean;
}

export const HOME_BASE = {
	city: 'Dhaka, Bangladesh',
	timeZone: 'Asia/Dhaka',
	coordinates: [90.4125, 23.8103] as [number, number]
};

export const CLIENTS: ClientInfo[] = [
	{
		id: 'honeyfrost-mt',
		name: 'Forthyones Limited',
		detailName: 'Forthyones Limited • Honeyfrost',
		location: 'Marsa, Malta',
		country: 'Malta',
		coordinates: [14.4953, 35.8792],
		period: 'May 2025 – Current',
		isCurrent: true,
		roles: ['Minecraft Add-on Developer', 'Full Stack Engineer'],
		logo: '/clients/honeyfrost.svg',
		logoType: 'svg-mask',
		labelOffset: [88, 44]
	},
	{
		id: 'honeyfrost-fr',
		name: 'Honeyfrost (France)',
		detailName: 'Honeyfrost (France)',
		location: 'Chessenaz, France',
		country: 'France',
		coordinates: [6.0375, 46.0319],
		period: 'Apr 2021 – Mar 2025',
		roles: ['Minecraft Add-on Developer'],
		logo: '/clients/honeyfrost.svg',
		logoType: 'svg-mask',
		labelOffset: [-88, -46]
	},
	{
		id: 'yeggs',
		name: 'Yeggs',
		detailName: 'Yeggs',
		location: 'Del Mar, California',
		country: 'United States',
		coordinates: [-117.2653, 32.9595],
		period: 'Jan 2022 – Sep 2022',
		roles: ['Minecraft Add-on Developer'],
		logo: '/clients/yeggs.webp',
		logoType: 'webp',
		labelOffset: [86, 42]
	},
	{
		id: 'leadpro',
		name: 'LeadPro',
		detailName: 'LeadPro',
		location: 'San Jose, California',
		country: 'United States',
		coordinates: [-121.8863, 37.3382],
		period: 'Oct 2020 – Jun 2022',
		roles: ['Minecraft Add-on Developer'],
		logo: '/clients/leadpro.svg',
		logoType: 'svg',
		labelOffset: [-86, -44]
	}
];

const RAW_PROJECTS: ProjectItem[] = [
	{
		id: 'internal-management-portals',
		title: 'Internal Management and Database portals',
		clientId: 'confidential',
		clientName: 'Confidential',
		publisher: 'Confidential',
		sortDate: '9999-01-02',
		description: 'Experience developing internal accounting and database applications.',
		role: 'Full Stack Developer',
		stack: ['SvelteKit', 'Tailwind CSS', 'PostgreSQL', 'Supabase', 'Resend']
	},
	{
		id: 'minecraft-themed-uis',
		title: 'Demo Minecraft-themed UIs',
		clientId: 'confidential',
		clientName: 'Confidential',
		publisher: 'Confidential',
		sortDate: '9999-01-01',
		description: 'Experience developing Minecraft-themed UIs for showcase purposes.',
		role: 'Frontend Developer',
		stack: ['SvelteKit', 'Tailwind CSS']
	},
	{
		id: 'rlcraft-bedrock-edition',
		title: 'RLCraft Bedrock Edition',
		clientId: 'honeyfrost-mt',
		clientName: 'Forthyones Limited',
		publisher: 'Honeyfrost',
		dateLabel: 'Jul 22, 2025',
		sortDate: '2025-07-22',
		thumbnail: '/projects/17-rlcraft.webp',
		externalUrl:
			'https://www.minecraft.net/en-us/marketplace/pdp/062d87b7-819a-437d-9493-2a6603449220',
		role: 'Minecraft Add-on Developer',
		stack: ['Scripting API', 'Add-ons', 'JSON UI']
	},
	{
		id: 'pirate-mashup',
		title: 'Pirate Mashup',
		clientId: 'honeyfrost-fr',
		clientName: 'Honeyfrost (France)',
		publisher: 'Honeyfrost',
		dateLabel: 'May 7, 2024',
		sortDate: '2024-05-07',
		thumbnail: '/projects/16-pirate-mashup.webp',
		externalUrl:
			'https://www.minecraft.net/en-us/marketplace/pdp/71a4d392-a036-4c17-ad18-851614fd2a33',
		role: 'Minecraft Add-on Developer',
		stack: ['Level Design', 'JSON UI', 'QA']
	},
	{
		id: 'skyblock-hd-mashup',
		title: 'Skyblock HD Mashup',
		clientId: 'honeyfrost-fr',
		clientName: 'Honeyfrost (France)',
		publisher: 'Honeyfrost',
		dateLabel: 'Aug 29, 2023',
		sortDate: '2023-08-29',
		thumbnail: '/projects/15-skyblock-hd-mashup.webp',
		externalUrl:
			'https://www.minecraft.net/en-us/marketplace/pdp/87936efd-3667-41be-a41e-394f6d3f79ec',
		role: 'Minecraft Add-on Developer',
		stack: ['Level Design', 'QA']
	},
	{
		id: 'boss-expansion',
		title: 'Boss Expansion',
		clientId: 'honeyfrost-fr',
		clientName: 'Honeyfrost (France)',
		publisher: 'Honeyfrost',
		dateLabel: 'Jul 4, 2023',
		sortDate: '2023-07-04',
		thumbnail: '/projects/14-boss-expansion.webp',
		externalUrl:
			'https://www.minecraft.net/en-us/marketplace/pdp/70c45b79-0478-42dc-bdbf-e7feadd4dba1',
		role: 'Minecraft Add-on Developer',
		stack: ['Level Design', 'Boss AI', 'QA']
	},
	{
		id: 'warden-dimension',
		title: 'WARDEN DIMENSION',
		clientId: 'honeyfrost-fr',
		clientName: 'Honeyfrost (France)',
		publisher: 'Honeyfrost',
		dateLabel: 'May 2, 2023',
		sortDate: '2023-05-02',
		thumbnail: '/projects/13-warden-dimension.webp',
		externalUrl:
			'https://www.minecraft.net/en-us/marketplace/pdp/c36c3b17-eed5-4f24-a641-256356237d2c',
		role: 'Minecraft Add-on Developer',
		stack: ['Level Design', 'Boss AI', 'Structures', 'NPC Behavior', 'Entity Behavior']
	},
	{
		id: 'planes-expansion',
		title: 'Planes Expansion',
		clientId: 'honeyfrost-fr',
		clientName: 'Honeyfrost (France)',
		publisher: 'Honeyfrost',
		dateLabel: 'Feb 22, 2023',
		sortDate: '2023-02-22',
		thumbnail: '/projects/9-planes-expansion.webp',
		externalUrl:
			'https://www.minecraft.net/en-us/marketplace/pdp/570ee8d3-e112-4a21-817a-b62bb5e0d690',
		role: 'Minecraft Add-on Developer',
		stack: ['Level Design', 'Vehicle Mechanics', 'Structures', 'NPC Behavior']
	},
	{
		id: 'weapons',
		title: 'Weapons',
		clientId: 'honeyfrost-fr',
		clientName: 'Honeyfrost (France)',
		publisher: 'Honeyfrost',
		dateLabel: 'Jan 25, 2023',
		sortDate: '2023-01-25',
		thumbnail: '/projects/8-weapons.webp',
		externalUrl:
			'https://www.minecraft.net/en-us/marketplace/pdp/d16d0068-29d4-4618-9d6b-a75afe9eb005',
		role: 'Minecraft Add-on Developer',
		stack: ['Scripting API', 'Weapon Mechanics', 'QA']
	},
	{
		id: 'road-warrior',
		title: 'Road Warrior',
		clientId: 'honeyfrost-fr',
		clientName: 'Honeyfrost (France)',
		publisher: 'Honeyfrost',
		dateLabel: 'Jan 4, 2023',
		sortDate: '2023-01-04',
		thumbnail: '/projects/12-road-warrior.webp',
		externalUrl:
			'https://www.minecraft.net/en-us/marketplace/pdp/8c1ea59c-1ae8-4db1-b8fa-4183e0687757',
		role: 'Minecraft Add-on Developer',
		stack: ['Level Design', 'Vehicle Mechanics', 'Weapon Mechanics', 'Boss AI', 'QA']
	},
	{
		id: 'medieval-weapons',
		title: 'Medieval Weapons',
		clientId: 'honeyfrost-fr',
		clientName: 'Honeyfrost (France)',
		publisher: 'Honeyfrost',
		dateLabel: 'Oct 4, 2022',
		sortDate: '2022-10-04',
		thumbnail: '/projects/11-medieval-weapons.webp',
		externalUrl:
			'https://www.minecraft.net/en-us/marketplace/pdp/70290480-241b-4244-9326-7bcd4d646f47',
		role: 'Minecraft Add-on Developer',
		stack: ['Level Design', 'Weapon Mechanics', 'NPC Behavior']
	},
	{
		id: 'puppy-town',
		title: 'Puppy Town',
		clientId: 'yeggs',
		clientName: 'Yeggs',
		publisher: 'Yeggs',
		dateLabel: 'Sep 27, 2022',
		sortDate: '2022-09-27',
		thumbnail: '/projects/7-puppy-town.webp',
		externalUrl:
			'https://www.minecraft.net/en-us/marketplace/pdp/6711131d-b9ff-4b62-9599-28cacee74cb5',
		role: 'Minecraft Add-on Developer',
		stack: ['Level Design', 'Vehicle Mechanics', 'Entity Behavior']
	},
	{
		id: 'anime-plus-plus',
		title: 'ANIME++',
		clientId: 'honeyfrost-fr',
		clientName: 'Honeyfrost (France)',
		publisher: 'Honeyfrost',
		dateLabel: 'Aug 30, 2022',
		sortDate: '2022-08-30',
		thumbnail: '/projects/10-anime-plus-plus.webp',
		externalUrl:
			'https://www.minecraft.net/en-us/marketplace/pdp/a775b7bd-c3a9-4abf-bc54-c10fc91e3730',
		role: 'Minecraft Add-on Developer',
		stack: ['Level Design', 'JSON UI', 'QA']
	},
	{
		id: 'escape-the-school',
		title: 'Escape The School',
		clientId: 'leadpro',
		clientName: 'LeadPro',
		publisher: 'BLOCKLAB Studios',
		dateLabel: 'Apr 26, 2022',
		sortDate: '2022-04-26',
		thumbnail: '/projects/5-escape-the-school.webp',
		externalUrl:
			'https://www.minecraft.net/en-us/marketplace/pdp/d6f1fc4d-eaac-4d7d-88e8-83c05a7b86da',
		role: 'Minecraft Add-on Developer',
		stack: ['Level Design', 'Minigames', 'NPC Behavior']
	},
	{
		id: 'spring-egg-hunt',
		title: 'Spring Egg Hunt',
		clientId: 'yeggs',
		clientName: 'Yeggs',
		publisher: 'Yeggs',
		dateLabel: 'Apr 19, 2022',
		sortDate: '2022-04-19',
		thumbnail: '/projects/6-spring-egg-hunt.webp',
		externalUrl:
			'https://www.minecraft.net/en-us/marketplace/pdp/f4137391-a06b-4e63-9067-62115cbf0d51',
		role: 'Minecraft Add-on Developer',
		stack: ['Level Design', 'Minigames', 'Entity Behavior']
	},
	{
		id: 'miracle-village',
		title: 'Miracle Village',
		clientId: 'leadpro',
		clientName: 'LeadPro',
		publisher: 'BLOCKLAB Studios',
		dateLabel: 'Apr 27, 2021',
		sortDate: '2021-04-27',
		thumbnail: '/projects/2-miracle-village.webp',
		externalUrl:
			'https://www.minecraft.net/en-us/marketplace/pdp/98fc0e66-0d98-4dc3-a678-dd1b35fdcbc9',
		role: 'Minecraft Add-on Developer',
		stack: ['Level Design', 'Entity Behavior']
	},
	{
		id: 'seven-wonders',
		title: 'Seven Wonders',
		clientId: 'leadpro',
		clientName: 'LeadPro',
		publisher: 'Razzleberries',
		dateLabel: 'Apr 20, 2021',
		sortDate: '2021-04-20',
		thumbnail: '/projects/4-seven-wonders.webp',
		externalUrl: 'https://chunk.gg/@razzleberries/seven-wonders',
		role: 'Minecraft Add-on Developer',
		stack: ['Level Design', 'NPC Behavior'],
		statusBadge: 'DELISTED // ARCHIVE'
	},
	{
		id: 'toxic-tides',
		title: 'Toxic Tides',
		clientId: 'leadpro',
		clientName: 'LeadPro',
		publisher: 'BLOCKLAB Studios',
		dateLabel: 'Mar 10, 2021',
		sortDate: '2021-03-10',
		thumbnail: '/projects/3-toxic-tides.webp',
		externalUrl:
			'https://www.minecraft.net/en-us/marketplace/pdp/28e7297d-a919-48dc-bd93-3d7de475cb51',
		role: 'Minecraft Add-on Developer',
		stack: ['Level Design', 'NPC Behavior']
	},
	{
		id: 'santas-palace',
		title: "Santa's Palace",
		clientId: 'leadpro',
		clientName: 'LeadPro',
		publisher: 'BLOCKLAB Studios',
		dateLabel: 'Dec 23, 2020',
		sortDate: '2020-12-23',
		thumbnail: '/projects/1-santas-palace.webp',
		externalUrl:
			'https://www.minecraft.net/en-us/marketplace/pdp/25a8c9dd-5b77-4cf3-af4d-d7f305b47424',
		role: 'Minecraft Add-on Developer',
		stack: ['Level Design', 'NPC Behavior', 'Entity Behavior']
	}
];

export const PROJECTS: ProjectItem[] = [...RAW_PROJECTS].sort((a, b) =>
	b.sortDate.localeCompare(a.sortDate)
);

export const EXPERTISE: ExpertiseCategory[] = [
	{
		id: 'minecraft-bedrock',
		code: 'SYS.01 // BEDROCK_ENGINE',
		title: 'Minecraft Bedrock',
		items: [
			{
				name: 'Scripting API',
				tag: '@minecraft/server'
			},
			{
				name: 'Add-ons',
				tag: 'BP // RP'
			},
			{
				name: 'Level Design',
				tag: 'GAMEPLAY_LOOP // NPC'
			},
			{
				name: 'Entity Behavior',
				tag: 'MOBS // BOSS_AI'
			},
			{
				name: 'JSON UI',
				tag: 'HUD // SCREENS'
			},
			{
				name: 'Structures',
				tag: 'JIGSAW // NBT'
			},
			{
				name: 'Worldgen',
				tag: 'BIOMES // FEATURES'
			}
		]
	},
	{
		id: 'web',
		code: 'SYS.02 // FULLSTACK_WEB',
		title: 'Web',
		items: [
			{
				name: 'React',
				tag: 'FRONTEND'
			},
			{
				name: 'SvelteKit',
				tag: 'FULLSTACK'
			},
			{
				name: 'PostgreSQL',
				tag: 'RELATIONAL_DB'
			},
			{
				name: 'DevOps',
				tag: 'CI/CD'
			},
			{
				name: 'Supabase',
				tag: 'BAAS // AUTH'
			},
			{
				name: 'Resend',
				tag: 'COMMS // SMTP'
			}
		]
	},
	{
		id: 'ai',
		code: 'SYS.03 // NEURAL_SYSTEMS',
		title: 'AI',
		items: [
			{
				name: 'Self-hosted LMs',
				tag: 'LOCAL_INFERENCE'
			},
			{
				name: 'ASR Models',
				tag: 'SPEECH // AUDIO'
			},
			{
				name: 'Classifier LMs',
				tag: 'DECISIONS_API'
			},
			{
				name: 'AI Integrations',
				tag: 'PIPELINES'
			}
		]
	}
];

export const SOCIAL_CHANNELS: SocialChannel[] = [
	{
		id: 'email',
		label: 'Email',
		handle: 'Direct transmission',
		href: 'mailto:da4thedge@gmail.com',
		code: 'CH_01 // SMTP'
	},
	{
		id: 'discord',
		label: 'Discord',
		handle: 'Real-time comms',
		href: '',
		copyValue: 'da_4th_edge',
		code: 'CH_02 // WUMPUS'
	},
	{
		id: 'linkedin',
		label: 'LinkedIn',
		handle: 'Professional network',
		href: 'https://www.linkedin.com/in/da4thedge',
		code: 'CH_03 // CORPO_RAT'
	},
	{
		id: 'github',
		label: 'GitHub',
		handle: 'Source repositories',
		href: 'https://github.com/Da4ThEdge',
		code: 'CH_04 // GIT'
	},
	{
		id: 'x',
		label: 'X',
		handle: 'Updates & thoughts',
		href: 'https://x.com/da4thedge',
		code: 'CH_05 // X_CORP'
	},
	/*{
		id: 'curseforge',
		label: 'CurseForge',
		handle: 'Published mods & add-ons',
		href: '',
		code: 'CH_06 // CF'
	},*/
	{
		id: 'youtube',
		label: 'YouTube',
		handle: 'Showcases & trailers',
		href: 'https://www.youtube.com/@Da4ThEdge',
		code: 'CH_07 // YT'
	},
	{
		id: 'resume',
		label: 'Résumé',
		handle: 'Download CV (PDF)',
		href: '/resume.pdf',
		download: true,
		code: 'CH_08 // CV'
	}
];

export const PRELOAD_IMAGE_URLS: string[] = [
	'/clients/honeyfrost.svg',
	'/clients/leadpro.svg',
	'/clients/yeggs.webp',
	...PROJECTS.flatMap((p) => (p.thumbnail ? [p.thumbnail] : [])).slice(0, 8)
];
