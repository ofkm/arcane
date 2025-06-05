const manifest = (() => {
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
			__memo(() => import('./chunks/0-CQHMxvMi.js')),
			__memo(() => import('./chunks/1-CbQEcarn.js')),
			__memo(() => import('./chunks/2-CgW4uFov.js')),
			__memo(() => import('./chunks/3-ByAbKKot.js')),
			__memo(() => import('./chunks/4-DSVm95q0.js')),
			__memo(() => import('./chunks/5-DdjJJMkZ.js')),
			__memo(() => import('./chunks/6-CyXHfX0Y.js')),
			__memo(() => import('./chunks/7-Bc3aI_UK.js')),
			__memo(() => import('./chunks/8-C6CnQLUR.js')),
			__memo(() => import('./chunks/9-CO7Ea1dj.js')),
			__memo(() => import('./chunks/10-B9uhjSKJ.js')),
			__memo(() => import('./chunks/11-DYrKA225.js')),
			__memo(() => import('./chunks/12-D8BK6rSl.js')),
			__memo(() => import('./chunks/13-CK2dAnKI.js')),
			__memo(() => import('./chunks/14-CXvyTPbq.js')),
			__memo(() => import('./chunks/15-DjqkPr2n.js')),
			__memo(() => import('./chunks/16-CyaNCZXA.js')),
			__memo(() => import('./chunks/17-BmG7_B2J.js')),
			__memo(() => import('./chunks/18-BtNGTSat.js')),
			__memo(() => import('./chunks/19-BYhp2qWx.js')),
			__memo(() => import('./chunks/20-DdxnLCWm.js')),
			__memo(() => import('./chunks/21-TcM22eK-.js')),
			__memo(() => import('./chunks/22-BoRhhigo.js')),
			__memo(() => import('./chunks/23-C9-Pf_t_.js')),
			__memo(() => import('./chunks/24-BfIi89HD.js')),
			__memo(() => import('./chunks/25-CI5pGcwH.js')),
			__memo(() => import('./chunks/26-CKnN_J3Q.js')),
			__memo(() => import('./chunks/27-C-R7t7Nc.js').then(function (n) { return n._; })),
			__memo(() => import('./chunks/28-BXVuUpix.js')),
			__memo(() => import('./chunks/29-DF-xJl_L.js'))
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
				endpoint: __memo(() => import('./chunks/_server.ts-DyPq2cEn.js'))
			},
			{
				id: "/api/agents/heartbeat",
				pattern: /^\/api\/agents\/heartbeat\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-JzmbPDIq.js'))
			},
			{
				id: "/api/agents/register",
				pattern: /^\/api\/agents\/register\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-BQplbPWr.js'))
			},
			{
				id: "/api/agents/[agentId]",
				pattern: /^\/api\/agents\/([^/]+?)\/?$/,
				params: [{"name":"agentId","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-Bhz53-xy.js'))
			},
			{
				id: "/api/agents/[agentId]/command",
				pattern: /^\/api\/agents\/([^/]+?)\/command\/?$/,
				params: [{"name":"agentId","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-CQ1kAZNP.js'))
			},
			{
				id: "/api/agents/[agentId]/deployments",
				pattern: /^\/api\/agents\/([^/]+?)\/deployments\/?$/,
				params: [{"name":"agentId","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-8L3O-UUg.js'))
			},
			{
				id: "/api/agents/[agentId]/deploy/container",
				pattern: /^\/api\/agents\/([^/]+?)\/deploy\/container\/?$/,
				params: [{"name":"agentId","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-CdaEjnZb.js'))
			},
			{
				id: "/api/agents/[agentId]/deploy/image",
				pattern: /^\/api\/agents\/([^/]+?)\/deploy\/image\/?$/,
				params: [{"name":"agentId","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-Bl_9D6uz.js'))
			},
			{
				id: "/api/agents/[agentId]/deploy/stack",
				pattern: /^\/api\/agents\/([^/]+?)\/deploy\/stack\/?$/,
				params: [{"name":"agentId","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-CaMl-e_z.js'))
			},
			{
				id: "/api/agents/[agentId]/stacks",
				pattern: /^\/api\/agents\/([^/]+?)\/stacks\/?$/,
				params: [{"name":"agentId","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-C-VVpXKL.js'))
			},
			{
				id: "/api/agents/[agentId]/tasks",
				pattern: /^\/api\/agents\/([^/]+?)\/tasks\/?$/,
				params: [{"name":"agentId","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-BMshmYIR.js'))
			},
			{
				id: "/api/agents/[agentId]/tasks/[taskId]",
				pattern: /^\/api\/agents\/([^/]+?)\/tasks\/([^/]+?)\/?$/,
				params: [{"name":"agentId","optional":false,"rest":false,"chained":false},{"name":"taskId","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-Bai8zJcN.js'))
			},
			{
				id: "/api/agents/[agentId]/tasks/[taskId]/result",
				pattern: /^\/api\/agents\/([^/]+?)\/tasks\/([^/]+?)\/result\/?$/,
				params: [{"name":"agentId","optional":false,"rest":false,"chained":false},{"name":"taskId","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-DrW31QZ1.js'))
			},
			{
				id: "/api/containers",
				pattern: /^\/api\/containers\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-DOBbA9Qj.js'))
			},
			{
				id: "/api/containers/start-all",
				pattern: /^\/api\/containers\/start-all\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-DAf6hnPj.js'))
			},
			{
				id: "/api/containers/stop-all",
				pattern: /^\/api\/containers\/stop-all\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-DQpUY4tN.js'))
			},
			{
				id: "/api/containers/[containerId]",
				pattern: /^\/api\/containers\/([^/]+?)\/?$/,
				params: [{"name":"containerId","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-A96A_FWb.js'))
			},
			{
				id: "/api/containers/[containerId]/logs/stream",
				pattern: /^\/api\/containers\/([^/]+?)\/logs\/stream\/?$/,
				params: [{"name":"containerId","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-CmMWJnPC.js'))
			},
			{
				id: "/api/containers/[containerId]/pull",
				pattern: /^\/api\/containers\/([^/]+?)\/pull\/?$/,
				params: [{"name":"containerId","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-CFcFfW_u.js'))
			},
			{
				id: "/api/containers/[containerId]/remove",
				pattern: /^\/api\/containers\/([^/]+?)\/remove\/?$/,
				params: [{"name":"containerId","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-Cy8EPrOB.js'))
			},
			{
				id: "/api/containers/[containerId]/restart",
				pattern: /^\/api\/containers\/([^/]+?)\/restart\/?$/,
				params: [{"name":"containerId","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-CYi3buTv.js'))
			},
			{
				id: "/api/containers/[containerId]/start",
				pattern: /^\/api\/containers\/([^/]+?)\/start\/?$/,
				params: [{"name":"containerId","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-CDIwZqFH.js'))
			},
			{
				id: "/api/containers/[containerId]/stats/stream",
				pattern: /^\/api\/containers\/([^/]+?)\/stats\/stream\/?$/,
				params: [{"name":"containerId","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-CK319cQz.js'))
			},
			{
				id: "/api/containers/[containerId]/stop",
				pattern: /^\/api\/containers\/([^/]+?)\/stop\/?$/,
				params: [{"name":"containerId","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-Cbf1WiW0.js'))
			},
			{
				id: "/api/convert",
				pattern: /^\/api\/convert\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-XmR9CAuE.js'))
			},
			{
				id: "/api/docker",
				pattern: /^\/api\/docker\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-CH6wXD7u.js'))
			},
			{
				id: "/api/docker/test-connection",
				pattern: /^\/api\/docker\/test-connection\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-CW8pMs0b.js'))
			},
			{
				id: "/api/images",
				pattern: /^\/api\/images\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-SoKy01QN.js'))
			},
			{
				id: "/api/images/maturity",
				pattern: /^\/api\/images\/maturity\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-Bhf-LEb_.js'))
			},
			{
				id: "/api/images/prune",
				pattern: /^\/api\/images\/prune\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-BhCoUwVO.js'))
			},
			{
				id: "/api/images/pull-stream/[...name]",
				pattern: /^\/api\/images\/pull-stream(?:\/(.*))?\/?$/,
				params: [{"name":"name","optional":false,"rest":true,"chained":true}],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-DVjXjnzv.js'))
			},
			{
				id: "/api/images/pull/[...name]",
				pattern: /^\/api\/images\/pull(?:\/(.*))?\/?$/,
				params: [{"name":"name","optional":false,"rest":true,"chained":true}],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-Cxx6Neti.js'))
			},
			{
				id: "/api/images/[id]",
				pattern: /^\/api\/images\/([^/]+?)\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-B11KNBpG.js'))
			},
			{
				id: "/api/images/[id]/maturity",
				pattern: /^\/api\/images\/([^/]+?)\/maturity\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-0cF3T82d.js'))
			},
			{
				id: "/api/networks/create",
				pattern: /^\/api\/networks\/create\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-CjEcNsKa.js'))
			},
			{
				id: "/api/networks/[id]",
				pattern: /^\/api\/networks\/([^/]+?)\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-Dp_zNjEd.js'))
			},
			{
				id: "/api/settings",
				pattern: /^\/api\/settings\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-Ca4n0MDx.js'))
			},
			{
				id: "/api/stacks/create",
				pattern: /^\/api\/stacks\/create\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-DA8Eu-Jz.js'))
			},
			{
				id: "/api/stacks/import",
				pattern: /^\/api\/stacks\/import\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-Cz6EoQPM.js'))
			},
			{
				id: "/api/stacks/validate",
				pattern: /^\/api\/stacks\/validate\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-v36vk-Gv.js'))
			},
			{
				id: "/api/stacks/[stackId]",
				pattern: /^\/api\/stacks\/([^/]+?)\/?$/,
				params: [{"name":"stackId","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-71cpGecn.js'))
			},
			{
				id: "/api/stacks/[stackId]/changes",
				pattern: /^\/api\/stacks\/([^/]+?)\/changes\/?$/,
				params: [{"name":"stackId","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-l33j3T61.js'))
			},
			{
				id: "/api/stacks/[stackId]/deployment-preview",
				pattern: /^\/api\/stacks\/([^/]+?)\/deployment-preview\/?$/,
				params: [{"name":"stackId","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-Cjt0F4Xm.js'))
			},
			{
				id: "/api/stacks/[stackId]/deploy",
				pattern: /^\/api\/stacks\/([^/]+?)\/deploy\/?$/,
				params: [{"name":"stackId","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-Doh8CoSp.js'))
			},
			{
				id: "/api/stacks/[stackId]/destroy",
				pattern: /^\/api\/stacks\/([^/]+?)\/destroy\/?$/,
				params: [{"name":"stackId","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-BrZR_rkJ.js'))
			},
			{
				id: "/api/stacks/[stackId]/down",
				pattern: /^\/api\/stacks\/([^/]+?)\/down\/?$/,
				params: [{"name":"stackId","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-BBKAWlr-.js'))
			},
			{
				id: "/api/stacks/[stackId]/logs",
				pattern: /^\/api\/stacks\/([^/]+?)\/logs\/?$/,
				params: [{"name":"stackId","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-BzDzsCHt.js'))
			},
			{
				id: "/api/stacks/[stackId]/migrate",
				pattern: /^\/api\/stacks\/([^/]+?)\/migrate\/?$/,
				params: [{"name":"stackId","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-hAixNp0K.js'))
			},
			{
				id: "/api/stacks/[stackId]/profiles",
				pattern: /^\/api\/stacks\/([^/]+?)\/profiles\/?$/,
				params: [{"name":"stackId","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-rfpjydlZ.js'))
			},
			{
				id: "/api/stacks/[stackId]/pull",
				pattern: /^\/api\/stacks\/([^/]+?)\/pull\/?$/,
				params: [{"name":"stackId","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-B-j24r1k.js'))
			},
			{
				id: "/api/stacks/[stackId]/redeploy",
				pattern: /^\/api\/stacks\/([^/]+?)\/redeploy\/?$/,
				params: [{"name":"stackId","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-jE7pAzRh.js'))
			},
			{
				id: "/api/stacks/[stackId]/restart",
				pattern: /^\/api\/stacks\/([^/]+?)\/restart\/?$/,
				params: [{"name":"stackId","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-B3zjI78g.js'))
			},
			{
				id: "/api/stacks/[stackId]/validate",
				pattern: /^\/api\/stacks\/([^/]+?)\/validate\/?$/,
				params: [{"name":"stackId","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-CBJtGocI.js'))
			},
			{
				id: "/api/system/auto-update",
				pattern: /^\/api\/system\/auto-update\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-ecwYyO2z.js'))
			},
			{
				id: "/api/system/prune",
				pattern: /^\/api\/system\/prune\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-SUEQ2uWJ.js'))
			},
			{
				id: "/api/system/stats",
				pattern: /^\/api\/system\/stats\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-Ci5pE_LL.js'))
			},
			{
				id: "/api/templates",
				pattern: /^\/api\/templates\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-D7xYQPTP.js'))
			},
			{
				id: "/api/templates/registries",
				pattern: /^\/api\/templates\/registries\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-BGxOZ1rH.js'))
			},
			{
				id: "/api/templates/registries/test",
				pattern: /^\/api\/templates\/registries\/test\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-7YDTZvZV.js'))
			},
			{
				id: "/api/templates/stats",
				pattern: /^\/api\/templates\/stats\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-Btp2cWbM.js'))
			},
			{
				id: "/api/templates/[id]",
				pattern: /^\/api\/templates\/([^/]+?)\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-C6gaCs6h.js'))
			},
			{
				id: "/api/templates/[id]/content",
				pattern: /^\/api\/templates\/([^/]+?)\/content\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-Dx4ZxJcj.js'))
			},
			{
				id: "/api/templates/[id]/download",
				pattern: /^\/api\/templates\/([^/]+?)\/download\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-CxPzwFaI.js'))
			},
			{
				id: "/api/users",
				pattern: /^\/api\/users\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-CO71N3ez.js'))
			},
			{
				id: "/api/users/password",
				pattern: /^\/api\/users\/password\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-CRtI5KqD.js'))
			},
			{
				id: "/api/users/[id]",
				pattern: /^\/api\/users\/([^/]+?)\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-BLoxKRgd.js'))
			},
			{
				id: "/api/volumes",
				pattern: /^\/api\/volumes\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-b6OJIPv2.js'))
			},
			{
				id: "/api/volumes/[name]",
				pattern: /^\/api\/volumes\/([^/]+?)\/?$/,
				params: [{"name":"name","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-C2eZQIUG.js'))
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
				endpoint: __memo(() => import('./chunks/_server.ts-DEKBOKn_.js'))
			},
			{
				id: "/auth/oidc/login",
				pattern: /^\/auth\/oidc\/login\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-DFIokfZh.js'))
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

const prerendered = new Set([]);

const base = "";

export { base, manifest, prerendered };
//# sourceMappingURL=manifest.js.map
