"use client";

import { useCallback, useMemo } from "react";
import ReactFlow, {
  applyNodeChanges,
  Background,
  type Connection,
  Controls,
  MiniMap,
  type NodeChange,
  ReactFlowProvider,
} from "reactflow";
import "reactflow/dist/style.css";
import { useDiagramStore } from "@/lib/store/diagram-store";
import { cableEdgeTypes } from "./cable-edge";
import { deviceNodeTypes } from "./device-node";
import { buildEdges, buildNodes, generateCableId } from "./utils";

function DiagramCanvasInner() {
  const devices = useDiagramStore((s) => s.devices);
  const cables = useDiagramStore((s) => s.cables);
  const updateDevicePosition = useDiagramStore((s) => s.updateDevicePosition);
  const setConnecting = useDiagramStore((s) => s.setConnecting);
  const addCable = useDiagramStore((s) => s.addCable);
  const setSelectedDevice = useDiagramStore((s) => s.setSelectedDevice);

  const nodes = useMemo(() => buildNodes(devices), [devices]);
  const edges = useMemo(() => buildEdges(cables), [cables]);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      for (const change of changes) {
        if (change.type === "position" && change.position) {
          updateDevicePosition(change.id, change.position);
        }
      }
      // We manage our own state, so we don't call applyNodeChanges to the store
      void applyNodeChanges;
    },
    [updateDevicePosition]
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.sourceHandle || !connection.targetHandle) return;
      const ep0 = connection.sourceHandle;
      const ep1 = connection.targetHandle;

      // Prevent duplicate cables
      const exists = cables.some(
        (c) =>
          (c.endpoints[0] === ep0 && c.endpoints[1] === ep1) ||
          (c.endpoints[0] === ep1 && c.endpoints[1] === ep0)
      );
      if (exists) return;

      addCable({
        id: generateCableId(ep0, ep1),
        endpoints: [ep0, ep1],
      });
      setConnecting(false);
    },
    [cables, addCable, setConnecting]
  );

  const onConnectStart = useCallback(() => {
    setConnecting(true);
  }, [setConnecting]);

  const onConnectEnd = useCallback(() => {
    setConnecting(false);
  }, [setConnecting]);

  const onPaneClick = useCallback(() => {
    setSelectedDevice(null);
  }, [setSelectedDevice]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={deviceNodeTypes}
      edgeTypes={cableEdgeTypes}
      onNodesChange={onNodesChange}
      onConnect={onConnect}
      onConnectStart={onConnectStart}
      onConnectEnd={onConnectEnd}
      onPaneClick={onPaneClick}
      fitView
      deleteKeyCode={null}
    >
      <Background />
      <Controls />
      <MiniMap />
    </ReactFlow>
  );
}

export function DiagramCanvas() {
  return (
    <ReactFlowProvider>
      <DiagramCanvasInner />
    </ReactFlowProvider>
  );
}
