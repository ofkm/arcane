import type { DockerRunCommand, DockerComposeConfig, DockerComposeService, YamlObject, YamlValue } from '../types/converter.type';

export { type DockerRunCommand } from '../types/converter.type';

export function parseDockerRunCommand(command: string): DockerRunCommand {
	try {
		// Validate input
		if (!command || typeof command !== 'string') {
			throw new Error('Docker run command must be a non-empty string');
		}

		// Remove 'docker run' from the beginning
		let cmd = command.trim().replace(/^docker\s+run\s+/, '');

		if (!cmd) {
			throw new Error('No arguments found after "docker run"');
		}

		const result: DockerRunCommand = { image: '' };
		let tokens: string[];

		// Parse tokens with error handling
		try {
			tokens = parseCommandTokens(cmd);
		} catch (error) {
			throw new Error(`Failed to parse command tokens: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}

		if (tokens.length === 0) {
			throw new Error('No valid tokens found in docker run command');
		}

		for (let i = 0; i < tokens.length; i++) {
			const token = tokens[i];

			try {
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

					case '--name': {
						if (i + 1 >= tokens.length) {
							throw new Error('Missing value for --name flag');
						}
						const nameValue = tokens[++i];
						if (!nameValue || nameValue.startsWith('-')) {
							throw new Error('Invalid value for --name flag: must not be empty or start with -');
						}
						result.name = nameValue;
						break;
					}

					case '-p':
					case '--port':
					case '--publish': {
						if (i + 1 >= tokens.length) {
							throw new Error('Missing value for port flag');
						}
						const portValue = tokens[++i];
						if (!portValue || portValue.startsWith('-')) {
							throw new Error('Invalid value for port flag: must not be empty or start with -');
						}
						if (!result.ports) result.ports = [];
						result.ports.push(portValue);
						break;
					}

					case '-v':
					case '--volume': {
						if (i + 1 >= tokens.length) {
							throw new Error('Missing value for volume flag');
						}
						const volumeValue = tokens[++i];
						if (!volumeValue || volumeValue.startsWith('-')) {
							throw new Error('Invalid value for volume flag: must not be empty or start with -');
						}
						if (!result.volumes) result.volumes = [];
						result.volumes.push(volumeValue);
						break;
					}

					case '-e':
					case '--env': {
						if (i + 1 >= tokens.length) {
							throw new Error('Missing value for environment flag');
						}
						const envValue = tokens[++i];
						if (!envValue || envValue.startsWith('-')) {
							throw new Error('Invalid value for environment flag: must not be empty or start with -');
						}
						if (!result.environment) result.environment = [];
						result.environment.push(envValue);
						break;
					}

					case '--network': {
						if (i + 1 >= tokens.length) {
							throw new Error('Missing value for --network flag');
						}
						const networkValue = tokens[++i];
						if (!networkValue || networkValue.startsWith('-')) {
							throw new Error('Invalid value for --network flag: must not be empty or start with -');
						}
						if (!result.networks) result.networks = [];
						result.networks.push(networkValue);
						break;
					}

					case '--restart': {
						if (i + 1 >= tokens.length) {
							throw new Error('Missing value for --restart flag');
						}
						const restartValue = tokens[++i];
						if (!restartValue || restartValue.startsWith('-')) {
							throw new Error('Invalid value for --restart flag: must not be empty or start with -');
						}
						result.restart = restartValue;
						break;
					}

					case '-w':
					case '--workdir': {
						if (i + 1 >= tokens.length) {
							throw new Error('Missing value for workdir flag');
						}
						const workdirValue = tokens[++i];
						if (!workdirValue || workdirValue.startsWith('-')) {
							throw new Error('Invalid value for workdir flag: must not be empty or start with -');
						}
						result.workdir = workdirValue;
						break;
					}

					case '-u':
					case '--user': {
						if (i + 1 >= tokens.length) {
							throw new Error('Missing value for user flag');
						}
						const userValue = tokens[++i];
						if (!userValue || userValue.startsWith('-')) {
							throw new Error('Invalid value for user flag: must not be empty or start with -');
						}
						result.user = userValue;
						break;
					}

					case '--entrypoint': {
						if (i + 1 >= tokens.length) {
							throw new Error('Missing value for --entrypoint flag');
						}
						const entrypointValue = tokens[++i];
						if (!entrypointValue || entrypointValue.startsWith('-')) {
							throw new Error('Invalid value for --entrypoint flag: must not be empty or start with -');
						}
						result.entrypoint = entrypointValue;
						break;
					}

					case '--health-cmd': {
						if (i + 1 >= tokens.length) {
							throw new Error('Missing value for --health-cmd flag');
						}
						const healthValue = tokens[++i];
						if (!healthValue || healthValue.startsWith('-')) {
							throw new Error('Invalid value for --health-cmd flag: must not be empty or start with -');
						}
						result.healthCheck = healthValue;
						break;
					}

					case '-m':
					case '--memory': {
						if (i + 1 >= tokens.length) {
							throw new Error('Missing value for memory flag');
						}
						const memoryValue = tokens[++i];
						if (!memoryValue || memoryValue.startsWith('-')) {
							throw new Error('Invalid value for memory flag: must not be empty or start with -');
						}
						result.memoryLimit = memoryValue;
						break;
					}

					case '--cpus': {
						if (i + 1 >= tokens.length) {
							throw new Error('Missing value for --cpus flag');
						}
						const cpusValue = tokens[++i];
						if (!cpusValue || cpusValue.startsWith('-')) {
							throw new Error('Invalid value for --cpus flag: must not be empty or start with -');
						}
						result.cpuLimit = cpusValue;
						break;
					}

					case '--label': {
						if (i + 1 >= tokens.length) {
							throw new Error('Missing value for --label flag');
						}
						const labelValue = tokens[++i];
						if (!labelValue || labelValue.startsWith('-')) {
							throw new Error('Invalid value for --label flag: must not be empty or start with -');
						}
						if (!result.labels) result.labels = [];
						result.labels.push(labelValue);
						break;
					}

					default: {
						// Handle unknown flags
						if (token.startsWith('-')) {
							// Check if it's a flag that expects a value
							const flagsWithValues = ['-p', '--port', '--publish', '-v', '--volume', '-e', '--env', '--network', '--restart', '-w', '--workdir', '-u', '--user', '--entrypoint', '--health-cmd', '-m', '--memory', '--cpus', '--label', '--name'];

							// Check if it's a combined short flag (e.g., -it for -i -t)
							if (token.startsWith('-') && !token.startsWith('--') && token.length > 2) {
								// Handle combined short flags like -it, -dit, etc.
								const flags = token.slice(1).split('');
								for (const flag of flags) {
									switch (flag) {
										case 'd':
											result.detached = true;
											break;
										case 'i':
											result.interactive = true;
											break;
										case 't':
											result.tty = true;
											break;
										default:
											console.warn(`Unknown short flag in combined flag: -${flag}`);
											break;
									}
								}
								break;
							}

							// For unknown flags, check if they expect a value
							const isKnownFlag = flagsWithValues.includes(token);
							if (!isKnownFlag) {
								// Unknown flag - decide whether to throw error or warn
								console.warn(`Unknown docker run flag: ${token}`);

								// Skip potential value if next token doesn't look like a flag or image
								if (i + 1 < tokens.length && !tokens[i + 1].startsWith('-') && !result.image && tokens[i + 1].includes(':')) {
									// Likely this unknown flag has a value, skip it
									i++;
								}
							}
						} else {
							// Token doesn't start with '-', it's either image or command
							if (!result.image) {
								if (!token) {
									throw new Error('Image name cannot be empty');
								}
								// Validate image name format (basic check)
								if (!/^[a-zA-Z0-9._/-]+(:[\w.-]+)?$/.test(token)) {
									console.warn(`Image name "${token}" may not be valid`);
								}
								result.image = token;
							} else {
								// Everything from this point forward is part of the command
								// Join all remaining tokens to handle multi-argument commands properly
								const remainingTokens = tokens.slice(i);
								result.command = remainingTokens.join(' ');

								// Important: return here to stop processing since we've captured the command
								return result;
							}
						}
						break;
					}
				}
			} catch (error) {
				// Add context about which token caused the error
				throw new Error(`Error processing token "${token}" at position ${i}: ${error instanceof Error ? error.message : 'Unknown error'}`);
			}
		}

		// Validate that we have at least an image
		if (!result.image) {
			throw new Error('No Docker image specified in command');
		}

		return result;
	} catch (error) {
		// Wrap all errors with context about the original command
		const errorMessage = error instanceof Error ? error.message : 'Unknown parsing error';
		throw new Error(`Failed to parse Docker run command: ${errorMessage}. Original command: "${command}"`);
	}
}

function parseCommandTokens(command: string): string[] {
	try {
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

		if (inQuotes) {
			throw new Error(`Unclosed quote in command: missing closing ${quoteChar}`);
		}

		if (current) {
			tokens.push(current);
		}

		return tokens;
	} catch (error) {
		throw new Error(`Token parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
	}
}

export function convertToDockerCompose(parsed: DockerRunCommand): string {
	try {
		if (!parsed.image) {
			throw new Error('Cannot convert to Docker Compose: no image specified');
		}

		const serviceName = parsed.name || 'app';

		const service: DockerComposeService & YamlObject = {
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

		const compose: DockerComposeConfig = {
			services: {
				[serviceName]: service
			}
		};

		// Convert to YAML-like string
		return generateYaml(compose);
	} catch (error) {
		throw new Error(`Failed to convert to Docker Compose: ${error instanceof Error ? error.message : 'Unknown error'}`);
	}
}

function generateYaml(obj: YamlObject, indent = 0): string {
	try {
		const spaces = '  '.repeat(indent);
		let result = '';

		for (const [key, value] of Object.entries(obj)) {
			if (value === null || value === undefined) continue;

			result += `${spaces}${key}:`;

			if (Array.isArray(value)) {
				result += '\n';
				for (const item of value) {
					// Handle array items that could be any YamlValue type
					if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
						result += `${spaces}  -\n`;
						result += generateYaml(item as YamlObject, indent + 2);
					} else {
						result += `${spaces}  - ${item}\n`;
					}
				}
			} else if (typeof value === 'object' && value !== null) {
				result += '\n';
				result += generateYaml(value as YamlObject, indent + 1);
			} else {
				result += ` ${value}\n`;
			}
		}

		return result;
	} catch (error) {
		throw new Error(`YAML generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
	}
}
