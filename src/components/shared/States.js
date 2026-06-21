export function LoadingSpinner({ text = 'Loading data...' }) {
  return (
    <div className="loading-container">
      <div className="spinner" />
      <span className="loading-text">{text}</span>
    </div>
  );
}

export function EmptyState({ title = 'No data found', sub = 'Try adjusting your filters.', icon = '📭' }) {
  return (
    <div className="empty-state">
      <span className="empty-state-icon">{icon}</span>
      <span className="empty-state-title">{title}</span>
      <span className="empty-state-sub">{sub}</span>
    </div>
  );
}
