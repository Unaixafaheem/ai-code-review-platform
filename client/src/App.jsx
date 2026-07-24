import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import GitHub from './pages/GitHub';
import EditorPage from './pages/Editor';
import History from './pages/History';
import MultiFile from './pages/MultiFile';
import PRBot from './pages/PRBot';
import Share from './pages/Share';
import Rules from './pages/Rules';
import Teams from './pages/Teams';
import Analytics from './pages/Analytics';
import Compare from './pages/Compare';
import Audit from './pages/Audit';

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/share/:shareId" element={<Share />} />
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/github" element={<ProtectedRoute><GitHub /></ProtectedRoute>} />
              <Route path="/multifile" element={<ProtectedRoute><MultiFile /></ProtectedRoute>} />
              <Route path="/pr-bot" element={<ProtectedRoute><PRBot /></ProtectedRoute>} />
              <Route path="/compare" element={<ProtectedRoute><Compare /></ProtectedRoute>} />
              <Route path="/rules" element={<ProtectedRoute><Rules /></ProtectedRoute>} />
              <Route path="/teams" element={<ProtectedRoute><Teams /></ProtectedRoute>} />
              <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
              <Route path="/audit" element={<ProtectedRoute><Audit /></ProtectedRoute>} />
              <Route path="/editor" element={<ProtectedRoute><EditorPage /></ProtectedRoute>} />
              <Route path="/history" element={<ProtectedRoute><History /></ProtectedRoute>} />
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
