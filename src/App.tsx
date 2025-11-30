import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom'
import { JudgesPage } from './pages/Judges'
import { SubmissionsPage } from './pages/Submissions'
import { AssignmentsPage } from './pages/Assignments'
import clsx from 'clsx'
import './App.css'

function Navigation() {
  const location = useLocation();
  
  return (
    <nav className="bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex space-x-8">
          <Link
            to="/judges"
            className={clsx(
              "border-b-2 py-4 px-1 text-sm font-medium transition-colors",
              location.pathname === "/judges" || location.pathname === "/"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
            )}
          >
            Judges
          </Link>
          <Link
            to="/submissions"
            className={clsx(
              "border-b-2 py-4 px-1 text-sm font-medium transition-colors",
              location.pathname === "/submissions"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
            )}
          >
            Submissions
          </Link>
          <Link
            to="/assignments"
            className={clsx(
              "border-b-2 py-4 px-1 text-sm font-medium transition-colors",
              location.pathname === "/assignments"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
            )}
          >
            Assignments
          </Link>
        </div>
      </div>
    </nav>
  );
}

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-slate-50">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Routes>
            <Route path="/" element={<JudgesPage />} />
            <Route path="/judges" element={<JudgesPage />} />
            <Route path="/submissions" element={<SubmissionsPage />} />
            <Route path="/assignments" element={<AssignmentsPage />} />
          </Routes>
        </div>
      </div>
    </Router>
  )
}

export default App

