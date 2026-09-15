import React, { useState } from 'react';
import { donationsAPI } from '../services/api';

const DonationForm = ({ navigateTo }) => {

  const [isFormLoading, setIsFormLoading] =
    useState(false);

  const [attachmentFile, setAttachmentFile] =
    useState(null);

  const [attachmentPreview, setAttachmentPreview] =
    useState(null);

  const [selectedCategories, setSelectedCategories] =
    useState([]);

  const [customCategory, setCustomCategory] =
    useState('');

  const [categoryItems, setCategoryItems] =
    useState({});

  const [donationData, setDonationData] =
    useState({
      donor_name: '',
      donation_date:
        new Date().toISOString().split('T')[0],
      payment_method: 'cash',
      reference_number: '',
      notes: ''
    });

  const fixedCategories = [
    {
      id: 'Uang',
      name: 'Uang',
      type: 'income'
    },
    {
      id: 'Sembako',
      name: 'Sembako',
      type: 'income'
    },
    {
      id: 'Makanan',
      name: 'Makanan',
      type: 'income'
    },
    {
      id: 'Minuman',
      name: 'Minuman',
      type: 'income'
    },
    {
      id: 'Obat-obatan',
      name: 'Obat-obatan',
      type: 'income'
    },
    {
      id: 'Peralatan',
      name: 'Peralatan',
      type: 'income'
    },
    {
      id: 'Lainnya',
      name: 'Lainnya',
      type: 'income'
    }
  ];

  const createEmptyItem = () => ({
    item_name: '',
    quantity: '',
    unit: '',
    amount: '',
    description: ''
  });

  const handleDonationDataChange = e => {

    const {
      name,
      value
    } = e.target;

    setDonationData(prev => ({
      ...prev,
      [name]: value
    }));

  };

  const handleCategorySelect = categoryName => {

    setSelectedCategories(prev => {

      if (prev.includes(categoryName)) {

        setCategoryItems(items => {

          const updated = {
            ...items
          };

          delete updated[categoryName];

          return updated;
        });

        return prev.filter(
          category =>
            category !== categoryName
        );
      }

      setCategoryItems(items => ({
        ...items,
        [categoryName]: [
          createEmptyItem()
        ]
      }));

      return [
        ...prev,
        categoryName
      ];

    });

  };

  const handleItemChange = (
    categoryName,
    itemIndex,
    field,
    value
  ) => {

    setCategoryItems(prev => ({
      ...prev,

      [categoryName]:
        (prev[categoryName] || []).map(
          (item, index) =>
            index === itemIndex
              ? {
                  ...item,
                  [field]: value
                }
              : item
        )
    }));

  };

  const handleAddItem = categoryName => {

    setCategoryItems(prev => ({
      ...prev,

      [categoryName]: [
        ...(prev[categoryName] || []),
        createEmptyItem()
      ]
    }));

  };

  const handleRemoveItem = (
    categoryName,
    itemIndex
  ) => {

    setCategoryItems(prev => ({
      ...prev,

      [categoryName]:
        (prev[categoryName] || [])
          .filter(
            (_, index) =>
              index !== itemIndex
          )
    }));

  };

  const handleCustomCategoryChange = e => {
    setCustomCategory(e.target.value);
  };

  const handleFileChange = e => {

    const file = e.target.files[0];

    if (!file) return;

    if (
      file.size >
      5 * 1024 * 1024
    ) {

      alert(
        'Ukuran file maksimal 5MB.'
      );

      e.target.value = '';

      return;
    }

    setAttachmentFile(file);

    if (
      file.type.startsWith(
        'image/'
      )
    ) {

      const reader =
        new FileReader();

      reader.onloadend = () => {
        setAttachmentPreview(
          reader.result
        );
      };

      reader.readAsDataURL(file);

    } else {

      setAttachmentPreview(null);

    }

  };

  const resetForm = () => {

    setDonationData({
      donor_name: '',
      donation_date:
        new Date().toISOString().split('T')[0],
      payment_method: 'cash',
      reference_number: '',
      notes: ''
    });

    setSelectedCategories([]);

    setCustomCategory('');

    setCategoryItems({});

    setAttachmentFile(null);

    setAttachmentPreview(null);

  };

  const handleCancel = () => {

    if (isFormLoading) {
      return;
    }

    resetForm();

    navigateTo('donation');

  };

  const handleSubmit = async e => {

    e.preventDefault();

    if (
      !donationData.donor_name.trim()
    ) {

      alert(
        'Nama donatur harus diisi.'
      );

      return;
    }

    if (
      selectedCategories.length === 0
    ) {

      alert(
        'Harap pilih minimal satu kategori donasi.'
      );

      return;
    }

    if (
      selectedCategories.includes(
        'Lainnya'
      ) &&
      !customCategory.trim()
    ) {

      alert(
        'Harap isi nama kategori untuk Lainnya.'
      );

      return;
    }

    const items = [];

    selectedCategories.forEach(
      categoryName => {

        const finalCategoryName =
          categoryName === 'Lainnya'
            ? customCategory.trim()
            : categoryName;

        const categoryItemList =
          categoryItems[
            categoryName
          ] || [];

        /* =========================
           UANG
        ========================= */

        if (
          categoryName === 'Uang'
        ) {

          const moneyItem =
            categoryItemList[0] ||
            createEmptyItem();

          if (
            !moneyItem.amount ||
            Number(
              moneyItem.amount
            ) <= 0
          ) {
            return;
          }

          items.push({
            category_name:
              finalCategoryName,

            item_name: null,

            quantity: 1,

            unit: 'rupiah',

            amount:
              Number(
                moneyItem.amount
              ),

            description:
              moneyItem.description ||
              null
          });

          return;
        }

        /* =========================
           BARANG
        ========================= */

        categoryItemList.forEach(
          item => {

            if (
              item.item_name ||
              item.quantity ||
              item.amount ||
              item.description
            ) {

              items.push({
                category_name:
                  finalCategoryName,

                item_name:
                  item.item_name ||
                  null,

                quantity:
                  Number(
                    item.quantity
                  ) || 0,

                unit:
                  item.unit ||
                  null,

                amount:
                  Number(
                    item.amount
                  ) || 0,

                description:
                  item.description ||
                  null
              });

            }

          }
        );

      }
    );

    if (items.length === 0) {

      alert(
        'Silakan isi minimal satu detail donasi.'
      );

      return;
    }

    const confirmed =
      window.confirm(
        'Apakah Anda yakin ingin menyimpan donasi ini?\n\nData yang sudah disimpan tidak dapat diubah.'
      );

    if (!confirmed) {
      return;
    }

    setIsFormLoading(true);

    try {

      const formData =
        new FormData();

      formData.append(
        'donor_name',
        donationData
          .donor_name
          .trim()
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
        donationData.reference_number ||
          ''
      );

      formData.append(
        'notes',
        donationData.notes ||
          ''
      );

      formData.append(
        'items',
        JSON.stringify(items)
      );

      if (attachmentFile) {

        formData.append(
          'attachment',
          attachmentFile
        );

      }

      await donationsAPI.create(
        formData
      );

      alert(
        '✅ Donasi berhasil disimpan!'
      );

      resetForm();

      navigateTo('donation');

    } catch (error) {

      console.error(
        'Error creating donation:',
        error
      );

      alert(
        '❌ Gagal menyimpan donasi: ' +
        (
          error?.error ||
          'Terjadi kesalahan'
        )
      );

    } finally {

      setIsFormLoading(false);

    }

  };

  return (
    <div className="page-wrapper">

      {/* ========================= */}
      {/* BACK */}
      {/* ========================= */}

      <button
        className="btn btn-back"
        onClick={handleCancel}
        disabled={isFormLoading}
      >
        <i className="fas fa-arrow-left"></i>
        Kembali
      </button>

      {/* ========================= */}
      {/* TITLE */}
      {/* ========================= */}

      <h2 className="page-title">

        <i className="fas fa-edit"></i>

        Tambah Donasi Baru

      </h2>

      {/* ========================= */}
      {/* FORM */}
      {/* ========================= */}

      <div className="form-section">

        <form
          onSubmit={handleSubmit}
        >

          {/* ========================= */}
          {/* DATA DONATUR */}
          {/* ========================= */}

          <div className="row g-3">

            <div className="col-md-6">

              <label className="form-label">
                Nama Donatur *
              </label>

              <input
                type="text"
                className="form-control"
                name="donor_name"
                value={
                  donationData.donor_name
                }
                onChange={
                  handleDonationDataChange
                }
                placeholder="Nama donatur"
                required
                disabled={
                  isFormLoading
                }
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
                value={
                  donationData.donation_date
                }
                onChange={
                  handleDonationDataChange
                }
                required
                disabled={
                  isFormLoading
                }
              />

            </div>

          </div>

          {/* ========================= */}
          {/* KATEGORI */}
          {/* ========================= */}

          <div className="mt-4">

            <label className="form-label fw-semibold">
              Kategori Donasi *
            </label>

            <div className="row g-2">

              {fixedCategories.map(
                category => (

                  <div
                    className="col-md-3 col-sm-6"
                    key={category.id}
                  >

                    <div className="form-check">

                      <input
                        type="checkbox"
                        className="form-check-input"
                        id={`category-${category.id}`}
                        checked={
                          selectedCategories.includes(
                            category.name
                          )
                        }
                        onChange={() =>
                          handleCategorySelect(
                            category.name
                          )
                        }
                        disabled={
                          isFormLoading
                        }
                      />

                      <label
                        className="form-check-label"
                        htmlFor={`category-${category.id}`}
                      >
                        {category.name}
                      </label>

                    </div>

                  </div>

                )
              )}

            </div>

          </div>

          {/* ========================= */}
          {/* DETAIL KATEGORI */}
          {/* ========================= */}

          {selectedCategories.map(
            categoryName => {

              const isMoney =
                categoryName ===
                'Uang';

              const items =
                categoryItems[
                  categoryName
                ] || [];

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

                  {categoryName ===
                    'Lainnya' && (

                    <div className="mb-3">

                      <label className="form-label">
                        Nama Kategori *
                      </label>

                      <input
                        type="text"
                        className="form-control"
                        value={
                          customCategory
                        }
                        onChange={
                          handleCustomCategoryChange
                        }
                        placeholder="Contoh: Kebutuhan Kebersihan"
                        required
                        disabled={
                          isFormLoading
                        }
                      />

                    </div>

                  )}

                  {/* ITEMS */}

                  {items.map(
                    (item, index) => (

                      <div
                        key={index}
                        className="p-3 mb-3 bg-light rounded"
                      >

                        {/* BARANG */}

                        {!isMoney && (

                          <div className="row g-2">

                            <div className="col-md-4">

                              <label className="form-label">
                                Nama Barang
                              </label>

                              <input
                                type="text"
                                className="form-control"
                                value={
                                  item.item_name
                                }
                                onChange={e =>
                                  handleItemChange(
                                    categoryName,
                                    index,
                                    'item_name',
                                    e.target.value
                                  )
                                }
                                placeholder="Contoh: Beras"
                                disabled={
                                  isFormLoading
                                }
                              />

                            </div>

                            <div className="col-md-3">

                              <label className="form-label">
                                Jumlah
                              </label>

                              <input
                                type="number"
                                className="form-control"
                                value={
                                  item.quantity
                                }
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
                                disabled={
                                  isFormLoading
                                }
                              />

                            </div>

                            <div className="col-md-3">

                              <label className="form-label">
                                Satuan
                              </label>

                              <input
                                type="text"
                                className="form-control"
                                value={
                                  item.unit
                                }
                                onChange={e =>
                                  handleItemChange(
                                    categoryName,
                                    index,
                                    'unit',
                                    e.target.value
                                  )
                                }
                                placeholder="kg / pcs / dus"
                                disabled={
                                  isFormLoading
                                }
                              />

                            </div>

                            <div className="col-md-2 d-flex align-items-end">

                              {items.length >
                                1 && (

                                <button
                                  type="button"
                                  className="btn btn-outline-danger w-100"
                                  onClick={() =>
                                    handleRemoveItem(
                                      categoryName,
                                      index
                                    )
                                  }
                                  disabled={
                                    isFormLoading
                                  }
                                >

                                  <i className="fas fa-trash"></i>

                                </button>

                              )}

                            </div>

                          </div>

                        )}

                        {/* UANG */}

                        {isMoney && (

                          <div className="row g-2">

                            <div className="col-md-6">

                              <label className="form-label">
                                Nominal *
                              </label>

                              <input
                                type="number"
                                className="form-control"
                                value={
                                  item.amount
                                }
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
                                disabled={
                                  isFormLoading
                                }
                              />

                            </div>

                            <div className="col-md-6">

                              <label className="form-label">
                                Metode Pembayaran *
                              </label>

                              <select
                                className="form-select"
                                name="payment_method"
                                value={
                                  donationData.payment_method
                                }
                                onChange={
                                  handleDonationDataChange
                                }
                                disabled={
                                  isFormLoading
                                }
                                required
                              >

                                <option value="cash">
                                  Tunai
                                </option>

                                <option value="transfer">
                                  Transfer
                                </option>

                                <option value="check">
                                  Cek
                                </option>

                                <option value="other">
                                  Lainnya
                                </option>

                              </select>

                            </div>

                          </div>

                        )}

                        {/* DESKRIPSI */}

                        <div className="mt-2">

                          <label className="form-label">
                            Deskripsi
                          </label>

                          <textarea
                            className="form-control"
                            rows="2"
                            value={
                              item.description
                            }
                            onChange={e =>
                              handleItemChange(
                                categoryName,
                                index,
                                'description',
                                e.target.value
                              )
                            }
                            placeholder="Keterangan item"
                            disabled={
                              isFormLoading
                            }
                          />

                        </div>

                      </div>

                    )
                  )}

                  {/* TAMBAH BARANG */}

                  {!isMoney && (

                    <button
                      type="button"
                      className="btn btn-outline-primary btn-sm"
                      onClick={() =>
                        handleAddItem(
                          categoryName
                        )
                      }
                      disabled={
                        isFormLoading
                      }
                    >

                      <i className="fas fa-plus me-1"></i>

                      Tambah Barang

                    </button>

                  )}

                </div>

              );

            }
          )}

          {/* ========================= */}
          {/* BUKTI */}
          {/* ========================= */}

          <div className="mt-3">

            <label className="form-label">
              Upload Bukti Transaksi*
            </label>

            <input
              type="file"
              className="form-control"
              accept="image/*,.pdf"
              onChange={
                handleFileChange
              }
              disabled={
                isFormLoading
              }
            />

            <small className="text-muted">
              Maksimal 5MB. Format:
              JPG, PNG, GIF, PDF
            </small>

            {/* IMAGE PREVIEW */}

            {attachmentPreview && (

              <div className="mt-2">

                <img
                  src={
                    attachmentPreview
                  }
                  alt="Preview"
                  style={{
                    maxWidth: '200px',
                    maxHeight: '200px',
                    borderRadius: '8px',
                    border:
                      '1px solid #ddd'
                  }}
                />

              </div>

            )}

            {/* PDF */}

            {attachmentFile &&
              !attachmentPreview &&
              attachmentFile.type ===
                'application/pdf' && (

                <div className="mt-2">

                  <div className="alert alert-info">

                    <i className="fas fa-file-pdf me-2"></i>

                    File PDF:{' '}
                    {attachmentFile.name}

                  </div>

                </div>

              )}

          </div>

          {/* ========================= */}
          {/* BUTTON */}
          {/* ========================= */}

          <div className="text-center mt-4">

            <button
              type="submit"
              className="btn btn-primary-custom me-2"
              disabled={
                isFormLoading
              }
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
              onClick={
                handleCancel
              }
              disabled={
                isFormLoading
              }
            >

              <i className="fas fa-times"></i>

              Batal

            </button>

          </div>

        </form>

      </div>

    </div>
  );
};

export default DonationForm;