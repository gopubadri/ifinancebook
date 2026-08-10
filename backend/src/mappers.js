function n(value) {
  if (value == null) return value
  return Number(value)
}

function isoDate(value) {
  if (!value) return value
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  return String(value).slice(0, 10)
}

function displayDate(value) {
  if (!value) return ''
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${dd}-${mm}-${yyyy}`
}

export function mapCustomer(row) {
  return {
    id: row.id,
    hpNo: row.hp_no,
    name: row.name,
    mobile: row.mobile,
    regNo: row.reg_no,
    village: row.village,
    emiPeriod: row.emi_period,
    emiAmount: n(row.emi_amount),
    makersNo: row.makers_no,
    model: row.model,
    chasisNo: row.chasis_no,
    engNo: row.eng_no,
    cb: row.cb,
    clrDate: isoDate(row.clr_date),
    emiDate: isoDate(row.emi_date),
    seized: row.seized,
    closed: row.closed,
    seizedDate: isoDate(row.seized_date),
    closedDate: isoDate(row.closed_date),
    city: row.city || '',
    state: row.state || '',
    street: row.street || '',
    alternateMobile: row.alternate_mobile || '',
    createdBy: row.created_by || '',
  }
}

export function mapEmiRow(row) {
  return {
    sno: row.sno,
    dueDate: isoDate(row.due_date),
    amount: n(row.amount),
    interestComponent: n(row.interest_component),
    paidInterest: n(row.paid_interest),
    paidAmount: n(row.paid_amount),
    balance: n(row.balance),
    cumulativeBalance: n(row.cumulative_balance),
    status: row.status,
  }
}

export function mapOutPayment(row) {
  return {
    sno: row.sno,
    amount: n(row.amount),
    date: isoDate(row.paid_date),
    dueDate: isoDate(row.due_date),
    interest: n(row.interest),
    paidAmount: n(row.paid_amount),
    status: row.status,
    notes: row.notes || '',
  }
}

export function mapStaff(row) {
  return {
    id: row.id,
    name: row.name,
    mobile: row.mobile,
    type: row.type,
    date: displayDate(row.joined_on),
  }
}

export function mapAuthUser(row) {
  return {
    id: row.id,
    username: row.username,
    name: row.name,
    role: row.role,
    date: displayDate(row.created_at),
  }
}

export function mapBike(row) {
  return {
    id: row.id,
    rcNo: row.rc_no,
    makers: row.makers,
    model: row.model,
    purchaseDate: displayDate(row.purchase_date),
    purchaseAmount: n(row.purchase_amount),
    repairCost: n(row.repair_cost),
    sellingPrice: n(row.selling_price),
    status: row.status || (n(row.selling_price) > 0 ? 'sold' : 'in_stock'),
    soldDate: row.sold_date ? displayDate(row.sold_date) : null,
    notes: row.notes || '',
  }
}

export function mapDayReport(row) {
  return {
    sno: row.sno,
    name: row.name,
    rcNo: row.rc_no,
    hp: row.hp,
    desc: row.description,
    createdBy: row.created_by || '',
    receiptAmt: n(row.receipt_amt),
  }
}
