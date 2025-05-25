export interface DockerRunCommand {
	image: string;
	name?: string;
	ports?: string[];
	volumes?: string[];
	environment?: string[];
	networks?: string[];
	restart?: string;
	workdir?: string;
	user?: string;
	entrypoint?: string;
	command?: string;
	detached?: boolean;
	interactive?: boolean;
	tty?: boolean;
	remove?: boolean;
	privileged?: boolean;
	labels?: string[];
	healthCheck?: string;
	memoryLimit?: string;
	cpuLimit?: string;
}

export function parseDockerRunCommand(command: string): DockerRunCommand {
	// Remove 'docker run' from the beginning
	let cmd = command.trim().replace(/^docker\s+run\s+/, '');

	const result: DockerRunCommand = { image: '' };
	const tokens = parseCommandTokens(cmd);

	for (let i = 0; i < tokens.length; i++) {
		const token = tokens[i];

		switch (token) {
			case '-d':
			case '--detach':
				result.detached = true;
				break;

			case '-i':
			case '--interactive':
				result.interactive = true;
				break;

			case '-t':
			case '--tty':
				result.tty = true;
				break;

			case '--rm':
				result.remove = true;
				break;

			case '--privileged':
				result.privileged = true;
				break;

			case '--name':
				if (i + 1 >= tokens.length) {
					throw new Error('Missing value for --name flag');
				}
				result.name = tokens[++i];
				break;

			case '-p':
			case '--port':
			case '--publish':
				if (i + 1 >= tokens.length) {
					throw new Error('Missing value for port flag');
				}
				if (!result.ports) result.ports = [];
				result.ports.push(tokens[++i]);
				break;

			case '-v':
			case '--volume':
				if (i + 1 >= tokens.length) {
					throw new Error('Missing value for volume flag');
				}
				if (!result.volumes) result.volumes = [];
				result.volumes.push(tokens[++i]);
				break;

			case '-e':
			case '--env':
				if (i + 1 >= tokens.length) {
					throw new Error('Missing value for environment flag');
				}
				if (!result.environment) result.environment = [];
				result.environment.push(tokens[++i]);
				break;

			case '--network':
				if (i + 1 >= tokens.length) {
					throw new Error('Missing value for --network flag');
				}
				if (!result.networks) result.networks = [];
				result.networks.push(tokens[++i]);
				break;

			case '--restart':
				if (i + 1 >= tokens.length) {
					throw new Error('Missing value for --restart flag');
				}
				result.restart = tokens[++i];
				break;

			case '-w':
			case '--workdir':
				if (i + 1 >= tokens.length) {
					throw new Error('Missing value for workdir flag');
				}
				result.workdir = tokens[++i];
				break;

			case '-u':
			case '--user':
				if (i + 1 >= tokens.length) {
					throw new Error('Missing value for user flag');
				}
				result.user = tokens[++i];
				break;

			case '--entrypoint':
				if (i + 1 >= tokens.length) {
					throw new Error('Missing value for --entrypoint flag');
				}
				result.entrypoint = tokens[++i];
				break;

			case '--health-cmd':
				if (i + 1 >= tokens.length) {
					throw new Error('Missing value for --health-cmd flag');
				}
				result.healthCheck = tokens[++i];
				break;

			case '-m':
			case '--memory':
				if (i + 1 >= tokens.length) {
					throw new Error('Missing value for memory flag');
				}
				result.memoryLimit = tokens[++i];
				break;

			case '--cpus':
				if (i + 1 >= tokens.length) {
					throw new Error('Missing value for --cpus flag');
				}
				result.cpuLimit = tokens[++i];
				break;

			case '--label':
				if (i + 1 >= tokens.length) {
					throw new Error('Missing value for --label flag');
				}
				if (!result.labels) result.labels = [];
				result.labels.push(tokens[++i]);
				break;

			default:
				// If it doesn't start with '-', it's likely the image or command
				if (!token.startsWith('-')) {
					if (!result.image) {
						result.image = token;
					} else {
						// Everything after image is the command
						result.command = tokens.slice(i).join(' ');
						return result;
					}
				}
				break;
		}
	}

	return result;
}

function parseCommandTokens(command: string): string[] {
	const tokens: string[] = [];
	let current = '';
	let inQuotes = false;
	let quoteChar = '';

	for (let i = 0; i < command.length; i++) {
		const char = command[i];

		if ((char === '"' || char === "'") && !inQuotes) {
			inQuotes = true;
			quoteChar = char;
		} else if (char === quoteChar && inQuotes) {
			inQuotes = false;
			quoteChar = '';
		} else if (char === ' ' && !inQuotes) {
			if (current) {
				tokens.push(current);
				current = '';
			}
		} else {
			current += char;
		}
	}

	if (current) {
		tokens.push(current);
	}

	return tokens;
}

export function convertToDockerCompose(parsed: DockerRunCommand): string {
	const serviceName = parsed.name || 'app';

	const service: any = {
		image: parsed.image
	};

	if (parsed.name) {
		service.container_name = parsed.name;
	}

	if (parsed.ports && parsed.ports.length > 0) {
		service.ports = parsed.ports;
	}

	if (parsed.volumes && parsed.volumes.length > 0) {
		service.volumes = parsed.volumes;
	}

	if (parsed.environment && parsed.environment.length > 0) {
		service.environment = parsed.environment;
	}

	if (parsed.networks && parsed.networks.length > 0) {
		service.networks = parsed.networks;
	}

	if (parsed.restart) {
		service.restart = parsed.restart;
	}

	if (parsed.workdir) {
		service.working_dir = parsed.workdir;
	}

	if (parsed.user) {
		service.user = parsed.user;
	}

	if (parsed.entrypoint) {
		service.entrypoint = parsed.entrypoint;
	}

	if (parsed.command) {
		service.command = parsed.command;
	}

	if (parsed.interactive && parsed.tty) {
		service.stdin_open = true;
		service.tty = true;
	}

	if (parsed.privileged) {
		service.privileged = true;
	}

	if (parsed.labels && parsed.labels.length > 0) {
		service.labels = parsed.labels;
	}

	if (parsed.healthCheck) {
		service.healthcheck = {
			test: parsed.healthCheck
		};
	}

	if (parsed.memoryLimit) {
		if (!service.deploy) service.deploy = {};
		if (!service.deploy.resources) service.deploy.resources = {};
		if (!service.deploy.resources.limits) service.deploy.resources.limits = {};
		service.deploy.resources.limits.memory = parsed.memoryLimit;
	}

	if (parsed.cpuLimit) {
		if (!service.deploy) service.deploy = {};
		if (!service.deploy.resources) service.deploy.resources = {};
		if (!service.deploy.resources.limits) service.deploy.resources.limits = {};
		service.deploy.resources.limits.cpus = parsed.cpuLimit;
	}

	const compose = {
		services: {
			[serviceName]: service
		}
	};

	// Convert to YAML-like string
	return generateYaml(compose);
}

function generateYaml(obj: any, indent = 0): string {
	const spaces = '  '.repeat(indent);
	let result = '';

	for (const [key, value] of Object.entries(obj)) {
		if (value === null || value === undefined) continue;

		result += `${spaces}${key}:`;

		if (Array.isArray(value)) {
			result += '\n';
			for (const item of value) {
				result += `${spaces}  - ${item}\n`;
			}
		} else if (typeof value === 'object') {
			result += '\n';
			result += generateYaml(value, indent + 1);
		} else {
			result += ` ${value}\n`;
		}
	}

	return result;
}
