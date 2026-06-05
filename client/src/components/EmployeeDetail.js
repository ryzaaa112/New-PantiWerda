// components/EmployeeDetail.js
import React, { useEffect, useState } from 'react';
import { employeesAPI } from '../services/api';

const EmployeeDetail = ({ navigateTo, employeeId }) => {
  const [employee, setEmployee] = useState(null);
  const [editData, setEditData] = useState({});
  const [editErrors, setEditErrors] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('personal');

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

      setEditData({
        religion: employeeData.religion || '',
        phone: employeeData.phone || '',
        address: employeeData.address || '',
        position: employeeData.position || '',
        salary: employeeData.salary || '',
        salary_type: employeeData.salary_type || 'Bulanan',
        additional_variable: employeeData.additional_variable || '',
        bpjs: employeeData.bpjs || ''
      });

    } catch (error) {
      console.error('Error fetching employee detail:', error);

      alert(error.error || 'Gagal memuat detail karyawan');

      navigateTo('el');
    } finally {
      setIsLoading(false);
    }
  };

  // ================= VALIDATION =================

  const validatePhone = (phone) => {
    if (!phone) return 'Nomor telepon wajib diisi';
    if (!phone.startsWith('0')) return 'Nomor telepon harus dimulai dengan 0';
    if (phone.length < 8) return 'Nomor telepon minimal 8 digit';
    if (!/^\d+$/.test(phone)) return 'Nomor telepon harus berupa angka';

    return '';
  };

  const validateSalary = (salary) => {
    if (!salary) return 'Jumlah gaji wajib diisi';

    if (salary === '-') {
      return 'Jumlah gaji harus berupa angka';
    }

    if (!/^\d+$/.test(String(salary))) {
      return 'Jumlah gaji harus berupa angka';
    }

    if (Number(salary) <= 0) {
      return 'Jumlah gaji harus lebih dari 0';
    }

    return '';
  };

  const validateBPJS = (bpjs) => {
    if (!bpjs) {
      return 'Nomor BPJS wajib diisi. Jika tidak ada, isi dengan -';
    }

    if (bpjs === '-') {
      return '';
    }

    if (!/^\d+$/.test(bpjs)) {
      return 'Nomor BPJS harus berupa angka atau isi dengan - jika tidak ada';
    }

    return '';
  };

  const validateAdditionalVariable = (additionalVariable) => {
    if (!additionalVariable) {
      return 'Variabel tambahan wajib diisi. Jika tidak ada, isi dengan -';
    }

    if (additionalVariable === '-') {
      return '';
    }

    if (!/^\d+$/.test(additionalVariable)) {
      return 'Variabel tambahan harus berupa angka atau isi dengan - jika tidak ada';
    }

    return '';
  };

  const validateEditData = () => {
    let isValid = true;

    const newErrors = {};

    const phoneError = validatePhone(editData.phone);
    if (phoneError) {
      newErrors.phone = phoneError;
      isValid = false;
    }

    const salaryError = validateSalary(editData.salary);
    if (salaryError) {
      newErrors.salary = salaryError;
      isValid = false;
    }

    const bpjsError = validateBPJS(editData.bpjs);
    if (bpjsError) {
      newErrors.bpjs = bpjsError;
      isValid = false;
    }

    const additionalVariableError = validateAdditionalVariable(editData.additional_variable);
    if (additionalVariableError) {
      newErrors.additional_variable = additionalVariableError;
      isValid = false;
    }

    setEditErrors(newErrors);

    return isValid;
  };

  // ================= EDIT HANDLER =================

  const handleEditChange = (e) => {
    const { name, value } = e.target;

    setEditData(prev => ({
      ...prev,
      [name]: value
    }));

    let error = '';

    if (name === 'phone') {
      error = validatePhone(value);
    } else if (name === 'salary') {
      error = validateSalary(value);
    } else if (name === 'bpjs') {
      error = validateBPJS(value);
    } else if (name === 'additional_variable') {
      error = validateAdditionalVariable(value);
    }

    setEditErrors(prev => ({
      ...prev,
      [name]: error
    }));
  };

  const handleEdit = () => {
    setIsEditing(true);
    setEditErrors({});
  };

  const handleCancelEdit = () => {
    setEditData({
      religion: employee.religion || '',
      phone: employee.phone || '',
      address: employee.address || '',
      position: employee.position || '',
      salary: employee.salary || '',
      salary_type: employee.salary_type || 'Bulanan',
      additional_variable: employee.additional_variable || '',
      bpjs: employee.bpjs || ''
    });

    setEditErrors({});
    setIsEditing(false);
  };

  const handleSaveEdit = async () => {
    if (!validateEditData()) {
      alert('❌ Mohon perbaiki data yang masih salah');
      return;
    }

    try {
      setIsSaving(true);

      await employeesAPI.update(employeeId, editData);

      alert('✅ Data karyawan berhasil diperbarui');

      setEmployee(prev => ({
        ...prev,
        ...editData
      }));

      setEditErrors({});
      setIsEditing(false);

    } catch (error) {
      console.error('Error updating employee:', error);
      alert('❌ Gagal memperbarui data karyawan');
    } finally {
      setIsSaving(false);
    }
  };

  // ================= FORMATTER =================

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

  const calculateAge = (birthDate) => {
    if (!birthDate) return '-';

    const today = new Date();
    const birth = new Date(birthDate);

    if (isNaN(birth.getTime())) {
      return '-';
    }

    let age = today.getFullYear() - birth.getFullYear();

    const monthDiff = today.getMonth() - birth.getMonth();
    const dayDiff = today.getDate() - birth.getDate();

    if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
      age--;
    }

    if (age < 0) {
      return '-';
    }

    return `${age} Tahun`;
  };

  const renderDetailRow = (label, content) => {
    return (
      <div className="col-md-6">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '180px 1fr',
            padding: '10px 0',
            borderBottom: '1px dashed #e5e5e5',
            fontSize: '14px',
            alignItems: 'center'
          }}
        >
          <strong>{label}:</strong>
          <span>{content}</span>
        </div>
      </div>
    );
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

      {/* BACK */}
      <button
        className="btn btn-back"
        onClick={() => navigateTo('el')}
      >
        <i className="fas fa-arrow-left"></i> Kembali ke Daftar
      </button>

      {/* BLUE HEADER */}
      <div
        style={{
          background: '#0057a8',
          borderRadius: '8px 8px 0 0',
          minHeight: '260px',
          color: 'white',
          position: 'relative',
          padding: '40px 30px',
          marginTop: '15px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        {/* AVATAR */}
        <div
          style={{
            width: '90px',
            height: '90px',
            borderRadius: '50%',
            background: '#1f1f1f',
            border: '3px solid #fff',
            position: 'absolute',
            top: '45px',
            left: '35px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <i
            className="fas fa-user"
            style={{
              fontSize: '38px',
              color: '#ffffff'
            }}
          ></i>
        </div>

        <h1
          style={{
            fontSize: '30px',
            fontWeight: '700',
            marginBottom: '8px'
          }}
        >
          {formatValue(employee.name)}
        </h1>

        <p
          style={{
            marginBottom: '8px',
            fontSize: '15px',
            opacity: '0.95'
          }}
        >
          {formatGender(employee.gender)} • {calculateAge(employee.birth_date)}
        </p>

        <span
          style={{
            background: '#5cb85c',
            color: '#fff',
            padding: '4px 10px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: '600'
          }}
        >
          Aktif
        </span>
      </div>

      {/* TABS */}
      <div
        style={{
          display: 'flex',
          background: '#fff',
          border: '1px solid #dee2e6',
          borderTop: 'none',
          marginBottom: '20px'
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('personal')}
          style={{
            padding: '10px 18px',
            border: 'none',
            borderRight: '1px solid #dee2e6',
            borderBottom: activeTab === 'personal' ? '2px solid #0057a8' : '2px solid transparent',
            background: activeTab === 'personal' ? '#fff' : '#f8f9fa',
            color: activeTab === 'personal' ? '#000' : '#6c757d',
            fontWeight: activeTab === 'personal' ? '600' : '400',
            cursor: 'pointer'
          }}
        >
          <i className="fas fa-user me-2"></i>
          Data Pribadi
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('attendance')}
          style={{
            padding: '10px 18px',
            border: 'none',
            borderRight: '1px solid #dee2e6',
            borderBottom: activeTab === 'attendance' ? '2px solid #0057a8' : '2px solid transparent',
            background: activeTab === 'attendance' ? '#fff' : '#f8f9fa',
            color: activeTab === 'attendance' ? '#000' : '#6c757d',
            fontWeight: activeTab === 'attendance' ? '600' : '400',
            cursor: 'pointer'
          }}
        >
          <i className="fas fa-calendar-check me-2"></i>
          Absensi
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('loan')}
          style={{
            padding: '10px 18px',
            border: 'none',
            borderRight: '1px solid #dee2e6',
            borderBottom: activeTab === 'loan' ? '2px solid #0057a8' : '2px solid transparent',
            background: activeTab === 'loan' ? '#fff' : '#f8f9fa',
            color: activeTab === 'loan' ? '#000' : '#6c757d',
            fontWeight: activeTab === 'loan' ? '600' : '400',
            cursor: 'pointer'
          }}
        >
          <i className="fas fa-hand-holding-usd me-2"></i>
          Pinjaman
        </button>
      </div>

      {/* TAB DATA PRIBADI */}
      {activeTab === 'personal' && (
        <div className="form-section">

          <div className="d-flex justify-content-between align-items-center mb-3">
            <h4>
              <i className="fas fa-user"></i>
              {' '}Data Pribadi
            </h4>

            {!isEditing ? (
              <button
                type="button"
                className="btn btn-outline-primary btn-sm"
                title="Edit Data"
                onClick={handleEdit}
              >
                <i className="fas fa-edit"></i>
              </button>
            ) : (
              <div className="d-flex gap-2">
                <button
                  type="button"
                  className="btn btn-outline-success btn-sm"
                  title="Simpan Perubahan"
                  onClick={handleSaveEdit}
                  disabled={isSaving}
                >
                  <i className="fas fa-check"></i>
                </button>

                <button
                  type="button"
                  className="btn btn-outline-danger btn-sm"
                  title="Batal Edit"
                  onClick={handleCancelEdit}
                  disabled={isSaving}
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>
            )}
          </div>

          <div className="row g-3">

            {/* TIDAK BISA EDIT */}
            {renderDetailRow(
              'Nama Lengkap',
              formatValue(employee.name)
            )}

            {renderDetailRow(
              'Jenis Kelamin',
              formatGender(employee.gender)
            )}

            {renderDetailRow(
              'Tanggal Lahir',
              formatValue(employee.birth_date)
            )}

            {/* BISA EDIT */}
            {renderDetailRow(
              'Gaji',
              isEditing ? (
                <>
                  <input
                    type="text"
                    className={`form-control form-control-sm ${editErrors.salary ? 'is-invalid' : ''}`}
                    name="salary"
                    value={editData.salary}
                    onChange={handleEditChange}
                    placeholder="Contoh: 5000000"
                  />

                  {editErrors.salary && (
                    <div className="invalid-feedback">
                      {editErrors.salary}
                    </div>
                  )}
                </>
              ) : (
                formatCurrency(employee.salary)
              )
            )}

            {renderDetailRow(
              'Jenis Gaji',
              isEditing ? (
                <select
                  className="form-select form-select-sm"
                  name="salary_type"
                  value={editData.salary_type}
                  onChange={handleEditChange}
                >
                  <option value="Bulanan">Bulanan</option>
                  <option value="Harian">Harian</option>
                </select>
              ) : (
                formatValue(employee.salary_type)
              )
            )}

            {renderDetailRow(
              'Agama',
              isEditing ? (
                <select
                  className="form-select form-select-sm"
                  name="religion"
                  value={editData.religion}
                  onChange={handleEditChange}
                >
                  <option value="">Pilih Agama</option>
                  <option value="Islam">Islam</option>
                  <option value="Kristen">Kristen</option>
                  <option value="Katolik">Katolik</option>
                  <option value="Hindu">Hindu</option>
                  <option value="Buddha">Buddha</option>
                  <option value="Konghucu">Konghucu</option>
                  <option value="Lainnya">Lainnya</option>
                </select>
              ) : (
                formatValue(employee.religion)
              )
            )}

            {renderDetailRow(
              'Jabatan',
              isEditing ? (
                <input
                  type="text"
                  className="form-control form-control-sm"
                  name="position"
                  value={editData.position}
                  onChange={handleEditChange}
                />
              ) : (
                formatValue(employee.position)
              )
            )}

            {renderDetailRow(
              'Alamat',
              isEditing ? (
                <textarea
                  className="form-control form-control-sm"
                  name="address"
                  value={editData.address}
                  onChange={handleEditChange}
                  rows="2"
                ></textarea>
              ) : (
                formatValue(employee.address)
              )
            )}

            {renderDetailRow(
              'Variabel Tambahan',
              isEditing ? (
                <>
                  <input
                    type="text"
                    className={`form-control form-control-sm ${editErrors.additional_variable ? 'is-invalid' : ''}`}
                    name="additional_variable"
                    value={editData.additional_variable}
                    onChange={handleEditChange}
                    placeholder="Isi angka atau -"
                  />

                  {editErrors.additional_variable && (
                    <div className="invalid-feedback">
                      {editErrors.additional_variable}
                    </div>
                  )}
                </>
              ) : (
                formatValue(employee.additional_variable)
              )
            )}

            {renderDetailRow(
              'BPJS',
              isEditing ? (
                <>
                  <input
                    type="text"
                    className={`form-control form-control-sm ${editErrors.bpjs ? 'is-invalid' : ''}`}
                    name="bpjs"
                    value={editData.bpjs}
                    onChange={handleEditChange}
                    placeholder="Isi angka atau -"
                  />

                  {editErrors.bpjs && (
                    <div className="invalid-feedback">
                      {editErrors.bpjs}
                    </div>
                  )}
                </>
              ) : (
                formatValue(employee.bpjs)
              )
            )}

            {renderDetailRow(
              'Nomor Telepon',
              isEditing ? (
                <>
                  <input
                    type="text"
                    className={`form-control form-control-sm ${editErrors.phone ? 'is-invalid' : ''}`}
                    name="phone"
                    value={editData.phone}
                    onChange={handleEditChange}
                    placeholder="08123456789"
                  />

                  {editErrors.phone && (
                    <div className="invalid-feedback">
                      {editErrors.phone}
                    </div>
                  )}
                </>
              ) : (
                formatValue(employee.phone)
              )
            )}

          </div>
        </div>
      )}

      {/* TAB ABSENSI */}
      {activeTab === 'attendance' && (
        <div className="form-section">
          <h4>
            <i className="fas fa-calendar-check"></i>
            {' '}Absensi
          </h4>

          <div className="text-center py-4 text-muted">
            <i className="fas fa-calendar-check fa-2x mb-3"></i>
            <p>Data absensi karyawan belum tersedia.</p>
          </div>
        </div>
      )}

      {/* TAB PINJAMAN */}
      {activeTab === 'loan' && (
        <div className="form-section">
          <h4>
            <i className="fas fa-hand-holding-usd"></i>
            {' '}Pinjaman
          </h4>

          <div className="text-center py-4 text-muted">
            <i className="fas fa-money-bill-wave fa-2x mb-3"></i>
            <p>Data pinjaman karyawan belum tersedia.</p>
          </div>
        </div>
      )}

    </div>
  );
};

export default EmployeeDetail;