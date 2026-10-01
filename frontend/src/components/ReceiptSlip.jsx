import { dmy, inr } from '../utils/format.js'

export default function ReceiptSlip({
  settings,
  rcNo,
  date,
  customer,
  amount,
  ta,
  total,
  receivedBy,
  onPrint,
  onClose,
  closeLabel = 'Close',
}) {
  return (
    <div className="receipt-slip" style={{ marginBottom: 18 }}>
      <div className="receipt-slip-brand">
        <h2>SRI ADITYA FINANCE</h2>
        <p>{settings?.city || 'TADEPALLIGUDEM'}{settings?.street ? ` · ${settings.street}` : ''}</p>
        {settings?.mobile && <p>Ph: {settings.mobile}</p>}
      </div>
      <div className="receipt-slip-title">EMI Receipt</div>
      <div className="receipt-slip-row"><span>Receipt No</span><span className="mono">{rcNo}</span></div>
      <div className="receipt-slip-row"><span>Date</span><span>{dmy(date)}</span></div>
      <div className="receipt-slip-row"><span>HP No</span><span className="mono">{customer?.hpNo}</span></div>
      <div className="receipt-slip-row"><span>Name</span><span>{customer?.name}</span></div>
      <div className="receipt-slip-row"><span>Reg No</span><span className="mono">{customer?.regNo || '—'}</span></div>
      <div className="receipt-slip-row"><span>Village</span><span>{customer?.village || '—'}</span></div>
      <div className="receipt-slip-row"><span>EMI Amount</span><span>{inr(amount)}</span></div>
      <div className="receipt-slip-row"><span>TA</span><span>{inr(ta)}</span></div>
      <div className="receipt-slip-row total"><span>Total received</span><span>₹{inr(total)}</span></div>
      <div className="receipt-slip-row"><span>Received by</span><span>{receivedBy || '—'}</span></div>
      <div className="receipt-slip-actions no-print">
        <button type="button" className="btn brass" onClick={onPrint || (() => window.print())}>Print receipt</button>
        {onClose && (
          <button type="button" className="btn outline" onClick={onClose}>{closeLabel}</button>
        )}
      </div>
    </div>
  )
}
