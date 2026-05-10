import type { Cable } from "../../../types/cable";
import type { Device } from "../../../types/device";
import type { Port } from "../../../types/port";

export interface LayoutPosition {
  x: number;
  y: number;
}

export interface DeviceNode {
  device: Device;
  ports: Port[];
  position: LayoutPosition;
  deviceVersion: string | null;
  portsVersion: string | null;
  layoutVersion: string | null;
}

export type AppMode = "standalone" | "git";

export interface DiagramState {
  devices: Record<string, DeviceNode>;
  cables: Cable[];
  cablesVersion: string | null;
  isDirty: boolean;
  isSaving: boolean;
  selectedDeviceName: string | null;
  isConnecting: boolean;
  mode: AppMode | null;
}

export type { Cable, Device, Port };
