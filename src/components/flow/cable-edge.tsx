"use client";

import { memo, useState } from "react";
import { EdgeLabelRenderer, type EdgeProps, getBezierPath } from "reactflow";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDiagramStore } from "@/lib/store/diagram-store";
import type { Cable } from "../../../types/cable";

const MEDIA_OPTIONS = ["SMF", "MMF", "copper", "DAC", "AOC"] as const;

function CableEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
}: EdgeProps<Cable>) {
  const [showPopover, setShowPopover] = useState(false);
  const updateCableAttributes = useDiagramStore((s) => s.updateCableAttributes);
  const deleteCable = useDiagramStore((s) => s.deleteCable);

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const label = data?.media
    ? `${data.media}${data.length_m != null ? ` ${data.length_m}m` : ""}`
    : "ケーブル";

  return (
    <>
      {/* biome-ignore lint/a11y/noStaticElementInteractions: SVG path needs click for edge selection */}
      <path
        id={id}
        d={edgePath}
        strokeWidth={2}
        stroke="#6b7280"
        fill="none"
        className="cursor-pointer hover:stroke-blue-500"
        onClick={() => setShowPopover((v) => !v)}
      />

      <EdgeLabelRenderer>
        <div
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: "all",
          }}
        >
          <button
            type="button"
            className="bg-white border border-gray-300 rounded px-1.5 py-0.5 text-xs text-gray-600 hover:bg-gray-50 shadow-sm"
            onClick={(e) => {
              e.stopPropagation();
              setShowPopover((v) => !v);
            }}
          >
            {label}
          </button>

          {showPopover && (
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-white border border-gray-200 rounded-lg shadow-lg p-3 w-52 z-50">
              <div className="text-xs font-semibold text-gray-700 mb-2">ケーブル属性</div>
              <div className="space-y-2">
                <div>
                  <label htmlFor={`cable-media-${id}`} className="text-xs text-gray-500">
                    媒体
                  </label>
                  <Select
                    value={data?.media ?? ""}
                    onValueChange={(v) =>
                      updateCableAttributes(id, {
                        media: v as Cable["media"],
                      })
                    }
                  >
                    <SelectTrigger id={`cable-media-${id}`} className="h-7 text-xs">
                      <SelectValue placeholder="選択" />
                    </SelectTrigger>
                    <SelectContent>
                      {MEDIA_OPTIONS.map((m) => (
                        <SelectItem key={m} value={m} className="text-xs">
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label htmlFor={`cable-length-${id}`} className="text-xs text-gray-500">
                    長さ (m)
                  </label>
                  <Input
                    id={`cable-length-${id}`}
                    type="number"
                    className="h-7 text-xs"
                    value={data?.length_m ?? ""}
                    onChange={(e) =>
                      updateCableAttributes(id, {
                        length_m: parseFloat(e.target.value) || undefined,
                      })
                    }
                  />
                </div>
                <button
                  type="button"
                  className="w-full text-xs text-red-500 hover:text-red-700 text-left"
                  onClick={() => {
                    deleteCable(id);
                    setShowPopover(false);
                  }}
                >
                  削除
                </button>
              </div>
            </div>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

export const CableEdgeComponent_ = memo(CableEdgeComponent);

export const cableEdgeTypes = {
  cableEdge: CableEdgeComponent_,
};
