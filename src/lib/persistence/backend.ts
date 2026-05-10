import { isGitWorkspace } from "../git/detector";
import { commitChanges } from "../git/operations";

export interface PersistenceBackend {
  afterSave(changedFiles: string[], commitMessage?: string): Promise<void>;
}

class FileOnlyBackend implements PersistenceBackend {
  async afterSave(): Promise<void> {}
}

class GitBackend implements PersistenceBackend {
  async afterSave(changedFiles: string[], commitMessage?: string): Promise<void> {
    const msg = commitMessage ?? "Update network topology";
    await commitChanges(msg, changedFiles);
  }
}

let _backend: PersistenceBackend | null = null;

export async function createBackend(): Promise<PersistenceBackend> {
  if (_backend) return _backend;
  const isGit = await isGitWorkspace();
  _backend = isGit ? new GitBackend() : new FileOnlyBackend();
  return _backend;
}
