"use client";

import { useState } from "react";
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
import { useDiagramStore } from "@/lib/store/diagram-store";
import type { Port } from "../../../types/port";

interface Props {
  open: boolean;
  onClose: () => void;
}

const PORT_TYPES = ["100G", "40G", "25G", "10G", "1G", "Management"];

export function AddDeviceDialog({ open, onClose }: Props) {
  const addDevice = useDiagramStore((s) => s.addDevice);
  const devices = useDiagramStore((s) => s.devices);

  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [vendor, setVendor] = useState("");
  const [model, setModel] = useState("");
  const [ports, setPorts] = useState<Port[]>([{ name: "Ethernet1", type: "100G" }]);
  const [error, setError] = useState("");

  function resetForm() {
    setName("");
    setRole("");
    setVendor("");
    setModel("");
    setPorts([{ name: "Ethernet1", type: "100G" }]);
    setError("");
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  function handleSubmit() {
    if (!name.trim()) {
      setError("機器名は必須です");
      return;
    }
    if (!role.trim()) {
      setError("ロールは必須です");
      return;
    }
    if (devices[name]) {
      setError(`機器名 '${name}' はすでに存在します`);
      return;
    }

    const existingCount = Object.keys(devices).length;
    const position = {
      x: 100 + (existingCount % 4) * 250,
      y: 100 + Math.floor(existingCount / 4) * 200,
    };

    addDevice(
      { name: name.trim(), role: role.trim(), vendor: vendor.trim(), model: model.trim() },
      ports.filter((p) => p.name.trim()),
      position
    );
    handleClose();
  }

  function updatePort(idx: number, field: keyof Port, value: string) {
    setPorts((prev) => prev.map((p, i) => (i === idx ? { ...p, [field]: value } : p)));
  }

  function addPort() {
    setPorts((prev) => [...prev, { name: `Ethernet${prev.length + 1}`, type: "100G" }]);
  }

  function removePort(idx: number) {
    setPorts((prev) => prev.filter((_, i) => i !== idx));
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>機器の追加</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {error && <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">{error}</div>}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="device-name">機器名 *</Label>
              <Input
                id="device-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="tk1-spine-01"
              />
            </div>
            <div>
              <Label htmlFor="device-role">ロール *</Label>
              <Input
                id="device-role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="spine"
              />
            </div>
            <div>
              <Label htmlFor="device-vendor">ベンダー</Label>
              <Input
                id="device-vendor"
                value={vendor}
                onChange={(e) => setVendor(e.target.value)}
                placeholder="arista"
              />
            </div>
            <div>
              <Label htmlFor="device-model">モデル</Label>
              <Input
                id="device-model"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="7280R3"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>ポート</Label>
              <Button variant="outline" size="sm" onClick={addPort}>
                + 追加
              </Button>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {ports.map((port, idx) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: port names can be empty/duplicate during editing
                <div key={idx} className="flex gap-2 items-center">
                  <Input
                    value={port.name}
                    onChange={(e) => updatePort(idx, "name", e.target.value)}
                    placeholder="Ethernet1"
                    className="flex-1"
                  />
                  <select
                    value={port.type}
                    onChange={(e) => updatePort(idx, "type", e.target.value)}
                    className="h-9 rounded-md border border-input px-2 text-sm"
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
                    onClick={() => removePort(idx)}
                    className="text-red-500 hover:text-red-700 px-2"
                  >
                    ✕
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            キャンセル
          </Button>
          <Button onClick={handleSubmit}>追加</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
