// client/src/App.js
import React, { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import InputData from './components/InputData';
import ResidentList from './components/ResidentList';
import ResidentDetail from './components/ResidentDetail';
import Record from './components/Record';
import Donation from './components/Donation';
import UserManagement from './components/UserManagement';
import Login from './components/Login';
import LoadingSpinner from './components/LoadingSpinner';
import RoomManagement from './components/RoomManagement';
import './App.css';
import EmployeeList from './components/EmployeeList';
import InputEmployee from './components/InputEmployee';
import EmployeeDetail from  './components/EmployeeDetail';
import Attendance from './components/Attendance';
import EmployeePayroll from './components/EmployeePayroll';

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [selectedResidentId, setSelectedResidentId] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);

  // Check authentication on mount with better validation
  useEffect(() => {
    const checkAuthentication = async () => {
      try {
        const token = localStorage.getItem('token');
        const savedUser = localStorage.getItem('user');
        const rememberMe = localStorage.getItem('rememberMe');

        // Only auto-login if rememberMe is set
        if (rememberMe === 'true' && token && savedUser) {
          const userData = JSON.parse(savedUser);

          // Verify token with server (optional - you can skip this if using JWT)
          // For now, we'll just trust the localStorage
          setIsAuthenticated(true);
          setUser(userData);
          setCurrentPage('dashboard');
        } else {
          // Clear storage if no remember me
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
      } catch (error) {
        console.error('Error checking authentication:', error);
        // Clear invalid storage
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('rememberMe');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthentication();
  }, []);

  const navigateTo = (page) => {
    // Role-based access control
    if (user) {
      // Staff cannot access donation or user management
      if (user.role === 'staff') {
        if (page === 'donation' || page === 'users' || page === 'attendance' || page==='payroll') {
          alert('Akses ditolak. Hanya admin yang dapat mengakses halaman ini.');
          return;
        }
      }
    }
    setCurrentPage(page);
  };

  const showDetail = (residentId) => {
    setSelectedResidentId(residentId);
    setCurrentPage('detail');
  };

  const showEmployeeDetail = (employeeId) => {
  setSelectedEmployeeId(employeeId);
  setCurrentPage('ed');
};

  const handleLogin = (userData, token) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setIsAuthenticated(true);
    setUser(userData);
    setCurrentPage('dashboard');
  };

  const handleLogout = () => {
    // Clear all authentication data
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('rememberMe');

    setIsAuthenticated(false);
    setUser(null);
    setCurrentPage('dashboard');
  };

  const renderPage = () => {
    if (!isAuthenticated) {
      return <Login onLogin={handleLogin} />;
    }

    switch (currentPage) {
      case 'dashboard':
        return <Dashboard navigateTo={navigateTo} user={user} onLogout={handleLogout} />;
      case 'input':
        return <InputData navigateTo={navigateTo} user={user} />;
      case 'list':
        return <ResidentList navigateTo={navigateTo} showDetail={showDetail} />;
      case 'detail':
        return <ResidentDetail navigateTo={navigateTo} residentId={selectedResidentId} user={user} />;
      case 'record':
        return <Record navigateTo={navigateTo} user={user} />;
      case 'rooms':
        return <RoomManagement navigateTo={navigateTo} user={user} />;
      case 'donation':
        // Only admin can access donation
        if (user.role === 'admin') {
          return <Donation navigateTo={navigateTo} user={user} />;
        } else {
          alert('Akses ditolak. Hanya admin yang dapat mengakses halaman keuangan.');
          navigateTo('dashboard');
          return null;
        }
      case 'users':
        // Only admin can access user management
        if (user.role === 'admin') {
          return <UserManagement navigateTo={navigateTo} user={user} />;
        } else {
          alert('Akses ditolak. Hanya admin yang dapat mengakses manajemen pengguna.');
          navigateTo('dashboard');
          return null;
        }
      case 'el':
        //only admin can access employees info
        if (user.role === 'admin') {
          return <EmployeeList navigateTo={navigateTo} showDetail={showEmployeeDetail} />;          
        } else {
          alert('Akses ditolak. Hanya admin yang dapat mengakses data karyawan.');
          navigateTo('dashboard');
          return null;
        }
      case 'ie':
        //only admin can access employees info
        if (user.role === 'admin') {
          return <InputEmployee navigateTo={navigateTo} />;          
        } else {
          alert('Akses ditolak. Hanya admin yang dapat mengakses data karyawan.');
          navigateTo('dashboard');
          return null;
        }
      case 'ed':
        //only admin can access employees info
        if (user.role === 'admin') {
          return <EmployeeDetail navigateTo={navigateTo} employeeId={selectedEmployeeId} />;          
        } else {
          alert('Akses ditolak. Hanya admin yang dapat mengakses data karyawan.');
          navigateTo('dashboard');
          return null;
        }
      case 'attendance':
        if (user.role === 'admin') {
          return <Attendance navigateTo={navigateTo} user={user} />;
        } else {
          alert('Akses ditolak. Hanya admin yang dapat mengakses absensi karyawan.');
          navigateTo('dashboard');
          return null;
        }
      case 'payroll':
        if (user.role === 'admin') {
          return <EmployeePayroll navigateTo={navigateTo} user={user} />;
        } else {
          alert('Akses ditolak. Hanya admin yang dapat mengakses rekap gaji.');
          navigateTo('dashboard');
          return null;
        }

      default:
        return <Dashboard navigateTo={navigateTo} user={user} onLogout={handleLogout} />;
      
    }
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="container-fluid">
      {renderPage()}
    </div>
  );
}

export default App;