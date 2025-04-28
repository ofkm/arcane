/**
 * Interface for Docker prune operation results
 */
export interface PruneResult {
	ContainersDeleted?: string[];
	ImagesDeleted?: any[];
	NetworksDeleted?: string[];
	VolumesDeleted?: string[];
	SpaceReclaimed?: number;
}
