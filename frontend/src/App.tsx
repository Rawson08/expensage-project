import { Routes, Route } from 'react-router-dom';
import './App.css';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Layout and Page components
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import PublicRoute from './components/PublicRoute';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import GroupDetailPage from './pages/GroupDetailPage';
import FriendsPage from './pages/FriendsPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import HelpPage from './pages/HelpPage'; // Import HelpPage
import NotFoundPage from './pages/NotFoundPage';

function App() {
  return (
    <> {/* Root Fragment */}
      <Routes>
        {/* Public Landing Page */}
        <Route path="/" element={<LandingPage />} />

        {/* Public Verification Page */}
        <Route path="/verify-email" element={<VerifyEmailPage />} />

        {/* Public Password Reset Pages */}
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />


        {/* Routes with the main Layout */}
        <Route element={<Layout />}>
          {/* Public routes (Login/Register) */}
          <Route element={<PublicRoute />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
          </Route>

          {/* Protected Routes (App Core) */}
          <Route element={<ProtectedRoute />}>
            <Route path="/app" element={<DashboardPage />} />
            <Route path="/app/group/:groupId" element={<GroupDetailPage />} />
            <Route path="/app/friends" element={<FriendsPage />} />
            <Route path="/app/help" element={<HelpPage />} /> {/* Add HelpPage route */}
            {/* Add other protected app routes here */}
          </Route>

          {/* Catch-all 404 within Layout */}
          <Route path="*" element={<NotFoundPage />} />
        </Route>

      </Routes>
      {/* Toast Notifications Container */}
      <ToastContainer
          position="top-right"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="light"
      />
    </>
  );
}

export default App;
