export function ValidationPlaceholder() {
  return (
    <section className="rail-section" aria-labelledby="checks-title">
      <div className="panel-heading">
        <h2 id="checks-title">Play checks</h2>
        <span>—</span>
      </div>
      <p className="empty-state">Validation has not been run yet.</p>
    </section>
  );
}
