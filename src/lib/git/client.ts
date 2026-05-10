import simpleGit, { type SimpleGit } from "simple-git";
import { getWorkspacePath } from "../yaml/workspace";

let _git: SimpleGit | null = null;

export function getGit(): SimpleGit {
  if (_git) return _git;
  _git = simpleGit(getWorkspacePath());
  return _git;
}
