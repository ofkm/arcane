export interface NetworkUsageCounts {
  networksInuse: number;
  networksUnused: number;
  totalNetworks: number;
}

export type NetworkSummary = {
  id: string;
  name: string;
  driver?: string;
  scope?: string;
};
