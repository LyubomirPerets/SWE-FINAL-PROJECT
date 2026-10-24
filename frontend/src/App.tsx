import { BrowserRouter, Link, Route, Routes } from 'react-router';
import { AuthProvider } from './auth/AuthProvider';
import { AuthShell } from './components/AuthShell';
import { RequireAuth } from './components/RequireAuth';
import { AuthPage } from './pages/AuthPage';
import { DashboardPage } from './pages/DashboardPage';
import LandingPage from './pages/LandingPage';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<AuthPage key="login" mode="login" />} />
          <Route path="/signup" element={<AuthPage key="signup" mode="signup" />} />
          <Route element={<RequireAuth />}>
            <Route path="/dashboard" element={<DashboardPage />} />
          </Route>
          <Route
            path="*"
            element={
              <AuthShell title="Page not found">
                <title>Page not found | Sierra</title>
                <p>This page doesn’t exist.</p>
                <Link className="auth-button" to="/">
                  Return home
                </Link>
              </AuthShell>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
