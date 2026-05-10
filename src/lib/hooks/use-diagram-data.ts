"use client";

import { useEffect } from "react";
import useSWR from "swr";
import { useDiagramStore } from "../store/diagram-store";

async function fetcher(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}`);
  return res.json();
}

export function useDiagramData() {
  const loadFromServer = useDiagramStore((s) => s.loadFromServer);

  const {
    data: devicesData,
    error: devicesError,
    isLoading: devicesLoading,
  } = useSWR("/api/devices", fetcher);

  const {
    data: cablesData,
    error: cablesError,
    isLoading: cablesLoading,
  } = useSWR("/api/cables", fetcher);

  useEffect(() => {
    if (!devicesData || !cablesData) return;

    const devices = devicesData.devices.map(
      (item: {
        device: { name: string };
        ports: unknown[];
        version: string;
        portsVersion?: string;
        layoutVersion?: string | null;
        position?: { x: number; y: number };
      }) => ({
        ...item,
        portsVersion: item.portsVersion ?? item.version,
        layoutVersion: item.layoutVersion ?? null,
        position: item.position ?? { x: 100, y: 100 },
      })
    );

    loadFromServer({
      devices,
      cables: cablesData,
    });
  }, [devicesData, cablesData, loadFromServer]);

  return {
    isLoading: devicesLoading || cablesLoading,
    error: devicesError || cablesError,
  };
}
