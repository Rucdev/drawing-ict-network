"use client";

import { useState } from "react";
import { DiagramCanvas } from "@/components/flow/diagram-canvas";
import { AddDeviceDialog } from "@/components/forms/add-device-dialog";
import { DeviceDetailPanel } from "@/components/forms/device-detail-panel";
import { SaveButton } from "@/components/forms/save-button";
import { useDiagramData } from "@/lib/hooks/use-diagram-data";
import { useMode } from "@/lib/hooks/use-mode";
import { useDiagramStore } from "@/lib/store/diagram-store";

interface Props {
  viewName: string;
}

export function DiagramView({ viewName }: Props) {
  const [showAddDevice, setShowAddDevice] = useState(false);
  const { isLoading, error } = useDiagramData();
  const mode = useDiagramStore((s) => s.mode);
  const isDirty = useDiagramStore((s) => s.isDirty);
  useMode();

  const deviceCount = useDiagramStore((s) => Object.keys(s.devices).length);

  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-red-600 text-sm">
          データの読み込みに失敗しました。WORKSPACE_PATH が設定されているか確認してください。
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-gray-200 bg-white">
        <span className="font-semibold text-sm text-gray-800">ネットワーク構成図</span>
        <span className="text-gray-400 text-sm">/ {viewName}</span>
        <div className="flex-1" />
        <span className="text-xs text-gray-400">{deviceCount} 機器</span>
        {mode && (
          <span
            className={`text-xs px-2 py-0.5 rounded-full ${
              mode === "git" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
            }`}
          >
            {mode === "git" ? "Git モード" : "スタンドアロン"}
          </span>
        )}
        {isDirty && <span className="text-xs text-orange-500">未保存の変更あり</span>}
        <button
          type="button"
          onClick={() => setShowAddDevice(true)}
          className="text-sm px-3 py-1.5 rounded-md bg-blue-500 text-white hover:bg-blue-600 transition-colors"
        >
          + 機器追加
        </button>
        <SaveButton />
      </div>

      {/* Canvas */}
      <div className="flex-1 relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
            <span className="text-sm text-gray-500">読み込み中...</span>
          </div>
        )}
        <DiagramCanvas />
      </div>

      {/* Side panels */}
      <DeviceDetailPanel />

      {/* Dialogs */}
      <AddDeviceDialog open={showAddDevice} onClose={() => setShowAddDevice(false)} />
    </div>
  );
}
