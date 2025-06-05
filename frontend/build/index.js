import process from 'node:process';
import { handler } from './handler.js';
import { env } from './env.js';
import http from 'node:http';
import { setImmediate } from 'node:timers';
import * as qs from 'node:querystring';

/**
 * @param {string|RegExp} input The route pattern
 * @param {boolean} [loose] Allow open-ended matching. Ignored with `RegExp` input.
 */
function parse$1(input, loose) {
	if (input instanceof RegExp) return { keys:false, pattern:input };
	var c, o, tmp, ext, keys=[], pattern='', arr = input.split('/');
	arr[0] || arr.shift();

	while (tmp = arr.shift()) {
		c = tmp[0];
		if (c === '*') {
			keys.push(c);
			pattern += tmp[1] === '?' ? '(?:/(.*))?' : '/(.*)';
		} else if (c === ':') {
			o = tmp.indexOf('?', 1);
			ext = tmp.indexOf('.', 1);
			keys.push( tmp.substring(1, !!~o ? o : !!~ext ? ext : tmp.length) );
			pattern += !!~o && !~ext ? '(?:/([^/]+?))?' : '/([^/]+?)';
			if (!!~ext) pattern += (!!~o ? '?' : '') + '\\' + tmp.substring(ext);
		} else {
			pattern += '/' + tmp;
		}
	}

	return {
		keys: keys,
		pattern: new RegExp('^' + pattern + (loose ? '(?=$|\/)' : '\/?$'), 'i')
	};
}

const MAP = {
	"": 0,
	GET: 1,
	HEAD: 2,
	PATCH: 3,
	OPTIONS: 4,
	CONNECT: 5,
	DELETE: 6,
	TRACE: 7,
	POST: 8,
	PUT: 9,
};

class Trouter {
	constructor() {
		this.routes = [];

		this.all = this.add.bind(this, '');
		this.get = this.add.bind(this, 'GET');
		this.head = this.add.bind(this, 'HEAD');
		this.patch = this.add.bind(this, 'PATCH');
		this.options = this.add.bind(this, 'OPTIONS');
		this.connect = this.add.bind(this, 'CONNECT');
		this.delete = this.add.bind(this, 'DELETE');
		this.trace = this.add.bind(this, 'TRACE');
		this.post = this.add.bind(this, 'POST');
		this.put = this.add.bind(this, 'PUT');
	}

	use(route, ...fns) {
		let handlers = [].concat.apply([], fns);
		let { keys, pattern } = parse$1(route, true);
		this.routes.push({ keys, pattern, method: '', handlers, midx: MAP[''] });
		return this;
	}

	add(method, route, ...fns) {
		let { keys, pattern } = parse$1(route);
		let handlers = [].concat.apply([], fns);
		this.routes.push({ keys, pattern, method, handlers, midx: MAP[method] });
		return this;
	}

	find(method, url) {
		let midx = MAP[method];
		let isHEAD = (midx === 2);
		let i=0, j=0, k, tmp, arr=this.routes;
		let matches=[], params={}, handlers=[];
		for (; i < arr.length; i++) {
			tmp = arr[i];
			if (tmp.midx === midx  || tmp.midx === 0 || (isHEAD && tmp.midx===1) ) {
				if (tmp.keys === false) {
					matches = tmp.pattern.exec(url);
					if (matches === null) continue;
					if (matches.groups !== void 0) for (k in matches.groups) params[k]=matches.groups[k];
					tmp.handlers.length > 1 ? (handlers=handlers.concat(tmp.handlers)) : handlers.push(tmp.handlers[0]);
				} else if (tmp.keys.length > 0) {
					matches = tmp.pattern.exec(url);
					if (matches === null) continue;
					for (j=0; j < tmp.keys.length;) params[tmp.keys[j]]=matches[++j];
					tmp.handlers.length > 1 ? (handlers=handlers.concat(tmp.handlers)) : handlers.push(tmp.handlers[0]);
				} else if (tmp.pattern.test(url)) {
					tmp.handlers.length > 1 ? (handlers=handlers.concat(tmp.handlers)) : handlers.push(tmp.handlers[0]);
				}
			} // else not a match
		}

		return { params, handlers };
	}
}

/**
 * @typedef ParsedURL
 * @type {import('.').ParsedURL}
 */

/**
 * @typedef Request
 * @property {string} url
 * @property {ParsedURL} _parsedUrl
 */

/**
 * @param {Request} req
 * @returns {ParsedURL|void}
 */
function parse(req) {
	let raw = req.url;
	if (raw == null) return;

	let prev = req._parsedUrl;
	if (prev && prev.raw === raw) return prev;

	let pathname=raw, search='', query;

	if (raw.length > 1) {
		let idx = raw.indexOf('?', 1);

		if (idx !== -1) {
			search = raw.substring(idx);
			pathname = raw.substring(0, idx);
			if (search.length > 1) {
				query = qs.parse(search.substring(1));
			}
		}
	}

	return req._parsedUrl = { pathname, search, query, raw };
}

function onError(err, req, res) {
	let code = typeof err.status === 'number' && err.status;
	code = res.statusCode = (code && code >= 100 ? code : 500);
	if (typeof err === 'string' || Buffer.isBuffer(err)) res.end(err);
	else res.end(err.message || http.STATUS_CODES[code]);
}

const mount = fn => fn instanceof Polka ? fn.attach : fn;

