import { Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedLayout } from './components/Layout.jsx'
import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import FinanceList from './pages/FinanceList.jsx'
import GenericModuleList from './pages/GenericModuleList.jsx'
import Consultancy from './pages/Consultancy.jsx'
import Users from './pages/Users.jsx'
import ReportsMenu from './pages/ReportsMenu.jsx'
import BalanceSheet from './pages/BalanceSheet.jsx'
import PnL from './pages/PnL.jsx'
import DayReport from './pages/DayReport.jsx'
import Charts from './pages/Charts.jsx'
import Settings from './pages/Settings.jsx'
import Support from './pages/Support.jsx'

import CustomerFrame from './pages/customer/CustomerFrame.jsx'
import CustomerDetail from './pages/customer/CustomerDetail.jsx'
import EmiReports from './pages/customer/EmiReports.jsx'
import OutPayments from './pages/customer/OutPayments.jsx'
import Receipt from './pages/customer/Receipt.jsx'
import CustomerSimple from './pages/customer/CustomerSimple.jsx'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<ProtectedLayout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/finance" element={<FinanceList />} />

        <Route path="/finance/:id" element={<CustomerFrame />}>
          <Route index element={<CustomerDetail />} />
          <Route path="receipt" element={<Receipt />} />
          <Route path="emi-reports" element={<EmiReports />} />
          <Route path="out-payments" element={<OutPayments />} />
          <Route path="handloans" element={<CustomerSimple title="Hand Loans" />} />
          <Route path="bills" element={<CustomerSimple title="Bills" />} />
          <Route path="ods" element={<CustomerSimple title="OD's" note="No overdue amount calculated for this finance." />} />
          <Route path="clearance" element={<CustomerSimple title="Clearance / STM" note="This finance has not been settled yet." />} />
          <Route path="reminders" element={<CustomerSimple title="Reminders" note="No reminders scheduled." />} />
          <Route path="seized" element={<CustomerSimple title="Seized Reports" note="This vehicle has not been seized." />} />
          <Route path="closed" element={<CustomerSimple title="Closed Reports" note="This finance is still active." />} />
        </Route>

        <Route path="/module/:key" element={<GenericModuleList />} />
        <Route path="/consultancy" element={<Consultancy />} />
        <Route path="/users" element={<Users />} />
        <Route path="/reports" element={<ReportsMenu />} />
        <Route path="/reports/balance-sheet" element={<BalanceSheet />} />
        <Route path="/reports/pnl" element={<PnL />} />
        <Route path="/reports/day-report" element={<DayReport />} />
        <Route path="/charts" element={<Charts />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/support" element={<Support />} />
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
