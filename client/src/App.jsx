import React, { Suspense, lazy } from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import ProtectedRoute from './components/ProtectedRoute/ProtectedRoute';
import Loader from './components/Loader/Loader';

const Login = lazy(() => import('./pages/Authentication/Login'));
const ForgotPassword = lazy(() => import('./pages/Authentication/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/Authentication/ResetPassword'));
const ChangePassword = lazy(() => import('./pages/Authentication/ChangePassword'));

const UserDashboard = lazy(() => import('./pages/Dashboard/UserDashboard'));
const ManagerDashboard = lazy(() => import('./pages/Dashboard/ManagerDashboard'));
const AdminDashboard = lazy(() => import('./pages/Dashboard/AdminDashboard'));

const CreateIntent = lazy(() => import('./pages/Intent/CreateIntent'));
const EditIntent = lazy(() => import('./pages/Intent/EditIntent'));
const IntentDetails = lazy(() => import('./pages/Intent/IntentDetails'));
const IntentList = lazy(() => import('./pages/Intent/IntentList'));

const PendingApproval = lazy(() => import('./pages/Approval/PendingApproval'));
const ApproveIntent = lazy(() => import('./pages/Approval/ApproveIntent'));
const RejectIntent = lazy(() => import('./pages/Approval/RejectIntent'));

const UploadQuotation = lazy(() => import('./pages/Quotations/UploadQuotation'));
const CompareQuotation = lazy(() => import('./pages/Quotations/CompareQuotation'));
const SelectSupplier = lazy(() => import('./pages/Quotations/SelectSupplier'));

const SupplierList = lazy(() => import('./pages/Suppliers/SupplierList'));
const AddSupplier = lazy(() => import('./pages/Suppliers/AddSupplier'));
const EditSupplier = lazy(() => import('./pages/Suppliers/EditSupplier'));
const SupplierProfile = lazy(() => import('./pages/Suppliers/SupplierProfile'));

const SamplePO = lazy(() => import('./pages/PurchaseOrder/SamplePO'));
const OriginalPO = lazy(() => import('./pages/PurchaseOrder/OriginalPO'));
const POHistory = lazy(() => import('./pages/PurchaseOrder/POHistory'));
const PrintPO = lazy(() => import('./pages/PurchaseOrder/PrintPO'));

const StoreManagerDashboard = lazy(() => import('./pages/StoreManager/StoreManagerDashboard'));
const OpenPurchaseOrders = lazy(() => import('./pages/StoreManager/OpenPurchaseOrders'));
const GRNList = lazy(() => import('./pages/StoreManager/GRNList'));
const GRNDetails = lazy(() => import('./pages/StoreManager/GRNDetails'));
const CreateGRN = lazy(() => import('./pages/StoreManager/CreateGRN'));

const DeliveryList = lazy(() => import('./pages/Delivery/DeliveryList'));
const PartialDelivery = lazy(() => import('./pages/Delivery/PartialDelivery'));
const FullDelivery = lazy(() => import('./pages/Delivery/FullDelivery'));
const IRF = lazy(() => import('./pages/Delivery/IRF'));

const UploadInvoice = lazy(() => import('./pages/Invoice/UploadInvoice'));
const InvoiceHistory = lazy(() => import('./pages/Invoice/InvoiceHistory'));
const PaymentStatus = lazy(() => import('./pages/Invoice/PaymentStatus'));

const DashboardReports = lazy(() => import('./pages/Reports/DashboardReports'));
const ProcurementReport = lazy(() => import('./pages/Reports/ProcurementReport'));
const SupplierReport = lazy(() => import('./pages/Reports/SupplierReport'));
const InvoiceReport = lazy(() => import('./pages/Reports/InvoiceReport'));
const ExportReport = lazy(() => import('./pages/Reports/ExportReport'));

const Notifications = lazy(() => import('./pages/Notifications/Notifications'));

