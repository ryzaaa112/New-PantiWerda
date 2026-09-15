// components/Record.js
import React, { useState, useEffect } from 'react';
import { recordsAPI, residentsAPI } from '../services/api';

const Record = ({ navigateTo }) => {
  const [showRecordForm, setShowRecordForm] = useState(false);
  const [records, setRecords] = useState([]);
  const [residents, setResidents] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFormLoading, setIsFormLoading] = useState(false);

  const [filters, setFilters] = useState({
    resident: '',
    date_from: '',
    date_to: ''
  });

  // Get current date and time for default values
  const now = new Date();
  const currentDate = now.toISOString().split('T')[0]; // YYYY-MM-DD
  const currentTime = now.toTimeString().slice(0, 5); // HH:MM

  const [formData, setFormData] = useState({
    resident_id: '',
    activity_name: '', 
    record_date: currentDate,
    record_time: currentTime,
    condition: 'Baik',
    notes: '',
    recorded_by: 'Staff'
  });

  useEffect(() => {
    fetchResidents();
  }, []);

  useEffect(() => {
    fetchRecords();
  }, [filters]);

  const fetchResidents = async () => {
    try {
      setIsLoading(true);
      const residentsData = await residentsAPI.getAll({ status: 'Aktif' });
      setResidents(residentsData);
    } catch (error) {
      console.error('Error fetching residents:', error);
      alert('Gagal memuat data penghuni');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRecords = async () => {
    try {
      setIsLoading(true);
      const data = await recordsAPI.getAll(filters);
      setRecords(data);
    } catch (error) {
      console.error('Error fetching records:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleForm = () => {
    setShowRecordForm(!showRecordForm);
    if (!showRecordForm) {
      const now = new Date();
      const currentDate = now.toISOString().split('T')[0];
      const currentTime = now.toTimeString().slice(0, 5);

      setFormData({
        resident_id: '',
        activity_name: '',
        record_date: currentDate,
        record_time: currentTime,
        condition: 'Baik',
        notes: '',
        recorded_by: 'Staff'
      });
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmitRecord = async (e) => {
    e.preventDefault();
    setIsFormLoading(true);

    try {
      // Combine date and time into ISO string
      const record_datetime = `${formData.record_date}T${formData.record_time}:00`;

      const recordData = {
        ...formData,
        record_datetime: record_datetime
      };

      // Remove the separate date/time fields before sending
      delete recordData.record_date;
      delete recordData.record_time;

      await recordsAPI.create(recordData);
      alert('✅ Record berhasil disimpan!');
      setShowRecordForm(false);
      fetchRecords(); // Refresh the list
    } catch (error) {
      console.error('Error creating record:', error);
      alert('❌ Gagal menyimpan record: ' + (error.error || 'Terjadi kesalahan'));
    } finally {
      setIsFormLoading(false);
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const getConditionColor = (condition) => {
    switch (condition) {
      case 'Baik': return 'success';
      case 'Cukup Baik': return 'warning';
      case 'Kurang Baik': return 'danger';
      default: return 'secondary';
    }
  };

  const formatDateTime = (datetime) => {
    if (!datetime) return '-';
    const date = new Date(datetime);
    return date.toLocaleString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Helper function to format time in 24-hour format
  const formatTimeForInput = (timeString) => {
    if (!timeString) return '00:00';

    // If time is in "HH:MM:SS" format, extract just "HH:MM"
    if (timeString.includes(':')) {
      const parts = timeString.split(':');
      if (parts.length >= 2) {
        return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
      }
    }
    return timeString;
  };

  const handleDeleteRecord = async (recordId) => {
    if (!window.confirm('Yakin ingin menghapus record ini?\n\nData yang dihapus tidak dapat dikembalikan.')) {
      return;
    }

    try {
      await recordsAPI.delete(recordId);
      alert('✅ Record berhasil dihapus');

      // Refresh the records list
      fetchRecords();
    } catch (error) {
      console.error('Error deleting record:', error);
      alert(`❌ Gagal menghapus record: ${error.error || 'Terjadi kesalahan'}`);
    }
  };

  return (
    <div className="page-wrapper">
      <button className="btn btn-back" onClick={() => navigateTo('dashboard')}>
        <i className="fas fa-arrow-left"></i> Kembali
      </button>

      <h2 className="page-title">
        <i className="fas fa-clipboard-list"></i>
        Report Kejadian Khusus
      </h2>

      <div className="mb-4 d-flex justify-content-between">
        <button className="btn btn-primary-custom" onClick={toggleForm}>
          <i className="fas fa-plus"></i> Tambah Record Baru
        </button>
        <button className="btn btn-outline-secondary" onClick={fetchResidents}>
          <i className="fas fa-sync-alt"></i> Refresh
        </button>
      </div>

      {/* Modal / Popup Form Record */}
      {showRecordForm && (
        <div className="modal show fade d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="fas fa-edit"></i> Form Report Kejadian
                </h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={toggleForm}
                  disabled={isFormLoading}
                ></button>
              </div>
              <form onSubmit={handleSubmitRecord}>
                <div className="modal-body">
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label">Pilih Opa/Oma *</label>
                      <select
                        className="form-select"
                        name="resident_id"
                        value={formData.resident_id}
                        onChange={handleFormChange}
                        required
                        disabled={isFormLoading}
                      >
                        <option value="">-- Pilih Penghuni --</option>
                        {residents.map(resident => (
                          <option key={resident.id} value={resident.id}>
                            {resident.name} ({resident.gender === 'male' ? 'Opa' : 'Oma'}, {resident.age} tahun)
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Separated Date and Time Inputs */}
                    <div className="col-md-3">
                      <label className="form-label">Tanggal *</label>
                      <input
                        type="date"
                        className="form-control"
                        name="record_date"
                        value={formData.record_date}
                        onChange={handleFormChange}
                        required
                        disabled={isFormLoading}
                        max={currentDate} // Cannot select future dates
                      />
                    </div>

                    <div className="col-md-3">
                      <label className="form-label">Waktu *</label>
                      <input
                        type="time"
                        className="form-control"
                        name="record_time"
                        value={formatTimeForInput(formData.record_time)}
                        onChange={handleFormChange}
                        required
                        disabled={isFormLoading}
                        step="300" // 5 minute increments (300 seconds)
                      />
                      <small className="text-muted">Format: 24 jam</small>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">Kejadian *</label>
                      <input
                        type="text"
                        className="form-control"
                        name="activity_name"
                        value={formData.activity_name}
                        onChange={handleFormChange}
                        placeholder="Contoh: Jatuh dari tempat tidur, Batuk-batuk, dll"
                        required
                        disabled={isFormLoading}
                      />
                      <small className="text-muted">Tuliskan nama atau jenis kejadian</small>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">Kondisi Umum *</label>
                      <select
                        className="form-select"
                        name="condition"
                        value={formData.condition}
                        onChange={handleFormChange}
                        required
                        disabled={isFormLoading}
                      >
                        <option value="Baik">Baik</option>
                        <option value="Cukup Baik">Cukup Baik</option>
                        <option value="Kurang Baik">Kurang Baik</option>
                      </select>
                    </div>

                    <div className="col-12">
                      <label className="form-label">Keterangan / Catatan *</label>
                      <textarea
                        className="form-control"
                        name="notes"
                        value={formData.notes}
                        onChange={handleFormChange}
                        rows="3"
                        placeholder="Tuliskan detail kegiatan, kondisi penghuni, atau informasi penting lainnya..."
                        required
                        disabled={isFormLoading}
                      ></textarea>
                      <small className="text-muted">Contoh: "Opa makan dengan lahap, mood baik", "Oma minum obat tepat waktu"</small>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">Dicatat Oleh</label>
                      <input
                        type="text"
                        className="form-control"
                        name="recorded_by"
                        value={formData.recorded_by}
                        onChange={handleFormChange}
                        placeholder="Nama staff"
                        disabled={isFormLoading}
                      />
                    </div>
                  </div>
                </div>

                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary-custom"
                    onClick={toggleForm}
                    disabled={isFormLoading}
                  >
                    <i className="fas fa-times"></i> Batal
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary-custom"
                    disabled={isFormLoading}
                  >
                    {isFormLoading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2"></span>
                        Menyimpan...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-save"></i> Simpan Record
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="filter-row mb-4">
        <div className="row g-2">
          <div className="col-md-4">
            <label className="form-label">Filter Opa/Oma</label>
            <select
              className="form-select"
              value={filters.resident}
              onChange={(e) => handleFilterChange('resident', e.target.value)}
              disabled={isLoading}
            >
              <option value="">Semua Opa & Oma</option>
              {residents.map(resident => (
                <option key={resident.id} value={resident.id}>
                  {resident.name} ({resident.gender === 'male' ? 'Opa' : 'Oma'})
                </option>
              ))}
            </select>
          </div>

          <div className="col-md-3">
            <label className="form-label">Dari Tanggal</label>
            <input
              type="date"
              className="form-control"
              value={filters.date_from}
              onChange={(e) => handleFilterChange('date_from', e.target.value)}
              placeholder="Dari tanggal"
              disabled={isLoading}
            />
          </div>

          <div className="col-md-3">
            <label className="form-label">Sampai Tanggal</label>
            <input
              type="date"
              className="form-control"
              value={filters.date_to}
              onChange={(e) => handleFilterChange('date_to', e.target.value)}
              placeholder="Sampai tanggal"
              disabled={isLoading}
              min={filters.date_from} // Cannot select date before "from" date
            />
          </div>

          <div className="col-md-2 d-flex align-items-end">
            <button
              className="btn btn-outline-secondary w-100"
              onClick={() => setFilters({ resident: '', date_from: '', date_to: '' })}
              disabled={isLoading}
            >
              <i className="fas fa-times"></i> Reset Filter
            </button>
          </div>
        </div>
      </div>

      {/* Record List */}
      <div className="record-list">
        {isLoading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-2">Memuat data record...</p>
          </div>
        ) : records.length === 0 ? (
          <div className="text-center py-5">
            <i className="fas fa-clipboard-list fa-3x text-muted mb-3"></i>
            <p className="text-muted">
              {Object.values(filters).some(f => f)
                ? 'Tidak ditemukan record dengan filter tersebut'
                : 'Belum ada report kejadian. Tambahkan record baru untuk melihatnya di sini.'
              }
            </p>
          </div>
        ) : (
          records.map(record => (
            <div key={record.id} className="record-card">
              <div className="record-header">
                <div className="record-date">
                  <i className="fas fa-calendar-day"></i> {formatDateTime(record.record_datetime)}
                </div>
                <span className="badge" style={{
                  backgroundColor: record.activity_color || '#007bff',
                  color: 'white'
                }}>
                  {record.activity_name}
                </span>
              </div>
              <h5 className="record-name">
                {record.resident_name} ({record.resident_type})
              </h5>
              <div className="mb-2">
                <span className={`badge bg-${getConditionColor(record.condition)} me-2`}>
                  {record.condition}
                </span>
              </div>
              <p className="mb-0">{record.notes}</p>
              {record.recorded_by && (
                <div className="record-footer mt-2">
                  <small className="text-muted">
                    Dicatat oleh: {record.recorded_by}
                  </small>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Record;