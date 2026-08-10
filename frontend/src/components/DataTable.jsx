// columns: [{ key, label, numeric, render(row) }]
export default function DataTable({ columns, rows, emptyMessage = 'No records found.' }) {
  if (!rows || rows.length === 0) {
    return (
      <div className="table-wrap">
        <div className="empty-state">{emptyMessage}</div>
      </div>
    )
  }

  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} className={col.numeric ? 'num' : ''}>{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.id ?? i}>
              {columns.map((col) => (
                <td key={col.key} className={col.numeric ? 'num' : ''}>
                  {col.render ? col.render(row, i) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
