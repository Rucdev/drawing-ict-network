"use client";

import { create } from "zustand";
import type { Cable } from "../../../types/cable";
import type { Device } from "../../../types/device";
import type { Port } from "../../../types/port";
import type { AppMode, DeviceNode, DiagramState, LayoutPosition } from "./types";

interface ServerSnapshot {
  devices: Array<{
    device: Device;
    ports: Port[];
    version: string;
    portsVersion?: string;
    layoutVersion?: string | null;
    position?: LayoutPosition;
  }>;
  cables: {
    data: { cables: Cable[] };
    version: string | null;
  };
}

interface DiagramActions {
  loadFromServer(data: ServerSnapshot): void;
  addDevice(device: Device, ports: Port[], position: LayoutPosition): void;
  updateDevice(name: string, patch: Partial<Device>): void;
  deleteDevice(name: string): void;
  updatePorts(deviceName: string, ports: Port[]): void;
  addCable(cable: Cable): void;
  deleteCable(id: string): void;
  updateCableAttributes(id: string, patch: Partial<Cable>): void;
  updateDevicePosition(name: string, position: LayoutPosition): void;
  setSelectedDevice(name: string | null): void;
  setConnecting(isConnecting: boolean): void;
  setMode(mode: AppMode): void;
  markDirty(): void;
  markClean(): void;
  setSaving(v: boolean): void;
}

export const useDiagramStore = create<DiagramState & DiagramActions>()((set) => ({
  devices: {},
  cables: [],
  cablesVersion: null,
  isDirty: false,
  isSaving: false,
  selectedDeviceName: null,
  isConnecting: false,
  mode: null,

  loadFromServer(data: ServerSnapshot) {
    const devices: Record<string, DeviceNode> = {};
    for (const item of data.devices) {
      devices[item.device.name] = {
        device: item.device,
        ports: item.ports,
        position: item.position ?? { x: 100, y: 100 },
        deviceVersion: item.version,
        portsVersion: item.portsVersion ?? item.version,
        layoutVersion: item.layoutVersion ?? null,
      };
    }
    set({
      devices,
      cables: data.cables.data.cables,
      cablesVersion: data.cables.version,
      isDirty: false,
    });
  },

  addDevice(device, ports, position) {
    set((state) => ({
      devices: {
        ...state.devices,
        [device.name]: {
          device,
          ports,
          position,
          deviceVersion: null,
          portsVersion: null,
          layoutVersion: null,
        },
      },
      isDirty: true,
    }));
  },

  updateDevice(name, patch) {
    set((state) => {
      const existing = state.devices[name];
      if (!existing) return {};
      return {
        devices: {
          ...state.devices,
          [name]: { ...existing, device: { ...existing.device, ...patch } },
        },
        isDirty: true,
      };
    });
  },

  deleteDevice(name) {
    set((state) => {
      const { [name]: _removed, ...rest } = state.devices;
      return {
        devices: rest,
        selectedDeviceName: state.selectedDeviceName === name ? null : state.selectedDeviceName,
        isDirty: true,
      };
    });
  },

  updatePorts(deviceName, ports) {
    set((state) => {
      const existing = state.devices[deviceName];
      if (!existing) return {};
      return {
        devices: {
          ...state.devices,
          [deviceName]: { ...existing, ports },
        },
        isDirty: true,
      };
    });
  },

  addCable(cable) {
    set((state) => ({
      cables: [...state.cables, cable],
      isDirty: true,
    }));
  },

  deleteCable(id) {
    set((state) => ({
      cables: state.cables.filter((c) => c.id !== id),
      isDirty: true,
    }));
  },

  updateCableAttributes(id, patch) {
    set((state) => ({
      cables: state.cables.map((c) => (c.id === id ? { ...c, ...patch } : c)),
      isDirty: true,
    }));
  },

  updateDevicePosition(name, position) {
    set((state) => {
      const existing = state.devices[name];
      if (!existing) return {};
      return {
        devices: {
          ...state.devices,
          [name]: { ...existing, position },
        },
        isDirty: true,
      };
    });
  },

  setSelectedDevice(name) {
    set({ selectedDeviceName: name });
  },

  setConnecting(isConnecting) {
    set({ isConnecting });
  },

  setMode(mode) {
    set({ mode });
  },

  markDirty() {
    set({ isDirty: true });
  },

  markClean() {
    set({ isDirty: false });
  },

  setSaving(v) {
    set({ isSaving: v });
  },
}));
