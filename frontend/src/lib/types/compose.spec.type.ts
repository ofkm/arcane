export type Include =
	| string
	| {
			path?: string | ListOfStrings;

			env_file?: string | ListOfStrings;

			project_directory?: string;
	  };

export type ListOfStrings = string[];

export type Development = {
	watch?: {
		ignore?: string | ListOfStrings;

		include?: string | ListOfStrings;

		path: string;

		action: 'rebuild' | 'sync' | 'restart' | 'sync+restart' | 'sync+exec';

		target?: string;
		exec?: ServiceHook;

		[k: string]: unknown;
	}[];

	[k: string]: unknown;
} & Development1;
export type Development1 = {
	watch?: {
		ignore?: string | ListOfStrings;

		include?: string | ListOfStrings;

		path: string;

		action: 'rebuild' | 'sync' | 'restart' | 'sync+restart' | 'sync+exec';

		target?: string;
		exec?: ServiceHook;

		[k: string]: unknown;
	}[];

	[k: string]: unknown;
} | null;

export type Deployment = {
	mode?: string;

	endpoint_mode?: string;

	replicas?: number | string;

	labels?:
		| {
				[k: string]: string | number | boolean | null;
		  }
		| string[];

	rollback_config?: {
		parallelism?: number | string;

		delay?: string;

		failure_action?: string;

		monitor?: string;

		max_failure_ratio?: number | string;

		order?: 'start-first' | 'stop-first';

		[k: string]: unknown;
	};

	update_config?: {
		parallelism?: number | string;

		delay?: string;

		failure_action?: string;

		monitor?: string;

		max_failure_ratio?: number | string;

		order?: 'start-first' | 'stop-first';

		[k: string]: unknown;
	};

	resources?: {
		limits?: {
			cpus?: number | string;

			memory?: string;

			pids?: number | string;

			[k: string]: unknown;
		};

		reservations?: {
			cpus?: number | string;

			memory?: string;
			generic_resources?: GenericResources;
			devices?: Devices;

			[k: string]: unknown;
		};

		[k: string]: unknown;
	};

	restart_policy?: {
		condition?: string;

		delay?: string;

		max_attempts?: number | string;

		window?: string;

		[k: string]: unknown;
	};

	placement?: {
		constraints?: string[];

		preferences?: {
			spread?: string;

			[k: string]: unknown;
		}[];

		max_replicas_per_node?: number | string;

		[k: string]: unknown;
	};

	[k: string]: unknown;
} & Deployment1;

export type GenericResources = {
	discrete_resource_spec?: {
		kind?: string;

		value?: number | string;

		[k: string]: unknown;
	};

	[k: string]: unknown;
}[];

export type ListOfStrings1 = string[];

export type ListOfStrings2 = string[];

export type Devices = {
	capabilities: ListOfStrings1;

	count?: string | number;
	device_ids?: ListOfStrings2;

	driver?: string;

	options?:
		| {
				[k: string]: string | number | boolean | null;
		  }
		| string[];

	[k: string]: unknown;
}[];
export type Deployment1 = {
	mode?: string;

	endpoint_mode?: string;

	replicas?: number | string;

	labels?:
		| {
				[k: string]: string | number | boolean | null;
		  }
		| string[];

	rollback_config?: {
		parallelism?: number | string;

		delay?: string;

		failure_action?: string;

		monitor?: string;

		max_failure_ratio?: number | string;

		order?: 'start-first' | 'stop-first';

		[k: string]: unknown;
	};

	update_config?: {
		parallelism?: number | string;

		delay?: string;

		failure_action?: string;

		monitor?: string;

		max_failure_ratio?: number | string;

		order?: 'start-first' | 'stop-first';

		[k: string]: unknown;
	};

	resources?: {
		limits?: {
			cpus?: number | string;

			memory?: string;

			pids?: number | string;

			[k: string]: unknown;
		};

		reservations?: {
			cpus?: number | string;

			memory?: string;
			generic_resources?: GenericResources;
			devices?: Devices;

			[k: string]: unknown;
		};

		[k: string]: unknown;
	};

	restart_policy?: {
		condition?: string;

		delay?: string;

		max_attempts?: number | string;

		window?: string;

		[k: string]: unknown;
	};

	placement?: {
		constraints?: string[];

		preferences?: {
			spread?: string;

			[k: string]: unknown;
		}[];

		max_replicas_per_node?: number | string;

		[k: string]: unknown;
	};

	[k: string]: unknown;
} | null;

