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
import SignupPage from './pages/SignupPage'

const ROUTE_ROLES = {
  '/products':        ['admin','owner','inventory'],
  '/sales':           ['admin','owner','sales'],
  '/purchase':        ['admin','owner','purchase'],
  '/manufacturing':   ['admin','owner','manufacturing'],
  '/vendors':         ['admin','owner','purchase'],
  '/customers':       ['admin','owner','sales'],
  '/audit':           ['admin'],
}

function PrivateRoute({ children }) {
  const { user } = useAuth()
  return user ? children : <Navigate to="/login" replace />
}

function RoleRoute({ roles, children }) {
  const { user } = useAuth()
  if (!roles.includes(user?.role)) return <Navigate to="/" replace />
  return children
}

function AppRoutes() {
  const { user } = useAuth()
  return (
    <Routes>
      <Route path="/login"  element={user ? <Navigate to="/" /> : <LoginPage />} />
      <Route path="/signup" element={user ? <Navigate to="/" /> : <SignupPage />} />
      <Route path="/*" element={
        <PrivateRoute>
          <Layout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/products"             element={<RoleRoute roles={ROUTE_ROLES['/products']}><ProductsPage /></RoleRoute>} />
              <Route path="/sales"                element={<RoleRoute roles={ROUTE_ROLES['/sales']}><SalesPage /></RoleRoute>} />
              <Route path="/sales/:id"            element={<RoleRoute roles={ROUTE_ROLES['/sales']}><SalesOrderDetail /></RoleRoute>} />
              <Route path="/purchase"             element={<RoleRoute roles={ROUTE_ROLES['/purchase']}><PurchasePage /></RoleRoute>} />
              <Route path="/purchase/:id"         element={<RoleRoute roles={ROUTE_ROLES['/purchase']}><PurchaseOrderDetail /></RoleRoute>} />
              <Route path="/manufacturing"        element={<RoleRoute roles={ROUTE_ROLES['/manufacturing']}><ManufacturingPage /></RoleRoute>} />
              <Route path="/manufacturing/:id"    element={<RoleRoute roles={ROUTE_ROLES['/manufacturing']}><MODetail /></RoleRoute>} />
              <Route path="/manufacturing/boms"   element={<RoleRoute roles={ROUTE_ROLES['/manufacturing']}><BOMPage /></RoleRoute>} />
              <Route path="/vendors"              element={<RoleRoute roles={ROUTE_ROLES['/vendors']}><VendorsPage /></RoleRoute>} />
              <Route path="/customers"            element={<RoleRoute roles={ROUTE_ROLES['/customers']}><CustomersPage /></RoleRoute>} />
              <Route path="/audit"                element={<RoleRoute roles={ROUTE_ROLES['/audit']}><AuditPage /></RoleRoute>} />
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
