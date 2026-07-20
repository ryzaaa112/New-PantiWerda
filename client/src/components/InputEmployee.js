// components/InputEmployee.js
import React, { useState } from 'react';
import { employeesAPI } from '../services/api';

const InputEmployee = ({ navigateTo }) => {

  const [isLoading, setIsLoading] = useState(false);

  // ERROR VALIDATION
  const [employeeErrors, setEmployeeErrors] = useState({});

  // FORM DATA
  const [formData, setFormData] = useState({

    // DATA PRIBADI
    name: '',
    gender: 'male',
    birth_date: '',
    religion: '',
    phone: '',
    address: '',

    // DATA PEKERJAAN
    position: '',
    salary: '',
    salary_type: 'Bulanan',
    additional_variable: '',
    bpjs: ''

  });

  // ================= VALIDATION =================

  const validateReligion = (religion) => {

    if (!religion) {
      return 'Agama wajib dipilih';
    }

    return '';
  };

  const validatePhone = (phone) => {

    if (!phone) return 'Nomor telepon wajib diisi';

    if (!phone.startsWith('0')) {
      return 'Nomor telepon harus dimulai dengan 0';
    }

    if (phone.length < 8) {
      return 'Nomor telepon minimal 8 digit';
    }

    if (!/^\d+$/.test(phone)) {
      return 'Nomor telepon harus berupa angka';
    }

    return '';
  };

  const validateSalary = (salary) => {

    if (!salary) {
      return 'Jumlah gaji wajib diisi';
    }

    if (!/^\d+$/.test(salary)) {
      return 'Jumlah gaji harus berupa angka';
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

  const validateAdditional_variable = (additional_variable) => {

    if (!additional_variable) {
      return 'Variabel tambahan wajib diisi. Jika tidak ada, isi dengan -';
    }

    if (additional_variable === '-') {
      return '';
    }

    if (!/^\d+$/.test(additional_variable)) {
      return 'Variabel tambahan harus berupa angka atau isi dengan - jika tidak ada';
    }

    return '';
  };

  // ================= HANDLE CHANGE =================

  const handleChange = (e) => {
    const { name, value } = e.target;

    // Perbarui state formData
    setFormData(prev => {
      const newData = { ...prev, [name]: value };

      // LOGIKA TAMBAHAN:
      // Jika tipe gaji diubah menjadi 'Harian', otomatis set BPJS ke '-'
      if (name === 'salary_type' && value === 'Harian') {
        newData.bpjs = '-';
      }
      
      return newData;
    });

    // Validasi input
    let error = '';

    if (name === 'religion') {
      error = validateReligion(value);
    } else if (name === 'phone') {
      error = validatePhone(value);
    } else if (name === 'salary') {
      error = validateSalary(value);
    } else if (name === 'bpjs') {
      error = validateBPJS(value);
    } else if (name === 'additional_variable') {
      error = validateAdditional_variable(value);
    }

    // Perbarui state error
    setEmployeeErrors(prev => ({
      ...prev,
      [name]: error
    }));
  };

  // ================= HANDLE SUBMIT =================

  const handleSubmit = async (e) => {
  e.preventDefault();

  // Buat copy formData untuk validasi
  let dataToSubmit = { ...formData };
  
  // Jika Harian, paksa BPJS menjadi "-" agar validasi lolos dan data bersih
  if (dataToSubmit.salary_type === 'Harian') {
    dataToSubmit.bpjs = '-';
  }

  const religionError = validateReligion(dataToSubmit.religion);
  const phoneError = validatePhone(dataToSubmit.phone);
  const salaryError = validateSalary(dataToSubmit.salary);
  // Hanya validasi BPJS jika bukan Harian
  const bpjsError = dataToSubmit.salary_type === 'Bulanan' ? validateBPJS(dataToSubmit.bpjs) : '';
  const additional_variableError = validateAdditional_variable(dataToSubmit.additional_variable);

  const errors = {
    religion: religionError,
    phone: phoneError,
    salary: salaryError,
    bpjs: bpjsError,
    additional_variable: additional_variableError
  };

  setEmployeeErrors(errors);

  if (Object.values(errors).some(err => err !== '')) {
    alert('❌ Mohon perbaiki data yang masih salah');
    return;
  }

  try {
    setIsLoading(true);
    await employeesAPI.create(dataToSubmit); // Kirim data yang sudah dibersihkan
    alert('✅ Data karyawan berhasil ditambahkan');
    navigateTo('el');
  } catch (error) {
    console.error('Error creating employee:', error);
    alert('❌ Gagal menambahkan data karyawan');
  } finally {
    setIsLoading(false);
  }
};

  return (

    <div className="page-wrapper">

      {/* BACK BUTTON */}
      <button
        className="btn btn-back"
        onClick={() => navigateTo('el')}
      >
        <i className="fas fa-arrow-left"></i> Kembali
      </button>

      {/* PAGE TITLE */}
      <h2 className="page-title">
        <i className="fas fa-user-plus"></i>
        Form Input Data Karyawan
      </h2>

      <form onSubmit={handleSubmit}>

        {/* ================= DATA PRIBADI ================= */}
        <div className="form-section">

          <h4>
            <i className="fas fa-user"></i>
            {' '}Data Pribadi
          </h4>

          <div className="row g-3">

            {/* NAMA */}
            <div className="col-md-6">

              <label className="form-label">
                Nama Lengkap *
              </label>

              <input
                type="text"
                className="form-control"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Masukkan nama lengkap"
                required
                disabled={isLoading}
              />

            </div>

            {/* GENDER */}
            <div className="col-md-6">

              <label className="form-label">
                Jenis Kelamin *
              </label>

              <select
                className="form-select"
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                required
                disabled={isLoading}
              >
                <option value="male">Laki-laki</option>
                <option value="female">Perempuan</option>
              </select>

            </div>

            {/* TANGGAL LAHIR */}
            <div className="col-md-6">

              <label className="form-label">
                Tanggal Lahir *
              </label>

              <input
                type="date"
                className="form-control"
                name="birth_date"
                value={formData.birth_date}
                onChange={handleChange}
                required
                disabled={isLoading}
              />

            </div>

            {/* AGAMA */}
            <div className="col-md-6">

              <label className="form-label">
                Agama *
              </label>

              <select
                className={`form-select ${employeeErrors.religion ? 'is-invalid' : ''}`}
                name="religion"
                value={formData.religion}
                onChange={handleChange}
                disabled={isLoading}
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

              {employeeErrors.religion && (
                <div className="invalid-feedback">
                  {employeeErrors.religion}
                </div>
              )}

            </div>

            {/* NOMOR TELEPON */}
            <div className="col-md-6">

              <label className="form-label">
                Nomor Telepon *
              </label>

              <input
                type="text"
                className={`form-control ${employeeErrors.phone ? 'is-invalid' : ''}`}
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="08123456789"
                disabled={isLoading}
              />

              {employeeErrors.phone && (
                <div className="invalid-feedback">
                  {employeeErrors.phone}
                </div>
              )}

              <small className="text-muted">
                Harus dimulai dengan 0 dan hanya angka
              </small>

            </div>

            {/* ALAMAT */}
            <div className="col-12">

              <label className="form-label">
                Alamat Lengkap
              </label>

              <textarea
                className="form-control"
                name="address"
                value={formData.address}
                onChange={handleChange}
                rows="3"
                placeholder="Masukkan alamat lengkap"
                disabled={isLoading}
              ></textarea>

            </div>

          </div>

        </div>

        {/* ================= DATA PEKERJAAN ================= */}
        <div className="form-section">

          <h4>
            <i className="fas fa-id-card"></i>
            {' '}Data Pekerjaan
          </h4>

          <div className="row g-3">

            {/* JABATAN */}
            <div className="col-md-6">

              <label className="form-label">
                Jabatan *
              </label>

              <input
                type="text"
                className="form-control"
                name="position"
                value={formData.position}
                onChange={handleChange}
                placeholder="Contoh: Perawat"
                required
                disabled={isLoading}
              />

            </div>

            {/* TIPE GAJI */}
            <div className="col-md-6">

              <label className="form-label">
                Tipe Gaji *
              </label>

              <select
                className="form-select"
                name="salary_type"
                value={formData.salary_type}
                onChange={handleChange}
                required
                disabled={isLoading}
              >
                <option value="Bulanan">Bulanan</option>
                <option value="Harian">Harian</option>
              </select>

            </div>

            {/* JUMLAH GAJI */}
            <div className="col-md-6">

              <label className="form-label">
                Jumlah Gaji *
              </label>

              <input
                type="text"
                className={`form-control ${employeeErrors.salary ? 'is-invalid' : ''}`}
                name="salary"
                value={formData.salary}
                onChange={handleChange}
                placeholder="Contoh: 5000000"
                disabled={isLoading}
              />

              {employeeErrors.salary && (
                <div className="invalid-feedback">
                  {employeeErrors.salary}
                </div>
              )}

            </div>

            {/* BPJS */}
            {formData.salary_type === 'Bulanan' && (
      <div className="col-md-6">
        <label className="form-label">BPJS *</label>
        <input
          type="text"
          className={`form-control ${employeeErrors.bpjs ? 'is-invalid' : ''}`}
          name="bpjs"
          value={formData.bpjs}
          onChange={handleChange}
          placeholder="Isi nominal, contoh: 500000. Jika tidak ada, isi -"
          disabled={isLoading}
        />
        {employeeErrors.bpjs && (
          <div className="invalid-feedback">{employeeErrors.bpjs}</div>
        )}
      </div>
    )}

            {/* VARIABEL TAMBAHAN */}
            <div className="col-md-6">

              <label className="form-label">
                Variabel Tambahan *
              </label>

              <textarea
                className={`form-control ${employeeErrors.additional_variable ? 'is-invalid' : ''}`}
                name="additional_variable"
                value={formData.additional_variable}
                onChange={handleChange}
                rows="2"
                placeholder="Isi nominal, contoh: 500000. Jika tidak ada, isi -"
                disabled={isLoading}
              ></textarea>

              {employeeErrors.additional_variable && (
                <div className="invalid-feedback">
                  {employeeErrors.additional_variable}
                </div>
              )}

            </div>

          </div>

        </div>

        {/* ================= BUTTON ================= */}
        <div className="text-center mt-4">

          <button
            type="submit"
            className="btn btn-primary-custom me-3"
            disabled={isLoading}
          >

            {isLoading ? (
              <>
                <span
                  className="spinner-border spinner-border-sm me-2"
                  role="status"
                ></span>

                Menyimpan...
              </>
            ) : (
              <>
                <i className="fas fa-save"></i>
                {' '}Simpan Data
              </>
            )}

          </button>

          <button
            type="button"
            className="btn btn-secondary-custom"
            onClick={() => navigateTo('el')}
            disabled={isLoading}
          >

            <i className="fas fa-times"></i>
            {' '}Batal

          </button>

        </div>

      </form>

    </div>

  );
};

export default InputEmployee;