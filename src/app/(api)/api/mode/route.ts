import { NextResponse } from "next/server";
import { isGitWorkspace } from "@/lib/git/detector";

export async function GET() {
  try {
    const isGit = await isGitWorkspace();
    return NextResponse.json({ mode: isGit ? "git" : "standalone" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
