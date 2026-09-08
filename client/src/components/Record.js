// components/Record.js
import React, { useState, useEffect } from 'react';
import { recordsAPI, residentsAPI } from '../services/api';

const Record = ({ navigateTo }) => {
  const [showRecordForm, setShowRecordForm] = useState(false);
  const [records, setRecords] = useState([]);
  const [residents, setResidents] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFormLoading, setIsFormLoading] = useState(false);

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
    fetchData();
    fetchRecords();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const residentsData = await residentsAPI.getAll();
      setResidents(residentsData);
    } catch (error) {
      console.error('Error fetching data:', error);
      alert('Gagal memuat data');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRecords = async () => {
    try {
      setIsLoading(true);
      const data = await recordsAPI.getAll();
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
        <button className="btn btn-outline-secondary" onClick={fetchRecords}>
          <i className="fas fa-sync-alt"></i> Refresh
        </button>
      </div>

      {/* Form Record */}
      {showRecordForm && (
        <div className="form-section">
          <h4><i className="fas fa-edit"></i> Form Report Kejadian</h4>
          <form onSubmit={handleSubmitRecord}>
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
                  max={currentDate}
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
                  step="300"
                />
                <small className="text-muted">Format: 24 jam</small>
              </div>

              {/* Diubah menjadi Textbox */}
              <div className="col-md-6">
                <label className="form-label">Kejadian *</label>
                <input
                  type="text"
                  className="form-control"
                  name="activity_name"
                  value={formData.activity_name}
                  onChange={handleFormChange}
                  placeholder="Contoh: Jatuh dari tempat tidur, Makan obat, dll"
                  required
                  disabled={isFormLoading}
                />
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

            <div className="text-center mt-4">
              <button
                type="submit"
                className="btn btn-primary-custom me-2"
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
              <button
                type="button"
                className="btn btn-secondary-custom"
                onClick={toggleForm}
                disabled={isFormLoading}
              >
                <i className="fas fa-times"></i> Batal
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default Record;