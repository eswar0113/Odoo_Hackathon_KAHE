import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import Dashboard from './pages/Dashboard'
import ProductsPage from './pages/products/ProductsPage'
import SalesPage from './pages/sales/SalesPage'
import SalesOrderDetail from './pages/sales/SalesOrderDetail'
import PurchasePage from './pages/purchase/PurchasePage'
import PurchaseOrderDetail from './pages/purchase/PurchaseOrderDetail'
import ManufacturingPage from './pages/manufacturing/ManufacturingPage'
import MODetail from './pages/manufacturing/MODetail'
import BOMPage from './pages/manufacturing/BOMPage'
import VendorsPage from './pages/vendors/VendorsPage'
import CustomersPage from './pages/customers/CustomersPage'
import AuditPage from './pages/AuditPage'

function PrivateRoute({ children }) {
  const { user } = useAuth()
  return user ? children : <Navigate to="/login" replace />
}

function AppRoutes() {
  const { user } = useAuth()
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" /> : <LoginPage />} />
      <Route path="/*" element={
        <PrivateRoute>
          <Layout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/products" element={<ProductsPage />} />
              <Route path="/sales" element={<SalesPage />} />
              <Route path="/sales/:id" element={<SalesOrderDetail />} />
              <Route path="/purchase" element={<PurchasePage />} />
              <Route path="/purchase/:id" element={<PurchaseOrderDetail />} />
              <Route path="/manufacturing" element={<ManufacturingPage />} />
              <Route path="/manufacturing/:id" element={<MODetail />} />
              <Route path="/manufacturing/boms" element={<BOMPage />} />
              <Route path="/vendors" element={<VendorsPage />} />
              <Route path="/customers" element={<CustomersPage />} />
              <Route path="/audit" element={<AuditPage />} />
            </Routes>
          </Layout>
        </PrivateRoute>
      } />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}
