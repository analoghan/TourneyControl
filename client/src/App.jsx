import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom'
import JudgesInterface from './components/JudgesInterface'
import StaffInterface from './components/StaffInterface'
import LoginPage from './components/LoginPage'
import './App.css'

function NavBar() {
  const location = useLocation()
  const isLoginPage = location.pathname === '/'
  
  if (isLoginPage) {
    return null
  }
  
  const getTitle = () => {
    if (location.pathname === '/judges') {
      return 'ATA Region 102 Tournament Control - Judges Dashboard'
    } else if (location.pathname === '/staff') {
      return 'ATA Region 102 Tournament Control - Staff Dashboard'
    }
    return 'ATA Region 102 Tournament Control'
  }
  
  return (
    <nav className="navbar">
      <h1>{getTitle()}</h1>
      <div className="nav-links">
        <Link to="/">Logout</Link>
      </div>
    </nav>
  )
}

function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <NavBar />
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/judges" element={<JudgesInterface />} />
          <Route path="/staff" element={<StaffInterface />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

export default App
