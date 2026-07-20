import { Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import ProtectedRoute from '../components/ProtectedRoute/ProtectedRoute';
import AuthLayout from '../layouts/AuthLayout';
import UserLayout from '../layouts/UserLayout';
import ManagerLayout from '../layouts/ManagerLayout';
import AdminLayout from '../layouts/AdminLayout';
import StoreManagerLayout from '../layouts/StoreManagerLayout';
import Loader from '../components/Loader/Loader';

const Login = lazy(() => import('../pages/Authentication/Login'));
const ForgotPassword = lazy(() => import('../pages/Authentication/ForgotPassword'));
const ResetPassword = lazy(() => import('../pages/Authentication/ResetPassword'));
const ChangePassword = lazy(() => import('../pages/Authentication/ChangePassword'));

const UserDashboard = lazy(() => import('../pages/Dashboard/UserDashboard'));
const ManagerDashboard = lazy(() => import('../pages/Dashboard/ManagerDashboard'));
const AdminDashboard = lazy(() => import('../pages/Dashboard/AdminDashboard'));

const CreateIntent = lazy(() => import('../pages/Intent/CreateIntent'));
const EditIntent = lazy(() => import('../pages/Intent/EditIntent'));
const IntentDetails = lazy(() => import('../pages/Intent/IntentDetails'));
const IntentList = lazy(() => import('../pages/Intent/IntentList'));

const PendingApproval = lazy(() => import('../pages/Approval/PendingApproval'));
const ApproveIntent = lazy(() => import('../pages/Approval/ApproveIntent'));
const RejectIntent = lazy(() => import('../pages/Approval/RejectIntent'));

const UploadQuotation = lazy(() => import('../pages/Quotations/UploadQuotation'));
const CompareQuotation = lazy(() => import('../pages/Quotations/CompareQuotation'));
const SelectSupplier = lazy(() => import('../pages/Quotations/SelectSupplier'));

const SupplierList = lazy(() => import('../pages/Suppliers/SupplierList'));
const AddSupplier = lazy(() => import('../pages/Suppliers/AddSupplier'));
const EditSupplier = lazy(() => import('../pages/Suppliers/EditSupplier'));
const SupplierProfile = lazy(() => import('../pages/Suppliers/SupplierProfile'));

const SamplePO = lazy(() => import('../pages/PurchaseOrder/SamplePO'));
const OriginalPO = lazy(() => import('../pages/PurchaseOrder/OriginalPO'));
const POHistory = lazy(() => import('../pages/PurchaseOrder/POHistory'));
const PrintPO = lazy(() => import('../pages/PurchaseOrder/PrintPO'));

const DeliveryList = lazy(() => import('../pages/Delivery/DeliveryList'));
const PartialDelivery = lazy(() => import('../pages/Delivery/PartialDelivery'));
const FullDelivery = lazy(() => import('../pages/Delivery/FullDelivery'));
const IRF = lazy(() => import('../pages/Delivery/IRF'));

const UploadInvoice = lazy(() => import('../pages/Invoice/UploadInvoice'));
const InvoiceHistory = lazy(() => import('../pages/Invoice/InvoiceHistory'));
const PaymentStatus = lazy(() => import('../pages/Invoice/PaymentStatus'));

const DashboardReports = lazy(() => import('../pages/Reports/DashboardReports'));
const ProcurementReport = lazy(() => import('../pages/Reports/ProcurementReport'));
const SupplierReport = lazy(() => import('../pages/Reports/SupplierReport'));
const InvoiceReport = lazy(() => import('../pages/Reports/InvoiceReport'));
const ExportReport = lazy(() => import('../pages/Reports/ExportReport'));

const Notifications = lazy(() => import('../pages/Notifications/Notifications'));

const Profile = lazy(() => import('../pages/Settings/Profile'));
const Users = lazy(() => import('../pages/Settings/Users'));
const Roles = lazy(() => import('../pages/Settings/Roles'));
const Department = lazy(() => import('../pages/Settings/Department'));

const StoreManagerDashboard = lazy(() => import('../pages/StoreManager/StoreManagerDashboard'));
const OpenPurchaseOrders = lazy(() => import('../pages/StoreManager/OpenPurchaseOrders'));
const GRNList = lazy(() => import('../pages/StoreManager/GRNList'));
const CreateGRN = lazy(() => import('../pages/StoreManager/CreateGRN'));
const GRNDetails = lazy(() => import('../pages/StoreManager/GRNDetails'));

const NotFound = lazy(() => import('../pages/Error/NotFound'));
const Unauthorized = lazy(() => import('../pages/Error/Unauthorized'));

const AppRoutes = () => {
  return (
    <Suspense fallback={<Loader />}>
      <Routes>
        {/* Auth Routes */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
        </Route>

        {/* Default redirect */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        {/* User Routes */}
        <Route
          element={
            <ProtectedRoute allowedRoles={['user', 'manager', 'admin']}>
              <UserLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<UserDashboard />} />
          <Route path="/intents" element={<IntentList />} />
          <Route path="/intents/create" element={<CreateIntent />} />
          <Route path="/intents/:id" element={<IntentDetails />} />
          <Route path="/intents/:id/edit" element={<EditIntent />} />
          <Route path="/change-password" element={<ChangePassword />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/settings/profile" element={<Profile />} />
        </Route>

        {/* Manager Routes */}
        <Route
          element={
            <ProtectedRoute allowedRoles={['manager', 'admin']}>
              <ManagerLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/manager/dashboard" element={<ManagerDashboard />} />
          <Route path="/manager/approvals" element={<PendingApproval />} />
          <Route path="/manager/approvals/:id/approve" element={<ApproveIntent />} />
          <Route path="/manager/approvals/:id/reject" element={<RejectIntent />} />
          <Route path="/manager/quotations/upload/:intentId" element={<UploadQuotation />} />
          <Route path="/manager/quotations/compare/:intentId" element={<CompareQuotation />} />
          <Route path="/manager/quotations/select/:quotationId" element={<SelectSupplier />} />
          <Route path="/manager/intents" element={<IntentList />} />
          <Route path="/manager/intents/:id" element={<IntentDetails />} />
          <Route path="/manager/suppliers" element={<SupplierList />} />
          <Route path="/manager/suppliers/add" element={<AddSupplier />} />
          <Route path="/manager/suppliers/:id" element={<SupplierProfile />} />
          <Route path="/manager/suppliers/:id/edit" element={<EditSupplier />} />
          <Route path="/manager/purchase-orders" element={<POHistory />} />
          <Route path="/manager/purchase-orders/:id" element={<SamplePO />} />
          <Route path="/manager/notifications" element={<Notifications />} />
        </Route>

        {/* Admin Routes */}
        <Route
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/intents" element={<IntentList />} />
          <Route path="/admin/intents/:id" element={<IntentDetails />} />
          <Route path="/admin/suppliers" element={<SupplierList />} />
          <Route path="/admin/suppliers/add" element={<AddSupplier />} />
          <Route path="/admin/suppliers/:id" element={<SupplierProfile />} />
          <Route path="/admin/suppliers/:id/edit" element={<EditSupplier />} />
          <Route path="/admin/purchase-orders" element={<POHistory />} />
          <Route path="/admin/purchase-orders/:id/approve" element={<OriginalPO />} />
          <Route path="/admin/purchase-orders/:id/print" element={<PrintPO />} />
          <Route path="/admin/deliveries" element={<DeliveryList />} />
          <Route path="/admin/deliveries/:id/partial" element={<PartialDelivery />} />
          <Route path="/admin/deliveries/:id/full" element={<FullDelivery />} />
          <Route path="/admin/deliveries/:id/irf" element={<IRF />} />
          <Route path="/admin/invoices" element={<InvoiceHistory />} />
          <Route path="/admin/invoices/upload/:intentId" element={<UploadInvoice />} />
          <Route path="/admin/invoices/:id/payment" element={<PaymentStatus />} />
          <Route path="/admin/reports" element={<DashboardReports />} />
          <Route path="/admin/reports/procurement" element={<ProcurementReport />} />
          <Route path="/admin/reports/suppliers" element={<SupplierReport />} />
          <Route path="/admin/reports/invoices" element={<InvoiceReport />} />
          <Route path="/admin/reports/export" element={<ExportReport />} />
          <Route path="/admin/settings/users" element={<Users />} />
          <Route path="/admin/settings/roles" element={<Roles />} />
          <Route path="/admin/settings/departments" element={<Department />} />
          <Route path="/admin/notifications" element={<Notifications />} />
        </Route>

        {/* Store Manager Routes */}
        <Route
          element={
            <ProtectedRoute allowedRoles={['store_manager']}>
              <StoreManagerLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/store-manager/dashboard" element={<StoreManagerDashboard />} />
          <Route path="/store-manager/open-purchase-orders" element={<OpenPurchaseOrders />} />
          <Route path="/store-manager/grns" element={<GRNList />} />
          <Route path="/store-manager/grns/create" element={<CreateGRN />} />
          <Route path="/store-manager/grns/:id" element={<GRNDetails />} />
          <Route path="/store-manager/notifications" element={<Notifications />} />
          <Route path="/store-manager/settings/profile" element={<Profile />} />
        </Route>

        {/* Error Routes */}
        <Route path="/unauthorized" element={<Unauthorized />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
};

export default AppRoutes;
