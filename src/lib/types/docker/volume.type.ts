export type ServiceVolume = {
    name: string;
    driver: string;
    scope: string;
    mountpoint: string;
    labels: { [label: string]: string } | null;
};