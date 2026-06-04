// components/EmployeeDetail.js
import React, { useEffect, useState } from 'react';
import { employeesAPI } from '../services/api';

const EmployeeDetail = ({ navigateTo, employeeId }) => {
  const [employee, setEmployee] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!employeeId) {
      alert('ID karyawan tidak ditemukan');
      setIsLoading(false);
      navigateTo('el');
      return;
    }

    fetchEmployeeDetail();
  }, [employeeId]);

  const fetchEmployeeDetail = async () => {
    try {
      setIsLoading(true);

      const employeeData = await employeesAPI.getById(employeeId);

      setEmployee(employeeData);
    } catch (error) {
      console.error('Error fetching employee detail:', error);

      alert(error.error || 'Gagal memuat detail karyawan');

      navigateTo('el');
    } finally {
      setIsLoading(false);
    }
  };

  const formatGender = (gender) => {
    if (gender === 'male') return 'Laki-laki';
    if (gender === 'female') return 'Perempuan';
    return '-';
  };

  const formatValue = (value) => {
    if (value === null || value === undefined || value === '') {
      return '-';
    }

    return value;
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

  if (isLoading) {
    return (
      <div className="page-wrapper">
        <div className="text-center mt-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>

          <p className="mt-3">Memuat detail karyawan...</p>
        </div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="page-wrapper">
        <button
          className="btn btn-back"
          onClick={() => navigateTo('el')}
        >
          <i className="fas fa-arrow-left"></i> Kembali
        </button>

        <div className="alert alert-warning mt-3">
          Data karyawan tidak ditemukan.
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrapper">

      <button
        className="btn btn-back"
        onClick={() => navigateTo('el')}
      >
        <i className="fas fa-arrow-left"></i> Kembali
      </button>

      <h2 className="page-title">
        <i className="fas fa-id-card"></i>
        {' '}Detail Data Karyawan
      </h2>

      {/* HEADER */}
      <div className="form-section">
        <div className="d-flex align-items-center gap-3">
          <div
            style={{
              width: '70px',
              height: '70px',
              borderRadius: '50%',
              background: '#e9ecef',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '32px',
              color: '#6c757d'
            }}
          >
            <i className="fas fa-user"></i>
          </div>

          <div>
            <h3 className="mb-1">
              {formatValue(employee.name)}
            </h3>

            <p className="mb-0 text-muted">
              {formatValue(employee.position)}
            </p>
          </div>
        </div>
      </div>

      {/* DATA PRIBADI */}
      <div className="form-section">
        <h4>
          <i className="fas fa-user"></i>
          {' '}Data Pribadi
        </h4>

        <div className="row g-3">

          <div className="col-md-6">
            <label className="form-label">Nama Lengkap</label>
            <div className="form-control bg-light">
              {formatValue(employee.name)}
            </div>
          </div>

          <div className="col-md-6">
            <label className="form-label">Jenis Kelamin</label>
            <div className="form-control bg-light">
              {formatGender(employee.gender)}
            </div>
          </div>

          <div className="col-md-6">
            <label className="form-label">Tanggal Lahir</label>
            <div className="form-control bg-light">
              {formatValue(employee.birth_date)}
            </div>
          </div>

          <div className="col-md-6">
            <label className="form-label">Agama</label>
            <div className="form-control bg-light">
              {formatValue(employee.religion)}
            </div>
          </div>

          <div className="col-md-6">
            <label className="form-label">Nomor Telepon</label>
            <div className="form-control bg-light">
              {formatValue(employee.phone)}
            </div>
          </div>

          <div className="col-12">
            <label className="form-label">Alamat Lengkap</label>
            <div
              className="form-control bg-light"
              style={{ minHeight: '70px' }}
            >
              {formatValue(employee.address)}
            </div>
          </div>

        </div>
      </div>

      {/* DATA PEKERJAAN */}
      <div className="form-section">
        <h4>
          <i className="fas fa-briefcase"></i>
          {' '}Data Pekerjaan
        </h4>

        <div className="row g-3">

          <div className="col-md-6">
            <label className="form-label">Jabatan</label>
            <div className="form-control bg-light">
              {formatValue(employee.position)}
            </div>
          </div>

          <div className="col-md-6">
            <label className="form-label">Tipe Gaji</label>
            <div className="form-control bg-light">
              {formatValue(employee.salary_type)}
            </div>
          </div>

          <div className="col-md-6">
            <label className="form-label">Jumlah Gaji</label>
            <div className="form-control bg-light">
              {formatCurrency(employee.salary)}
            </div>
          </div>

          <div className="col-md-6">
            <label className="form-label">BPJS</label>
            <div className="form-control bg-light">
              {formatValue(employee.bpjs)}
            </div>
          </div>

          <div className="col-12">
            <label className="form-label">Variabel Tambahan</label>
            <div
              className="form-control bg-light"
              style={{ minHeight: '70px' }}
            >
              {formatValue(employee.additional_variable)}
            </div>
          </div>

        </div>
      </div>

      <div className="text-center mt-4">
        <button
          type="button"
          className="btn btn-secondary-custom"
          onClick={() => navigateTo('el')}
        >
          <i className="fas fa-arrow-left"></i>
          {' '}Kembali ke Data Karyawan
        </button>
      </div>

    </div>
  );
};

export default EmployeeDetail;