import type { ActivityEvent } from "../domain/types";

interface ActivityRailProps {
  activity: ActivityEvent[];
  webMcpAvailable: boolean;
}

function actorLabel(actor: ActivityEvent["actor"]): string {
  return actor.toUpperCase();
}

export function ActivityRail({ activity, webMcpAvailable }: ActivityRailProps) {
  return (
    <section className="rail-section" aria-labelledby="activity-title">
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
          {activity.map((event) => (
            <li key={event.id} className={`activity-event activity-event--${event.status}`}>
              <div><strong>{actorLabel(event.actor)}</strong><span>{event.operation.replaceAll("_", " ")}</span></div>
              <p>{event.summary}</p>
              <small>{event.channel} · {event.status} · r{event.revisionBefore} → r{event.revisionAfter}</small>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
