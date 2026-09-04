import { COACH_UI } from "../application/commandMetadata";
import { playCommands } from "../application/commands";
import type { ValidationIssue, ValidationReport } from "../domain/types";
interface Props { report: ValidationReport; onMessage: (tone: "success" | "error", message: string) => void; }

function validationIssue(entry: ValidationIssue, index: number) {
  const title = entry.actionId === undefined ? entry.code.replaceAll("_", " ") : `${entry.actionId} · ${entry.code.replaceAll("_", " ")}`;
  return <article className="validation-issue" key={`${entry.code}-${entry.actionId ?? index}`}>
    <strong>{title}</strong>
    {entry.endSecond === undefined ? <p>{entry.message}</p> : <><dl>
      <div><dt>Ends at</dt><dd>{entry.endSecond.toFixed(2)}s</dd></div>
      {entry.clockSeconds === undefined ? null : <div><dt>Clock limit</dt><dd>{entry.clockSeconds.toFixed(2)}s</dd></div>}
      {entry.overBySeconds === undefined ? null : <div><dt>Over by</dt><dd>{entry.overBySeconds.toFixed(2)}s</dd></div>}
    </dl><p className="validation-issue__source">{entry.message}</p></>}
  </article>;
}

export function ValidationPanel({ report, onMessage }: Props) {
  const run = () => {
    const result = playCommands.runValidation(COACH_UI);
    onMessage(result.ok ? "success" : "error", result.ok ? `Validated at revision ${result.revision}.` : `${result.code}: ${result.message}`);
  };

  const hasOnlyGoldenClockOverflow = report.status === "complete"
    && report.errors.length === 1
    && report.errors[0]?.code === "CLOCK_OVERFLOW";
  const invalidSummary = hasOnlyGoldenClockOverflow
    ? "1 timing conflict"
    : `${report.status === "complete" ? report.errors.length : 0} blocking error${report.status === "complete" && report.errors.length === 1 ? "" : "s"}`;

  return <section className="rail-section validation-panel" aria-labelledby="checks-title" aria-live="polite">
    <div className="panel-heading"><h2 id="checks-title">Play checks</h2><span>{report.status === "not_run" ? "—" : `${report.checksPassed}/${report.checksTotal}`}</span></div>
    {report.status === "not_run" ? <><p className="empty-state">Validation has not been run yet.</p><button className="secondary-button validation-panel__run" type="button" onClick={run}>Run checks</button></> : <>
      <p className={report.valid ? "validation-summary is-valid" : "validation-summary is-invalid"}>{report.valid ? <><span aria-hidden="true">✓ </span><span>{report.checksPassed}/{report.checksTotal} execution checks passed</span></> : hasOnlyGoldenClockOverflow ? "! Timing conflict" : `${report.checksPassed}/${report.checksTotal} execution checks passed · ${invalidSummary}`}</p>
      {!report.valid && hasOnlyGoldenClockOverflow ? <p className="validation-summary-detail">{report.checksPassed}/{report.checksTotal} execution checks passed · {invalidSummary}</p> : null}
      <small className="validation-revision">Validated at revision {report.validatedRevision}</small>
      {report.valid ? <small className="validation-zero-errors">0 errors</small> : null}
      <ul className="validation-checks">{report.checks.filter((check) => check.status !== "not_applicable").map((check) => <li key={check.id} className={`is-${check.status}`}>{check.label}: {check.status === "passed" ? "passed" : `${check.errorCount} error${check.errorCount === 1 ? "" : "s"}`}</li>)}</ul>
      {report.errors.map(validationIssue)}
      {report.warnings.map((entry, index) => <p className="validation-warning" key={`${entry.code}-${entry.actionId ?? index}`}>{entry.message}</p>)}
      <button className="secondary-button validation-panel__run" type="button" onClick={run}>Run checks again</button>
    </>}
  </section>;
}
