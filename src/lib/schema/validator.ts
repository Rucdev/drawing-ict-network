import Ajv, { type AnySchema, type ErrorObject } from "ajv";
import addFormats from "ajv-formats";
import { loadSchema } from "./loader";

const SCHEMA_NAMES = ["device", "port", "ports-file", "cable", "cables-file", "layout"];

let _ajv: Ajv | null = null;

function getAjv(): Ajv {
  if (_ajv) return _ajv;
  const ajv = new Ajv({ allErrors: true });
  addFormats(ajv);
  for (const name of SCHEMA_NAMES) {
    ajv.addSchema(loadSchema(name) as AnySchema);
  }
  _ajv = ajv;
  return ajv;
}

export class ValidationError extends Error {
  constructor(
    public readonly schemaId: string,
    public readonly errors: ErrorObject[]
  ) {
    const msg = errors.map((e) => `${e.instancePath} ${e.message}`).join("; ");
    super(`Validation failed for ${schemaId}: ${msg}`);
    this.name = "ValidationError";
  }
}

export function validate(
  schemaId: string,
  data: unknown
): { valid: boolean; errors: ErrorObject[] } {
  const ajv = getAjv();
  const valid = ajv.validate(schemaId, data) as boolean;
  return { valid, errors: ajv.errors ?? [] };
}

export function validateOrThrow(schemaId: string, data: unknown): void {
  const { valid, errors } = validate(schemaId, data);
  if (!valid) throw new ValidationError(schemaId, errors);
}
