export function emiFrequencyFromSettings(settings) {
  const value = String(settings?.emiFrequency || '').toLowerCase()
  if (value === 'weekly' || value === 'quarterly') return value
  return 'monthly'
}

export function buildEmiSchedule({ emiAmount, emiPeriod, emiDate, frequency = 'monthly' }) {
  const step = emiFrequencyFromSettings({ emiFrequency: frequency })
  const rows = []
  let cumulative = 0
  const principal = Number(emiAmount) * Number(emiPeriod) * 0.85
  const interestPerEmi = Math.round(((principal * 0.01 * Number(emiPeriod)) / Number(emiPeriod)) * 100) / 100
  const start = new Date(emiDate)
  for (let i = 0; i < Number(emiPeriod); i++) {
    const due = new Date(start)
    if (step === 'weekly') due.setDate(start.getDate() + i * 7)
    else if (step === 'quarterly') due.setMonth(start.getMonth() + i * 3)
    else due.setMonth(start.getMonth() + i)
    cumulative += Number(emiAmount)
    rows.push({
      sno: i + 1,
      dueDate: due.toISOString().slice(0, 10),
      amount: Number(emiAmount),
      interestComponent: interestPerEmi,
      paidInterest: 0,
      paidAmount: 0,
      balance: Number(emiAmount),
      cumulativeBalance: cumulative,
      status: 'pending',
    })
  }
  return rows
}