export type ListOrDict =
	| {
			[k: string]: string | number | boolean | null;
	  }
	| string[];

export type ServiceConfigOrSecret = (
	| string
	| {
			source?: string;

			target?: string;

			uid?: string;

			gid?: string;

			mode?: number | string;

			[k: string]: unknown;
	  }
)[];

export type ServiceConfigOrSecret1 = (
	| string
	| {
			source?: string;

			target?: string;

			uid?: string;

			gid?: string;

			mode?: number | string;

			[k: string]: unknown;
	  }
)[];

export type ListOfStrings3 = string[];

export type ListOfStrings4 = string[];

export type ListOfStrings5 = string[];

export type ListOfStrings6 = string[];

export type ListOfStrings7 = string[];

export type ListOfStrings8 = string[];

export type ListOfStrings9 = string[];

export type ServiceConfigOrSecret2 = (
	| string
	| {
			source?: string;

			target?: string;

			uid?: string;

			gid?: string;

			mode?: number | string;

			[k: string]: unknown;
	  }
)[];

export type Network = {
	name?: string;

	driver?: string;

	driver_opts?: {
		[k: string]: string | number;
	};

	ipam?: {
		driver?: string;

		config?: {
			subnet?: string;

			ip_range?: string;

			gateway?: string;

			aux_addresses?: {
				[k: string]: string;
			};

			[k: string]: unknown;
		}[];

		options?: {
			[k: string]: string;
		};

		[k: string]: unknown;
	};

	external?:
		| boolean
		| string
		| {
				name?: string;

				[k: string]: unknown;
		  };

	internal?: boolean | string;

	enable_ipv4?: boolean | string;

	enable_ipv6?: boolean | string;

	attachable?: boolean | string;

	labels?:
		| {
				[k: string]: string | number | boolean | null;
		  }
		| string[];

	[k: string]: unknown;
} & Network1;
export type Network1 = {
	name?: string;

	driver?: string;

	driver_opts?: {
		[k: string]: string | number;
	};

	ipam?: {
		driver?: string;

		config?: {
			subnet?: string;

			ip_range?: string;

			gateway?: string;

			aux_addresses?: {
				[k: string]: string;
			};

			[k: string]: unknown;
		}[];

		options?: {
			[k: string]: string;
		};

		[k: string]: unknown;
	};

	external?:
		| boolean
		| string
		| {
				name?: string;

				[k: string]: unknown;
		  };

	internal?: boolean | string;

	enable_ipv4?: boolean | string;

	enable_ipv6?: boolean | string;

	attachable?: boolean | string;

	labels?:
		| {
				[k: string]: string | number | boolean | null;
		  }
		| string[];

	[k: string]: unknown;
} | null;

export type Volume = {
	name?: string;

	driver?: string;

	driver_opts?: {
		[k: string]: string | number;
	};

	external?:
		| boolean
		| string
		| {
				name?: string;

				[k: string]: unknown;
		  };

	labels?:
		| {
				[k: string]: string | number | boolean | null;
		  }
		| string[];

	[k: string]: unknown;
} & Volume1;
export type Volume1 = {
	name?: string;

	driver?: string;

	driver_opts?: {
		[k: string]: string | number;
	};

	external?:
		| boolean
		| string
		| {
				name?: string;

				[k: string]: unknown;
		  };

	labels?:
		| {
				[k: string]: string | number | boolean | null;
		  }
		| string[];

	[k: string]: unknown;
} | null;

export interface ComposeSpecification {
	version?: string;

	name?: string;

	include?: Include[];

	services?: {
		[k: string]: Service;
	};

	networks?: {
		[k: string]: Network;
	};

	volumes?: {
		[k: string]: Volume;
	};

	secrets?: {
		[k: string]: Secret;
	};

	configs?: {
		[k: string]: Config;
	};

	[k: string]: unknown;
}

export interface Service {
	develop?: Development;
	deploy?: Deployment;
	annotations?: ListOrDict;
	attach?: boolean | string;

