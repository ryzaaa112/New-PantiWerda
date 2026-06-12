import React, { useEffect, useState } from 'react';
import { employeePayrollsAPI } from '../services/api';
import * as XLSX from 'xlsx'; // Import library di bagian atas file Anda

const EmployeePayroll = ({ navigateTo }) => {
  const currentDate = new Date();

  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [showMonthPicker, setShowMonthPicker] = useState(false);

  const payrollMonth = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;

  const monthOptions = [
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

  const fullMonthNames = {
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

  const [payrollData, setPayrollData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [payingEmployeeId, setPayingEmployeeId] = useState(null);

  useEffect(() => {
    fetchPayrollData();
  }, [payrollMonth]);

  const fetchPayrollData = async () => {
    try {
      setIsLoading(true);

      const data = await employeePayrollsAPI.getMonthly(payrollMonth);

      setPayrollData(data);
    } catch (error) {
      console.error('Error fetching payroll:', error);
      alert(error.error || 'Gagal memuat rekap gaji karyawan');
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (value) => {
    if (!value || value === '-') {
      return 'Rp0';
    }

    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(value);
  };

  const getMonthName = (monthValue) => {
    const [year, month] = monthValue.split('-').map(Number);

    return new Date(year, month - 1, 1).toLocaleDateString('id-ID', {
      month: 'long',
      year: 'numeric'
    });
  };

  const handlePayEmployee = async (employeeId) => {
    try {
      setPayingEmployeeId(employeeId);

      await employeePayrollsAPI.payEmployee({
        employee_id: employeeId,
        payroll_month: payrollMonth
      });

      alert('✅ Gaji karyawan berhasil dibayar');

      fetchPayrollData();
    } catch (error) {
      console.error('Error paying employee:', error);
      alert(error.error || 'Gagal membayar gaji karyawan');
    } finally {
      setPayingEmployeeId(null);
    }
  };


const handleDownloadExcel = () => {
  if (!payrollData || !payrollData.payrolls) return;

  // 1. Siapkan data dengan format yang diinginkan
  const wsData = payrollData.payrolls.map(item => ({
    "Nama": item.employee_name,
    "Jabatan": item.position || '-',
    "Tipe Gaji": item.salary_type || '-',
    "Gaji Pokok": item.base_salary,
    "Bonus": item.additional_variable,
    "BPJS": item.bpjs_deduction,
    "Pinjaman": item.loan_deduction,
    "Total Dibayar": item.total_salary,
    "Status": item.status
  }));

  // 2. Buat Worksheet
  const ws = XLSX.utils.json_to_sheet(wsData);

  // 3. Atur Lebar Kolom agar tidak terpotong
  const colWidths = [{ wch: 20 }, { wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 15 }, { wch: 15 }];
  ws['!cols'] = colWidths;

  // 4. Beri Warna berdasarkan Status
  const range = XLSX.utils.decode_range(ws['!ref']);
  for (let R = range.s.r + 1; R <= range.e.r; ++R) {
    const statusCellAddress = XLSX.utils.encode_cell({ c: 8, r: R }); // Kolom ke-9 (Status)
    const cell = ws[statusCellAddress];
    
    if (cell && cell.v === 'Sudah Dibayar') {
      cell.s = { fill: { fgColor: { rgb: "C6EFCE" } }, font: { color: { rgb: "006100" }, bold: true } };
    } else if (cell && cell.v === 'Belum Dibayar') {
      cell.s = { fill: { fgColor: { rgb: "FFC7CE" } }, font: { color: { rgb: "9C0006" }, bold: true } };
    }
  }

  // 5. Buat Workbook dan download
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Rekap Gaji");
  XLSX.writeFile(wb, `Rekap_Gaji_${payrollMonth}.xlsx`);
};

  return (
    <div className="page-wrapper">

      <button
        className="btn btn-back"
        onClick={() => navigateTo('dashboard')}
      >
        <i className="fas fa-arrow-left"></i> Kembali
      </button>

      <div className="d-flex justify-content-between align-items-start flex-wrap gap-3 mb-4">
        <div>
          <h2 className="page-title mb-2">
            <i className="fas fa-money-check-alt"></i>
            {' '}Rekap Gaji Karyawan
          </h2>

          <p className="text-muted mb-0">
            Rekap total gaji yang perlu dibayarkan kepada karyawan.
          </p>
        </div>
        <div className="d-flex gap-2 align-items-end">
    
    {/* Tombol Download excel */}
    <button 
      className="btn btn-success" 
      onClick={handleDownloadExcel}
      disabled={!payrollData || payrollData.payrolls?.length === 0}
    >
      <i className="fas fa-file-excel me-1"></i> Download Excel
    </button>

        <div style={{ position: 'relative' }}>
          <label className="form-label mb-1">
            Bulan Gaji
          </label>

          <button
            type="button"
            className="form-control d-flex justify-content-between align-items-center"
            style={{
              minWidth: '190px',
              background: '#fff',
              textAlign: 'left'
            }}
            onClick={() => setShowMonthPicker(!showMonthPicker)}
          >
            <span>
              {fullMonthNames[selectedMonth]} {selectedYear}
            </span>

            <i className="fas fa-chevron-down"></i>
          </button>

          {showMonthPicker && (
            <div
              style={{
                position: 'absolute',
                top: '72px',
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
                  onClick={() => setSelectedYear(selectedYear - 1)}
                >
                  <i className="fas fa-chevron-left"></i>
                </button>

                <strong style={{ fontSize: '18px' }}>
                  {selectedYear}
                </strong>

                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => setSelectedYear(selectedYear + 1)}
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
                {monthOptions.map((month) => (
                  <button
                    key={month.value}
                    type="button"
                    className={`btn btn-sm ${
                      selectedMonth === month.value
                        ? 'btn-primary'
                        : 'btn-outline-primary'
                    }`}
                    onClick={() => {
                      setSelectedMonth(month.value);
                      setShowMonthPicker(false);
                    }}
                  >
                    {month.label}
                  </button>
                ))}
              </div>

              <div className="d-flex justify-content-between mt-3">
                <button
                  type="button"
                  className="btn btn-sm btn-light"
                  onClick={() => {
                    const today = new Date();
                    setSelectedMonth(today.getMonth() + 1);
                    setSelectedYear(today.getFullYear());
                    setShowMonthPicker(false);
                  }}
                >
                  Bulan Ini
                </button>

                <button
                  type="button"
                  className="btn btn-sm btn-secondary"
                  onClick={() => setShowMonthPicker(false)}
                >
                  Tutup
                </button>
              </div>
            </div>
          )}
    </div>
  </div>
  {/* --- AKHIR PEMBUNGKUS --- */}
</div>

      {isLoading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status"></div>
          <p className="mt-2">Memuat rekap gaji...</p>
        </div>
      ) : !payrollData ? (
        <div className="text-center py-5 text-muted">
          <p>Data rekap gaji tidak tersedia.</p>
        </div>
      ) : (
        <>
          <div className="row g-3 mb-4">

            <div className="col-md-3">
              <div className="border rounded p-3">
                <small className="text-muted">Total Gaji Pokok</small>
                <h5 className="mb-0">
                  {formatCurrency(payrollData.summary.total_base_salary)}
                </h5>
              </div>
            </div>

            <div className="col-md-3">
              <div className="border rounded p-3">
                <small className="text-muted">Total Bonus</small>
                <h5 className="mb-0 text-success">
                  {formatCurrency(payrollData.summary.total_additional_variable)}
                </h5>
              </div>
            </div>

            <div className="col-md-3">
              <div className="border rounded p-3">
                <small className="text-muted">Total Potongan</small>
                <h5 className="mb-0 text-danger">
                  {formatCurrency(
                    payrollData.summary.total_bpjs_deduction +
                    payrollData.summary.total_loan_deduction
                  )}
                </h5>
              </div>
            </div>

            <div className="col-md-3">
              <div className="border rounded p-3">
                <small className="text-muted">Total Dibayar</small>
                <h5 className="mb-0 text-primary">
                  {formatCurrency(payrollData.summary.total_salary)}
                </h5>
              </div>
            </div>

          </div>

          <div className="row g-3 mb-4">
            <div className="col-md-6">
              <div className="alert alert-warning mb-0">
                <strong>Belum Dibayar:</strong>{' '}
                {payrollData.summary.total_unpaid} karyawan
              </div>
            </div>

            <div className="col-md-6">
              <div className="alert alert-success mb-0">
                <strong>Sudah Dibayar:</strong>{' '}
                {payrollData.summary.total_paid} karyawan
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header text-center bg-white">
              <strong>{getMonthName(payrollMonth)}</strong>
            </div>

            <div className="table-responsive">
              <table className="table table-bordered table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Nama</th>
                    <th>Jabatan</th>
                    <th>Tipe Gaji</th>
                    <th>Gaji Pokok</th>
                    <th>Bonus</th>
                    <th>BPJS</th>
                    <th>Pinjaman</th>
                    <th>Total Dibayar</th>
                    <th>Status</th>
                    <th>Aksi</th>
                  </tr>
                </thead>

                <tbody>
                  {payrollData.payrolls.length === 0 ? (
                    <tr>
                      <td colSpan="10" className="text-center text-muted py-4">
                        Belum ada data karyawan.
                      </td>
                    </tr>
                  ) : (
                    payrollData.payrolls.map((item) => (
                      <tr key={item.employee_id}>
                        <td className="fw-semibold">
                          {item.employee_name}
                        </td>

                        <td>{item.position || '-'}</td>

                        <td>{item.salary_type || '-'}</td>

                        <td>{formatCurrency(item.base_salary)}</td>

                        <td className="text-success fw-semibold">
                          + {formatCurrency(item.additional_variable)}
                        </td>

                        <td className="text-danger fw-semibold">
                          - {formatCurrency(item.bpjs_deduction)}
                        </td>

                        <td className="text-danger fw-semibold">
                          - {formatCurrency(item.loan_deduction)}
                        </td>

                        <td className="fw-bold text-primary">
                          {formatCurrency(item.total_salary)}
                        </td>

                        <td>
                          {item.status === 'Sudah Dibayar' ? (
                            <span className="badge bg-success">
                              Sudah Dibayar
                            </span>
                          ) : (
                            <span className="badge bg-warning text-dark">
                              Belum Dibayar
                            </span>
                          )}
                        </td>

                        <td>
                          {item.status === 'Sudah Dibayar' ? (
                            <button
                              type="button"
                              className="btn btn-sm btn-secondary"
                              disabled
                            >
                              Selesai
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="btn btn-sm btn-primary"
                              disabled={payingEmployeeId === item.employee_id}
                              onClick={() => handlePayEmployee(item.employee_id)}
                            >
                              {payingEmployeeId === item.employee_id ? (
                                'Membayar...'
                              ) : (
                                <>
                                  <i className="fas fa-check me-1"></i>
                                  Bayar
                                </>
                              )}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

    </div>
  );
};

export default EmployeePayroll;