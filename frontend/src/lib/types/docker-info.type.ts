export interface DockerInfo {
    success: boolean;
    version: string;
    apiVersion: string;
    gitCommit: string;
    goVersion: string;
    os: string;
    arch: string;
    buildTime: string;
    containers: number;
    containersRunning: number;
    containersPaused: number;
    containersStopped: number;
    images: number;
    storageDriver: string;
    loggingDriver: string;
    cgroupDriver: string;
    cgroupVersion: string;
    kernelVersion: string;
    operatingSystem: string;
    osVersion: string;
    serverVersion: string;
    architecture: string;
    cpus: number;
    memTotal: number;
}