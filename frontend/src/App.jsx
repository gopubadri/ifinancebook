import { Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedLayout } from './components/Layout.jsx'

// auth
import Login from './pages/auth/Login.jsx'

// dashboard
import Dashboard from './pages/dashboard/Dashboard.jsx'
import GlobalSearch from './pages/dashboard/GlobalSearch.jsx'

// finance
import FinanceList from './pages/finance/FinanceList.jsx'
import NewFinance from './pages/finance/NewFinance.jsx'
import CustomerFrame from './pages/customer/CustomerFrame.jsx'
import CustomerDetail from './pages/customer/CustomerDetail.jsx'
import Receipt from './pages/customer/Receipt.jsx'
import EmiReports from './pages/customer/EmiReports.jsx'
import OutPayments from './pages/customer/OutPayments.jsx'
import CustomerSimple from './pages/customer/CustomerSimple.jsx'

// modules
import GenericModuleList from './pages/modules/GenericModuleList.jsx'
import Consultancy from './pages/modules/Consultancy.jsx'

// reports
import ReportsMenu from './pages/reports/ReportsMenu.jsx'
import DayReport from './pages/reports/DayReport.jsx'
import BalanceSheet from './pages/reports/BalanceSheet.jsx'
import PnL from './pages/reports/PnL.jsx'
import Charts from './pages/reports/Charts.jsx'
import ClosedHpReport from './pages/reports/ClosedHpReport.jsx'
import SeizedHpReport from './pages/reports/SeizedHpReport.jsx'
import OdReport from './pages/reports/OdReport.jsx'
import CollectionReport from './pages/reports/CollectionReport.jsx'

// accounting
import ChartOfAccounts from './pages/accounting/ChartOfAccounts.jsx'
import AccountLedger from './pages/accounting/AccountLedger.jsx'
import Journals from './pages/accounting/Journals.jsx'
import JournalDetail from './pages/accounting/JournalDetail.jsx'
import SubMastersPage from './pages/accounting/SubMastersPage.jsx'
import TrialBalance from './pages/accounting/TrialBalance.jsx'

// admin
import Users from './pages/admin/Users.jsx'
import Settings from './pages/admin/Settings.jsx'
import Support from './pages/admin/Support.jsx'

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

        <Route path="/reports" element={<ReportsMenu />} />
        <Route path="/reports/day-report" element={<DayReport />} />
        <Route path="/reports/closed-hp" element={<ClosedHpReport />} />
        <Route path="/reports/seized-hp" element={<SeizedHpReport />} />
        <Route path="/reports/od" element={<OdReport />} />
        <Route path="/reports/collection" element={<CollectionReport />} />
        <Route path="/reports/balance-sheet" element={<BalanceSheet />} />
        <Route path="/reports/pnl" element={<PnL />} />
        <Route path="/reports/trial-balance" element={<TrialBalance />} />
        <Route path="/charts" element={<Charts />} />

        <Route path="/accounting/accounts" element={<ChartOfAccounts />} />
        <Route path="/accounting/accounts/:id" element={<AccountLedger />} />
        <Route path="/accounting/journals" element={<Journals />} />
        <Route path="/accounting/journals/:id" element={<JournalDetail />} />
        <Route path="/accounting/sub-masters" element={<SubMastersPage />} />
        <Route path="/accounting/trial-balance" element={<TrialBalance />} />

        <Route path="/users" element={<Users />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/support" element={<Support />} />
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
