"use client";

import { useEffect } from "react";
import useSWR from "swr";
import { useDiagramStore } from "../store/diagram-store";
import type { AppMode } from "../store/types";

async function fetcher(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}`);
  return res.json();
}

export function useMode() {
  const setMode = useDiagramStore((s) => s.setMode);
  const { data } = useSWR<{ mode: AppMode }>("/api/mode", fetcher);

  useEffect(() => {
    if (data?.mode) setMode(data.mode);
  }, [data, setMode]);
}
