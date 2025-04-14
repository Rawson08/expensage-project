import React from 'react';
import { Link } from 'react-router-dom';
import InstallPwaButton from '../components/InstallPwaButton'; // Import the component

// Example icons
const FeatureIcon = () => <svg className="w-8 h-8 text-green-500 inline-block mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>;
const DevelopIcon = () => <svg className="w-8 h-8 text-yellow-500 inline-block mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const FutureIcon = () => <svg className="w-8 h-8 text-purple-500 inline-block mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-14l-3-3m0 0l-3 3m3-3v12" /></svg>;


const LandingPage: React.FC = () => {
  const currentFeatures = [
    "PWA ability for phone users",
    "User Registration & Login (JWT)",
    "Friend Management (Add/Accept/List)",
    "Group Creation & Management",
    "Expense Tracking (Equal, Exact, %, Share splits)",
    "Payment Recording",
    "Balance Calculation (Overall, Group, Pairwise)",
    "Receipt Scanning & Autofill (OCR + AI Parsing)",
    "Receipt Image Storage (Cloudflare R2)",
    "Expense Notes",
  ];
  const developingFeatures = [
    "Frontend UI Implementation",
    "Debt Simplification Suggestions",
    "Comprehensive Testing (Unit/Integration)",
    "Real-time Updates (Optional - WebSockets)",
  ];
  const futureFeatures = [
    "Multi-Currency Support Refinement",
    "Advanced Reporting & Analytics",
    "Recurring Expenses",
    "Notifications",
    "Budgeting Features",
  ];

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200"> {/* Dark mode bg/text */}
      <header className="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-10"> {/* Dark mode header bg */}
        <nav className="container mx-auto px-6 py-3 flex justify-between items-center">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400"> {/* Dark mode logo text */}
            ExpenSage
          </div>
          <div className="flex items-center"> {/* Use flex container */}
               {/* Install Button - Mobile Only */}
               <div className="sm:hidden mr-2"> {/* Hide on sm screens and up, add margin */}
                   <InstallPwaButton />
               </div>
            <Link to="/login" className="text-gray-600 dark:text-gray-300 hover:text-green-600 dark:hover:text-green-400 font-medium py-2 px-4 rounded mr-2"> {/* Dark mode link */}
              Login
            </Link>
            <Link to="/register" className="bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700 text-white font-semibold py-2 px-4 rounded shadow"> {/* Dark mode button */}
              Sign Up
            </Link>
          </div>
        </nav>
      </header>

      <section className="bg-gradient-to-r from-green-500 via-teal-500 to-blue-500 text-white py-20 text-center">
        <div className="container mx-auto px-6">
          <h1 className="text-5xl md:text-6xl font-bold mb-4 leading-tight">Welcome to ExpenSage</h1>
          <p className="text-lg md:text-xl mb-8 max-w-3xl mx-auto">
            Manage your expenses with ExpenSage.
          </p>
          <p className="text-lg md:text-xl mb-8 max-w-3xl mx-auto">
            The smart, simple way to manage shared expenses. Track balances, split bills accurately, and even scan receipts effortlessly.
          </p>
          <Link to="/register" className="bg-white text-blue-600 font-bold py-3 px-8 rounded-full shadow-lg hover:bg-gray-100 text-lg transition duration-300 ease-in-out transform hover:-translate-y-1">
            Get Started Free
          </Link>
        </div>
      </section>

      <section className="py-16">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-900 dark:text-gray-100">Features</h2> {/* Dark mode text */}
          <div className="grid md:grid-cols-3 gap-8">

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border-t-4 border-green-500"> {/* Dark mode card bg */}
              <h3 className="text-xl font-semibold mb-4 flex items-center text-gray-900 dark:text-gray-100"><FeatureIcon /> Current Features</h3> {/* Dark mode text */}
              <ul className="space-y-2 text-gray-700 dark:text-gray-300 list-disc list-inside"> {/* Dark mode text */}
                {currentFeatures.map((feature, index) => <li key={`current-${index}`}>{feature}</li>)}
              </ul>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border-t-4 border-yellow-500"> {/* Dark mode card bg */}
              <h3 className="text-xl font-semibold mb-4 flex items-center text-gray-900 dark:text-gray-100"><DevelopIcon /> In Development</h3> {/* Dark mode text */}
              <ul className="space-y-2 text-gray-700 dark:text-gray-300 list-disc list-inside"> {/* Dark mode text */}
                 {developingFeatures.map((feature, index) => <li key={`dev-${index}`}>{feature}</li>)}
              </ul>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border-t-4 border-purple-500"> {/* Dark mode card bg */}
              <h3 className="text-xl font-semibold mb-4 flex items-center text-gray-900 dark:text-gray-100"><FutureIcon /> Future Roadmap</h3> {/* Dark mode text */}
              <ul className="space-y-2 text-gray-700 dark:text-gray-300 list-disc list-inside"> {/* Dark mode text */}
                 {futureFeatures.map((feature, index) => <li key={`future-${index}`}>{feature}</li>)}
              </ul>
            </div>

          </div>
        </div>
      </section>

      <footer className="bg-gray-800 dark:bg-gray-900 text-gray-400 dark:text-gray-500 text-center text-sm py-6"> {/* Dark mode footer */}
        <div className="container mx-auto px-6">
          © {new Date().getFullYear()} ExpenSage. Built with Care by Roshan Subedi.
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;