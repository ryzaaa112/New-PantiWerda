// components/EmployeeDetail.js
import React, { useEffect, useState } from 'react';
import { employeesAPI, employeeLoansAPI, attendanceAPI } from '../services/api';

const EmployeeDetail = ({ navigateTo, employeeId }) => {
  const [employee, setEmployee] = useState(null);
  const [editData, setEditData] = useState({});
  const [editErrors, setEditErrors] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('personal');
  const [loanData, setLoanData] = useState(null);
  const [loanLoading, setLoanLoading] = useState(false);
  const [showLoanModal, setShowLoanModal] = useState(false);
  const [showLoanConfirm, setShowLoanConfirm] = useState(false);
  const [selectedLoanYear, setSelectedLoanYear] = useState(new Date().getFullYear());
  const [loanForm, setLoanForm] = useState({
    total_amount: '',
    monthly_installment: ''
  });
  const [loanErrors, setLoanErrors] = useState({});
  const [attendanceMonth, setAttendanceMonth] = useState(
    new Date().toISOString().slice(0, 7)
  );

  const [attendanceData, setAttendanceData] = useState(null);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceSavingCell, setAttendanceSavingCell] = useState(null);
  const initialAttendanceDate = new Date();

  const [selectedAttendanceMonth, setSelectedAttendanceMonth] = useState(
    initialAttendanceDate.getMonth() + 1
  );
  const [selectedAttendanceYear, setSelectedAttendanceYear] = useState(
    initialAttendanceDate.getFullYear()
  );
  const [showAttendanceMonthPicker, setShowAttendanceMonthPicker] = useState(false);

  const attendanceMonthOptions = [
    { value: 1, label: 'Jan' },
    { value: 2, label: 'Feb' },
    { value: 3, label: 'Mar' },
    { value: 4, label: 'Apr' },
    { value: 5, label: 'Mei' },
    { value: 6, label: 'Jun' },
    { value: 7, label: 'Jul' },
    { value: 8, label: 'Agu' },
    { value: 9, label: 'Sep' },
    { value: 10, label: 'Okt' },
    { value: 11, label: 'Nov' },
    { value: 12, label: 'Des' }
  ];

  const fullAttendanceMonthNames = {
    1: 'Januari',
    2: 'Februari',
    3: 'Maret',
    4: 'April',
    5: 'Mei',
    6: 'Juni',
    7: 'Juli',
    8: 'Agustus',
    9: 'September',
    10: 'Oktober',
    11: 'November',
    12: 'Desember'
  };

  useEffect(() => {
    const newAttendanceMonth = `${selectedAttendanceYear}-${String(
      selectedAttendanceMonth
    ).padStart(2, '0')}`;

    setAttendanceMonth(newAttendanceMonth);
  }, [selectedAttendanceMonth, selectedAttendanceYear]);

  useEffect(() => {
    if (!employeeId) {
      alert('ID karyawan tidak ditemukan');
      setIsLoading(false);
      navigateTo('el');
      return;
    }

    fetchEmployeeDetail();
  }, [employeeId]);

  useEffect(() => {
    if (activeTab === 'attendance' && employeeId) {
      fetchEmployeeAttendance();
    }
  }, [activeTab, employeeId, attendanceMonth]);

  useEffect(() => {
    if (activeTab === 'loan' && employeeId) {
      fetchLoanData();
    }
  }, [activeTab, employeeId, selectedLoanYear]);

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

  const monthNames = {
    1: 'Januari',
    2: 'Februari',
    3: 'Maret',
    4: 'April',
    5: 'Mei',
    6: 'Juni',
    7: 'Juli',
    8: 'Agustus',
    9: 'September',
    10: 'Oktober',
    11: 'November',
    12: 'Desember'
  };
  const handleDownloadAllYears = async () => {
    if (!employeeId || !loanData) return;

    try {
      const startYear = new Date().getFullYear();
      const endYear = 2030; 
      let allInstallments = [];

      // Ambil data per tahun
      for (let year = startYear; year <= endYear; year++) {
        const data = await employeeLoansAPI.getByEmployee(employeeId, year);
        if (data && data.installments) {
          allInstallments.push(...data.installments);
        }
      }

      // Fungsi pembantu untuk membersihkan format "Rp" atau simbol mata uang lainnya
      // Kita hanya mengambil angka murni
      const cleanNumber = (val) => {
        return val ? val.toString().replace(/[^0-9]/g, '') : '0';
      };

      // 1. Bagian Header (Ringkasan)
      let htmlTable = `
        <table border="1">
          <tr><th colspan="5" style="background-color: #d9ecff; text-align: center;">LAPORAN PINJAMAN LENGKAP: ${employee.name.toUpperCase()}</th></tr>
          <tr><td>Nama Karyawan</td><td colspan="4">${employee.name}</td></tr>
          <tr><td>Total Pinjaman</td><td colspan="4">${loanData.summary.total_amount}</td></tr>
          <tr><td>Sisa Pinjaman</td><td colspan="4">${loanData.summary.remaining_amount}</td></tr>
          <tr><td>Cicilan Perbulan</td><td colspan="4">${loanData.summary.monthly_installment}</td></tr>
          <tr><td>Target Lunas</td><td colspan="4">${monthNames[loanData.summary.target_month]} ${loanData.summary.target_year}</td></tr>
          <tr><td colspan="5"></td></tr>
          <tr style="background-color: #d9ecff;">
            <th>Bulan</th><th>Tahun</th><th>Tagihan</th><th>Sisa Pinjaman</th><th>Status</th>
          </tr>
      `;

      // 2. Bagian Isi (Cicilan)
      allInstallments.forEach(item => {
        htmlTable += `
          <tr>
            <td>${monthNames[item.month]}</td>
            <td>${item.year}</td>
            <td>${cleanNumber(item.bill_amount)}</td>
            <td>${cleanNumber(item.remaining_after)}</td>
            <td>${item.status}</td>
          </tr>
        `;
      });

      htmlTable += `</table>`;

      // 3. Trigger Download
      const blob = new Blob([htmlTable], { type: 'application/vnd.ms-excel' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Laporan_Pinjaman_${employee.name.replace(/\s+/g, '_')}.xls`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Gagal download:", error);
      alert("Terjadi kesalahan saat memproses data.");
    }
  };

  
  const fetchLoanData = async () => {
    try {
      setLoanLoading(true);

      const data = await employeeLoansAPI.getByEmployee(employeeId, selectedLoanYear);

      setLoanData(data);
    } catch (error) {
      console.error('Error fetching loan data:', error);
      alert('Gagal memuat data pinjaman');
    } finally {
      setLoanLoading(false);
    }
  };

  const validateLoanForm = () => {
    const errors = {};

    if (!loanForm.total_amount) {
      errors.total_amount = 'Jumlah pinjaman wajib diisi';
    } else if (!/^\d+$/.test(loanForm.total_amount)) {
      errors.total_amount = 'Jumlah pinjaman harus berupa angka';
    } else if (Number(loanForm.total_amount) <= 0) {
      errors.total_amount = 'Jumlah pinjaman harus lebih dari 0';
    }

    if (!loanForm.monthly_installment) {
      errors.monthly_installment = 'Cicilan per bulan wajib diisi';
    } else if (!/^\d+$/.test(loanForm.monthly_installment)) {
      errors.monthly_installment = 'Cicilan per bulan harus berupa angka';
    } else if (Number(loanForm.monthly_installment) <= 0) {
      errors.monthly_installment = 'Cicilan per bulan harus lebih dari 0';
    }

    if (
      loanForm.total_amount &&
      loanForm.monthly_installment &&
      Number(loanForm.monthly_installment) > Number(loanForm.total_amount)
    ) {
      errors.monthly_installment = 'Cicilan tidak boleh lebih besar dari jumlah pinjaman';
    }

    setLoanErrors(errors);

    return Object.keys(errors).length === 0;
  };

  const handleLoanChange = (e) => {
    const { name, value } = e.target;

    setLoanForm(prev => ({
      ...prev,
      [name]: value
    }));

    setLoanErrors(prev => ({
      ...prev,
      [name]: ''
    }));
  };

  const handleCreateLoan = () => {
    if (!validateLoanForm()) {
      return;
    }

    setShowLoanConfirm(true);
  };

  const handleConfirmCreateLoan = async () => {
    try {
      await employeeLoansAPI.create(employeeId, loanForm);

      alert('✅ Pinjaman berhasil ditambahkan');

      setShowLoanModal(false);
      setShowLoanConfirm(false);

      setLoanForm({
        total_amount: '',
        monthly_installment: ''
      });

      fetchLoanData();

    } catch (error) {
      console.error('Error creating loan:', error);
      alert(error.error || '❌ Gagal menambahkan pinjaman');
    }
  };

  const handleUpdateInstallmentStatus = async (installmentId, status) => {
    try {
      await employeeLoansAPI.updateInstallmentStatus(installmentId, status);

      fetchLoanData();
    } catch (error) {
      console.error('Error updating installment:', error);
      alert('Gagal memperbarui status cicilan');
    }
  };

  const getLoanYearOptions = () => {
    const currentYear = new Date().getFullYear();
    const targetYear = loanData?.summary?.target_year || currentYear + 5;

    const startYear = currentYear - 1;
    const endYear = Math.max(targetYear, currentYear + 5);

    const years = [];

    for (let year = startYear; year <= endYear; year++) {
      years.push(year);
    }

    return years;
  };

  const ATTENDANCE_STATUS_LIST = [
    { code: 'H', label: 'Hadir', className: 'bg-success text-white' },
    { code: 'S', label: 'Sakit', className: 'bg-info text-dark' },
    { code: 'I', label: 'Izin', className: 'bg-warning text-dark' },
    { code: 'T', label: 'Izin (Tidak digaji)', className: 'bg-orange text-white' },
    { code: 'A', label: 'Alpa', className: 'bg-danger text-white' },
    { code: 'O', label: 'Off', className: 'bg-secondary text-white' },
    { code: 'K', label: 'Kebijakan', className: 'bg-primary text-white' },
  ];

  const ATTENDANCE_STATUS_ORDER = ['', 'H', 'S', 'I', 'T', 'A', 'O', 'K'];

  const pad2 = (num) => String(num).padStart(2, '0');

  const getAttendanceMonthName = (monthValue) => {
    const [year, month] = monthValue.split('-').map(Number);

    return new Date(year, month - 1, 1).toLocaleDateString('id-ID', {
      month: 'long',
      year: 'numeric',
    });
  };

  const getAttendanceDaysInMonth = (monthValue) => {
    const [year, month] = monthValue.split('-').map(Number);

    return new Date(year, month, 0).getDate();
  };

  const getAttendanceStatusData = (status) => {
    return ATTENDANCE_STATUS_LIST.find((item) => item.code === status);
  };

  const getNextAttendanceStatus = (currentStatus) => {
    const currentIndex = ATTENDANCE_STATUS_ORDER.indexOf(currentStatus || '');

    if (currentIndex === -1) {
      return 'H';
    }

    return ATTENDANCE_STATUS_ORDER[
      (currentIndex + 1) % ATTENDANCE_STATUS_ORDER.length
    ];
  };

  const fetchEmployeeAttendance = async () => {
    try {
      setAttendanceLoading(true);

      const data = await attendanceAPI.getMonthly(attendanceMonth);

      const selectedEmployeeAttendance = data.employees?.find(
        (item) => Number(item.id) === Number(employeeId)
      );

      setAttendanceData({
        daysInMonth: data.daysInMonth || getAttendanceDaysInMonth(attendanceMonth),
        employee: selectedEmployeeAttendance || null,
      });

    } catch (error) {
      console.error('Error fetching employee attendance:', error);
      alert(error.error || 'Gagal memuat absensi karyawan');
    } finally {
      setAttendanceLoading(false);
    }
  };

  const updateEmployeeAttendanceCell = async (day, currentStatus) => {
    const nextStatus = getNextAttendanceStatus(currentStatus);
    const attendanceDate = `${attendanceMonth}-${pad2(day)}`;
    const cellKey = `${employeeId}-${day}`;

    setAttendanceSavingCell(cellKey);

    try {
      await attendanceAPI.save({
        employee_id: employeeId,
        attendance_date: attendanceDate,
        status: nextStatus,
      });

      await fetchEmployeeAttendance();

    } catch (error) {
      console.error('Error saving employee attendance:', error);
      alert(error.error || 'Gagal menyimpan absensi karyawan');
    } finally {
      setAttendanceSavingCell(null);
    }
  };

  const countAttendanceStatus = (attendance = {}, code) => {
    return Object.values(attendance).filter((item) => item?.status === code).length;
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

          <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-4">
            <div>
              <h4 className="mb-1">
                <i className="fas fa-calendar-check"></i>
                {' '}Absensi Karyawan
              </h4>

              <p className="text-muted mb-0">
                Rekap absensi bulanan untuk {formatValue(employee.name)}
              </p>
            </div>

            <div className="d-flex align-items-center gap-2">
              <label className="form-label mb-0">Bulan:</label>

              <div style={{ position: 'relative' }}>
                <button
                  type="button"
                  className="form-control form-control-sm d-flex justify-content-between align-items-center"
                  style={{
                    width: '180px',
                    background: '#fff',
                    textAlign: 'left'
                  }}
                  onClick={() => setShowAttendanceMonthPicker(!showAttendanceMonthPicker)}
                >
                  <span>
                    {fullAttendanceMonthNames[selectedAttendanceMonth]} {selectedAttendanceYear}
                  </span>

                  <i className="fas fa-chevron-down"></i>
                </button>

                {showAttendanceMonthPicker && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '38px',
                      right: 0,
                      width: '280px',
                      background: '#fff',
                      border: '1px solid #dee2e6',
                      borderRadius: '10px',
                      boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
                      padding: '16px',
                      zIndex: 999
                    }}
                  >
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => setSelectedAttendanceYear(selectedAttendanceYear - 1)}
                      >
                        <i className="fas fa-chevron-left"></i>
                      </button>

                      <strong style={{ fontSize: '18px' }}>
                        {selectedAttendanceYear}
                      </strong>

                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => setSelectedAttendanceYear(selectedAttendanceYear + 1)}
                      >
                        <i className="fas fa-chevron-right"></i>
                      </button>
                    </div>

                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(4, 1fr)',
                        gap: '8px'
                      }}
                    >
                      {attendanceMonthOptions.map((item) => (
                        <button
                          key={item.value}
                          type="button"
                          className={`btn btn-sm ${
                            selectedAttendanceMonth === item.value
                              ? 'btn-primary'
                              : 'btn-outline-primary'
                          }`}
                          onClick={() => {
                            setSelectedAttendanceMonth(item.value);
                            setShowAttendanceMonthPicker(false);
                          }}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>

                    <div className="d-flex justify-content-between mt-3">
                      <button
                        type="button"
                        className="btn btn-sm btn-light"
                        onClick={() => {
                          const today = new Date();
                          setSelectedAttendanceMonth(today.getMonth() + 1);
                          setSelectedAttendanceYear(today.getFullYear());
                          setShowAttendanceMonthPicker(false);
                        }}
                      >
                        Bulan Ini
                      </button>

                      <button
                        type="button"
                        className="btn btn-sm btn-secondary"
                        onClick={() => setShowAttendanceMonthPicker(false)}
                      >
                        Tutup
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="card mb-3">
            <div className="card-body py-3">
              <div className="d-flex flex-wrap align-items-center gap-2">
                <strong className="me-2">Keterangan:</strong>

                {ATTENDANCE_STATUS_LIST.map((status) => (
                  <span key={status.code} className={`badge ${status.className}`}>
                    {status.code} = {status.label}
                  </span>
                ))}

                <span className="text-muted ms-2">
                  Klik kotak tanggal untuk mengganti status.
                </span>
              </div>
            </div>
          </div>

          {attendanceLoading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>

              <p className="mt-2">Memuat absensi karyawan...</p>
            </div>
          ) : !attendanceData?.employee ? (
            <div className="text-center py-5 text-muted">
              <i className="fas fa-calendar-times fa-3x mb-3"></i>
              <p>Data absensi karyawan belum ditemukan.</p>
            </div>
          ) : (
            <>
              <div className="row g-3 mb-4">
                <div className="col-md-2">
                  <div className="border rounded p-3 text-center">
                    <small className="text-muted">Hadir</small>
                    <h5 className="mb-0 text-success">
                      {countAttendanceStatus(attendanceData.employee.attendance, 'H')}
                    </h5>
                  </div>
                </div>

                <div className="col-md-2">
                  <div className="border rounded p-3 text-center">
                    <small className="text-muted">Sakit</small>
                    <h5 className="mb-0 text-info">
                      {countAttendanceStatus(attendanceData.employee.attendance, 'S')}
                    </h5>
                  </div>
                </div>

                <div className="col-md-2">
                  <div className="border rounded p-3 text-center">
                    <small className="text-muted">Izin</small>
                    <h5 className="mb-0 text-warning">
                      {countAttendanceStatus(attendanceData.employee.attendance, 'I')}
                    </h5>
                  </div>
                </div>

                <div className="col-md-2">
                  <div className="border rounded p-3 text-center">
                    <small className="text-muted">Alpa</small>
                    <h5 className="mb-0 text-danger">
                      {countAttendanceStatus(attendanceData.employee.attendance, 'A')}
                    </h5>
                  </div>
                </div>

                <div className="col-md-2">
                  <div className="border rounded p-3 text-center">
                    <small className="text-muted">Off</small>
                    <h5 className="mb-0 text-secondary">
                      {countAttendanceStatus(attendanceData.employee.attendance, 'O')}
                    </h5>
                  </div>
                </div>

                <div className="col-md-2">
                  <div className="border rounded p-3 text-center">
                    <small className="text-muted">Kebijakan</small>
                    <h5 className="mb-0 text-primary">
                      {countAttendanceStatus(attendanceData.employee.attendance, 'K')}
                    </h5>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-header text-center bg-white">
                  <strong>{getAttendanceMonthName(attendanceMonth)}</strong>
                </div>

                <div className="table-responsive">
                  <table className="table table-bordered table-sm align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th style={{ minWidth: 180 }} className="text-center">
                          Nama
                        </th>

                        {Array.from(
                          { length: attendanceData.daysInMonth },
                          (_, index) => index + 1
                        ).map((day) => (
                          <th
                            key={day}
                            className="text-center"
                            style={{ minWidth: 42 }}
                          >
                            {day}
                          </th>
                        ))}
                      </tr>
                    </thead>

                    <tbody>
                      <tr>
                        <td className="fw-semibold">
                          {attendanceData.employee.name}
                        </td>

                        {Array.from(
                          { length: attendanceData.daysInMonth },
                          (_, index) => index + 1
                        ).map((day) => {
                          const currentStatus =
                            attendanceData.employee.attendance?.[day]?.status || '';

                          const statusData = getAttendanceStatusData(currentStatus);

                          const cellKey = `${employeeId}-${day}`;

                          return (
                            <td key={day} className="text-center p-1">
                              <button
                                type="button"
                                className={`btn btn-sm w-100 ${
                                  statusData?.className || 'btn-outline-light text-dark'
                                }`}
                                style={{
                                  minHeight: 30,
                                  fontWeight: 700,
                                  borderColor: '#dee2e6',
                                }}
                                onClick={() =>
                                  updateEmployeeAttendanceCell(day, currentStatus)
                                }
                                disabled={attendanceSavingCell === cellKey}
                              >
                                {attendanceSavingCell === cellKey
                                  ? '...'
                                  : currentStatus}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

        </div>
      )}

      {/* TAB PINJAMAN */}
      {activeTab === 'loan' && (
        <div className="form-section">

          {loanLoading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>

              <p className="mt-2">Memuat data pinjaman...</p>
            </div>
          ) : !loanData?.activeLoan ? (
            <div
              style={{
                minHeight: '260px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <p className="text-muted mb-3">
                Belum ada riwayat pinjaman aktif.
              </p>

              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setShowLoanModal(true)}
              >
                <i className="fas fa-plus me-2"></i>
                Tambah Pinjaman
              </button>
            </div>
          ) : (
            <div>

              {/* FILTER TAHUN */}
              <div
                className="mb-4"
                style={{
                  border: '1px solid #e5e5e5',
                  borderRadius: '8px',
                  padding: '20px',
                  maxWidth: '850px',
                  margin: '0 auto'
                }}
              >
                <div className="row align-items-end">

                  <div className="col-md-3">
                    <label className="form-label">
                      Pilih Tahun
                    </label>

                    <select
                      className="form-select"
                      value={selectedLoanYear}
                      onChange={(e) => setSelectedLoanYear(e.target.value)}
                    >
                      {getLoanYearOptions().map((year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-md-9 text-end">
                    <button
                      type="button"
                      className="btn btn-success"
                      onClick={handleDownloadAllYears}
                    >
                      <i className="fas fa-file-excel me-2"></i>
                      Download Excel
                    </button>
                  </div>

                </div>
              </div>

              {/* SUMMARY PINJAMAN */}
              <div
                className="row g-3 mb-4"
                style={{
                  maxWidth: '850px',
                  margin: '0 auto'
                }}
              >
                <div className="col-md-3">
                  <div className="border rounded p-3">
                    <small className="text-muted">Total Pinjaman</small>
                    <h6 className="text-danger mb-0">
                      {formatCurrency(loanData.summary.total_amount)}
                    </h6>
                  </div>
                </div>

                <div className="col-md-3">
                  <div className="border rounded p-3">
                    <small className="text-muted">Sisa Pinjaman</small>
                    <h6 className="text-danger mb-0">
                      {formatCurrency(loanData.summary.remaining_amount)}
                    </h6>
                  </div>
                </div>

                <div className="col-md-3">
                  <div className="border rounded p-3">
                    <small className="text-muted">Cicilan Perbulan</small>
                    <h6 className="text-primary mb-0">
                      {formatCurrency(loanData.summary.monthly_installment)}
                    </h6>
                  </div>
                </div>

                <div className="col-md-3">
                  <div className="border rounded p-3">
                    <small className="text-muted">Target Lunas</small>
                    <h6 className="mb-0">
                      {monthNames[loanData.summary.target_month]} {loanData.summary.target_year}
                    </h6>
                  </div>
                </div>
              </div>

              {/* TABEL CICILAN */}
              <div
                className="table-responsive"
                style={{
                  maxWidth: '850px',
                  margin: '0 auto',
                  border: '1px solid #e5e5e5',
                  borderRadius: '8px',
                  overflow: 'hidden'
                }}
              >
                <div
                  style={{
                    background: '#d9ecff',
                    padding: '14px 18px',
                    fontWeight: '700',
                    color: '#0057a8'
                  }}
                >
                  Rincian Perhitungan Pinjaman
                </div>

                <table className="table mb-0">
                  <thead>
                    <tr>
                      <th>Bulan</th>
                      <th>Tahun</th>
                      <th>Tagihan</th>
                      <th>Sisa Pinjaman</th>
                      <th>Status</th>
                    </tr>
                  </thead>

                  <tbody>
                    {loanData.installments.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="text-center text-muted py-4">
                          Tidak ada data cicilan pada tahun ini.
                        </td>
                      </tr>
                    ) : (
                      loanData.installments.map((item) => (
                        <tr key={item.id}>
                          <td>{monthNames[item.month]}</td>
                          <td>{item.year}</td>
                          <td className="text-danger fw-bold">
                            {formatCurrency(item.bill_amount)}
                          </td>
                          <td>
                            {formatCurrency(item.remaining_after)}
                          </td>
                          <td>
                            {item.status === 'SUDAH BAYAR' ? (
                              <span className="badge bg-success">
                                SUDAH BAYAR
                              </span>
                            ) : (
                              <span className="badge bg-danger">
                                BELUM BAYAR
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

            </div>
          )}

          {/* MODAL TAMBAH PINJAMAN */}
          {showLoanModal && (
            <div
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0,0,0,0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 9999
              }}
            >
              <div
                style={{
                  background: '#fff',
                  width: '360px',
                  borderRadius: '8px',
                  padding: '28px',
                  boxShadow: '0 8px 25px rgba(0,0,0,0.18)'
                }}
              >
                <div className="mb-3">
                  <label className="form-label">
                    Jumlah Pinjaman
                  </label>

                  <input
                    type="text"
                    className={`form-control ${loanErrors.total_amount ? 'is-invalid' : ''}`}
                    name="total_amount"
                    value={loanForm.total_amount}
                    onChange={handleLoanChange}
                    placeholder="Contoh: 4000000"
                  />

                  {loanErrors.total_amount && (
                    <div className="invalid-feedback">
                      {loanErrors.total_amount}
                    </div>
                  )}
                </div>

                <div className="mb-4">
                  <label className="form-label">
                    Cicilan Perbulan
                  </label>

                  <input
                    type="text"
                    className={`form-control ${loanErrors.monthly_installment ? 'is-invalid' : ''}`}
                    name="monthly_installment"
                    value={loanForm.monthly_installment}
                    onChange={handleLoanChange}
                    placeholder="Contoh: 300000"
                  />

                  {loanErrors.monthly_installment && (
                    <div className="invalid-feedback">
                      {loanErrors.monthly_installment}
                    </div>
                  )}
                </div>

                {showLoanConfirm && (
                  <div className="alert alert-info mt-3">
                    <strong>Konfirmasi Pinjaman</strong>

                    <div className="mt-2">
                      <div>
                        Jumlah Pinjaman:{' '}
                        <strong>{formatCurrency(loanForm.total_amount)}</strong>
                      </div>

                      <div>
                        Cicilan Perbulan:{' '}
                        <strong>{formatCurrency(loanForm.monthly_installment)}</strong>
                      </div>

                      <div>
                        Perkiraan Lama Cicilan:{' '}
                        <strong>
                          {Math.ceil(
                            Number(loanForm.total_amount) / Number(loanForm.monthly_installment)
                          )} bulan
                        </strong>
                      </div>
                    </div>
                  </div>
                )}

                <div className="d-flex gap-2">
                  {!showLoanConfirm ? (
                    <button
                      type="button"
                      className="btn btn-primary flex-fill"
                      onClick={handleCreateLoan}
                    >
                      <i className="fas fa-plus me-2"></i>
                      Tambah Pinjaman
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-primary flex-fill"
                      onClick={handleConfirmCreateLoan}
                    >
                      <i className="fas fa-check me-2"></i>
                      Ya, Tambahkan
                    </button>
                  )}

                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      if (showLoanConfirm) {
                        setShowLoanConfirm(false);
                      } else {
                        setShowLoanModal(false);
                      }
                    }}
                  >
                    {showLoanConfirm ? 'Kembali' : 'Batal'}
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      )}
      
    </div>
  );
};

export default EmployeeDetail;