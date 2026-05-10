import type { Edge, Node } from "reactflow";
import type { DeviceNode } from "@/lib/store/types";
import type { Cable } from "../../../types/cable";

export function buildNodes(devices: Record<string, DeviceNode>): Node[] {
  return Object.values(devices).map((node) => ({
    id: node.device.name,
    type: "deviceNode",
    position: node.position,
    data: node,
  }));
}

export function buildEdges(cables: Cable[]): Edge[] {
  return cables.map((cable) => {
    const [ep0, ep1] = cable.endpoints;
    const [sourceDevice, sourcePort] = ep0.split(":");
    const [targetDevice, targetPort] = ep1.split(":");
    return {
      id: cable.id,
      source: sourceDevice,
      sourceHandle: ep0,
      target: targetDevice,
      targetHandle: ep1,
      type: "cableEdge",
      data: cable,
      label: cable.media
        ? `${cable.media}${cable.length_m != null ? ` ${cable.length_m}m` : ""}`
        : undefined,
      // suppress unused variable warnings
      _sp: sourcePort,
      _tp: targetPort,
    } as Edge;
  });
}

export function generateCableId(ep1: string, ep2: string): string {
  const sorted = [ep1, ep2].sort();
  const sanitized = sorted.map((ep) => ep.replace(/:/g, "_")).join("__");
  return `cable-${sanitized}`;
}

export function parseHandleId(handleId: string): {
  device: string;
  port: string;
} {
  const idx = handleId.indexOf(":");
  if (idx === -1) throw new Error(`Invalid handle ID: ${handleId}`);
  return { device: handleId.slice(0, idx), port: handleId.slice(idx + 1) };
}
