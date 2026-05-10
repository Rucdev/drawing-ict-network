"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useDiagramStore } from "@/lib/store/diagram-store";
import type { Port } from "../../../types/port";

const PORT_TYPES = ["100G", "40G", "25G", "10G", "1G", "Management"];

export function DeviceDetailPanel() {
  const selectedDeviceName = useDiagramStore((s) => s.selectedDeviceName);
  const devices = useDiagramStore((s) => s.devices);
  const setSelectedDevice = useDiagramStore((s) => s.setSelectedDevice);
  const updateDevice = useDiagramStore((s) => s.updateDevice);
  const updatePorts = useDiagramStore((s) => s.updatePorts);
  const deleteDevice = useDiagramStore((s) => s.deleteDevice);
  const cables = useDiagramStore((s) => s.cables);

  const node = selectedDeviceName ? devices[selectedDeviceName] : null;

  const [role, setRole] = useState("");
  const [vendor, setVendor] = useState("");
  const [model, setModel] = useState("");
  const [ports, setPorts] = useState<Port[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (!node) return;
    setRole(node.device.role);
    setVendor(node.device.vendor);
    setModel(node.device.model);
    setPorts([...node.ports]);
  }, [node]);

  function handleDeviceUpdate() {
    if (!selectedDeviceName) return;
    updateDevice(selectedDeviceName, { role, vendor, model });
  }

  function handlePortsUpdate() {
    if (!selectedDeviceName) return;
    updatePorts(
      selectedDeviceName,
      ports.filter((p) => p.name.trim())
    );
  }

  function handleDelete() {
    if (!selectedDeviceName) return;
    deleteDevice(selectedDeviceName);
    setSelectedDevice(null);
    setShowDeleteConfirm(false);
  }

  function updatePort(idx: number, field: keyof Port, value: string) {
    setPorts((prev) => {
      const next = prev.map((p, i) => (i === idx ? { ...p, [field]: value } : p));
      return next;
    });
  }

  function addPort() {
    setPorts((prev) => [...prev, { name: `Port${prev.length + 1}`, type: "1G" }]);
  }

  function removePort(idx: number) {
    setPorts((prev) => prev.filter((_, i) => i !== idx));
  }

  const cableCount = cables.filter((c) =>
    c.endpoints.some((ep) => ep.startsWith(`${selectedDeviceName}:`))
  ).length;

  return (
    <>
      <Sheet open={!!selectedDeviceName} onOpenChange={(o) => !o && setSelectedDevice(null)}>
        <SheetContent className="w-80 overflow-y-auto">
          {node && (
            <>
              <SheetHeader>
                <SheetTitle className="text-base">{node.device.name}</SheetTitle>
              </SheetHeader>

              <div className="mt-4 space-y-4">
                <div>
                  <Label>ロール</Label>
                  <Input
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    onBlur={handleDeviceUpdate}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>ベンダー</Label>
                  <Input
                    value={vendor}
                    onChange={(e) => setVendor(e.target.value)}
                    onBlur={handleDeviceUpdate}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>モデル</Label>
                  <Input
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    onBlur={handleDeviceUpdate}
                    className="mt-1"
                  />
                </div>

                <Separator />

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>ポート ({ports.length})</Label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        addPort();
                        handlePortsUpdate();
                      }}
                    >
                      + 追加
                    </Button>
                  </div>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {ports.map((port, idx) => (
                      // biome-ignore lint/suspicious/noArrayIndexKey: port names can be empty/duplicate during editing
                      <div key={idx} className="flex gap-1 items-center">
                        <Input
                          value={port.name}
                          onChange={(e) => updatePort(idx, "name", e.target.value)}
                          onBlur={handlePortsUpdate}
                          className="flex-1 h-8 text-xs"
                        />
                        <select
                          value={port.type}
                          onChange={(e) => {
                            updatePort(idx, "type", e.target.value);
                            handlePortsUpdate();
                          }}
                          className="h-8 rounded-md border border-input px-1 text-xs"
                        >
                          {PORT_TYPES.map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            removePort(idx);
                            handlePortsUpdate();
                          }}
                          className="text-red-400 hover:text-red-600 h-8 px-1.5"
                        >
                          ✕
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                <div className="text-xs text-gray-500">ケーブル接続数: {cableCount}</div>

                <Button
                  variant="destructive"
                  size="sm"
                  className="w-full"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={cableCount > 0}
                >
                  {cableCount > 0 ? `削除不可 (ケーブル${cableCount}本)` : "機器を削除"}
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={showDeleteConfirm} onOpenChange={(o) => !o && setShowDeleteConfirm(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>機器の削除</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            「{selectedDeviceName}」を削除しますか？この操作は取り消せません。
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
              キャンセル
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              削除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
