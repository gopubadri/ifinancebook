/** Download rows as a CSV file (opens in Excel). */
export function exportCsv(filename, columns, rows) {
  function cell(value) {
    const s = value == null ? '' : String(value)
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
    return s
  }

  const header = columns.map((c) => cell(c.label)).join(',')
  const lines = rows.map((row) =>
    columns
      .map((c) => {
        const raw = typeof c.value === 'function' ? c.value(row) : row[c.key]
        return cell(raw)
      })
      .join(',')
  )

  const blob = new Blob(['\ufeff' + header + '\n' + lines.join('\n')], {
    type: 'text/csv;charset=utf-8;',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
