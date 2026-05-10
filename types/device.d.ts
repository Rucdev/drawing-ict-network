export interface Device {
  name: string;
  role: string;
  vendor: string;
  model: string;
  attributes?: {
    [k: string]: string | string[];
  };
}
