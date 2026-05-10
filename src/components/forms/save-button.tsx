"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSave } from "@/lib/hooks/use-save";
import { useDiagramStore } from "@/lib/store/diagram-store";

export function SaveButton() {
  const isDirty = useDiagramStore((s) => s.isDirty);
  const isSaving = useDiagramStore((s) => s.isSaving);
  const mode = useDiagramStore((s) => s.mode);
  const { save } = useSave();

  const [showCommitDialog, setShowCommitDialog] = useState(false);
  const [commitMessage, setCommitMessage] = useState("");

  function handleClick() {
    if (mode === "git") {
      setCommitMessage("");
      setShowCommitDialog(true);
    } else {
      save();
    }
  }

  function handleCommit() {
    save(commitMessage || "Update network topology");
    setShowCommitDialog(false);
  }

  return (
    <>
      <Button
        onClick={handleClick}
        disabled={!isDirty || isSaving}
        variant={isDirty ? "default" : "outline"}
        size="sm"
      >
        {isSaving ? (
          <span className="flex items-center gap-1.5">
            <span className="animate-spin">⟳</span>
            保存中...
          </span>
        ) : (
          <span className="flex items-center gap-1.5">
            {isDirty && <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />}
            保存
          </span>
        )}
      </Button>

      <Dialog open={showCommitDialog} onOpenChange={(o) => !o && setShowCommitDialog(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>コミットメッセージ</DialogTitle>
          </DialogHeader>
          <div>
            <Label htmlFor="commit-message">メッセージ</Label>
            <Input
              id="commit-message"
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
              placeholder="Update network topology"
              className="mt-1"
              onKeyDown={(e) => e.key === "Enter" && handleCommit()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCommitDialog(false)}>
              キャンセル
            </Button>
            <Button onClick={handleCommit}>保存 & コミット</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