	build?:
		| string
		| {
				context?: string;

				dockerfile?: string;

				dockerfile_inline?: string;

				entitlements?: string[];

				args?:
					| {
							[k: string]: string | number | boolean | null;
					  }
					| string[];

				ssh?:
					| {
							[k: string]: string | number | boolean | null;
					  }
					| string[];

				labels?:
					| {
							[k: string]: string | number | boolean | null;
					  }
					| string[];

				cache_from?: string[];

				cache_to?: string[];

				no_cache?: boolean | string;

				additional_contexts?:
					| {
							[k: string]: string | number | boolean | null;
					  }
					| string[];

				network?: string;

				pull?: boolean | string;

				target?: string;

				shm_size?: number | string;

				extra_hosts?:
					| {
							[k: string]: string | string[];
					  }
					| string[];

				isolation?: string;

				privileged?: boolean | string;
				secrets?: ServiceConfigOrSecret;

				tags?: string[];
				ulimits?: Ulimits;

				platforms?: string[];

				[k: string]: unknown;
		  };

	blkio_config?: {
		device_read_bps?: BlkioLimit[];

		device_read_iops?: BlkioLimit[];

		device_write_bps?: BlkioLimit[];

		device_write_iops?: BlkioLimit[];

		weight?: number | string;

		weight_device?: BlkioWeight[];
	};

	cap_add?: string[];

	cap_drop?: string[];

	cgroup?: 'host' | 'private';

	cgroup_parent?: string;

	command?: null | string | string[];
	configs?: ServiceConfigOrSecret1;

	container_name?: string;

	cpu_count?: string | number;

	cpu_percent?: string | number;

	cpu_shares?: number | string;

	cpu_quota?: number | string;

	cpu_period?: number | string;

	cpu_rt_period?: number | string;

	cpu_rt_runtime?: number | string;

	cpus?: number | string;

	cpuset?: string;

	credential_spec?: {
		config?: string;

		file?: string;

		registry?: string;

		[k: string]: unknown;
	};

	depends_on?:
		| ListOfStrings3
		| {
				[k: string]: {
					restart?: boolean | string;

					required?: boolean;

					condition: 'service_started' | 'service_healthy' | 'service_completed_successfully';

					[k: string]: unknown;
				};
		  };
	device_cgroup_rules?: ListOfStrings4;

	devices?: (
		| string
		| {
				source: string;

				target?: string;

				permissions?: string;

				[k: string]: unknown;
		  }
	)[];

	dns?: string | ListOfStrings;

	dns_opt?: string[];

	dns_search?: string | ListOfStrings;

	domainname?: string;

	entrypoint?: null | string | string[];

	env_file?:
		| string
		| (
				| string
				| {
						path: string;

						format?: string;

						required?: boolean | string;
				  }
		  )[];

	label_file?: string | string[];

	environment?:
		| {
				[k: string]: string | number | boolean | null;
		  }
		| string[];

	expose?: (string | number)[];

	extends?:
		| string
		| {
				service: string;

				file?: string;
		  };

	provider?: {
		type: string;

		options?: {
			[k: string]: (string | number | boolean) | (string | number | boolean)[];
		};

		configs?: {
			[k: string]: string;
		};

		[k: string]: unknown;
	};

	external_links?: string[];

	extra_hosts?:
		| {
				[k: string]: string | string[];
		  }
		| string[];

	gpus?:
		| 'all'
		| {
				capabilities?: ListOfStrings5;

				count?: string | number;
				device_ids?: ListOfStrings6;

				driver?: string;

				options?:
					| {
							[k: string]: string | number | boolean | null;
					  }
					| string[];
				[k: string]: unknown;
		  }[];

	group_add?: (string | number)[];
	healthcheck?: Healthcheck;

	hostname?: string;

	image?: string;

	init?: boolean | string;

	ipc?: string;

	isolation?: string;

	labels?:
		| {
				[k: string]: string | number | boolean | null;
		  }
		| string[];

	links?: string[];

	logging?: {
		driver?: string;

		options?: {
			[k: string]: string | number | null;
		};

		[k: string]: unknown;
	};

	mac_address?: string;

	mem_limit?: number | string;

	mem_reservation?: string | number;

	mem_swappiness?: number | string;

	memswap_limit?: number | string;

	network_mode?: string;

	networks?:
		| ListOfStrings3
		| {
				[k: string]: {
					aliases?: ListOfStrings7;

					interface_name?: string;

					ipv4_address?: string;

					ipv6_address?: string;
					link_local_ips?: ListOfStrings8;

					mac_address?: string;

					driver_opts?: {
						[k: string]: string | number;
					};

					priority?: number;

					gw_priority?: number;

					[k: string]: unknown;
				} | null;
		  };

