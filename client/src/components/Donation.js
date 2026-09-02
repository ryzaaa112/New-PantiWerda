import React, { useState, useEffect } from 'react';
import { donationsAPI, donationCategoriesAPI } from '../services/api';

const Donation = ({ navigateTo }) => {
  const [showForm, setShowForm] = useState(false);
  const [donations, setDonations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFormLoading, setIsFormLoading] = useState(false);

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

  const [attachmentFile, setAttachmentFile] = useState(null);
  const [attachmentPreview, setAttachmentPreview] = useState(null);

  const [selectedCategories, setSelectedCategories] = useState([]);
  const [customCategory, setCustomCategory] = useState('');
  const [donationCategories, setDonationCategories] = useState([]);

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = user.role === 'admin';

  const fixedCategories = [
    { id: 'Uang', name: 'Uang', type: 'income' },
    { id: 'Sembako', name: 'Sembako', type: 'income' },
    { id: 'Makanan', name: 'Makanan', type: 'income' },
    { id: 'Minuman', name: 'Minuman', type: 'income' },
    { id: 'Obat-obatan', name: 'Obat-obatan', type: 'income' },
    { id: 'Peralatan', name: 'Peralatan', type: 'income' },
    { id: 'Lainnya', name: 'Lainnya', type: 'income' }
  ];

  const fetchDonationCategories = async () => {
    try {
      const data = await donationCategoriesAPI.getAll();
      setDonationCategories(data);
    } catch (error) {
      console.error('Error fetching donation categories:', error);
    }
  };

  const [filters, setFilters] = useState({
    month: '',
    category_name: ''
  });

  const [donationData, setDonationData] = useState({
    donor_name: '',
    donation_date: new Date().toISOString().split('T')[0],
    payment_method: 'cash',
    reference_number: '',
    notes: ''
  });

  useEffect(() => {
    fetchDonations();
  }, [filters]);

  const fetchDonations = async () => {
    try {
      setIsLoading(true);

      const data = await donationsAPI.getAll(filters);

      // Group items belonging to the same donation
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

  const resetForm = () => {
    setDonationData({
      donor_name: '',
      donation_date: new Date().toISOString().split('T')[0],
      payment_method: 'cash',
      reference_number: '',
      notes: ''
    });

    setSelectedCategories([]);
    setCustomCategory('');
    setAttachmentFile(null);
    setAttachmentPreview(null);
  };

  const toggleForm = () => {
    if (showForm) {
      setShowForm(false);
      resetForm();
    } else {
      setShowForm(true);
      resetForm();
    }
  };

  const handleDonationDataChange = (e) => {
    const { name, value } = e.target;

    setDonationData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCategoryToggle = (categoryName) => {
    setSelectedCategories(prev => {
      if (prev.includes(categoryName)) {
        return prev.filter(category => category !== categoryName);
      }

      return [...prev, categoryName];
    });
  };

  const addItem = (categoryName) => {
    setSelectedCategories(prev =>
      prev.map(category => {
        if (category.name !== categoryName) {
          return category;
        }

        return category;
      })
    );
  };

  const createEmptyItem = () => ({
    item_name: '',
    quantity: '',
    unit: '',
    amount: '',
    description: ''
  });

  const [categoryItems, setCategoryItems] = useState({});

  const handleCategorySelect = (categoryName) => {
    setSelectedCategories(prev => {
      if (prev.includes(categoryName)) {
        return prev.filter(category => category !== categoryName);
      }

      setCategoryItems(items => ({
        ...items,
        [categoryName]: [createEmptyItem()]
      }));

      return [...prev, categoryName];
    });
  };

  const handleItemChange = (categoryName, itemIndex, field, value) => {
    setCategoryItems(prev => ({
      ...prev,
      [categoryName]: prev[categoryName].map((item, index) =>
        index === itemIndex
          ? { ...item, [field]: value }
          : item
      )
    }));
  };

  const handleAddItem = (categoryName) => {
    setCategoryItems(prev => ({
      ...prev,
      [categoryName]: [
        ...(prev[categoryName] || []),
        createEmptyItem()
      ]
    }));
  };

  const handleRemoveItem = (categoryName, itemIndex) => {
    setCategoryItems(prev => ({
      ...prev,
      [categoryName]: prev[categoryName].filter(
        (_, index) => index !== itemIndex
      )
    }));
  };

  const handleCustomCategoryChange = (e) => {
    setCustomCategory(e.target.value);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];

    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Ukuran file maksimal 5MB.');
      e.target.value = '';
      return;
    }

    setAttachmentFile(file);

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();

      reader.onloadend = () => {
        setAttachmentPreview(reader.result);
      };

      reader.readAsDataURL(file);
    } else {
      setAttachmentPreview(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!donationData.donor_name.trim()) {
      alert('Nama donatur harus diisi.');
      return;
    }

    if (selectedCategories.length === 0) {
      alert('Harap pilih minimal satu kategori donasi.');
      return;
    }

    if (
      selectedCategories.includes('Lainnya') &&
      !customCategory.trim()
    ) {
      alert('Harap isi nama kategori untuk Lainnya.');
      return;
    }

    // Build items array
    const items = [];

    selectedCategories.forEach(categoryName => {
      const finalCategoryName =
        categoryName === 'Lainnya'
          ? customCategory.trim()
          : categoryName;

      const categoryItemList = categoryItems[categoryName] || [];

      // Uang
      if (categoryName === 'Uang') {
        const moneyItem = categoryItemList[0] || createEmptyItem();

        if (!moneyItem.amount || Number(moneyItem.amount) <= 0) {
          return;
        }

        items.push({
          category_name: finalCategoryName,
          item_name: null,
          quantity: 1,
          unit: 'rupiah',
          amount: Number(moneyItem.amount),
          description: moneyItem.description || null
        });

        return;
      }

      // Other categories
      categoryItemList.forEach(item => {
        if (
          item.item_name ||
          item.quantity ||
          item.amount ||
          item.description
        ) {
          items.push({
            category_name: finalCategoryName,
            item_name: item.item_name || null,
            quantity: Number(item.quantity) || 0,
            unit: item.unit || null,
            amount: Number(item.amount) || 0,
            description: item.description || null
          });
        }
      });
    });

    if (items.length === 0) {
      alert('Silakan isi minimal satu detail donasi.');
      return;
    }

    if (
      !window.confirm(
        'Apakah Anda yakin ingin menyimpan donasi ini?\n\nData yang sudah disimpan tidak dapat diubah.'
      )
    ) {
      return;
    }

    setIsFormLoading(true);

    try {
      const formData = new FormData();

      formData.append(
        'donor_name',
        donationData.donor_name.trim()
      );

      formData.append(
        'donation_date',
        donationData.donation_date
      );

      formData.append(
        'payment_method',
        donationData.payment_method
      );

      formData.append(
        'reference_number',
        donationData.reference_number || ''
      );

      formData.append(
        'notes',
        donationData.notes || ''
      );

      formData.append(
        'items',
        JSON.stringify(items)
      );

      if (attachmentFile) {
        formData.append('attachment', attachmentFile);
      }

      await donationsAPI.create(formData);

      alert('✅ Donasi berhasil disimpan!');

      setShowForm(false);
      resetForm();

      fetchDonations();

    } catch (error) {
      console.error('Error creating donation:', error);

      alert(
        '❌ Gagal menyimpan donasi: ' +
        (error?.error || 'Terjadi kesalahan')
      );
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

  const getTotalAmount = (items) => {
    return items.reduce(
      (total, item) => total + (Number(item.amount) || 0),
      0
    );
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

      {/* Back Button */}
      <button
        className="btn btn-back"
        onClick={() => navigateTo('dashboard')}
      >
        <i className="fas fa-arrow-left"></i> Kembali
      </button>

      {/* Title */}
      <h2 className="page-title">
        <i className="fas fa-donate"></i>
        Kelola Donasi
      </h2>

      {/* Admin Buttons */}
      {isAdmin && (
        <div className="mb-4 d-flex justify-content-between">

          <button
            className="btn btn-primary-custom"
            onClick={toggleForm}
          >
            <i className="fas fa-plus"></i>
            Tambah Donasi Baru
          </button>

          <button
            className="btn btn-outline-secondary"
            onClick={fetchDonations}
          >
            <i className="fas fa-sync-alt"></i>
            Refresh
          </button>

        </div>
      )}

      {/* ========================= */}
      {/* DONATION FORM */}
      {/* ========================= */}

      {showForm && (
        <div className="form-section">

          <h4>
            <i className="fas fa-edit"></i>
            Form Donasi
          </h4>

          <form onSubmit={handleSubmit}>

            {/* DONOR INFORMATION */}

            <div className="row g-3">

              <div className="col-md-6">

                <label className="form-label">
                  Nama Donatur *
                </label>

                <input
                  type="text"
                  className="form-control"
                  name="donor_name"
                  value={donationData.donor_name}
                  onChange={handleDonationDataChange}
                  placeholder="Nama donatur"
                  required
                  disabled={isFormLoading}
                />

              </div>

              <div className="col-md-6">

                <label className="form-label">
                  Tanggal Donasi *
                </label>

                <input
                  type="date"
                  className="form-control"
                  name="donation_date"
                  value={donationData.donation_date}
                  onChange={handleDonationDataChange}
                  required
                  disabled={isFormLoading}
                />

              </div>

            </div>

            {/* ========================= */}
            {/* CATEGORY CHECKBOX */}
            {/* ========================= */}

            <div className="mt-4">

              <label className="form-label fw-semibold">
                Kategori Donasi *
              </label>

              <div className="row g-2">

                {fixedCategories.map(category => (

                  <div
                    className="col-md-3 col-sm-6"
                    key={category.id}
                  >

                    <div className="form-check">

                      <input
                        type="checkbox"
                        className="form-check-input"
                        id={`category-${category.id}`}
                        checked={selectedCategories.includes(
                          category.name
                        )}
                        onChange={() =>
                          handleCategorySelect(category.name)
                        }
                        disabled={isFormLoading}
                      />

                      <label
                        className="form-check-label"
                        htmlFor={`category-${category.id}`}
                      >
                        {category.name}
                      </label>

                    </div>

                  </div>

                ))}

              </div>

            </div>

            {/* ========================= */}
            {/* CATEGORY DETAILS */}
            {/* ========================= */}

            {selectedCategories.map(categoryName => {

              const isMoney = categoryName === 'Uang';

              const items =
                categoryItems[categoryName] || [];

              return (

                <div
                  key={categoryName}
                  className="mt-4 p-3 border rounded"
                >

                  <h5 className="mb-3">

                    <i className="fas fa-box-open me-2"></i>

                    {categoryName}

                  </h5>

                  {/* CUSTOM CATEGORY */}

                  {categoryName === 'Lainnya' && (

                    <div className="mb-3">

                      <label className="form-label">
                        Nama Kategori *
                      </label>

                      <input
                        type="text"
                        className="form-control"
                        value={customCategory}
                        onChange={handleCustomCategoryChange}
                        placeholder="Contoh: Kebutuhan Kebersihan"
                        required
                        disabled={isFormLoading}
                      />

                    </div>

                  )}

                  {/* ITEMS */}

                  {items.map((item, index) => (

                    <div
                      key={index}
                      className="p-3 mb-3 bg-light rounded"
                    >

                      {!isMoney && (
                        <div className="row g-2">

                          <div className="col-md-4">

                            <label className="form-label">
                              Nama Barang
                            </label>

                            <input
                              type="text"
                              className="form-control"
                              value={item.item_name}
                              onChange={e =>
                                handleItemChange(
                                  categoryName,
                                  index,
                                  'item_name',
                                  e.target.value
                                )
                              }
                              placeholder="Contoh: Beras"
                              disabled={isFormLoading}
                            />

                          </div>

                          <div className="col-md-3">

                            <label className="form-label">
                              Jumlah
                            </label>

                            <input
                              type="number"
                              className="form-control"
                              value={item.quantity}
                              onChange={e =>
                                handleItemChange(
                                  categoryName,
                                  index,
                                  'quantity',
                                  e.target.value
                                )
                              }
                              min="0"
                              step="any"
                              placeholder="0"
                              disabled={isFormLoading}
                            />

                          </div>

                          <div className="col-md-3">

                            <label className="form-label">
                              Satuan
                            </label>

                            <input
                              type="text"
                              className="form-control"
                              value={item.unit}
                              onChange={e =>
                                handleItemChange(
                                  categoryName,
                                  index,
                                  'unit',
                                  e.target.value
                                )
                              }
                              placeholder="kg / pcs / dus"
                              disabled={isFormLoading}
                            />

                          </div>

                          <div className="col-md-2 d-flex align-items-end">

                            {items.length > 1 && (

                              <button
                                type="button"
                                className="btn btn-outline-danger w-100"
                                onClick={() =>
                                  handleRemoveItem(
                                    categoryName,
                                    index
                                  )
                                }
                                disabled={isFormLoading}
                              >
                                <i className="fas fa-trash"></i>
                              </button>

                            )}

                          </div>

                        </div>
                      )}

                      {isMoney && (

                        <div className="row g-2">

                          <div className="col-md-6">

                            <label className="form-label">
                              Nominal *
                            </label>

                            <input
                              type="number"
                              className="form-control"
                              value={item.amount}
                              onChange={e =>
                                handleItemChange(
                                  categoryName,
                                  index,
                                  'amount',
                                  e.target.value
                                )
                              }
                              min="0"
                              step="1000"
                              placeholder="500000"
                              required
                              disabled={isFormLoading}
                            />

                          </div>

                        </div>

                      )}

                      <div className="mt-2">

                        <label className="form-label">
                          Deskripsi
                        </label>

                        <textarea
                          className="form-control"
                          rows="2"
                          value={item.description}
                          onChange={e =>
                            handleItemChange(
                              categoryName,
                              index,
                              'description',
                              e.target.value
                            )
                          }
                          placeholder="Keterangan item"
                          disabled={isFormLoading}
                        />

                      </div>

                    </div>

                  ))}

                  {/* ADD ITEM */}

                  {!isMoney && (

                    <button
                      type="button"
                      className="btn btn-outline-primary btn-sm"
                      onClick={() =>
                        handleAddItem(categoryName)
                      }
                      disabled={isFormLoading}
                    >
                      <i className="fas fa-plus me-1"></i>
                      Tambah Barang
                    </button>

                  )}

                </div>

              );
            })}

            {/* ========================= */}
            {/* PAYMENT */}
            {/* ========================= */}

            <div className="row g-3 mt-2">

              <div className="col-md-4">

                <label className="form-label">
                  Metode Pembayaran
                </label>

                <select
                  className="form-select"
                  name="payment_method"
                  value={donationData.payment_method}
                  onChange={handleDonationDataChange}
                  disabled={isFormLoading}
                >
                  <option value="cash">Tunai</option>
                  <option value="transfer">Transfer</option>
                  <option value="check">Cek</option>
                  <option value="other">Lainnya</option>
                </select>

              </div>

              <div className="col-md-4">

                <label className="form-label">
                  Nomor Referensi
                </label>

                <input
                  type="text"
                  className="form-control"
                  name="reference_number"
                  value={donationData.reference_number}
                  onChange={handleDonationDataChange}
                  placeholder="No. bukti transfer / cek"
                  disabled={isFormLoading}
                />

              </div>

              <div className="col-md-4">

                <label className="form-label">
                  Catatan
                </label>

                <input
                  type="text"
                  className="form-control"
                  name="notes"
                  value={donationData.notes}
                  onChange={handleDonationDataChange}
                  placeholder="Catatan tambahan"
                  disabled={isFormLoading}
                />

              </div>

            </div>

            {/* ========================= */}
            {/* ATTACHMENT */}
            {/* ========================= */}

            <div className="mt-3">

              <label className="form-label">
                Bukti Transaksi (Gambar/PDF)
              </label>

              <input
                type="file"
                className="form-control"
                accept="image/*,.pdf"
                onChange={handleFileChange}
                disabled={isFormLoading}
              />

              <small className="text-muted">
                Maksimal 5MB. Format: JPG, PNG, GIF, PDF
              </small>

              {attachmentPreview && (

                <div className="mt-2">

                  <img
                    src={attachmentPreview}
                    alt="Preview"
                    style={{
                      maxWidth: '200px',
                      maxHeight: '200px',
                      borderRadius: '8px',
                      border: '1px solid #ddd'
                    }}
                  />

                </div>

              )}

              {attachmentFile &&
                !attachmentPreview &&
                attachmentFile.type === 'application/pdf' && (

                  <div className="mt-2">

                    <div className="alert alert-info">

                      <i className="fas fa-file-pdf me-2"></i>

                      File PDF: {attachmentFile.name}

                    </div>

                  </div>

                )}

            </div>

            {/* ========================= */}
            {/* BUTTONS */}
            {/* ========================= */}

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
                    <i className="fas fa-save"></i>
                    Simpan Donasi
                  </>
                )}

              </button>

              <button
                type="button"
                className="btn btn-secondary-custom"
                onClick={toggleForm}
                disabled={isFormLoading}
              >
                <i className="fas fa-times"></i>
                Batal
              </button>

            </div>

          </form>

        </div>
      )}

      {/* ========================= */}
      {/* FILTER */}
      {/* ========================= */}

      <div className="filter-row mb-4">

        <div className="row g-2">

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
              onClick={() => setShowMonthPicker(!showMonthPicker)}
              disabled={isLoading}
            >
              {filters.month
                ? new Date(`${filters.month}-01`).toLocaleDateString(
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
                        filters.month === `${selectedYear}-${month.value}`
                          ? 'btn-primary'
                          : 'btn-outline-primary'
                      }`}
                      onClick={() => {
                        const selectedValue =
                          `${selectedYear}-${month.value}`;

                        setSelectedMonth(month.value);

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
                      handleFilterChange('month', '');
                      setShowMonthPicker(false);
                    }}
                  >
                    Hapus filter bulan
                  </button>
                )}
              </div>
            )}
          </div>

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
                  <th>Total</th>
                  <th>Metode</th>
                  <th>Bukti</th>

                </tr>

              </thead>

              <tbody>

                {donations.map(donation => (

                  <tr key={donation.donation_id}>

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

                    <td>
                      {donation.donor_name}
                    </td>

                    <td>

                      {getCategoryNames(
                        donation.items
                      ).map(category => (

                        <span
                          key={category}
                          className="badge bg-success me-1 mb-1"
                        >
                          {category}
                        </span>

                      ))}

                    </td>

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
                                — {item.quantity}{' '}
                                {item.unit}
                              </span>
                            )}

                          {Number(item.amount) > 0 && (
                            <span>
                              {' '}
                              — {formatCurrency(
                                item.amount
                              )}
                            </span>
                          )}

                        </div>

                      ))}

                    </td>

                    <td>

                      <span className="fw-bold text-success">

                        {formatCurrency(
                          getTotalAmount(
                            donation.items
                          )
                        )}

                      </span>

                    </td>

                    <td>

                      <span className="badge bg-info">

                        {donation.payment_method === 'cash'
                          ? 'Tunai'
                          : donation.payment_method === 'transfer'
                            ? 'Transfer'
                            : donation.payment_method === 'check'
                              ? 'Cek'
                              : 'Lainnya'}

                      </span>

                    </td>

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