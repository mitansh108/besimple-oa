import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom'
import { JudgesPage } from './pages/Judges'
import { SubmissionsPage } from './pages/Submissions'
import { ResultsPage } from './pages/Results'
import { DashboardPage } from './pages/Dashboard'
import { LandingPage } from './pages/Landing'
import clsx from 'clsx'
import './App.css'

function Navigation() {
  const location = useLocation();
  
  return (
    <nav className="bg-white border-b border-orange-100 shadow-sm">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center space-x-8">
          <Link
            to="/"
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <img 
              src="/logos/verdict-high-resolution-logo-transparent.png" 
              alt="Verdict Logo" 
              className="h-8 w-auto"
            />
          </Link>
          <div className="flex space-x-8">
          <Link
            to="/dashboard"
            className={clsx(
              "border-b-2 py-4 px-1 text-sm font-medium transition-colors",
              location.pathname === "/dashboard"
                ? "border-orange-500 text-orange-600"
                : "border-transparent text-slate-600 hover:text-orange-600 hover:border-orange-200"
            )}
          >
            Dashboard
          </Link>
          <Link
            to="/judges"
            className={clsx(
              "border-b-2 py-4 px-1 text-sm font-medium transition-colors",
              location.pathname === "/judges"
                ? "border-orange-500 text-orange-600"
                : "border-transparent text-slate-600 hover:text-orange-600 hover:border-orange-200"
            )}
          >
            Judges
          </Link>
          <Link
            to="/submissions"
            className={clsx(
              "border-b-2 py-4 px-1 text-sm font-medium transition-colors",
              location.pathname === "/submissions"
                ? "border-orange-500 text-orange-600"
                : "border-transparent text-slate-600 hover:text-orange-600 hover:border-orange-200"
            )}
          >
            Submissions
          </Link>
          <Link
            to="/results"
            className={clsx(
              "border-b-2 py-4 px-1 text-sm font-medium transition-colors",
              location.pathname === "/results"
                ? "border-orange-500 text-orange-600"
                : "border-transparent text-slate-600 hover:text-orange-600 hover:border-orange-200"
            )}
          >
            Results
          </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}

function AppContent() {
  const location = useLocation();
  const showNav = location.pathname !== "/";

  return (
    <>
      {showNav && <Navigation />}
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/dashboard" element={
          <div className="min-h-screen bg-orange-50/30">
            <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
              <DashboardPage />
            </div>
          </div>
        } />
        <Route path="/judges" element={
          <div className="min-h-screen bg-orange-50/30">
            <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
              <JudgesPage />
            </div>
          </div>
        } />
        <Route path="/submissions" element={
          <div className="min-h-screen bg-orange-50/30">
            <SubmissionsPage />
          </div>
        } />
        <Route path="/results" element={
          <div className="min-h-screen bg-orange-50/30">
            <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
              <ResultsPage />
            </div>
          </div>
        } />
      </Routes>
    </>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  )
}

export default App