	oom_kill_disable?: boolean | string;

	oom_score_adj?: string | number;

	pid?: string | null;

	pids_limit?: number | string;

	platform?: string;

	ports?: (
		| number
		| string
		| {
				name?: string;

				mode?: string;

				host_ip?: string;

				target?: number | string;

				published?: string | number;

				protocol?: string;

				app_protocol?: string;

				[k: string]: unknown;
		  }
	)[];

	post_start?: ServiceHook1[];

	pre_stop?: ServiceHook1[];

	privileged?: boolean | string;
	profiles?: ListOfStrings9;

	pull_policy?: string;

	pull_refresh_after?: string;

	read_only?: boolean | string;

	restart?: string;

	runtime?: string;

	scale?: number | string;

	security_opt?: string[];

	shm_size?: number | string;
	secrets?: ServiceConfigOrSecret2;

	sysctls?:
		| {
				[k: string]: string | number | boolean | null;
		  }
		| string[];

	stdin_open?: boolean | string;

	stop_grace_period?: string;

	stop_signal?: string;

	storage_opt?: {
		[k: string]: unknown;
	};

	tmpfs?: string | ListOfStrings;

	tty?: boolean | string;
	ulimits?: Ulimits1;

	user?: string;

	uts?: string;

	userns_mode?: string;

	volumes?: (
		| string
		| {
				type: 'bind' | 'volume' | 'tmpfs' | 'cluster' | 'npipe' | 'image';

				source?: string;

				target?: string;

				read_only?: boolean | string;

				consistency?: string;

				bind?: {
					propagation?: string;

					create_host_path?: boolean | string;

					recursive?: 'enabled' | 'disabled' | 'writable' | 'readonly';

					selinux?: 'z' | 'Z';

					[k: string]: unknown;
				};

				volume?: {
					labels?:
						| {
								[k: string]: string | number | boolean | null;
						  }
						| string[];

					nocopy?: boolean | string;

					subpath?: string;

					[k: string]: unknown;
				};

				tmpfs?: {
					size?: number | string;

					mode?: number | string;

					[k: string]: unknown;
				};

				image?: {
					subpath?: string;

					[k: string]: unknown;
				};

				[k: string]: unknown;
		  }
	)[];

	volumes_from?: string[];

	working_dir?: string;

	[k: string]: unknown;
}

export interface ServiceHook {
	command: null | string | string[];

	user?: string;

	privileged?: boolean | string;

	working_dir?: string;

	environment?:
		| {
				[k: string]: string | number | boolean | null;
		  }
		| string[];

	[k: string]: unknown;
}

export interface Ulimits {
	[k: string]:
		| (number | string)
		| {
				hard: number | string;

				soft: number | string;

				[k: string]: unknown;
		  };
}

export interface BlkioLimit {
	path?: string;

	rate?: number | string;
}

export interface BlkioWeight {
	path?: string;

	weight?: number | string;
}

export interface Healthcheck {
	disable?: boolean | string;

	interval?: string;

	retries?: number | string;

	test?: string | string[];

	timeout?: string;

	start_period?: string;

	start_interval?: string;

	[k: string]: unknown;
}

export interface ServiceHook1 {
	command: null | string | string[];

	user?: string;

	privileged?: boolean | string;

	working_dir?: string;

	environment?:
		| {
				[k: string]: string | number | boolean | null;
		  }
		| string[];

	[k: string]: unknown;
}

export interface Ulimits1 {
	[k: string]:
		| (number | string)
		| {
				hard: number | string;

				soft: number | string;

				[k: string]: unknown;
		  };
}

export interface Secret {
	name?: string;

	environment?: string;

	file?: string;

	external?:
		| boolean
		| string
		| {
				name?: string;
				[k: string]: unknown;
		  };

	labels?:
		| {
				[k: string]: string | number | boolean | null;
		  }
		| string[];

	driver?: string;

	driver_opts?: {
		[k: string]: string | number;
	};

	template_driver?: string;

	[k: string]: unknown;
}

export interface Config {
	name?: string;

	content?: string;

	environment?: string;

	file?: string;

	external?:
		| boolean
		| string
		| {
				name?: string;
				[k: string]: unknown;
		  };

	labels?:
		| {
				[k: string]: string | number | boolean | null;
		  }
		| string[];

	template_driver?: string;

	[k: string]: unknown;
}
