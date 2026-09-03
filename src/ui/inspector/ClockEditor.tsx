import { useState } from "react";

import { COACH_UI } from "../../application/commandMetadata";
import { playCommands } from "../../application/commands";
import type { CommandResult } from "../../application/commandResults";

interface ClockEditorProps {
  clockSeconds: number;
  revision: number;
  onResult: (result: CommandResult<unknown>) => void;
}

export function ClockEditor({ clockSeconds, revision, onResult }: ClockEditorProps) {
  const [draft, setDraft] = useState(String(clockSeconds));

  function submit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const nextClock = Number(draft);
    if (!Number.isFinite(nextClock) || nextClock <= 0) {
      onResult({ ok: false, revision, code: "INVALID_INPUT", message: "Clock must be a finite number greater than zero." });
      return;
    }
    onResult(playCommands.setClock({ clockSeconds: nextClock, expectedRevision: revision }, COACH_UI));
  }

  return (
    <form className="clock-editor" onSubmit={submit} aria-label="Play clock editor" noValidate>
      <label htmlFor="play-clock">Clock</label>
      <div>
        <input id="play-clock" name="play-clock" type="number" min="0.1" step="0.1" value={draft} onChange={(event) => setDraft(event.target.value)} />
        <button className="secondary-button" type="submit">Apply</button>
      </div>
    </form>
  );
}
