import { getGit } from "./client";

export async function commitChanges(message: string, filePaths: string[]): Promise<string> {
  const git = getGit();
  await git.add(filePaths);
  const result = await git.commit(message);
  return result.commit;
}
