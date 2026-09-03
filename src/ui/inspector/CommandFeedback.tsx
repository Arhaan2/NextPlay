interface CommandFeedbackProps {
  feedback?: { tone: "success" | "error"; message: string };
}

export function CommandFeedback({ feedback }: CommandFeedbackProps) {
  if (feedback === undefined) {
    return null;
  }

  return <p className={`command-feedback command-feedback--${feedback.tone}`} role="status">{feedback.message}</p>;
}
