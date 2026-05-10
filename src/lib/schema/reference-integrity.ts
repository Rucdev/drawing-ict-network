import type { Cable } from "../../../types/cable";
import type { Device } from "../../../types/device";
import type { Port } from "../../../types/port";

export interface DeviceWithPorts {
  device: Device;
  ports: Port[];
}

export interface IntegrityError {
  type: "MISSING_PORT_REF";
  cableId: string;
  ref: string;
}

export function checkReferenceIntegrity(
  devices: DeviceWithPorts[],
  cables: Cable[]
): IntegrityError[] {
  const validRefs = new Set<string>();
  for (const { device, ports } of devices) {
    for (const port of ports) {
      validRefs.add(`${device.name}:${port.name}`);
    }
  }

  const errors: IntegrityError[] = [];
  for (const cable of cables) {
    for (const ref of cable.endpoints) {
      if (!validRefs.has(ref)) {
        errors.push({ type: "MISSING_PORT_REF", cableId: cable.id, ref });
      }
    }
  }
  return errors;
}
