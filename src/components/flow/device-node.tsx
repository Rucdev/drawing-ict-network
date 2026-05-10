"use client";

import { memo, useMemo } from "react";
import { Handle, type NodeProps, Position } from "reactflow";
import { useDiagramStore } from "@/lib/store/diagram-store";
import type { DeviceNode } from "@/lib/store/types";
import type { Cable } from "../../../types/cable";

const ROLE_COLORS: Record<string, string> = {
  spine: "bg-blue-100 text-blue-800",
  leaf: "bg-green-100 text-green-800",
  core: "bg-purple-100 text-purple-800",
  edge: "bg-orange-100 text-orange-800",
  border: "bg-red-100 text-red-800",
};

function roleColor(role: string): string {
  return ROLE_COLORS[role] ?? "bg-gray-100 text-gray-800";
}

function DeviceNodeComponent({ data, selected }: NodeProps<DeviceNode>) {
  const { device, ports } = data;
  const isConnecting = useDiagramStore((s) => s.isConnecting);
  const cables = useDiagramStore((s) => s.cables);
  const setSelectedDevice = useDiagramStore((s) => s.setSelectedDevice);

  const usedPorts = useMemo(() => {
    const used = new Set<string>();
    for (const cable of cables as Cable[]) {
      for (const ep of cable.endpoints) {
        const [dev, port] = ep.split(":");
        if (dev === device.name) used.add(port);
      }
    }
    return used;
  }, [cables, device.name]);

  const visiblePorts = isConnecting ? ports : ports.filter((p) => usedPorts.has(p.name));

  const leftPorts = visiblePorts.filter((_, i) => i % 2 === 0);
  const rightPorts = visiblePorts.filter((_, i) => i % 2 === 1);

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: React Flow node requires div with onClick
    // biome-ignore lint/a11y/useKeyWithClickEvents: keyboard navigation handled by React Flow
    <div
      className={`bg-white border-2 rounded-lg shadow-md min-w-[160px] cursor-pointer select-none ${
        selected ? "border-blue-500" : "border-gray-300"
      }`}
      onClick={() => setSelectedDevice(device.name)}
    >
      <div className="px-3 py-2 border-b border-gray-200">
        <div className="font-semibold text-sm text-gray-900 truncate">{device.name}</div>
        <div
          className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium mt-1 ${roleColor(device.role)}`}
        >
          {device.role}
        </div>
      </div>

      <div className="flex">
        {/* Left handles */}
        <div className="relative flex flex-col py-1">
          {leftPorts.map((port) => (
            <div key={port.name} className="relative flex items-center h-6">
              <Handle
                type="source"
                position={Position.Left}
                id={`${device.name}:${port.name}`}
                className="!w-2 !h-2 !bg-gray-400 !border-gray-600"
                style={{ position: "relative", left: 0, top: 0, transform: "none" }}
              />
              <span className="text-xs text-gray-500 ml-1 truncate max-w-[60px]">{port.name}</span>
            </div>
          ))}
        </div>

        <div className="flex-1" />

        {/* Right handles */}
        <div className="relative flex flex-col py-1">
          {rightPorts.map((port) => (
            <div key={port.name} className="relative flex items-center h-6">
              <span className="text-xs text-gray-500 mr-1 truncate max-w-[60px]">{port.name}</span>
              <Handle
                type="source"
                position={Position.Right}
                id={`${device.name}:${port.name}`}
                className="!w-2 !h-2 !bg-gray-400 !border-gray-600"
                style={{ position: "relative", right: 0, top: 0, transform: "none" }}
              />
            </div>
          ))}
        </div>
      </div>

      {visiblePorts.length === 0 && (
        <div className="px-3 py-2 text-xs text-gray-400 italic">
          {isConnecting ? "ポートなし" : "接続中のポートなし"}
        </div>
      )}
    </div>
  );
}

export const DeviceNodeComponent_ = memo(DeviceNodeComponent);

export const deviceNodeTypes = {
  deviceNode: DeviceNodeComponent_,
};
