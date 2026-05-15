import React, { useMemo, useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { FiGrid, FiPackage, FiShoppingBag, FiUsers, FiTag, FiPercent, FiMenu, FiX, FiLogOut, FiChevronRight, FiHome } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import './AdminLayout.css';

interface NavItem { path: string; label: string; icon: React.ReactNode; }

const navItems: NavItem[] = [
  { path: '/admin', label: 'Dashboard', icon: <FiGrid /> },
  { path: '/admin/orders', label: 'Orders', icon: <FiShoppingBag /> },
  { path: '/admin/products', label: 'Products', icon: <FiPackage /> },
  { path: '/admin/categories', label: 'Categories', icon: <FiTag /> },
  { path: '/admin/users', label: 'Users', icon: <FiUsers /> },
  { path: '/admin/discounts', label: 'Discounts', icon: <FiPercent /> },
];

const AdminLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleLogout = () => { logout(); navigate('/login'); };
  const currentPage = navItems.find(n => n.path === location.pathname)?.label || 'Admin Panel';
  const breadcrumbs = useMemo(() => {
    const path = location.pathname.replace(/\/+$/, '');
    const parts = path.split('/').filter(Boolean); // ["admin", "orders", "123"]
    const crumbs: { label: string; path: string }[] = [];
    let acc = '';
    for (const part of parts) {
      acc += `/${part}`;
      const label = part === 'admin' ? 'Admin' : part.replace(/-/g, ' ').replace(/\b\w/g, m => m.toUpperCase());
      crumbs.push({ label, path: acc });
    }
    return crumbs;
  }, [location.pathname]);

  return (
    <div className={`admin-layout${sidebarOpen ? '' : ' collapsed'}`}>
      <aside className="admin-sidebar">
        <div className="sidebar-header">
          <Link to="/admin" className="admin-logo">{sidebarOpen && 'MobileShop'}</Link>
          <button className="sidebar-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? <FiX /> : <FiMenu />}
          </button>
        </div>
        <div className="sidebar-user">
          <div className="avatar">{user?.name?.charAt(0)}</div>
          {sidebarOpen && <div><p className="sidebar-name">{user?.name}</p><p className="sidebar-role">Administrator</p></div>}
        </div>
        <nav className="sidebar-nav">
          {sidebarOpen && <div className="nav-section">Main</div>}
          {navItems.map(item => (
            <Link key={item.path} to={item.path} className={`nav-item${location.pathname === item.path ? ' active' : ''}`} title={!sidebarOpen ? item.label : ''}>
              <span className="nav-icon">{item.icon}</span>
              {sidebarOpen && <><span className="nav-label">{item.label}</span><FiChevronRight className="nav-arrow" /></>}
            </Link>
          ))}
        </nav>
        <div className="sidebar-footer">
          <Link to="/" className="nav-item" title="View Store">
            <span className="nav-icon"><FiHome /></span>
            {sidebarOpen && <span className="nav-label">View Store</span>}
          </Link>
          <button className="nav-item logout-btn" onClick={handleLogout} title="Logout">
            <span className="nav-icon"><FiLogOut /></span>
            {sidebarOpen && <span className="nav-label">Logout</span>}
          </button>
        </div>
      </aside>
      <main className="admin-main">
        <div className="admin-topbar">
          <button className="mobile-sidebar-btn" onClick={() => setSidebarOpen(!sidebarOpen)}><FiMenu /></button>
          <div className="topbar-left">
            <div className="breadcrumb">
              {breadcrumbs.map((c, idx) => (
                <React.Fragment key={c.path}>
                  {idx > 0 && <span className="crumb-sep">/</span>}
                  <Link to={c.path} className={`crumb${idx === breadcrumbs.length - 1 ? ' current' : ''}`}>{c.label}</Link>
                </React.Fragment>
              ))}
            </div>
            <h2 className="topbar-title">{currentPage}</h2>
          </div>
          <div className="topbar-right">
            <span className="admin-badge">Admin</span>
            <div className="avatar" title={user?.name || 'Admin'}>{user?.name?.charAt(0)}</div>
          </div>
        </div>
        <div className="admin-content"><Outlet /></div>
      </main>
    </div>
  );
};

export default AdminLayout;

