export default function StatusBadge({ status }) {
  const cls = status?.toLowerCase() || 'absent';
  return (
    <span className={`badge ${cls}`}>
      <span className="badge-dot" />
      {status || 'Absent'}
    </span>
  );
}
