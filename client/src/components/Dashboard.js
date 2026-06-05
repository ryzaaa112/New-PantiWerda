// components/Dashboard.js
import React, { useState, useEffect } from 'react';
import { dashboardAPI } from '../services/api';

const Dashboard = ({ navigateTo, user, onLogout }) => {
  const [stats, setStats] = useState({
    active_residents: 0,
    today_records: 0,
    monthly_income: 0,
    monthly_expense: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const data = await dashboardAPI.getStats();
      setStats(data);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Base menu items for all roles
  const baseMenuItems = [
    {
      icon: 'fas fa-user-plus',
      title: 'Input Data Opa & Oma',
      description: 'Tambahkan data penghuni baru ke dalam sistem',
      page: 'input',
      allowedRoles: ['admin', 'staff']
    },
    {
      icon: 'fas fa-users',
      title: 'Daftar Opa & Oma',
      description: 'Lihat daftar semua penghuni panti',
      page: 'list',
      allowedRoles: ['admin', 'staff']
    },
    {
      icon: 'fas fa-clipboard-list',
      title: 'Report Kejadian Opa & Oma',
      description: 'Catat aktivitas dan kondisi harian',
      page: 'record',
      allowedRoles: ['admin', 'staff']
    },
    {
      icon: 'fas fa-bed',
      title: 'Manajemen Ruangan',
      description: 'Kelola kamar dan penugasan ruangan',
      page: 'rooms',
      allowedRoles: ['admin', 'staff']  // Add room management here for both roles
    }
  ];

  // Admin-only menu items
  const adminMenuItems = [
    {
      icon: 'fas fa-hand-holding-heart',
      title: 'Kelola Pemasukan dan Donasi',
      description: 'Kelola Donasi',
      page: 'donation',
      allowedRoles: ['admin']  // Still admin only
    },
    {
      icon: 'fas fa-users-cog',
      title: 'Manajemen Pengguna',
      description: 'Kelola akun staff dan administrator',
      page: 'users',
      allowedRoles: ['admin']  // Still admin only
    },
    {
      icon: 'fas fa-user-tie',
      title: 'Data Karyawan',
      description: 'Lihat dan tambahkan data karyawan baru ke dalam sistem',
      page: 'el',
      allowedRoles: ['admin']  // Still admin only
    },
    {
      icon: 'fas fa-calendar-check',
      title: 'Absensi Karyawan',
      description: 'Catat absensi karyawan panti',
      page: 'attendance',
      allowedRoles: ['admin']  // Still admin only
    },
    {
      icon: 'fas fa-calculator',
      title: 'Rekap Gaji karyawan',
      description: 'Menghitung total gaji karyawan yang perlu dibayar',
      page: 'users',
      allowedRoles: ['admin']  // Still admin only
    }
  ];

  // Combine menu items based on user role
  const getMenuItems = () => {
    if (user?.role === 'admin') {
      return [...baseMenuItems, ...adminMenuItems];
    }
    return baseMenuItems.filter(item =>
      item.allowedRoles.includes('staff') || item.allowedRoles.includes(user?.role)
    );
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="page-wrapper text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrapper" style={{ background: 'white', borderRadius: '12px', padding: '30px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
      {/* Header with User Info */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1><i className="fas fa-heartbeat"></i> Panti Werdha Kasih Karunia</h1>
          <p className="subtitle">
            {user?.role === 'admin'
              ? 'Sistem Administrasi Lengkap'
              : 'Sistem Input Data Penghuni'}
          </p>
        </div>
        <div className="text-end">
          <div className="user-info mb-2">
            <i className={`fas fa-user-circle me-2 ${user?.role === 'admin' ? 'text-primary' : 'text-success'}`}></i>
            <strong>{user?.full_name || 'User'}</strong>
            <span className={`badge ${user?.role === 'admin' ? 'bg-primary' : 'bg-success'} ms-2`}>
              {user?.role === 'admin' ? 'Administrator' : 'Staff'}
            </span>
          </div>
          <button
            className="btn btn-sm btn-outline-danger"
            onClick={onLogout}
          >
            <i className="fas fa-sign-out-alt"></i> Logout
          </button>
        </div>
      </div>
      {/* Stats Cards - Hide financial stats for staff */}
      <div className="row mb-4">
        <div className="col-md-3">
          <div className="stat-card bg-primary text-white">
            <div className="stat-icon">
              <i className="fas fa-users"></i>
            </div>
            <div className="stat-content">
              <h3>{stats.active_residents}</h3>
              <p>Penghuni Aktif</p>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="stat-card bg-success text-white">
            <div className="stat-icon">
              <i className="fas fa-clipboard-check"></i>
            </div>
            <div className="stat-content">
              <h3>{stats.today_records}</h3>
              <p>Record Hari Ini</p>
            </div>
          </div>
        </div>

        {/* Only show financial stats for admin */}
        {user?.role === 'admin' && (
          <>
            <div className="col-md-3">
              <div className="stat-card bg-warning text-dark">
                <div className="stat-icon">
                  <i className="fas fa-arrow-up"></i>
                </div>
                <div className="stat-content">
                  <h3>{formatCurrency(stats.monthly_income)}</h3>
                  <p>Pemasukan Bulan Ini</p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Welcome Message based on Role */}
      <div className="alert alert-info mb-4">
        <i className="fas fa-info-circle me-2"></i>
        <strong>Selamat datang, {user?.full_name}!</strong> Anda login sebagai {user?.role === 'admin' ? 'Administrator' : 'Staff'}.
        {user?.role === 'staff' && ' Anda dapat menginput data penghuni dan melihat daftar penghuni.'}
        {user?.role === 'admin' && ' Anda memiliki akses penuh ke semua fitur sistem.'}
      </div>

      {/* Menu Grid */}
      <div className="menu-grid">
        {getMenuItems().map((item, index) => (
          <div
            key={index}
            className="menu-item"
            onClick={() => navigateTo(item.page)}
            style={{
              background: 'white',
              borderRadius: '12px',
              padding: '30px 25px',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              color: '#333',
              position: 'relative',
              overflow: 'hidden',
              border: '1px solid #eaeaea',
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
              opacity: item.allowedRoles.includes(user?.role) ? 1 : 0.5
            }}
            onMouseEnter={(e) => {
              if (item.allowedRoles.includes(user?.role)) {
                e.currentTarget.style.transform = 'translateY(-5px)';
                e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.1)';
                e.currentTarget.style.borderColor = '#0056a6';
              }
            }}
            onMouseLeave={(e) => {
              if (item.allowedRoles.includes(user?.role)) {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)';
                e.currentTarget.style.borderColor = '#eaeaea';
              }
            }}
          >
            <i
              className={item.icon}
              style={{
                fontSize: '3.5rem',
                marginBottom: '20px',
                display: 'block',
                color: item.allowedRoles.includes(user?.role) ? '#0056a6' : '#ccc'
              }}
            ></i>
            <h3 style={{
              fontSize: '1.4rem',
              fontWeight: '600',
              marginBottom: '10px',
              color: item.allowedRoles.includes(user?.role) ? '#0056a6' : '#aaa'
            }}>{item.title}</h3>
            <p style={{
              fontSize: '0.95rem',
              color: item.allowedRoles.includes(user?.role) ? '#6c757d' : '#bbb',
              margin: 0
            }}>{item.description}</p>

            {/* Role badge for admin-only items */}
            {item.allowedRoles.length === 1 && item.allowedRoles[0] === 'admin' && (
              <span className="badge text-dark position-absolute d-flex flex-column align-items-center"
                style={{ padding:'6px' ,fontSize: '0,75rem' ,  top: '10px', right: '10px' }}>
                <i className="fas fa-crown mb-1" style={{center:'10px' ,fontSize:'1rem'}}></i>
                <span>Admin Only</span>
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Role Information - Only show for admin */}
      {user?.role === 'admin' && (
        <div className="row mt-5">
          <div className="col-md-12">
            <div className="card">
              <div className="card-body">
                <h5 className="card-title"><i className="fas fa-shield-alt me-2"></i>Informasi Hak Akses</h5>
                <div className="row">
                  <div className="col-md-6">
                    <h6><i className="fas fa-user-tie text-primary me-2"></i>Administrator</h6>
                    <ul className="list-unstyled">
                      <li><i className="fas fa-check text-success me-2"></i>Mengelola semua data penghuni</li>
                      <li><i className="fas fa-check text-success me-2"></i>Mengelola keuangan dan donasi</li>
                      <li><i className="fas fa-check text-success me-2"></i>Membuat dan menghapus akun staff</li>
                      <li><i className="fas fa-check text-success me-2"></i>Menghapus record dan transaksi</li>
                      <li><i className="fas fa-check text-success me-2"></i>Mengelola penugasan ruangan</li>
                    </ul>
                  </div>
                  <div className="col-md-6">
                    <h6><i className="fas fa-user text-success me-2"></i>Staff</h6>
                    <ul className="list-unstyled">
                      <li><i className="fas fa-check text-success me-2"></i>Menginput data penghuni baru</li>
                      <li><i className="fas fa-check text-success me-2"></i>Melihat daftar dan detail penghuni</li>
                      <li><i className="fas fa-check text-success me-2"></i>Mencatat record harian</li>
                      <li><i className="fas fa-check text-success me-2"></i>Mengelola penugasan ruangan</li>
                      <li><i className="fas fa-times text-danger me-2"></i>Tidak dapat mengakses keuangan</li>
                      <li><i className="fas fa-times text-danger me-2"></i>Tidak dapat menghapus data</li>
                      <li><i className="fas fa-times text-danger me-2"></i>Tidak dapat mengelola pengguna</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;