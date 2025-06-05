export { matchers } from './matchers.js';

export const nodes = [
	() => import('./nodes/0'),
	() => import('./nodes/1'),
	() => import('./nodes/2'),
	() => import('./nodes/3'),
	() => import('./nodes/4'),
	() => import('./nodes/5'),
	() => import('./nodes/6'),
	() => import('./nodes/7'),
	() => import('./nodes/8'),
	() => import('./nodes/9'),
	() => import('./nodes/10'),
	() => import('./nodes/11'),
	() => import('./nodes/12'),
	() => import('./nodes/13'),
	() => import('./nodes/14'),
	() => import('./nodes/15'),
	() => import('./nodes/16'),
	() => import('./nodes/17'),
	() => import('./nodes/18'),
	() => import('./nodes/19'),
	() => import('./nodes/20'),
	() => import('./nodes/21'),
	() => import('./nodes/22'),
	() => import('./nodes/23'),
	() => import('./nodes/24'),
	() => import('./nodes/25'),
	() => import('./nodes/26'),
	() => import('./nodes/27'),
	() => import('./nodes/28'),
	() => import('./nodes/29')
];

export const server_loads = [0];

export const dictionary = {
		"/": [~3],
		"/agents": [~4],
		"/agents/[agentId]": [~5],
		"/auth/login": [~6],
		"/auth/logout": [~7],
		"/compose": [~8],
		"/compose/agent/[agentId]/[composeName]": [~10],
		"/compose/new": [~11],
		"/compose/[composeId]": [~9],
		"/containers": [~12],
		"/containers/[id]": [~13],
		"/images": [~14],
		"/images/[imageId]": [~15],
		"/networks": [~16],
		"/networks/[networkId]": [~17],
		"/onboarding/complete": [18,[2]],
		"/onboarding/password": [~19,[2]],
		"/onboarding/settings": [~20,[2]],
		"/onboarding/welcome": [~21,[2]],
		"/settings/docker": [~22],
		"/settings/general": [~23],
		"/settings/rbac": [~24],
		"/settings/security": [~25],
		"/settings/templates": [~26],
		"/settings/users": [~27],
		"/volumes": [~28],
		"/volumes/[volumeName]": [~29]
	};

export const hooks = {
	handleError: (({ error }) => { console.error(error) }),
	
	reroute: (() => {}),
	transport: {}
};

export const decoders = Object.fromEntries(Object.entries(hooks.transport).map(([k, v]) => [k, v.decode]));

export const hash = false;

export const decode = (type, value) => decoders[type](value);

export { default as root } from '../root.js';