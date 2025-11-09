import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import JudgesInterface from './components/JudgesInterface'
import StaffInterface from './components/StaffInterface'
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <nav className="navbar">
          <h1>Tournament Control</h1>
          <div className="nav-links">
            <Link to="/judges">Judges</Link>
            <Link to="/staff">Staff</Link>
          </div>
        </nav>
        <Routes>
          <Route path="/" element={<StaffInterface />} />
          <Route path="/judges" element={<JudgesInterface />} />
          <Route path="/staff" element={<StaffInterface />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

export default App
