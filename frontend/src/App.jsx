import { Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedLayout } from './components/Layout.jsx'
import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import FinanceList from './pages/FinanceList.jsx'
import NewFinance from './pages/NewFinance.jsx'
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
import ChartOfAccounts from './pages/accounting/ChartOfAccounts.jsx'
import Journals from './pages/accounting/Journals.jsx'
import JournalDetail from './pages/accounting/JournalDetail.jsx'
import TrialBalance from './pages/accounting/TrialBalance.jsx'
import AccountLedger from './pages/accounting/AccountLedger.jsx'
import SubMastersPage from './pages/accounting/SubMastersPage.jsx'

import CustomerFrame from './pages/customer/CustomerFrame.jsx'
import CustomerDetail from './pages/customer/CustomerDetail.jsx'
import EmiReports from './pages/customer/EmiReports.jsx'
import OutPayments from './pages/customer/OutPayments.jsx'
import Receipt from './pages/customer/Receipt.jsx'
import CustomerSimple from './pages/customer/CustomerSimple.jsx'
import GlobalSearch from './pages/GlobalSearch.jsx'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<ProtectedLayout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/search" element={<GlobalSearch />} />
        <Route path="/finance" element={<FinanceList />} />
        <Route path="/finance/new" element={<NewFinance />} />

        <Route path="/finance/:id" element={<CustomerFrame />}>
          <Route index element={<CustomerDetail />} />
          <Route path="receipt" element={<Receipt />} />
          <Route path="emi-reports" element={<EmiReports />} />
          <Route path="out-payments" element={<OutPayments />} />
          <Route path="handloans" element={<CustomerSimple title="Hand Loans" />} />
          <Route path="bills" element={<CustomerSimple title="Bills" />} />
          <Route path="ods" element={<CustomerSimple title="OD's" />} />
          <Route path="clearance" element={<CustomerSimple title="Clearance / STM" />} />
          <Route path="reminders" element={<CustomerSimple title="Reminders" />} />
          <Route path="seized" element={<CustomerSimple title="Seized Reports" />} />
          <Route path="closed" element={<CustomerSimple title="Closed Reports" />} />
        </Route>

        <Route path="/module/:key" element={<GenericModuleList />} />
        <Route path="/consultancy" element={<Consultancy />} />
        <Route path="/users" element={<Users />} />
        <Route path="/reports" element={<ReportsMenu />} />
        <Route path="/reports/balance-sheet" element={<BalanceSheet />} />
        <Route path="/reports/pnl" element={<PnL />} />
        <Route path="/reports/day-report" element={<DayReport />} />
        <Route path="/reports/trial-balance" element={<TrialBalance />} />
        <Route path="/charts" element={<Charts />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/support" element={<Support />} />

        <Route path="/accounting/accounts" element={<ChartOfAccounts />} />
        <Route path="/accounting/accounts/:id" element={<AccountLedger />} />
        <Route path="/accounting/journals" element={<Journals />} />
        <Route path="/accounting/journals/:id" element={<JournalDetail />} />
        <Route path="/accounting/sub-masters" element={<SubMastersPage />} />
        <Route path="/accounting/trial-balance" element={<TrialBalance />} />
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