const Profile = lazy(() => import('./pages/Settings/Profile'));
const Users = lazy(() => import('./pages/Settings/Users'));
const Roles = lazy(() => import('./pages/Settings/Roles'));
const Department = lazy(() => import('./pages/Settings/Department'));

const NotFound = lazy(() => import('./pages/Error/NotFound'));
const Unauthorized = lazy(() => import('./pages/Error/Unauthorized'));

const AuthLayout = lazy(() => import('./layouts/AuthLayout'));
const UserLayout = lazy(() => import('./layouts/UserLayout'));
const ManagerLayout = lazy(() => import('./layouts/ManagerLayout'));
const AdminLayout = lazy(() => import('./layouts/AdminLayout'));
const StoreManagerLayout = lazy(() => import('./layouts/StoreManagerLayout'));

const DashboardRedirect = () => {
  const { user } = useAuth();
  if (user?.role === 'admin') return <Navigate to="/admin/dashboard" replace />;
  if (user?.role === 'manager') return <Navigate to="/manager/dashboard" replace />;
  if (user?.role === 'store_manager') return <Navigate to="/store-manager/dashboard" replace />;
  return <Navigate to="/user/dashboard" replace />;
};

function App() {
  const router = createBrowserRouter(
    [
      {
        element: <AuthLayout />,
        children: [
          { path: '/login', element: <Login /> },
          { path: '/forgot-password', element: <ForgotPassword /> },
          { path: '/reset-password/:token', element: <ResetPassword /> },
        ],
      },
      { path: '/', element: <Navigate to="/dashboard" replace /> },
      {
        path: '/dashboard',
        element: (
          <ProtectedRoute allowedRoles={['user', 'manager', 'admin', 'store_manager']}>
            <DashboardRedirect />
          </ProtectedRoute>
        ),
      },
      {
        element: (
          <ProtectedRoute allowedRoles={['user', 'manager', 'admin']}>
            <UserLayout />
          </ProtectedRoute>
        ),
        children: [
          { path: '/user/dashboard', element: <UserDashboard /> },
          { path: '/intents', element: <IntentList /> },
          { path: '/intents/create', element: <CreateIntent /> },
          { path: '/intents/:id', element: <IntentDetails /> },
          { path: '/intents/:id/edit', element: <EditIntent /> },
          { path: '/change-password', element: <ChangePassword /> },
          { path: '/notifications', element: <Notifications /> },
          { path: '/settings/profile', element: <Profile /> },
        ],
      },
      {
        element: (
          <ProtectedRoute allowedRoles={['manager', 'admin']}>
            <ManagerLayout />
          </ProtectedRoute>
        ),
        children: [
          { path: '/manager/dashboard', element: <ManagerDashboard /> },
          { path: '/manager/approvals', element: <PendingApproval /> },
          { path: '/manager/approvals/:id/approve', element: <ApproveIntent /> },
          { path: '/manager/approvals/:id/reject', element: <RejectIntent /> },
          { path: '/manager/quotations/upload/:intentId', element: <UploadQuotation /> },
          { path: '/manager/quotations/compare/:intentId', element: <CompareQuotation /> },
          { path: '/manager/quotations/select/:intentId/:quotationId', element: <SelectSupplier /> },
          { path: '/manager/suppliers', element: <SupplierList /> },
          { path: '/manager/suppliers/add', element: <AddSupplier /> },
          { path: '/manager/suppliers/:id', element: <SupplierProfile /> },
          { path: '/manager/suppliers/:id/edit', element: <EditSupplier /> },
          { path: '/manager/purchase-orders', element: <POHistory /> },
          { path: '/manager/purchase-orders/:id', element: <SamplePO /> },
          { path: '/manager/intents', element: <IntentList /> },
          { path: '/manager/intents/create', element: <CreateIntent /> },
          { path: '/manager/intents/:id', element: <IntentDetails /> },
          { path: '/manager/intents/:id/edit', element: <EditIntent /> },
          { path: '/manager/notifications', element: <Notifications /> },
          { path: '/manager/settings/profile', element: <Profile /> },
          { path: '/manager/change-password', element: <ChangePassword /> },
        ],
      },
      {
        element: (
          <ProtectedRoute allowedRoles={['store_manager']}>
            <StoreManagerLayout />
          </ProtectedRoute>
        ),
        children: [
          { path: '/store-manager/dashboard', element: <StoreManagerDashboard /> },
          { path: '/store-manager/open-purchase-orders', element: <OpenPurchaseOrders /> },
          { path: '/store-manager/grns', element: <GRNList /> },
          { path: '/store-manager/grns/create', element: <CreateGRN /> },
          { path: '/store-manager/grns/:id', element: <GRNDetails /> },
          { path: '/store-manager/notifications', element: <Notifications /> },
          { path: '/store-manager/settings/profile', element: <Profile /> },
          { path: '/store-manager/change-password', element: <ChangePassword /> },
        ],
      },
      {
        element: (
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminLayout />
          </ProtectedRoute>
        ),
        children: [
          { path: '/admin/dashboard', element: <AdminDashboard /> },
          { path: '/admin/purchase-orders', element: <POHistory /> },
          { path: '/admin/purchase-orders/:id', element: <SamplePO /> },
          { path: '/admin/purchase-orders/:id/approve', element: <OriginalPO /> },
          { path: '/admin/purchase-orders/:id/print', element: <PrintPO /> },
          { path: '/admin/quotations/upload/:intentId', element: <UploadQuotation /> },
          { path: '/admin/quotations/compare/:intentId', element: <CompareQuotation /> },
          { path: '/admin/quotations/select/:intentId/:quotationId', element: <SelectSupplier /> },
          { path: '/admin/deliveries', element: <DeliveryList /> },
          { path: '/admin/deliveries/:id/partial', element: <PartialDelivery /> },
          { path: '/admin/deliveries/:id/full', element: <FullDelivery /> },
          { path: '/admin/deliveries/:id/irf', element: <IRF /> },
          { path: '/admin/invoices', element: <InvoiceHistory /> },
          { path: '/admin/invoices/upload/:intentId', element: <UploadInvoice /> },
          { path: '/admin/invoices/:id/payment', element: <PaymentStatus /> },
          { path: '/admin/reports', element: <DashboardReports /> },
          { path: '/admin/reports/procurement', element: <ProcurementReport /> },
          { path: '/admin/reports/suppliers', element: <SupplierReport /> },
          { path: '/admin/reports/invoices', element: <InvoiceReport /> },
          { path: '/admin/reports/export', element: <ExportReport /> },
          { path: '/admin/settings/users', element: <Users /> },
          { path: '/admin/settings/roles', element: <Roles /> },
          { path: '/admin/settings/departments', element: <Department /> },
          { path: '/admin/intents', element: <IntentList /> },
          { path: '/admin/intents/create', element: <CreateIntent /> },
          { path: '/admin/intents/:id', element: <IntentDetails /> },
          { path: '/admin/intents/:id/edit', element: <EditIntent /> },
          { path: '/admin/notifications', element: <Notifications /> },
          { path: '/admin/settings/profile', element: <Profile /> },
          { path: '/admin/change-password', element: <ChangePassword /> },
          { path: '/admin/suppliers', element: <SupplierList /> },
          { path: '/admin/suppliers/add', element: <AddSupplier /> },
          { path: '/admin/suppliers/:id', element: <SupplierProfile /> },
          { path: '/admin/suppliers/:id/edit', element: <EditSupplier /> },
          { path: '/admin/purchase-orders', element: <POHistory /> },
        ],
      },
      { path: '/unauthorized', element: <Unauthorized /> },
      { path: '*', element: <NotFound /> },
    ],
    { future: { v7_startTransition: true, v7_relativeSplatPath: true } }
  );

  return (
    <AuthProvider>
      <NotificationProvider>
        <Suspense fallback={<Loader />}>
          <RouterProvider router={router} />
        </Suspense>
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;
