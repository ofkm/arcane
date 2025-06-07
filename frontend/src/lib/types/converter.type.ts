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

export interface DockerComposeHealthcheck {
	test: string;
}

export interface DockerComposeResources {
	limits?: {
		memory?: string;
		cpus?: string;
	};
}

export interface DockerComposeDeploy {
	resources?: DockerComposeResources;
}

export interface DockerComposeService {
	image: string;
	container_name?: string;
	ports?: string[];
	volumes?: string[];
	environment?: string[];
	networks?: string[];
	restart?: string;
	working_dir?: string;
	user?: string;
	entrypoint?: string;
	command?: string;
	stdin_open?: boolean;
	tty?: boolean;
	privileged?: boolean;
	labels?: string[];
	healthcheck?: DockerComposeHealthcheck;
	deploy?: DockerComposeDeploy;
}

export type YamlValue = string | number | boolean | YamlArray | YamlObject;
export type YamlArray = YamlValue[];
export type YamlObject = { [key: string]: YamlValue };

export interface DockerComposeConfig extends YamlObject {
	services: {
		[serviceName: string]: DockerComposeService & YamlObject;
	};
}
