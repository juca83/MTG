import { BrowserRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { Search, BookOpen, Layers, Settings } from 'lucide-react'
import SearchPage from './pages/Search'
import CollectionPage from './pages/Collection'
import DecksPage from './pages/Decks'
import DeckDetailPage from './pages/DeckDetail'

function NavBar() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-app-surface border-t border-app-border safe-bottom z-50">
      <div className="flex items-stretch justify-around max-w-lg mx-auto">
        <NavLink to="/" end className={({ isActive }) => `nav-item flex-1 ${isActive ? 'active' : ''}`}>
          <Search size={20} />
          <span>Search</span>
        </NavLink>
        <NavLink to="/collection" className={({ isActive }) => `nav-item flex-1 ${isActive ? 'active' : ''}`}>
          <BookOpen size={20} />
          <span>Collection</span>
        </NavLink>
        <NavLink to="/decks" className={({ isActive }) => `nav-item flex-1 ${isActive ? 'active' : ''}`}>
          <Layers size={20} />
          <span>Decks</span>
        </NavLink>
      </div>
    </nav>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-app-bg pb-16">
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: '#1a1a2e',
              color: '#fff',
              border: '1px solid #2a2a4a',
            },
          }}
        />
        <Routes>
          <Route path="/" element={<SearchPage />} />
          <Route path="/collection" element={<CollectionPage />} />
          <Route path="/decks" element={<DecksPage />} />
          <Route path="/decks/:deckId" element={<DeckDetailPage />} />
        </Routes>
        <NavBar />
      </div>
    </BrowserRouter>
  )
}
