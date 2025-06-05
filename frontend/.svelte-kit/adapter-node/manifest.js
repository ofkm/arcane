export const manifest = (() => {
function __memo(fn) {
	let value;
	return () => value ??= (value = fn());
}

return {
	appDir: "_app",
	appPath: "_app",
	assets: new Set(["favicon.png","img/arcane.png","img/arcane.svg"]),
	mimeTypes: {".png":"image/png",".svg":"image/svg+xml"},
	_: {
		client: {start:"_app/immutable/entry/start.VpXHFlS0.js",app:"_app/immutable/entry/app.Daa4CgOm.js",imports:["_app/immutable/entry/start.VpXHFlS0.js","_app/immutable/chunks/CGNubMbN.js","_app/immutable/chunks/SIFgIYqZ.js","_app/immutable/chunks/hybYrdok.js","_app/immutable/entry/app.Daa4CgOm.js","_app/immutable/chunks/SIFgIYqZ.js","_app/immutable/chunks/zguDtZw-.js","_app/immutable/chunks/hybYrdok.js","_app/immutable/chunks/D4OMRqmI.js","_app/immutable/chunks/BmbK19Nn.js","_app/immutable/chunks/C7TZ37ch.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:true},
		nodes: [
			__memo(() => import('./nodes/0.js')),
			__memo(() => import('./nodes/1.js')),
			__memo(() => import('./nodes/2.js')),
			__memo(() => import('./nodes/3.js')),
			__memo(() => import('./nodes/4.js')),
			__memo(() => import('./nodes/5.js')),
			__memo(() => import('./nodes/6.js')),
			__memo(() => import('./nodes/7.js')),
			__memo(() => import('./nodes/8.js')),
			__memo(() => import('./nodes/9.js')),
			__memo(() => import('./nodes/10.js')),
			__memo(() => import('./nodes/11.js')),
			__memo(() => import('./nodes/12.js')),
			__memo(() => import('./nodes/13.js')),
			__memo(() => import('./nodes/14.js')),
			__memo(() => import('./nodes/15.js')),
			__memo(() => import('./nodes/16.js')),
			__memo(() => import('./nodes/17.js')),
			__memo(() => import('./nodes/18.js')),
			__memo(() => import('./nodes/19.js')),
			__memo(() => import('./nodes/20.js')),
			__memo(() => import('./nodes/21.js')),
			__memo(() => import('./nodes/22.js')),
			__memo(() => import('./nodes/23.js')),
			__memo(() => import('./nodes/24.js')),
			__memo(() => import('./nodes/25.js')),
			__memo(() => import('./nodes/26.js')),
			__memo(() => import('./nodes/27.js')),
			__memo(() => import('./nodes/28.js')),
			__memo(() => import('./nodes/29.js'))
		],
		routes: [
			{
				id: "/",
				pattern: /^\/$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 3 },
				endpoint: null
			},
			{
				id: "/agents",
				pattern: /^\/agents\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 4 },
				endpoint: null
			},
			{
				id: "/agents/[agentId]",
				pattern: /^\/agents\/([^/]+?)\/?$/,
				params: [{"name":"agentId","optional":false,"rest":false,"chained":false}],
				page: { layouts: [0,], errors: [1,], leaf: 5 },
				endpoint: null
			},
			{
				id: "/api/agents",
				pattern: /^\/api\/agents\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/agents/_server.ts.js'))
			},
			{
				id: "/api/agents/heartbeat",
				pattern: /^\/api\/agents\/heartbeat\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/agents/heartbeat/_server.ts.js'))
			},
			{
				id: "/api/agents/register",
				pattern: /^\/api\/agents\/register\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/agents/register/_server.ts.js'))
			},
			{
				id: "/api/agents/[agentId]",
				pattern: /^\/api\/agents\/([^/]+?)\/?$/,
				params: [{"name":"agentId","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/agents/_agentId_/_server.ts.js'))
			},
			{
				id: "/api/agents/[agentId]/command",
				pattern: /^\/api\/agents\/([^/]+?)\/command\/?$/,
				params: [{"name":"agentId","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/agents/_agentId_/command/_server.ts.js'))
			},
			{
				id: "/api/agents/[agentId]/deployments",
				pattern: /^\/api\/agents\/([^/]+?)\/deployments\/?$/,
				params: [{"name":"agentId","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/agents/_agentId_/deployments/_server.ts.js'))
			},
			{
				id: "/api/agents/[agentId]/deploy/container",
				pattern: /^\/api\/agents\/([^/]+?)\/deploy\/container\/?$/,
				params: [{"name":"agentId","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/agents/_agentId_/deploy/container/_server.ts.js'))
			},
			{
				id: "/api/agents/[agentId]/deploy/image",
				pattern: /^\/api\/agents\/([^/]+?)\/deploy\/image\/?$/,
				params: [{"name":"agentId","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/agents/_agentId_/deploy/image/_server.ts.js'))
			},
			{
				id: "/api/agents/[agentId]/deploy/stack",
				pattern: /^\/api\/agents\/([^/]+?)\/deploy\/stack\/?$/,
				params: [{"name":"agentId","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/agents/_agentId_/deploy/stack/_server.ts.js'))
			},
			{
				id: "/api/agents/[agentId]/stacks",
				pattern: /^\/api\/agents\/([^/]+?)\/stacks\/?$/,
				params: [{"name":"agentId","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/agents/_agentId_/stacks/_server.ts.js'))
			},
			{
				id: "/api/agents/[agentId]/tasks",
				pattern: /^\/api\/agents\/([^/]+?)\/tasks\/?$/,
				params: [{"name":"agentId","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/agents/_agentId_/tasks/_server.ts.js'))
			},
			{
				id: "/api/agents/[agentId]/tasks/[taskId]",
				pattern: /^\/api\/agents\/([^/]+?)\/tasks\/([^/]+?)\/?$/,
				params: [{"name":"agentId","optional":false,"rest":false,"chained":false},{"name":"taskId","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/agents/_agentId_/tasks/_taskId_/_server.ts.js'))
			},
			{
				id: "/api/agents/[agentId]/tasks/[taskId]/result",
				pattern: /^\/api\/agents\/([^/]+?)\/tasks\/([^/]+?)\/result\/?$/,
				params: [{"name":"agentId","optional":false,"rest":false,"chained":false},{"name":"taskId","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/agents/_agentId_/tasks/_taskId_/result/_server.ts.js'))
			},
			{
				id: "/api/containers",
				pattern: /^\/api\/containers\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/containers/_server.ts.js'))
			},
			{
				id: "/api/containers/start-all",
				pattern: /^\/api\/containers\/start-all\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/containers/start-all/_server.ts.js'))
			},
			{
				id: "/api/containers/stop-all",
				pattern: /^\/api\/containers\/stop-all\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/containers/stop-all/_server.ts.js'))
			},
			{
				id: "/api/containers/[containerId]",
				pattern: /^\/api\/containers\/([^/]+?)\/?$/,
				params: [{"name":"containerId","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/containers/_containerId_/_server.ts.js'))
			},
			{
				id: "/api/containers/[containerId]/logs/stream",
				pattern: /^\/api\/containers\/([^/]+?)\/logs\/stream\/?$/,
				params: [{"name":"containerId","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/containers/_containerId_/logs/stream/_server.ts.js'))
			},
			{
				id: "/api/containers/[containerId]/pull",
				pattern: /^\/api\/containers\/([^/]+?)\/pull\/?$/,
				params: [{"name":"containerId","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/containers/_containerId_/pull/_server.ts.js'))
			},
			{
				id: "/api/containers/[containerId]/remove",
				pattern: /^\/api\/containers\/([^/]+?)\/remove\/?$/,
				params: [{"name":"containerId","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/containers/_containerId_/remove/_server.ts.js'))
			},
			{
				id: "/api/containers/[containerId]/restart",
				pattern: /^\/api\/containers\/([^/]+?)\/restart\/?$/,
				params: [{"name":"containerId","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/containers/_containerId_/restart/_server.ts.js'))
			},
			{
				id: "/api/containers/[containerId]/start",
				pattern: /^\/api\/containers\/([^/]+?)\/start\/?$/,
				params: [{"name":"containerId","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/containers/_containerId_/start/_server.ts.js'))
			},
			{
				id: "/api/containers/[containerId]/stats/stream",
				pattern: /^\/api\/containers\/([^/]+?)\/stats\/stream\/?$/,
				params: [{"name":"containerId","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/containers/_containerId_/stats/stream/_server.ts.js'))
			},
			{
				id: "/api/containers/[containerId]/stop",
				pattern: /^\/api\/containers\/([^/]+?)\/stop\/?$/,
				params: [{"name":"containerId","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/containers/_containerId_/stop/_server.ts.js'))
			},
			{
				id: "/api/convert",
				pattern: /^\/api\/convert\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/convert/_server.ts.js'))
			},
			{
				id: "/api/docker",
				pattern: /^\/api\/docker\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/docker/_server.ts.js'))
			},
			{
				id: "/api/docker/test-connection",
				pattern: /^\/api\/docker\/test-connection\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/docker/test-connection/_server.ts.js'))
			},
			{
				id: "/api/images",
				pattern: /^\/api\/images\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/images/_server.ts.js'))
			},
			{
				id: "/api/images/maturity",
				pattern: /^\/api\/images\/maturity\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/images/maturity/_server.ts.js'))
			},
			{
				id: "/api/images/prune",
				pattern: /^\/api\/images\/prune\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/images/prune/_server.ts.js'))
			},
			{
				id: "/api/images/pull-stream/[...name]",
				pattern: /^\/api\/images\/pull-stream(?:\/(.*))?\/?$/,
				params: [{"name":"name","optional":false,"rest":true,"chained":true}],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/images/pull-stream/_...name_/_server.ts.js'))
			},
			{
				id: "/api/images/pull/[...name]",
				pattern: /^\/api\/images\/pull(?:\/(.*))?\/?$/,
				params: [{"name":"name","optional":false,"rest":true,"chained":true}],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/images/pull/_...name_/_server.ts.js'))
			},
			{
				id: "/api/images/[id]",
				pattern: /^\/api\/images\/([^/]+?)\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/images/_id_/_server.ts.js'))
			},
			{
				id: "/api/images/[id]/maturity",
				pattern: /^\/api\/images\/([^/]+?)\/maturity\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/images/_id_/maturity/_server.ts.js'))
			},
			{
				id: "/api/networks/create",
				pattern: /^\/api\/networks\/create\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/networks/create/_server.ts.js'))
			},
			{
				id: "/api/networks/[id]",
				pattern: /^\/api\/networks\/([^/]+?)\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/networks/_id_/_server.ts.js'))
			},
			{
				id: "/api/settings",
				pattern: /^\/api\/settings\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/settings/_server.ts.js'))
			},
			{
				id: "/api/stacks/create",
				pattern: /^\/api\/stacks\/create\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/stacks/create/_server.ts.js'))
			},
			{
				id: "/api/stacks/import",
				pattern: /^\/api\/stacks\/import\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/stacks/import/_server.ts.js'))
			},
			{
				id: "/api/stacks/validate",
				pattern: /^\/api\/stacks\/validate\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/stacks/validate/_server.ts.js'))
			},
			{
				id: "/api/stacks/[stackId]",
				pattern: /^\/api\/stacks\/([^/]+?)\/?$/,
				params: [{"name":"stackId","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/stacks/_stackId_/_server.ts.js'))
			},
			{
				id: "/api/stacks/[stackId]/changes",
				pattern: /^\/api\/stacks\/([^/]+?)\/changes\/?$/,
				params: [{"name":"stackId","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/stacks/_stackId_/changes/_server.ts.js'))
			},
			{
				id: "/api/stacks/[stackId]/deployment-preview",
				pattern: /^\/api\/stacks\/([^/]+?)\/deployment-preview\/?$/,
				params: [{"name":"stackId","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/stacks/_stackId_/deployment-preview/_server.ts.js'))
			},
			{
				id: "/api/stacks/[stackId]/deploy",
				pattern: /^\/api\/stacks\/([^/]+?)\/deploy\/?$/,
				params: [{"name":"stackId","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/stacks/_stackId_/deploy/_server.ts.js'))
			},
			{
				id: "/api/stacks/[stackId]/destroy",
				pattern: /^\/api\/stacks\/([^/]+?)\/destroy\/?$/,
				params: [{"name":"stackId","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/stacks/_stackId_/destroy/_server.ts.js'))
			},
			{
				id: "/api/stacks/[stackId]/down",
				pattern: /^\/api\/stacks\/([^/]+?)\/down\/?$/,
				params: [{"name":"stackId","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/stacks/_stackId_/down/_server.ts.js'))
			},
			{
				id: "/api/stacks/[stackId]/logs",
				pattern: /^\/api\/stacks\/([^/]+?)\/logs\/?$/,
				params: [{"name":"stackId","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/stacks/_stackId_/logs/_server.ts.js'))
			},
			{
				id: "/api/stacks/[stackId]/migrate",
				pattern: /^\/api\/stacks\/([^/]+?)\/migrate\/?$/,
				params: [{"name":"stackId","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/stacks/_stackId_/migrate/_server.ts.js'))
			},
			{
				id: "/api/stacks/[stackId]/profiles",
				pattern: /^\/api\/stacks\/([^/]+?)\/profiles\/?$/,
				params: [{"name":"stackId","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/stacks/_stackId_/profiles/_server.ts.js'))
			},
			{
				id: "/api/stacks/[stackId]/pull",
				pattern: /^\/api\/stacks\/([^/]+?)\/pull\/?$/,
				params: [{"name":"stackId","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/stacks/_stackId_/pull/_server.ts.js'))
			},
			{
				id: "/api/stacks/[stackId]/redeploy",
				pattern: /^\/api\/stacks\/([^/]+?)\/redeploy\/?$/,
				params: [{"name":"stackId","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/stacks/_stackId_/redeploy/_server.ts.js'))
			},
			{
				id: "/api/stacks/[stackId]/restart",
				pattern: /^\/api\/stacks\/([^/]+?)\/restart\/?$/,
				params: [{"name":"stackId","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/stacks/_stackId_/restart/_server.ts.js'))
			},
			{
				id: "/api/stacks/[stackId]/validate",
				pattern: /^\/api\/stacks\/([^/]+?)\/validate\/?$/,
				params: [{"name":"stackId","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/stacks/_stackId_/validate/_server.ts.js'))
			},
			{
				id: "/api/system/auto-update",
				pattern: /^\/api\/system\/auto-update\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/system/auto-update/_server.ts.js'))
			},
			{
				id: "/api/system/prune",
				pattern: /^\/api\/system\/prune\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/system/prune/_server.ts.js'))
			},
			{
				id: "/api/system/stats",
				pattern: /^\/api\/system\/stats\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/system/stats/_server.ts.js'))
			},
			{
				id: "/api/templates",
				pattern: /^\/api\/templates\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/templates/_server.ts.js'))
			},
			{
				id: "/api/templates/registries",
				pattern: /^\/api\/templates\/registries\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/templates/registries/_server.ts.js'))
			},
			{
				id: "/api/templates/registries/test",
				pattern: /^\/api\/templates\/registries\/test\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/templates/registries/test/_server.ts.js'))
			},
			{
				id: "/api/templates/stats",
				pattern: /^\/api\/templates\/stats\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/templates/stats/_server.ts.js'))
			},
			{
				id: "/api/templates/[id]",
				pattern: /^\/api\/templates\/([^/]+?)\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/templates/_id_/_server.ts.js'))
			},
			{
				id: "/api/templates/[id]/content",
				pattern: /^\/api\/templates\/([^/]+?)\/content\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/templates/_id_/content/_server.ts.js'))
			},
			{
				id: "/api/templates/[id]/download",
				pattern: /^\/api\/templates\/([^/]+?)\/download\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/templates/_id_/download/_server.ts.js'))
			},
			{
				id: "/api/users",
				pattern: /^\/api\/users\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/users/_server.ts.js'))
			},
			{
				id: "/api/users/password",
				pattern: /^\/api\/users\/password\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/users/password/_server.ts.js'))
			},
			{
				id: "/api/users/[id]",
				pattern: /^\/api\/users\/([^/]+?)\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/users/_id_/_server.ts.js'))
			},
			{
				id: "/api/volumes",
				pattern: /^\/api\/volumes\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/volumes/_server.ts.js'))
			},
			{
				id: "/api/volumes/[name]",
				pattern: /^\/api\/volumes\/([^/]+?)\/?$/,
				params: [{"name":"name","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/volumes/_name_/_server.ts.js'))
			},
			{
				id: "/auth/login",
				pattern: /^\/auth\/login\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 6 },
				endpoint: null
			},
			{
				id: "/auth/logout",
				pattern: /^\/auth\/logout\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 7 },
				endpoint: null
			},
			{
				id: "/auth/oidc/callback",
				pattern: /^\/auth\/oidc\/callback\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/auth/oidc/callback/_server.ts.js'))
			},
			{
				id: "/auth/oidc/login",
				pattern: /^\/auth\/oidc\/login\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/auth/oidc/login/_server.ts.js'))
			},
			{
				id: "/compose",
				pattern: /^\/compose\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 8 },
				endpoint: null
			},
			{
				id: "/compose/agent/[agentId]/[composeName]",
				pattern: /^\/compose\/agent\/([^/]+?)\/([^/]+?)\/?$/,
				params: [{"name":"agentId","optional":false,"rest":false,"chained":false},{"name":"composeName","optional":false,"rest":false,"chained":false}],
				page: { layouts: [0,], errors: [1,], leaf: 10 },
				endpoint: null
			},
			{
				id: "/compose/new",
				pattern: /^\/compose\/new\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 11 },
				endpoint: null
			},
			{
				id: "/compose/[composeId]",
				pattern: /^\/compose\/([^/]+?)\/?$/,
				params: [{"name":"composeId","optional":false,"rest":false,"chained":false}],
				page: { layouts: [0,], errors: [1,], leaf: 9 },
				endpoint: null
			},
			{
				id: "/containers",
				pattern: /^\/containers\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 12 },
				endpoint: null
			},
			{
				id: "/containers/[id]",
				pattern: /^\/containers\/([^/]+?)\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: { layouts: [0,], errors: [1,], leaf: 13 },
				endpoint: null
			},
			{
				id: "/images",
				pattern: /^\/images\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 14 },
				endpoint: null
			},
			{
				id: "/images/[imageId]",
				pattern: /^\/images\/([^/]+?)\/?$/,
				params: [{"name":"imageId","optional":false,"rest":false,"chained":false}],
				page: { layouts: [0,], errors: [1,], leaf: 15 },
				endpoint: null
			},
			{
				id: "/networks",
				pattern: /^\/networks\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 16 },
				endpoint: null
			},
			{
				id: "/networks/[networkId]",
				pattern: /^\/networks\/([^/]+?)\/?$/,
				params: [{"name":"networkId","optional":false,"rest":false,"chained":false}],
				page: { layouts: [0,], errors: [1,], leaf: 17 },
				endpoint: null
			},
			{
				id: "/onboarding/complete",
				pattern: /^\/onboarding\/complete\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 18 },
				endpoint: null
			},
			{
				id: "/onboarding/password",
				pattern: /^\/onboarding\/password\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 19 },
				endpoint: null
			},
			{
				id: "/onboarding/settings",
				pattern: /^\/onboarding\/settings\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 20 },
				endpoint: null
			},
			{
				id: "/onboarding/welcome",
				pattern: /^\/onboarding\/welcome\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 21 },
				endpoint: null
			},
			{
				id: "/settings/docker",
				pattern: /^\/settings\/docker\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 22 },
				endpoint: null
			},
			{
				id: "/settings/general",
				pattern: /^\/settings\/general\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 23 },
				endpoint: null
			},
			{
				id: "/settings/rbac",
				pattern: /^\/settings\/rbac\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 24 },
				endpoint: null
			},
			{
				id: "/settings/security",
				pattern: /^\/settings\/security\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 25 },
				endpoint: null
			},
			{
				id: "/settings/templates",
				pattern: /^\/settings\/templates\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 26 },
				endpoint: null
			},
			{
				id: "/settings/users",
				pattern: /^\/settings\/users\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 27 },
				endpoint: null
			},
			{
				id: "/volumes",
				pattern: /^\/volumes\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 28 },
				endpoint: null
			},
			{
				id: "/volumes/[volumeName]",
				pattern: /^\/volumes\/([^/]+?)\/?$/,
				params: [{"name":"volumeName","optional":false,"rest":false,"chained":false}],
				page: { layouts: [0,], errors: [1,], leaf: 29 },
				endpoint: null
			}
		],
		prerendered_routes: new Set([]),
		matchers: async () => {
			
			return {  };
		},
		server_assets: {}
	}
}
})();

export const prerendered = new Set([]);

export const base = "";