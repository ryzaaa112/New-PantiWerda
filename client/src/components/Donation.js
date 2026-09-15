import React, { useState, useEffect } from 'react';
import { donationsAPI } from '../services/api';

const Donation = ({ navigateTo }) => {
  const [donations, setDonations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const currentYear = new Date().getFullYear();

  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState('');

  const monthOptions = [
    { value: '01', label: 'Jan' },
    { value: '02', label: 'Feb' },
    { value: '03', label: 'Mar' },
    { value: '04', label: 'Apr' },
    { value: '05', label: 'Mei' },
    { value: '06', label: 'Jun' },
    { value: '07', label: 'Jul' },
    { value: '08', label: 'Agu' },
    { value: '09', label: 'Sep' },
    { value: '10', label: 'Okt' },
    { value: '11', label: 'Nov' },
    { value: '12', label: 'Des' }
  ];

  const [filters, setFilters] = useState({
    month: '',
    category_name: ''
  });

  const fixedCategories = [
    { id: 'Uang', name: 'Uang', type: 'income' },
    { id: 'Sembako', name: 'Sembako', type: 'income' },
    { id: 'Makanan', name: 'Makanan', type: 'income' },
    { id: 'Minuman', name: 'Minuman', type: 'income' },
    { id: 'Obat-obatan', name: 'Obat-obatan', type: 'income' },
    { id: 'Peralatan', name: 'Peralatan', type: 'income' },
    { id: 'Lainnya', name: 'Lainnya', type: 'income' }
  ];

  useEffect(() => {
    fetchDonations();
  }, [filters]);

  const fetchDonations = async () => {
    try {
      setIsLoading(true);

      const data = await donationsAPI.getAll(filters);

      const grouped = groupDonations(data);

      setDonations(grouped);
    } catch (error) {
      console.error('Error fetching donations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const groupDonations = (data) => {
    const grouped = {};

    data.forEach(item => {
      if (!grouped[item.donation_id]) {
        grouped[item.donation_id] = {
          id: item.id,
          donation_id: item.donation_id,
          donor_name: item.donor_name,
          donation_date: item.donation_date,
          payment_method: item.payment_method,
          reference_number: item.reference_number,
          notes: item.notes,
          attachment_path: item.attachment_path,
          items: []
        };
      }

      if (item.item_id) {
        grouped[item.donation_id].items.push({
          item_id: item.item_id,
          category_name: item.category_name,
          item_name: item.item_name,
          quantity: item.quantity,
          unit: item.unit,
          amount: item.amount,
          description: item.item_description
        });
      }
    });

    return Object.values(grouped);
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(Number(amount) || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';

    return new Date(dateString).toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getCategoryNames = (items) => {
    const categories = [
      ...new Set(items.map(item => item.category_name))
    ];

    return categories;
  };

  const viewAttachment = (attachmentPath) => {
    window.open(
      `http://localhost:5000${attachmentPath}`,
      '_blank'
    );
  };

  return (
    <div className="page-wrapper">

      {/* ========================= */}
      {/* BACK BUTTON */}
      {/* ========================= */}

      <button
        className="btn btn-back"
        onClick={() => navigateTo('dashboard')}
      >
        <i className="fas fa-arrow-left"></i> Kembali
      </button>

      {/* ========================= */}
      {/* TITLE */}
      {/* ========================= */}

      <h2 className="page-title">
        <i className="fas fa-donate"></i>
        Kelola Donasi
      </h2>

      {/* ========================= */}
      {/* BUTTONS */}
      {/* ========================= */}

      <div className="mb-4 d-flex justify-content-between">

        <button
          className="btn btn-primary-custom"
          onClick={() => navigateTo('donation-form')}
        >
          <i className="fas fa-plus"></i>
          Tambah Donasi Baru
        </button>

        <button
          className="btn btn-outline-secondary"
          onClick={fetchDonations}
          disabled={isLoading}
        >
          <i className="fas fa-sync-alt"></i>
          Refresh
        </button>

      </div>

      {/* ========================= */}
      {/* FILTER */}
      {/* ========================= */}

      <div className="filter-row mb-4">

        <div className="row g-2">

          {/* CATEGORY */}

          <div className="col-md-4">

            <label className="form-label">
              Kategori
            </label>

            <select
              className="form-select"
              value={filters.category_name}
              onChange={e =>
                handleFilterChange(
                  'category_name',
                  e.target.value
                )
              }
              disabled={isLoading}
            >

              <option value="">
                Semua Kategori
              </option>

              {fixedCategories
                .filter(category => category.name !== 'Lainnya')
                .map(category => (
                  <option
                    key={category.id}
                    value={category.name}
                  >
                    {category.name}
                  </option>
                ))}

              <option value="__custom__">
                Lainnya
              </option>

            </select>

          </div>

          {/* MONTH */}

          <div
            className="col-md-4"
            style={{ position: 'relative' }}
          >

            <label className="form-label">
              Bulan
            </label>

            <button
              type="button"
              className="form-control text-start"
              onClick={() =>
                setShowMonthPicker(!showMonthPicker)
              }
              disabled={isLoading}
            >

              {filters.month
                ? new Date(
                    `${filters.month}-01`
                  ).toLocaleDateString(
                    'id-ID',
                    {
                      month: 'long',
                      year: 'numeric'
                    }
                  )
                : 'Pilih bulan'}

            </button>

            {showMonthPicker && (
              <div
                style={{
                  position: 'absolute',
                  top: '72px',
                  left: 0,
                  width: '280px',
                  background: '#fff',
                  border: '1px solid #dee2e6',
                  borderRadius: '10px',
                  boxShadow:
                    '0 8px 25px rgba(0,0,0,0.15)',
                  padding: '16px',
                  zIndex: 999
                }}
              >

                <div className="d-flex justify-content-between align-items-center mb-3">

                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() =>
                      setSelectedYear(selectedYear - 1)
                    }
                  >
                    <i className="fas fa-chevron-left"></i>
                  </button>

                  <strong style={{ fontSize: '18px' }}>
                    {selectedYear}
                  </strong>

                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() =>
                      setSelectedYear(selectedYear + 1)
                    }
                  >
                    <i className="fas fa-chevron-right"></i>
                  </button>

                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns:
                      'repeat(4, 1fr)',
                    gap: '8px'
                  }}
                >

                  {monthOptions.map(month => (
                    <button
                      key={month.value}
                      type="button"
                      className={`btn btn-sm ${
                        filters.month ===
                        `${selectedYear}-${month.value}`
                          ? 'btn-primary'
                          : 'btn-outline-primary'
                      }`}
                      onClick={() => {

                        const selectedValue =
                          `${selectedYear}-${month.value}`;

                        setSelectedMonth(
                          month.value
                        );

                        handleFilterChange(
                          'month',
                          selectedValue
                        );

                        setShowMonthPicker(false);
                      }}
                    >
                      {month.label}
                    </button>
                  ))}

                </div>

                {filters.month && (
                  <button
                    type="button"
                    className="btn btn-sm btn-link w-100 mt-2"
                    onClick={() => {

                      setSelectedMonth('');

                      handleFilterChange(
                        'month',
                        ''
                      );

                      setShowMonthPicker(false);
                    }}
                  >
                    Hapus filter bulan
                  </button>
                )}

              </div>
            )}

          </div>

          {/* RESET */}

          <div className="col-md-4 d-flex align-items-end">

            <button
              className="btn btn-outline-secondary w-100"
              onClick={() =>
                setFilters({
                  month: '',
                  category_name: ''
                })
              }
              disabled={isLoading}
            >
              <i className="fas fa-times"></i>
              Reset Filter
            </button>

          </div>

        </div>

      </div>

      {/* ========================= */}
      {/* DONATION LIST */}
      {/* ========================= */}

      <div className="transaction-list">

        {isLoading ? (

          <div className="text-center py-5">

            <div
              className="spinner-border text-primary"
              role="status"
            >
              <span className="visually-hidden">
                Loading...
              </span>
            </div>

            <p className="mt-2">
              Memuat data donasi...
            </p>

          </div>

        ) : donations.length === 0 ? (

          <div className="text-center py-5">

            <i className="fas fa-donate fa-3x text-muted mb-3"></i>

            <p className="text-muted">

              {Object.values(filters).some(f => f)
                ? 'Tidak ditemukan donasi dengan filter tersebut'
                : 'Belum ada data donasi. Tambahkan donasi baru untuk melihatnya di sini.'
              }

            </p>

          </div>

        ) : (

          <div className="table-responsive">

            <table className="table table-hover">

              <thead>

                <tr>

                  <th>Tanggal</th>

                  <th>Donatur</th>

                  <th>Kategori</th>

                  <th>Detail</th>

                  <th>Metode(Donasi Uang)</th>

                  <th>Bukti</th>

                </tr>

              </thead>

              <tbody>

                {donations.map(donation => (

                  <tr
                    key={donation.donation_id}
                  >

                    {/* TANGGAL */}

                    <td>

                      <div className="fw-semibold">
                        {formatDate(
                          donation.donation_date
                        )}
                      </div>

                      <small className="text-muted">
                        ID: {donation.donation_id}
                      </small>

                    </td>

                    {/* DONATUR */}

                    <td>
                      {donation.donor_name}
                    </td>

                    {/* KATEGORI */}

                    <td>

                      {getCategoryNames(
                        donation.items
                      ).map(category => (

                        <div
                          key={category}
                          className="mb-1"
                        >

                          <span className="badge bg-success">
                            {category}
                          </span>

                        </div>

                      ))}

                    </td>

                    {/* DETAIL */}

                    <td>

                      {donation.items.map(item => (

                        <div
                          key={item.item_id}
                          className="mb-1"
                        >

                          <strong>
                            {item.item_name ||
                              item.category_name}
                          </strong>

                          {item.quantity > 0 &&
                            item.unit && (
                              <span>
                                {' '}
                                → {item.quantity}{' '}
                                {item.unit}
                              </span>
                            )}

                          {Number(item.amount) > 0 && (
                            <span>
                              {' '}
                              →{' '}
                              {formatCurrency(
                                item.amount
                              )}
                            </span>
                          )}

                        </div>

                      ))}

                    </td>

                    {/* METODE UANG */}

                    <td>

                      {donation.items.some(
                        item =>
                          item.category_name ===
                          'Uang'
                      ) ? (

                        <span className="badge bg-info">

                          {donation.payment_method ===
                          'cash'
                            ? 'Tunai'
                            : donation.payment_method ===
                              'transfer'
                              ? 'Transfer'
                              : donation.payment_method ===
                                'check'
                                ? 'Cek'
                                : 'Lainnya'}

                        </span>

                      ) : (

                        <span className="text-muted">
                          -
                        </span>

                      )}

                    </td>

                    {/* BUKTI */}

                    <td>

                      {donation.attachment_path ? (

                        <button
                          className="btn btn-sm btn-outline-info"
                          onClick={() =>
                            viewAttachment(
                              donation.attachment_path
                            )
                          }
                        >

                          <i className="fas fa-eye"></i>
                          {' '}Lihat

                        </button>

                      ) : (

                        <span className="text-muted">
                          -
                        </span>

                      )}

                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>

        )}

      </div>

    </div>
  );
};

export default Donation;