import React from 'react';

function SkeletonRow({ cols }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="skeleton h-4 rounded" style={{ width: `${60 + Math.random() * 40}%` }} />
        </td>
      ))}
    </tr>
  );
}

export default function DataTable({ columns, data, loading, rowKey, emptyMsg = 'No records found' }) {
  return (
    <div className="gym-card p-0 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="gym-table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.key} style={{ width: col.width }}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <SkeletonRow key={i} cols={columns.length} />
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center" style={{ color: 'var(--gym-muted)' }}>
                  <div className="flex flex-col items-center gap-2">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="32" height="32" style={{ opacity: 0.4 }}>
                      <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <span className="text-sm">{emptyMsg}</span>
                  </div>
                </td>
              </tr>
            ) : (
              data.map((row, idx) => (
                <tr key={row[rowKey] ?? idx}>
                  {columns.map((col) => (
                    <td key={col.key}>
                      {col.render
                        ? col.render(row[col.key], row)
                        : row[col.key] ?? '—'}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {!loading && data.length > 0 && (
        <div
          className="px-4 py-2.5 text-xs flex items-center justify-between"
          style={{
            borderTop: '1px solid var(--gym-border)',
            color: 'var(--gym-muted)',
            background: 'var(--gym-surface2)',
          }}
        >
          <span>{data.length} record{data.length !== 1 ? 's' : ''}</span>
          <span style={{ fontFamily: "'Space Mono', monospace" }}>DTS GYM</span>
        </div>
      )}
    </div>
  );
}
