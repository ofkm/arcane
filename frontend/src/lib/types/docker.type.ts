export interface DockerInfo {
	containers: number;
	containersRunning: number;
	containersPaused: number;
	containersStopped: number;
	images: number;
	serverVersion: string;
	storageDriver: string;
	loggingDriver: string;
	cgroupDriver: string;
	memTotal: number;
	ncpu: number;
	operatingSystem: string;
	architecture: string;
}

export interface SystemInfo {
	docker: DockerInfo;
	system: {
		hostname: string;
		uptime: number;
		load: number[];
		memory: {
			total: number;
			free: number;
			used: number;
			usedPercent: number;
		};
		disk: {
			total: number;
			free: number;
			used: number;
			usedPercent: number;
		};
	};
}

export interface PruneResult {
	containersDeleted: string[];
	imagesDeleted: ImagePruneResult[];
	volumesDeleted: string[];
	networksDeleted: string[];
	spaceReclaimed: number;
}

export interface ImagePruneResult {
	id: string;
	tags: string[];
	size: number;
}
