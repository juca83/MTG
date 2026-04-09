import { BrowserRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { Home, List, BarChart2, Target, Settings, Wallet } from 'lucide-react'
import Dashboard from './pages/Dashboard'
import Expenses from './pages/Expenses'
import Analytics from './pages/Analytics'
import Budgets from './pages/Budgets'
import Accounts from './pages/Accounts'
import SettingsPage from './pages/Settings'

function BottomNav() {
  const location = useLocation()
  const items = [
    { to: '/',         icon: Home,     label: 'Accueil' },
    { to: '/expenses', icon: List,     label: 'Dépenses' },
    { to: '/analytics',icon: BarChart2,label: 'Analyse' },
    { to: '/budgets',  icon: Target,   label: 'Budget' },
    { to: '/accounts', icon: Wallet,   label: 'Comptes' },
    { to: '/settings', icon: Settings, label: 'Réglages' },
  ]
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-app-surface border-t border-app-border safe-bottom z-40">
      <div className="flex justify-around items-center h-14 max-w-lg mx-auto">
        {items.map(({ to, icon: Icon, label }) => {
          const active = location.pathname === to
          return (
            <NavLink key={to} to={to} className={`nav-item ${active ? 'active' : ''}`}>
              <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
              <span className="text-[10px]">{label}</span>
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-center"
        toastOptions={{
          style: { background: '#1e293b', color: '#f1f5f9', border: '1px solid #334155' },
          duration: 2500,
        }}
      />
      <div className="min-h-screen bg-app-bg max-w-lg mx-auto relative">
        <Routes>
          <Route path="/"          element={<Dashboard />} />
          <Route path="/expenses"  element={<Expenses />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/budgets"   element={<Budgets />} />
          <Route path="/accounts"  element={<Accounts />} />
          <Route path="/settings"  element={<SettingsPage />} />
        </Routes>
        <BottomNav />
      </div>
    </BrowserRouter>
  )
}
