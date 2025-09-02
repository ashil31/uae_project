import { Toaster } from "react-hot-toast";
import { Tooltip } from 'react-tooltip';
import 'react-tooltip/dist/react-tooltip.css';
import { HelmetProvider } from 'react-helmet-async';
// import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Provider } from 'react-redux';
import { store } from './store/store';
import { AuthProvider } from './context/authContext';
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";

// Admin Components
import AdminLayout from "./admin/components/AdminLayout";
import Dashboard from "./admin/pages/Dashboard";
import Products from "./admin/pages/Products";
import AdminOrders from "./admin/pages/AdminOrders";
import AdminUsers from "./admin/pages/AdminUsers";
import HeroManager from "./admin/pages/HeroManager";
import DealManager from "./admin/pages/DealManger";
import AccessControl from "./admin/pages/AccessControl";
import OrderTrackingEditor from "./admin/pages/OrderTrackingEditor";
import InvoicePage from "./admin/pages/InvoicePage";
import InvoiceList from "./admin/pages/InvoiceList";
import ReviewManager from "./admin/pages/ReviewManager";
import WholesaleManager from "./admin/pages/WholesaleManager";
import SettingsEditor from "./admin/pages/SettingEditor";
import ContactManager from "./admin/pages/ContactManager";
import ClothCalculator from "./admin/pages/ClothCalculator";
import TailorManager from "./admin/pages/TailorManager";
import TailorList from "./admin/components/Tailors/TailorList";
import ClothRollList from "./admin/components/ClothRolls/ClothRollList";
import RollAssignmentList from "./admin/components/Assignments/RollAssignmentList";

const queryClient = new QueryClient();

const App = () => (
  <HelmetProvider>  
    <QueryClientProvider client={queryClient}>
      <Provider store={store}>
        <AuthProvider>
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 5000,
                style: {
                  background: '#363636',
                  color: '#fff',
                },
                success: {
                  duration: 3000,
                  iconTheme: {
                    primary: 'green',
                    secondary: 'white',
                  },
                },
                error: {
                  iconTheme: {
                    primary: 'red',
                    secondary: 'white',
                  },
                },
              }}
            />
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/login" element={<Login />} />
                
                {/* Admin Routes */}
                <Route path="/admin" element={
                  <ProtectedRoute requireAdmin>
                    <AdminLayout />
                  </ProtectedRoute>
                }>
                  <Route index element={<Dashboard />} />
                  <Route path="products" element={<Products />} />
                  <Route path="orders" element={<AdminOrders />} />
                  <Route path="users" element={<AdminUsers />} />
                  <Route path="banners" element={<HeroManager />} />
                  <Route path="deals" element={<DealManager />} />
                  <Route path="access" element={<AccessControl />} />
                  <Route path="tracking" element={<OrderTrackingEditor />} />
                  <Route path="invoices" element={<InvoiceList />} />
                  <Route path="invoice/:orderId" element={<InvoicePage />} />
                  <Route path="reviews" element={<ReviewManager />} />
                  <Route path="wholesale" element={<WholesaleManager />} />
                  <Route path="queries" element={<ContactManager />} />
                  <Route path="cloth-calculator" element={<ClothCalculator />} />
                  <Route path="settings" element={<SettingsEditor />} />
                  <Route path="tailors" element={<TailorManager />} />
                  <Route path="tailors/list" element={<TailorList />} />
                  <Route path="cloth-rolls" element={<ClothRollList />} />
                  <Route path="assignments" element={<RollAssignmentList />} />
                </Route>

                {/* Catch-all route */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
            <Tooltip 
            id="main-tooltip" 
            place="top" 
            effect="solid" 
            className="z-50" 
          />
        </AuthProvider>
      </Provider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;