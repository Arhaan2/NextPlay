import { useState } from "react";

export const FIRST_DEMO_PROMPT = "Use this page’s tools to create a sideline out-of-bounds play that produces a right-corner three for O2. O5 should screen for O2, O4 should cut as a decoy, and the entire play must finish within 4.2 seconds. Read the current play first, add the actions, validate the result, and animate it.";

export const SECOND_DEMO_PROMPT = "I moved the screen, locked the screen and O2’s route, and shortened the clock to 2.0 seconds. Re-read the live play and retime only the unlocked actions so the play finishes within the new clock. Preserve every locked action, validate it, and animate it again.";

interface PromptCardProps {
  label: string;
  prompt: string;
}

function PromptCard({ label, prompt }: PromptCardProps) {
  const [feedback, setFeedback] = useState<string>();

  async function copyPrompt(): Promise<void> {
    if (typeof navigator.clipboard?.writeText !== "function") {
      setFeedback("Clipboard unavailable — select and copy the prompt manually.");
      return;
    }

    try {
      await navigator.clipboard.writeText(prompt);
      setFeedback(`${label} prompt copied.`);
    } catch {
      setFeedback("Could not copy the prompt — select and copy it manually.");
    }
  }

  return (
    <article className="demo-prompt-card">
      <div className="demo-prompt-card__heading">
        <h3>{label}</h3>
        <button className="secondary-button" type="button" onClick={() => void copyPrompt()} aria-label={`Copy ${label.toLowerCase()} demo prompt`}>Copy</button>
      </div>
      <p>{prompt}</p>
      <output className="demo-prompt-card__feedback" aria-live="polite">{feedback}</output>
    </article>
  );
}

export function DemoPrompts() {
  return (
    <div className="demo-prompts" aria-labelledby="demo-prompts-title">
      <details>
        <summary>
          <strong id="demo-prompts-title">Demo prompts</strong>
        </summary>
        <div className="demo-prompts__list">
          <PromptCard label="First play" prompt={FIRST_DEMO_PROMPT} />
          <PromptCard label="Replan" prompt={SECOND_DEMO_PROMPT} />
        </div>
      </details>
    </div>
  );
}
