import React, { useEffect, useMemo, useState } from 'react';
import { attendanceAPI } from '../services/api';

const STATUS_LIST = [
  { code: 'H', label: 'Hadir', className: 'bg-success text-white' },
  { code: 'S', label: 'Sakit', className: 'bg-info text-dark' },
  { code: 'I', label: 'Izin', className: 'bg-warning text-dark' },
  { code: 'A', label: 'Alpa', className: 'bg-danger text-white' },
  { code: 'O', label: 'Off', className: 'bg-secondary text-white' },
  { code: 'K', label: 'Kebijakan', className: 'bg-primary text-white' },
];

const STATUS_ORDER = ['', 'H', 'S', 'I', 'A', 'O', 'K'];

const pad2 = (num) => String(num).padStart(2, '0');

const getTodayMonth = () => new Date().toISOString().slice(0, 7);

const getMonthName = (monthValue) => {
  const [year, month] = monthValue.split('-').map(Number);

  return new Date(year, month - 1, 1).toLocaleDateString('id-ID', {
    month: 'long',
    year: 'numeric',
  });
};

const Attendance = ({ navigateTo }) => {
  const [month, setMonth] = useState(getTodayMonth());
  const [selectedDay, setSelectedDay] = useState(new Date().getDate());
  const [daysInMonth, setDaysInMonth] = useState(31);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingCell, setSavingCell] = useState(null);

  const days = useMemo(() => {
    return Array.from({ length: daysInMonth }, (_, index) => index + 1);
  }, [daysInMonth]);

  useEffect(() => {
    fetchAttendance();
  }, [month]);

  const fetchAttendance = async () => {
    setLoading(true);

    try {
      const data = await attendanceAPI.getMonthly(month);

      setEmployees(data.employees || []);
      setDaysInMonth(data.daysInMonth || 31);
    } catch (error) {
      console.error(error);
      alert(error?.error || 'Gagal mengambil data absensi');
    } finally {
      setLoading(false);
    }
  };

  const getStatusData = (status) => {
    return STATUS_LIST.find((item) => item.code === status);
  };

  const getNextStatus = (currentStatus) => {
    const currentIndex = STATUS_ORDER.indexOf(currentStatus || '');

    if (currentIndex === -1) return 'H';

    return STATUS_ORDER[(currentIndex + 1) % STATUS_ORDER.length];
  };

  const updateAttendanceCell = async (employeeId, day, currentStatus) => {
    const nextStatus = getNextStatus(currentStatus);
    const attendanceDate = `${month}-${pad2(day)}`;
    const cellKey = `${employeeId}-${day}`;

    setSavingCell(cellKey);

    try {
      await attendanceAPI.save({
        employee_id: employeeId,
        attendance_date: attendanceDate,
        status: nextStatus,
      });

      await fetchAttendance();
    } catch (error) {
      console.error(error);
      alert(error?.error || 'Gagal menyimpan absensi');
    } finally {
      setSavingCell(null);
    }
  };

  const markAllPresent = async () => {
    const attendanceDate = `${month}-${pad2(selectedDay)}`;

    const confirmed = window.confirm(
      `Tandai semua karyawan hadir pada tanggal ${selectedDay} ${getMonthName(month)}?`
    );

    if (!confirmed) return;

    try {
      setLoading(true);

      await attendanceAPI.markAll({
        attendance_date: attendanceDate,
        status: 'H',
      });

      await fetchAttendance();
      alert('Semua karyawan berhasil ditandai hadir');
    } catch (error) {
      console.error(error);
      alert(error?.error || 'Gagal menandai semua hadir');
    } finally {
      setLoading(false);
    }
  };

  const downloadExcel = async () => {
    try {
      const blob = await attendanceAPI.exportExcel(month);

      const url = window.URL.createObjectURL(
        new Blob([blob], { type: 'text/csv;charset=utf-8;' })
      );

      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `absensi-karyawan-${month}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      alert(error?.error || 'Gagal download absensi');
    }
  };

  const countStatus = (attendance = {}, code) => {
    return Object.values(attendance).filter((item) => item?.status === code).length;
  };

  return (
    <div className="page-wrapper">
      <button className="btn btn-back" onClick={() => navigateTo('dashboard')}>
        <i className="fas fa-arrow-left"></i> Kembali
      </button>

      <div className="d-flex justify-content-between align-items-start flex-wrap gap-3 mb-4">
        <div>
          <h2 className="page-title mb-2">
            <i className="fas fa-calendar-check"></i> Absensi Karyawan Bulanan
          </h2>
          <p className="text-muted mb-0">Monitoring kehadiran karyawan per bulan</p>
        </div>

        <div className="d-flex align-items-end gap-2 flex-wrap">
          <div>
            <label className="form-label mb-1">Bulan</label>
            <input
              type="month"
              className="form-control"
              value={month}
              onChange={(event) => setMonth(event.target.value)}
            />
          </div>

          <div>
            <label className="form-label mb-1">Tanggal</label>
            <select
              className="form-select"
              value={selectedDay}
              onChange={(event) => setSelectedDay(Number(event.target.value))}
            >
              {days.map((day) => (
                <option key={day} value={day}>
                  {day}
                </option>
              ))}
            </select>
          </div>

          <button className="btn btn-success" onClick={markAllPresent} disabled={loading}>
            <i className="fas fa-check-double me-1"></i> Semua Hadir
          </button>

          <button className="btn btn-dark" onClick={downloadExcel} disabled={loading}>
            <i className="fas fa-file-excel me-1"></i> Download Excel
          </button>
        </div>
      </div>

      <div className="card mb-3">
        <div className="card-body py-3">
          <div className="d-flex flex-wrap align-items-center gap-2">
            <strong className="me-2">Keterangan:</strong>

            {STATUS_LIST.map((status) => (
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

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status"></div>
          <p className="mt-2">Memuat data absensi...</p>
        </div>
      ) : employees.length === 0 ? (
        <div className="text-center py-5">
          <i className="fas fa-user-tie fa-3x text-muted mb-3"></i>
          <p className="text-muted">
            Belum ada data karyawan. Tambahkan karyawan dulu di menu Data Karyawan.
          </p>

          <button className="btn btn-primary" onClick={() => navigateTo('ie')}>
            <i className="fas fa-user-plus me-1"></i> Tambah Karyawan
          </button>
        </div>
      ) : (
        <div className="card">
          <div className="card-header text-center bg-white">
            <strong>{getMonthName(month)}</strong>
          </div>

          <div className="table-responsive" style={{ maxHeight: '68vh' }}>
            <table className="table table-bordered table-sm align-middle mb-0">
              <thead className="table-light sticky-top">
                <tr>
                  <th style={{ minWidth: 180 }} className="text-center">
                    Nama
                  </th>

                  {days.map((day) => (
                    <th key={day} className="text-center" style={{ minWidth: 42 }}>
                      {day}
                    </th>
                  ))}

                  <th className="text-center" style={{ minWidth: 70 }}>
                    Total
                  </th>

                  <th className="text-center" style={{ minWidth: 70 }}>
                    Alpa
                  </th>
                </tr>
              </thead>

              <tbody>
                {employees.map((employee) => (
                  <tr key={employee.id}>
                    <td className="fw-semibold">{employee.name}</td>

                    {days.map((day) => {
                      const currentStatus = employee.attendance?.[day]?.status || '';
                      const statusData = getStatusData(currentStatus);
                      const cellKey = `${employee.id}-${day}`;

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
                              updateAttendanceCell(employee.id, day, currentStatus)
                            }
                            disabled={savingCell === cellKey}
                          >
                            {savingCell === cellKey ? '...' : currentStatus}
                          </button>
                        </td>
                      );
                    })}

                    <td className="text-center fw-bold table-light">
                      {countStatus(employee.attendance, 'H')}
                    </td>

                    <td className="text-center fw-bold table-light">
                      {countStatus(employee.attendance, 'A')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Attendance;