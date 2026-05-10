import { promises as fs } from "node:fs";
import { join } from "node:path";
import { stringify } from "yaml";
import type { Device } from "../../../types/device";
import type { Layout } from "../../../types/layout";
import type { PortsFile } from "../../../types/ports-file";
import { atomicWrite } from "../locking/atomic-write";
import { currentHash, hashFile } from "../locking/hash";
import { readYamlFile, readYamlFileSafe } from "./reader";
import { getWorkspacePath } from "./workspace";

export function deviceDir(name: string): string {
  return join(getWorkspacePath(), "devices", name);
}

export async function readDevice(name: string): Promise<{ data: Device; version: string }> {
  const path = join(deviceDir(name), "device.yaml");
  const data = await readYamlFile<Device>(path);
  const version = await currentHash(path);
  return { data, version };
}

export async function readPorts(name: string): Promise<{ data: PortsFile; version: string }> {
  const path = join(deviceDir(name), "ports.yaml");
  const data = await readYamlFile<PortsFile>(path);
  const version = await currentHash(path);
  return { data, version };
}

export async function readLayout(name: string): Promise<{ data: Layout; version: string | null }> {
  const path = join(deviceDir(name), "layout.yaml");
  const data = await readYamlFileSafe<Layout>(path);
  if (!data) return { data: { positions: {} }, version: null };
  const version = await hashFile(path);
  return { data, version };
}

export async function listDeviceNames(): Promise<string[]> {
  const dir = join(getWorkspacePath(), "devices");
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    return entries
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .sort();
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
}

export async function createDeviceFiles(device: Device, ports: PortsFile): Promise<void> {
  const dir = deviceDir(device.name);
  await fs.mkdir(dir, { recursive: true });
  await atomicWrite([
    {
      targetPath: join(dir, "device.yaml"),
      content: stringify(device),
      expectedHash: null,
    },
    {
      targetPath: join(dir, "ports.yaml"),
      content: stringify(ports),
      expectedHash: null,
    },
  ]);
}

export async function writeDevice(
  name: string,
  device: Device,
  expectedVersion: string | null
): Promise<string> {
  const path = join(deviceDir(name), "device.yaml");
  await atomicWrite([
    { targetPath: path, content: stringify(device), expectedHash: expectedVersion },
  ]);
  return currentHash(path);
}

export async function writePorts(
  name: string,
  ports: PortsFile,
  expectedVersion: string | null
): Promise<string> {
  const path = join(deviceDir(name), "ports.yaml");
  await atomicWrite([
    { targetPath: path, content: stringify(ports), expectedHash: expectedVersion },
  ]);
  return currentHash(path);
}

export async function writeLayout(
  name: string,
  layout: Layout,
  expectedVersion: string | null
): Promise<string> {
  const path = join(deviceDir(name), "layout.yaml");
  await atomicWrite([
    { targetPath: path, content: stringify(layout), expectedHash: expectedVersion },
  ]);
  return currentHash(path);
}

export async function deleteDevice(name: string): Promise<void> {
  await fs.rm(deviceDir(name), { recursive: true, force: true });
}
