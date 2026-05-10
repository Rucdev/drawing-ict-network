export function getWorkspacePath(): string {
  const p = process.env.WORKSPACE_PATH;
  if (!p) {
    throw new Error(
      "WORKSPACE_PATH environment variable is not set. " +
        "Set it to the directory where YAML files should be stored."
    );
  }
  return p;
}
