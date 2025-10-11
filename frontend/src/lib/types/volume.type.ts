export interface VolumeUsageData {
	size: number;
	refCount: number;
}

export interface VolumeSummaryDto {
	id: string;
	name: string;
	driver: string;
	mountpoint: string;
	scope: string;
	options: Record<string, string> | null;
	labels: Record<string, string>;
	createdAt: string;
	inUse: boolean;
	usageData?: VolumeUsageData;
	size: number;
}

export interface VolumeDetailDto extends VolumeSummaryDto {
	containers: string[];
}

export interface VolumeUsageDto {
	inUse: boolean;
	containers: string[];
}

export interface VolumeUsageCounts {
	volumesInuse: number;
	volumesUnused: number;
	totalVolumes: number;
}
