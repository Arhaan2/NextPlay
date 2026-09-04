import { useState } from "react";

import type { ActivityEvent } from "../domain/types";

interface ActivityRailProps {
  activity: ActivityEvent[];
  webMcpAvailable: boolean;
}

function actorLabel(actor: ActivityEvent["actor"]): string {
  return actor.toUpperCase();
}

function operationLabel(operation: string): string {
  return operation.replaceAll("_", " ");
}

function detailText(details: unknown): string | undefined {
  if (details === undefined) {
    return undefined;
  }

  try {
    const serialized = JSON.stringify(details, (_key, value: unknown) => {
      if (typeof value === "function" || typeof value === "symbol") {
        return undefined;
      }
      if (typeof value === "bigint") {
        return value.toString();
      }
      return value;
    }, 2);
    return serialized === undefined ? undefined : serialized;
  } catch {
    return "Details could not be displayed safely.";
  }
}

export function ActivityRail({ activity, webMcpAvailable }: ActivityRailProps) {
  const [expanded, setExpanded] = useState<string[]>([]);

  function toggleDetails(id: string): void {
    setExpanded((current) => current.includes(id)
      ? current.filter((item) => item !== id)
      : [...current, id]);
  }

  return (
    <section className="rail-section activity-rail" aria-labelledby="activity-title">
      <div className="panel-heading">
        <h2 id="activity-title">Agent activity</h2>
        <span>{activity.length}</span>
      </div>
      {activity.length === 0 ? (
        <p className="empty-state">
          {webMcpAvailable ? "No WebMCP activity yet." : "WebMCP tools are not registered yet."}
        </p>
      ) : (
        <ol className="activity-list">
          {activity.map((event) => {
            const details = detailText(event.details);
            const isExpanded = expanded.includes(event.id);
            return (
            <li key={event.id} className={`activity-event activity-event--${event.status} activity-event--${event.actor}`}>
              <div className="activity-event__heading"><strong>{actorLabel(event.actor)}</strong><span>{operationLabel(event.operation)}</span><small>r{event.revisionBefore} → r{event.revisionAfter}</small><b>{event.status}</b></div>
              <p>{event.summary}</p>
              <small>{event.channel.toUpperCase()} · r{event.revisionBefore} → r{event.revisionAfter}</small>
              {details === undefined ? null : <>
                <button className="activity-event__details-toggle" type="button" onClick={() => toggleDetails(event.id)} aria-expanded={isExpanded} aria-controls={`activity-details-${event.id}`}>
                  {isExpanded ? "Collapse details" : "Expand details"}
                </button>
                {isExpanded ? <pre className="activity-event__details" id={`activity-details-${event.id}`}>{details}</pre> : null}
              </>}
            </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
