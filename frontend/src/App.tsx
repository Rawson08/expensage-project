import { Routes, Route } from 'react-router-dom';
import './App.css';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Layout and Page components
// import Layout from './components/Layout'; // Keep if used elsewhere, otherwise remove
import MainLayout from './components/MainLayout';
import { DataProvider } from './context/DataContext'; // Import DataProvider
import ProtectedRoute from './components/ProtectedRoute';
import PublicRoute from './components/PublicRoute';
import LandingPage from './pages/LandingPage'; // Add missing import
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
// import DashboardPage from './pages/DashboardPage'; // Remove old import
import GroupsPage from './pages/GroupsPage'; // Add correct import
import GroupDetailPage from './pages/GroupDetailPage';
import FriendsPage from './pages/FriendsPage';
import ActivityPage from './pages/ActivityPage'; // Import new page
import AccountPage from './pages/AccountPage'; // Import new page
// import AddExpensePage from './pages/AddExpensePage'; // Remove old import
import SelectExpenseTargetPage from './pages/SelectExpenseTargetPage'; // Add new selection page import
import ExpenseFormPage from './pages/ExpenseFormPage'; // Add new form page import
import RecordPaymentPage from './pages/RecordPaymentPage'; // Import new payment page
import VerifyEmailPage from './pages/VerifyEmailPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import HelpPage from './pages/HelpPage';
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
        {/* Routes WITHOUT the tabbed MainLayout (Login, Register, etc.) */}
        {/* <Route element={<Layout />}>  Optional: Keep old Layout if needed for login/register pages */}
          <Route element={<PublicRoute />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
          </Route>
        {/* </Route> */}


        {/* Protected Routes using the new MainLayout with BottomNavBar */}
        {/* Wrap ALL Protected Routes with DataProvider */}
        <Route
          element={
            <DataProvider> {/* DataProvider now wraps ProtectedRoute */}
              <ProtectedRoute />
            </DataProvider>
          }
        >
          {/* Routes using MainLayout (now get context via parent) */}
          <Route path="/app" element={<MainLayout />}>
            <Route index element={<GroupsPage />} />
            <Route path="groups" element={<GroupsPage />} />
            <Route path="friends" element={<FriendsPage />} />
            <Route path="add-expense" element={<SelectExpenseTargetPage />} />
            <Route path="activity" element={<ActivityPage />} />
            <Route path="account" element={<AccountPage />} />
            <Route path="group/:groupId" element={<GroupDetailPage />} />
            <Route path="help" element={<HelpPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>

          {/* Expense Form Page (now also gets context via parent) */}
          <Route path="/app/expense/new" element={<ExpenseFormPage />} />
          {/* Add route for Settle Up / Record Payment */}
          <Route path="/app/settle-up" element={<RecordPaymentPage />} />
        </Route>
        {/* Removed extra closing Route tag */}

        {/* Catch-all 404 for routes outside /app */}
        <Route path="*" element={<NotFoundPage />} />

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
