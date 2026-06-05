import React, { useState, useEffect } from 'react';
import { employeesAPI } from '../services/api';
import { calculateAge } from '../utils/helpers';

const EmployeeList = ({ navigateTo, showDetail }) => {
  const [employees, setemployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchemployees();
  }, []);

  const fetchemployees = async () => {
    try {
      const data = await employeesAPI.getAll();

      setemployees(data || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    if (!value || value === '-') {
      return '-';
    }

    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(value);
  };

  // Filter employees based on search term
  const filteredemployees = employees.filter(employee =>
    employee.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="page-wrapper">
      <button className="btn btn-back" onClick={() => navigateTo('dashboard')}>
        <i className="fas fa-arrow-left"></i> Kembali
      </button>

      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="page-title">
          <i className="fas fa-user-tie"></i>
          Daftar Karyawan
        </h2>
        <button
          className="btn btn-primary-custom"
          onClick={() => navigateTo('ie')}
        >
          <i className="fas fa-user-plus"></i> Tambah Karyawan Baru
        </button>
      </div>

      <div className="search-box mb-4">
        <input
          type="text"
          className="form-control"
          placeholder="🔍 Cari nama Karyawan..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-2">Memuat data...</p>
        </div>
      ) : filteredemployees.length === 0 ? (
        <div className="text-center py-5">
          <i className="fas fa-users fa-3x text-muted mb-3"></i>
          <p className="text-muted">
            {searchTerm ? 'Tidak ada karyawan yang sesuai dengan pencarian' : 'Belum ada data karyawan'}
          </p>
          {!searchTerm && (
            <button
              className="btn btn-primary-custom mt-3"
              onClick={() => navigateTo('ie')}
            >
              <i className="fas fa-user-plus"></i> Tambah Karyawan Baru
            </button>
          )}
        </div>
      ) : (
        <div className="profile-grid">
          {filteredemployees.map(employee => {
            const age = employee.age || calculateAge(employee.birth_date);
            const gender = employee.gender || 'male';
            const genderIcon = gender === 'male' ? 'fa-male' : 'fa-female';
            const type = gender === 'male' ? 'Laki-laki' : 'Perempuan';

            return (
              <div
                key={employee.id}
                className="profile-card"
              >
                <div
                  className="profile-header"
                  onClick={() => showDetail(employee.id)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="profile-avatar">
                    <i className={`fas ${genderIcon}`}></i>
                  </div>
                  <h5 style={{ margin: 0, fontSize: '1.3rem' }}>{employee.name}</h5>
                  <p style={{ margin: '5px 0 0 0', opacity: 0.9 }}>
                    {type} • {age || '?'}
                  </p>
                </div>

                <div className="profile-body">

                  <div className="profile-info-item">
                    <i className="fas fa-briefcase"></i>
                    <span>
                      <strong>Jabatan:</strong> {employee.position || 'Tidak ada data'}
                    </span>
                  </div>

                  <div className="profile-info-item">
                    <i className="fas fa-money-bill-wave"></i>
                    <span>
                      <strong>Gaji:</strong> {formatCurrency(employee.salary)}
                    </span>
                  </div>

                  <div className="profile-info-item">
                    <i className="fas fa-wallet"></i>
                    <span>
                      <strong>Tipe Gaji:</strong> {employee.salary_type || '-'}
                    </span>
                  </div>

                  <div className="mt-3 d-flex justify-content-between align-items-center">
                    <span className="badge bg-success badge-custom">
                      Aktif
                    </span>

                    <button
                      className="btn btn-sm btn-primary"
                      onClick={() => showDetail(employee.id)}
                    >
                      <i className="fas fa-eye"></i> Detail
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default EmployeeList;