class Polka extends Trouter {
	constructor(opts={}) {
		super();
		this.parse = parse;
		this.server = opts.server;
		this.handler = this.handler.bind(this);
		this.onError = opts.onError || onError; // catch-all handler
		this.onNoMatch = opts.onNoMatch || this.onError.bind(null, { status: 404 });
		this.attach = (req, res) => setImmediate(this.handler, req, res);
	}

	use(base, ...fns) {
		if (base === '/') {
			super.use(base, fns.map(mount));
		} else if (typeof base === 'function' || base instanceof Polka) {
			super.use('/', [base, ...fns].map(mount));
		} else {
			super.use(base,
				(req, _, next) => {
					if (typeof base === 'string') {
						let len = base.length;
						base.startsWith('/') || len++;
						req.url = req.url.substring(len) || '/';
						req.path = req.path.substring(len) || '/';
					} else {
						req.url = req.url.replace(base, '') || '/';
						req.path = req.path.replace(base, '') || '/';
					}
					if (req.url.charAt(0) !== '/') {
						req.url = '/' + req.url;
					}
					next();
				},
				fns.map(mount),
				(req, _, next) => {
					req.path = req._parsedUrl.pathname;
					req.url = req.path + req._parsedUrl.search;
					next();
				}
			);
		}
		return this; // chainable
	}

	listen() {
		(this.server = this.server || http.createServer()).on('request', this.attach);
		this.server.listen.apply(this.server, arguments);
		return this;
	}

	handler(req, res, next) {
		let info = this.parse(req), path = info.pathname;
		let obj = this.find(req.method, req.path=path);

		req.url = path + info.search;
		req.originalUrl = req.originalUrl || req.url;
		req.query = info.query || {};
		req.search = info.search;
		req.params = obj.params;

		if (path.length > 1 && path.indexOf('%', 1) !== -1) {
			for (let k in req.params) {
				try { req.params[k] = decodeURIComponent(req.params[k]); }
				catch (e) { /* malform uri segment */ }
			}
		}

		let i=0, arr=obj.handlers.concat(this.onNoMatch), len=arr.length;
		let loop = async () => res.finished || (i < len) && arr[i++](req, res, next);
		(next = next || (err => err ? this.onError(err, req, res, next) : loop().catch(next)))(); // init
	}
}

function polka (opts) {
	return new Polka(opts);
}

const path = env('SOCKET_PATH', false);
const host = env('HOST', '0.0.0.0');
const port = env('PORT', !path && '3000');

const shutdown_timeout = parseInt(env('SHUTDOWN_TIMEOUT', '30'));
const idle_timeout = parseInt(env('IDLE_TIMEOUT', '0'));
const listen_pid = parseInt(env('LISTEN_PID', '0'));
const listen_fds = parseInt(env('LISTEN_FDS', '0'));
// https://www.freedesktop.org/software/systemd/man/latest/sd_listen_fds.html
const SD_LISTEN_FDS_START = 3;

if (listen_pid !== 0 && listen_pid !== process.pid) {
	throw new Error(`received LISTEN_PID ${listen_pid} but current process id is ${process.pid}`);
}
if (listen_fds > 1) {
	throw new Error(
		`only one socket is allowed for socket activation, but LISTEN_FDS was set to ${listen_fds}`
	);
}

const socket_activation = listen_pid === process.pid && listen_fds === 1;

let requests = 0;
/** @type {NodeJS.Timeout | void} */
let shutdown_timeout_id;
/** @type {NodeJS.Timeout | void} */
let idle_timeout_id;

const server = polka().use(handler);

if (socket_activation) {
	server.listen({ fd: SD_LISTEN_FDS_START }, () => {
		console.log(`Listening on file descriptor ${SD_LISTEN_FDS_START}`);
	});
} else {
	server.listen({ path, host, port }, () => {
		console.log(`Listening on ${path || `http://${host}:${port}`}`);
	});
}

/** @param {'SIGINT' | 'SIGTERM' | 'IDLE'} reason */
function graceful_shutdown(reason) {
	if (shutdown_timeout_id) return;

	// If a connection was opened with a keep-alive header close() will wait for the connection to
	// time out rather than close it even if it is not handling any requests, so call this first
	// @ts-expect-error this was added in 18.2.0 but is not reflected in the types
	server.server.closeIdleConnections();

	server.server.close((error) => {
		// occurs if the server is already closed
		if (error) return;

		if (shutdown_timeout_id) {
			clearTimeout(shutdown_timeout_id);
		}
		if (idle_timeout_id) {
			clearTimeout(idle_timeout_id);
		}

		// @ts-expect-error custom events cannot be typed
		process.emit('sveltekit:shutdown', reason);
	});

	shutdown_timeout_id = setTimeout(
		// @ts-expect-error this was added in 18.2.0 but is not reflected in the types
		() => server.server.closeAllConnections(),
		shutdown_timeout * 1000
	);
}

server.server.on(
	'request',
	/** @param {import('node:http').IncomingMessage} req */
	(req) => {
		requests++;

		if (socket_activation && idle_timeout_id) {
			idle_timeout_id = clearTimeout(idle_timeout_id);
		}

		req.on('close', () => {
			requests--;

			if (shutdown_timeout_id) {
				// close connections as soon as they become idle, so they don't accept new requests
				// @ts-expect-error this was added in 18.2.0 but is not reflected in the types
				server.server.closeIdleConnections();
			}
			if (requests === 0 && socket_activation && idle_timeout) {
				idle_timeout_id = setTimeout(() => graceful_shutdown('IDLE'), idle_timeout * 1000);
			}
		});
	}
);

process.on('SIGTERM', graceful_shutdown);
process.on('SIGINT', graceful_shutdown);

export { host, path, port, server };
