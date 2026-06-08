// server/server.js
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const bcrypt = require('bcrypt');
const multer = require('multer');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 5000;

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let folder = 'public/uploads/';
    if (file.fieldname === 'photo') {
      folder += 'photos/';
    } else if (file.fieldname === 'audio') {
      folder += 'audio/';
    }

    // Create directory if it doesn't exist
    if (!fs.existsSync(folder)) {
      fs.mkdirSync(folder, { recursive: true });
    }

    cb(null, folder);
  },
  filename: function (req, file, cb) {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: function (req, file, cb) {
    // Accept images and audio
    if (file.fieldname === 'photo') {
      if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
        return cb(new Error('Hanya file gambar (JPG, PNG, GIF) yang diizinkan'), false);
      }
    } else if (file.fieldname === 'audio') {
      if (!file.originalname.match(/\.(mp3|wav|m4a|ogg)$/)) {
        return cb(new Error('Hanya file audio (MP3, WAV, M4A, OGG) yang diizinkan'), false);
      }
    }
    cb(null, true);
  }
});

const transactionStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    let folder = 'public/uploads/transactions/';
    // Create directory if it doesn't exist
    if (!fs.existsSync(folder)) {
      fs.mkdirSync(folder, { recursive: true });
    }
    cb(null, folder);
  },
  filename: function (req, file, cb) {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'proof-' + uniqueSuffix + ext);
  }
});

const uploadTransaction = multer({
  storage: transactionStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: function (req, file, cb) {
    // Accept images and PDFs
    if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Hanya file gambar (JPG, PNG, GIF) dan PDF yang diizinkan'), false);
    }
  }
});

app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));

// BASIC TEST ENDPOINT 
app.get('/api/test', (req, res) => {
  res.json({
    message: 'Server is working!',
    timestamp: new Date().toISOString(),
    database: 'SQLite connected'
  });
});

// DASHBOARD STATS 
app.get('/api/dashboard-stats', async (req, res) => {
  try {
    // Get active residents count
    const residentCount = await db.get(
      'SELECT COUNT(*) as count FROM residents WHERE status = "Aktif"'
    );

    // Get today's records count
    const today = new Date().toISOString().split('T')[0];
    const todayRecords = await db.get(
      'SELECT COUNT(*) as count FROM daily_records WHERE DATE(record_datetime) = ?',
      [today]
    );

    // Get current month's financials
    const currentMonth = new Date().toISOString().slice(0, 7);
    const monthlyFinancials = await db.get(`
      SELECT 
        COALESCE(SUM(CASE WHEN dc.type = 'income' THEN t.amount ELSE 0 END), 0) as monthly_income,
        COALESCE(SUM(CASE WHEN dc.type = 'expense' THEN t.amount ELSE 0 END), 0) as monthly_expense
      FROM transactions t
      JOIN donation_categories dc ON t.category_id = dc.id
      WHERE strftime('%Y-%m', t.transaction_date) = ?
    `, [currentMonth]);

    res.json({
      active_residents: residentCount.count || 0,
      today_records: todayRecords.count || 0,
      monthly_income: monthlyFinancials.monthly_income || 0,
      monthly_expense: monthlyFinancials.monthly_expense || 0
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// RESIDENTS ENDPOINTS
// GET all residents
app.get('/api/residents', async (req, res) => {
  try {
    console.log('GET /api/residents - Fetching all residents');

    const { search, status, type } = req.query;

    let query = `
      SELECT r.*, 
             rm.room_name,
             rm.room_type,
             rm.status as room_status
      FROM residents r
      LEFT JOIN rooms rm ON r.room_id = rm.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      query += ' AND r.status = ?';
      params.push(status);
    }

    if (type) {
      query += ' AND r.gender = ?';
      params.push(type === 'Opa' ? 'male' : 'female');
    }

    if (search) {
      query += ' AND (r.name LIKE ? OR r.resident_id LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY r.name';

    const residents = await db.all(query, params);
    console.log(`Found ${residents.length} residents`);

    res.json(residents);
  } catch (error) {
    console.error('Error fetching residents:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ================== TRANSACTIONS API ==================

// GET transactions with filtering
// GET transactions with filtering
app.get('/api/transactions', async (req, res) => {
  try {
    const { type, month, category_name } = req.query;

    let query = `
      SELECT t.*, dc.name as category_name, dc.type as transaction_type
      FROM transactions t
      JOIN donation_categories dc ON t.category_id = dc.id
      WHERE 1=1
    `;
    const params = [];

    if (type) {
      query += ' AND dc.type = ?';
      params.push(type);
    }

    if (month) {
      query += ' AND strftime("%Y-%m", t.transaction_date) = ?';
      params.push(month);
    }

    if (category_name) {
      query += ' AND dc.name = ?';
      params.push(category_name);
    }

    query += ' ORDER BY t.transaction_date DESC';

    const transactions = await db.all(query, params);
    res.json(transactions);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST create new transaction WITH file upload
app.post('/api/transactions', uploadTransaction.single('attachment'), async (req, res) => {
  try {
    const {
      category_name, amount, transaction_date, source,
      description, payment_method, reference_number, notes
    } = req.body;

    let categoryId;

    // Check if category_name is provided (for custom categories)
    if (category_name) {
      // Check if category exists
      const existingCategory = await db.get(
        'SELECT id FROM donation_categories WHERE name = ?',
        [category_name]
      );

      if (existingCategory) {
        categoryId = existingCategory.id;
      } else {
        // Create new category if it doesn't exist
        const newCategory = await db.run(
          'INSERT INTO donation_categories (name, type, description) VALUES (?, ?, ?)',
          [category_name, 'income', `Kategori baru: ${category_name}`]
        );
        categoryId = newCategory.lastID;
      }
    } else {
      return res.status(400).json({ error: 'Kategori harus diisi' });
    }

    // Get category type for transaction ID prefix
    const category = await db.get('SELECT type FROM donation_categories WHERE id = ?', [categoryId]);
    const prefix = category.type === 'income' ? 'INC' : 'EXP';

    // Generate transaction ID
    const lastTransaction = await db.get(
      `SELECT transaction_id FROM transactions WHERE transaction_id LIKE '${prefix}-%' ORDER BY id DESC LIMIT 1`
    );

    let newNumber = 1;
    if (lastTransaction) {
      const lastNum = parseInt(lastTransaction.transaction_id.split('-')[1]);
      newNumber = lastNum + 1;
    }
    const transactionId = `${prefix}-${newNumber.toString().padStart(3, '0')}`;

    // Handle attachment path
    const attachmentPath = req.file ? `/uploads/transactions/${req.file.filename}` : null;

    const result = await db.run(`
      INSERT INTO transactions 
      (transaction_id, category_id, amount, transaction_date, source, 
       description, payment_method, reference_number, notes, attachment_path)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      transactionId,
      categoryId,
      amount,
      transaction_date,
      source,
      description,
      payment_method || 'cash',
      reference_number || '',
      notes || '',
      attachmentPath
    ]);

    res.status(201).json({
      id: result.lastID,
      transaction_id: transactionId,
      message: 'Transaction created successfully',
      attachment_path: attachmentPath
    });
  } catch (error) {
    console.error('Error creating transaction:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST create new resident
app.post('/api/residents', upload.fields([
  { name: 'photo', maxCount: 1 },
  { name: 'audio', maxCount: 1 }
]), async (req, res) => {
  try {
    console.log('📸 POST /api/residents - Creating resident with files');

    const formData = req.body;
    const files = req.files;

    // Calculate age from birth_date
    const calculateAge = (birthDate) => {
      const today = new Date();
      const birth = new Date(birthDate);
      let age = today.getFullYear() - birth.getFullYear();
      const monthDiff = today.getMonth() - birth.getMonth();

      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
      }
      return age;
    };

    // Validate required fields
    const requiredFields = ['name', 'gender', 'birth_date', 'join_date', 'condition'];
    for (const field of requiredFields) {
      if (!formData[field]) {
        return res.status(400).json({
          error: `Field ${field} harus diisi`
        });
      }
    }

    // Generate resident ID
    const lastResident = await db.get(
      "SELECT resident_id FROM residents WHERE resident_id LIKE 'R-%' ORDER BY id DESC LIMIT 1"
    );

    let newNumber = 1;
    if (lastResident) {
      const lastNum = parseInt(lastResident.resident_id.split('-')[1]);
      newNumber = lastNum + 1;
    }
    const residentId = `R-${newNumber.toString().padStart(3, '0')}`;

    if (formData.room_id) {
      // Check if room exists and has available beds
      const room = await db.get(`
        SELECT r.*, 
              COUNT(res.id) as current_occupants
        FROM rooms r
        LEFT JOIN residents res ON r.id = res.room_id
        WHERE r.id = ?
        GROUP BY r.id
      `, [formData.room_id]);

      if (!room) {
        return res.status(400).json({ error: 'Ruangan tidak ditemukan' });
      }

      if (room.status !== 'available') {
        return res.status(400).json({ error: `Ruangan ${room.room_name} tidak tersedia (status: ${room.status})` });
      }

      const availableBeds = room.capacity - room.current_occupants;
      if (availableBeds <= 0) {
        return res.status(400).json({ error: `Ruangan ${room.room_name} sudah penuh` });
      }
    }

    // Calculate age from birth date
    const age = calculateAge(formData.birth_date);

    // Prepare file paths
    const photoPath = files.photo ? `/uploads/photos/${files.photo[0].filename}` : null;
    const audioPath = files.audio ? `/uploads/audio/${files.audio[0].filename}` : null;

    // Start transaction
    await db.run('BEGIN TRANSACTION');

    try {
      // Insert resident with all fields
      const result = await db.run(`
        INSERT INTO residents (
          resident_id, name, age, gender, birth_date, birth_place,
          address, religion, join_date, condition, medical_history,
          allergies, smoking, alcohol, functional_walking, functional_eating,
          mental_emotion, mental_consciousness, photo_path, audio_path, room_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        residentId,
        formData.name,
        age,
        formData.gender,
        formData.birth_date,
        formData.birth_place || null,
        formData.address || null,
        formData.religion || null,
        formData.join_date,
        formData.condition,
        formData.medical_history || null,
        formData.allergies || null,
        formData.smoking || null,
        formData.alcohol || null,
        formData.functional_walking || null,
        formData.functional_eating || null,
        formData.mental_emotion || null,
        formData.mental_consciousness || null,
        photoPath,
        audioPath,
        formData.room_id || null
      ]);

      const residentDbId = result.lastID;

      // Parse guardians if provided (as JSON string)
      let guardians = [];
      if (formData.guardians) {
        try {
          guardians = JSON.parse(formData.guardians);
        } catch (e) {
          console.warn('⚠️ Could not parse guardians JSON:', e.message);
        }
      }

      // Insert guardians
      if (guardians && guardians.length > 0) {
        for (const guardian of guardians) {
          if (guardian.name && guardian.phone) {
            await db.run(`
              INSERT INTO guardians (resident_id, name, id_number, email, phone, relationship, address, is_primary)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, [
              residentDbId,
              guardian.name,
              guardian.id_number || null,
              guardian.email || null,
              guardian.phone,
              guardian.relationship || null,
              guardian.address || null,
              guardian.is_primary ? 1 : 0
            ]);
          }
        }
      }

      // Insert hematology data if exists
      if (formData.hemoglobin || formData.leukocyte || formData.erythrocyte) {
        await db.run(`
          INSERT INTO health_records (
            resident_id, record_type, hemoglobin, leukocyte, erythrocyte, 
            recorded_date, recorded_by
          ) VALUES (?, 'hematology', ?, ?, ?, ?, ?)
        `, [
          residentDbId,
          formData.hemoglobin || null,
          formData.leukocyte || null,
          formData.erythrocyte || null,
          formData.join_date,
          'system'
        ]);
      }

      // Insert blood sugar data if exists
      if (formData.blood_sugar_random || formData.blood_sugar_fasting || formData.blood_sugar_two_hour) {
        await db.run(`
          INSERT INTO health_records (
            resident_id, record_type, blood_sugar_random, blood_sugar_fasting, 
            blood_sugar_two_hour, recorded_date, recorded_by
          ) VALUES (?, 'blood_sugar', ?, ?, ?, ?, ?)
        `, [
          residentDbId,
          formData.blood_sugar_random || null,
          formData.blood_sugar_fasting || null,
          formData.blood_sugar_two_hour || null,
          formData.join_date,
          'system'
        ]);
      }

      let medications = [];
      if (formData.medications) {
        try {
          medications = JSON.parse(formData.medications);
        } catch (e) {
          console.warn('⚠️ Could not parse medications JSON:', e.message);
        }
      }

      // Insert medications if provided
      if (medications && medications.length > 0) {
        for (const medication of medications) {
          if (medication.medication_name) {
            await db.run(`
        INSERT INTO medications (
          resident_id, medication_name, dosage, schedule, status, start_date
        ) VALUES (?, ?, ?, ?, ?, ?)
      `, [
              residentDbId,
              medication.medication_name,
              medication.dosage || null,
              medication.schedule || null,
              medication.status || 'Active',
              formData.join_date
            ]);
          }
        }
      }


      await db.run('COMMIT');

      res.status(201).json({
        id: residentDbId,
        resident_id: residentId,
        photo_path: photoPath,
        audio_path: audioPath,
        age_calculated: age,
        message: 'Data penghuni berhasil disimpan!'
      });

    } catch (error) {
      // Rollback transaction on error
      await db.run('ROLLBACK');

      // Clean up uploaded files if there was an error
      if (files.photo) {
        fs.unlinkSync(path.join(__dirname, files.photo[0].path));
      }
      if (files.audio) {
        fs.unlinkSync(path.join(__dirname, files.audio[0].path));
      }

      throw error;
    }

  } catch (error) {
    console.error('❌ Error creating resident:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
});

// Database setup
let db;
async function initializeDatabase() {
  try {
    db = await open({
      filename: path.join(__dirname, 'nursing_home.db'),
      driver: sqlite3.Database
    });

    // Test connection
    await db.get('SELECT 1 as test');
    console.log('✅ Database connected successfully');

    // Create tables if they don't exist
    await createTables();

    // Insert default data (including admin account)
    await insertDefaultData();

    // Check database structure
    await checkDatabaseStructure();

  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
}

async function createTables() {
  try {
    // EMPLOYEE PAYROLLS TABLE
    await db.run(`
      CREATE TABLE IF NOT EXISTS employee_payrolls (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        employee_id INTEGER NOT NULL,
        payroll_month TEXT NOT NULL,
        base_salary INTEGER NOT NULL DEFAULT 0,
        additional_variable INTEGER NOT NULL DEFAULT 0,
        bpjs_deduction INTEGER NOT NULL DEFAULT 0,
        loan_deduction INTEGER NOT NULL DEFAULT 0,
        total_salary INTEGER NOT NULL DEFAULT 0,
        status TEXT DEFAULT 'Belum Dibayar' CHECK (status IN ('Belum Dibayar', 'Sudah Dibayar')),
        paid_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(employee_id, payroll_month),
        FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
      )
    `);

    //EMPLOYEE LOANS TABLE
    await db.exec(`
      CREATE TABLE IF NOT EXISTS employee_loans (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        employee_id INTEGER NOT NULL,
        total_amount INTEGER NOT NULL,
        monthly_installment INTEGER NOT NULL,
        remaining_amount INTEGER NOT NULL,
        start_month INTEGER NOT NULL,
        start_year INTEGER NOT NULL,
        target_month INTEGER NOT NULL,
        target_year INTEGER NOT NULL,
        status TEXT DEFAULT 'Aktif',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
      )
    `);

    await db.exec(`
      CREATE TABLE IF NOT EXISTS employee_loan_installments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        loan_id INTEGER NOT NULL,
        employee_id INTEGER NOT NULL,
        month INTEGER NOT NULL,
        year INTEGER NOT NULL,
        bill_amount INTEGER NOT NULL,
        remaining_after INTEGER NOT NULL,
        status TEXT DEFAULT 'BELUM BAYAR',
        paid_at DATETIME,
        FOREIGN KEY (loan_id) REFERENCES employee_loans(id) ON DELETE CASCADE,
        FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
      )
    `);
    // EMPLOYEES TABLE
    await db.run(`
      CREATE TABLE IF NOT EXISTS employees (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        gender TEXT,
        birth_date TEXT,
        religion TEXT,
        phone TEXT,
        address TEXT,
        position TEXT NOT NULL,
        salary INTEGER NOT NULL,
        salary_type TEXT DEFAULT 'Bulanan',
        additional_variable TEXT,
        bpjs TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await db.run(`
      CREATE TABLE IF NOT EXISTS employee_attendance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        employee_id INTEGER NOT NULL,
        attendance_date TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('H', 'S', 'I', 'A', 'O', 'K')),
        notes TEXT,
        recorded_by TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(employee_id, attendance_date),
        FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
      )
    `);
    // Create rooms table first
    await db.run(`
      CREATE TABLE IF NOT EXISTS rooms (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        room_name TEXT NOT NULL UNIQUE,
        room_type TEXT NOT NULL CHECK (room_type IN ('private', 'shared', 'special')),
        capacity INTEGER NOT NULL DEFAULT 1,
        current_occupants INTEGER DEFAULT 0,
        notes TEXT,
        status TEXT DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'maintenance', 'reserved')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.run(`
      CREATE TABLE IF NOT EXISTS residents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        resident_id TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        age INTEGER NOT NULL,
        gender TEXT NOT NULL CHECK (gender IN ('male', 'female')),
        birth_date TEXT NOT NULL,
        birth_place TEXT,
        address TEXT,
        religion TEXT,
        join_date TEXT NOT NULL,
        condition TEXT CHECK (condition IN ('Sehat', 'Cukup Sehat', 'Kurang Sehat')),
        medical_history TEXT,
        allergies TEXT,
        smoking TEXT,
        alcohol TEXT,
        functional_walking TEXT,
        functional_eating TEXT,
        mental_emotion TEXT,
        mental_consciousness TEXT,
        photo_path TEXT,
        audio_path TEXT,
        status TEXT DEFAULT 'Aktif' CHECK (status IN ('Aktif', 'Perlu Perhatian', 'Keluar', 'Meninggal')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // GUARDIANS TABLE
    await db.run(`
      CREATE TABLE IF NOT EXISTS guardians (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        resident_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        id_number TEXT,
        email TEXT,
        phone TEXT NOT NULL,
        relationship TEXT,
        address TEXT,
        is_primary BOOLEAN DEFAULT 0,
        emergency_contact BOOLEAN DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (resident_id) REFERENCES residents(id) ON DELETE CASCADE
      )
    `);

    // HEALTH_RECORDS TABLE (For hematology, blood sugar, etc.)
    await db.run(`
      CREATE TABLE IF NOT EXISTS health_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        resident_id INTEGER NOT NULL,
        record_type TEXT NOT NULL CHECK (record_type IN ('hematology', 'blood_sugar', 'blood_pressure', 'general', 'initial')),
        hemoglobin TEXT,
        leukocyte TEXT,
        erythrocyte TEXT,
        blood_sugar_random TEXT,
        blood_sugar_fasting TEXT,
        blood_sugar_two_hour TEXT,
        systolic INTEGER,
        diastolic INTEGER,
        heart_rate INTEGER,
        temperature REAL,
        weight REAL,
        height REAL,
        bmi REAL,
        notes TEXT,
        recorded_date TEXT NOT NULL,
        recorded_by TEXT DEFAULT 'system',
        FOREIGN KEY (resident_id) REFERENCES residents(id) ON DELETE CASCADE
      )
    `);

    // MEDICATIONS TABLE
    await db.run(`
      CREATE TABLE IF NOT EXISTS medications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        resident_id INTEGER NOT NULL,
        medication_name TEXT NOT NULL,
        dosage TEXT,
        schedule TEXT,
        start_date TEXT,
        end_date TEXT,
        prescribing_doctor TEXT,
        pharmacy TEXT,
        notes TEXT,
        status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Completed', 'Stopped', 'Changed')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (resident_id) REFERENCES residents(id) ON DELETE CASCADE
      )
    `);

    // ACTIVITY_TYPES TABLE
    await db.run(`
      CREATE TABLE IF NOT EXISTS activity_types (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        category TEXT CHECK (category IN ('routine', 'medical', 'visit', 'special')),
        color_code TEXT DEFAULT '#6c757d',
        icon TEXT DEFAULT 'fa-calendar'
      )
    `);

    // DAILY_RECORDS TABLE
    await db.run(`
      CREATE TABLE IF NOT EXISTS daily_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        resident_id INTEGER NOT NULL,
        activity_type_id INTEGER NOT NULL,
        record_datetime TEXT NOT NULL,
        condition TEXT NOT NULL CHECK (condition IN ('Baik', 'Cukup Baik', 'Kurang Baik')),
        notes TEXT NOT NULL,
        recorded_by TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (resident_id) REFERENCES residents(id) ON DELETE CASCADE,
        FOREIGN KEY (activity_type_id) REFERENCES activity_types(id)
      )
    `);

    // DONATION_CATEGORIES TABLE
    await db.run(`
      CREATE TABLE IF NOT EXISTS donation_categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
        description TEXT
      )
    `);

    // TRANSACTIONS TABLE
    await db.run(`
      CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        transaction_id TEXT UNIQUE NOT NULL,
        category_id INTEGER NOT NULL,
        amount DECIMAL(15,2) NOT NULL,
        transaction_date TEXT NOT NULL,
        source TEXT,
        description TEXT,
        payment_method TEXT CHECK (payment_method IN ('cash', 'transfer', 'check', 'other')),
        reference_number TEXT,
        recorded_by TEXT,
        notes TEXT,
        attachment_path TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES donation_categories(id)
      )
    `);

    // USERS TABLE
    await db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        full_name TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('admin', 'staff', 'doctor', 'nurse')),
        email TEXT,
        phone TEXT,
        is_active BOOLEAN DEFAULT 1,
        last_login TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // VISITORS_LOG TABLE
    await db.run(`
      CREATE TABLE IF NOT EXISTS visitors_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        resident_id INTEGER NOT NULL,
        visitor_name TEXT NOT NULL,
        relationship TEXT,
        phone TEXT,
        visit_date TEXT NOT NULL,
        visit_time TEXT,
        purpose TEXT,
        notes TEXT,
        recorded_by TEXT,
        FOREIGN KEY (resident_id) REFERENCES residents(id) ON DELETE CASCADE
      )
    `);

    await db.run(`
      CREATE TABLE IF NOT EXISTS rooms (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        room_name TEXT NOT NULL UNIQUE,
        room_type TEXT NOT NULL CHECK (room_type IN ('private', 'shared', 'special')),
        capacity INTEGER NOT NULL DEFAULT 1,
        current_occupants INTEGER DEFAULT 0,
        notes TEXT,
        status TEXT DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'maintenance', 'reserved')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add room_id column to residents table
    try {
      await db.run(`
        ALTER TABLE residents ADD COLUMN room_id INTEGER REFERENCES rooms(id)
      `);
      console.log('✅ Added room_id column to residents table');
    } catch (alterError) {
      if (alterError.message.includes('duplicate column name')) {
        console.log('✅ room_id column already exists in residents table');
      } else {
        throw alterError; // Re-throw if it's a different error
      }
    }

    // Create indexes for better performance
    await db.run('CREATE INDEX IF NOT EXISTS idx_residents_name ON residents(name)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_residents_status ON residents(status)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_health_records_resident ON health_records(resident_id)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_health_records_type ON health_records(record_type)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_medications_resident ON medications(resident_id)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_guardians_resident ON guardians(resident_id)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_daily_records_date ON daily_records(record_datetime)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date)');

    console.log('✅ Tables created with complete schema');
  } catch (error) {
    console.error('❌ Error creating tables:', error);
    throw error;
  }
}

async function insertDefaultData() {
  try {
    console.log('📥 Inserting default data...');

    // Insert default activity types
    const activityTypes = [
      ['Pemeriksaan Medis', 'medical', '#17a2b8', 'fa-stethoscope'],
      ['Kunjungan Keluarga', 'visit', '#28a745', 'fa-users'],
      ['Kegiatan Khusus', 'special', '#ffc107', 'fa-star'],
      ['Makan', 'routine', '#fd7e14', 'fa-utensils'],
      ['Istirahat', 'routine', '#6f42c1', 'fa-bed'],
      ['Fisioterapi', 'medical', '#20c997', 'fa-hands-helping'],
      ['Konseling', 'medical', '#e83e8c', 'fa-comments'],
      ['Kecelakaan', 'emergency', '#e83e8c', 'fa-comments']
    ];

    for (const [name, category, color_code, icon] of activityTypes) {
      await db.run(
        'INSERT OR IGNORE INTO activity_types (name, category, color_code, icon) VALUES (?, ?, ?, ?)',
        [name, category, color_code, icon]
      );
    }
    console.log('✅ Activity types inserted');

    // Insert default donation categories
    const donationCategories = [
      ['Uang', 'income', 'Donasi dalam bentuk uang'],
      ['Sembako', 'income', 'Donasi dalam bentuk sembako'],
      ['Makanan', 'income', 'Donasi dalam bentuk makanan'],
      ['Minuman', 'income', 'Donasi dalam bentuk minuman'],
      ['Obat-obatan', 'income', 'Donasi dalam bentuk obat-obatan'],
      ['Peralatan', 'income', 'Donasi dalam bentuk peralatan'],
      ['Lainnya', 'income', 'Kategori donasi lainnya']
    ];

    // Clear and insert new categories
    await db.run('DELETE FROM donation_categories');

    for (const [name, type, description] of donationCategories) {
      await db.run(
        'INSERT INTO donation_categories (name, type, description) VALUES (?, ?, ?)',
        [name, type, description]
      );
    }
    console.log('✅ Donation categories inserted');

    // Insert default rooms
    const defaultRooms = [
      ['Merpati', 'private', 1, 'Kamar dengan AC dan kamar mandi dalam'],
      ['Kakatua', 'private', 1, 'Kamar dengan jendela besar dan taman view'],
      ['Elang', 'private', 1, 'Kamar untuk lansia dengan kebutuhan khusus'],
      ['Kenari', 'shared', 2, 'Kamar bersama dengan 2 tempat tidur'],
      ['Cendrawasih', 'shared', 2, 'Kamar bersama dengan fasilitas lengkap'],
      ['Jalak', 'private', 1, 'Kamar standar dengan ventilasi baik'],
      ['Kutilang', 'private', 1, 'Kamar nyaman dengan akses mudah'],
      ['Murai', 'special', 1, 'Kamar untuk perawatan intensif'],
      ['Pipit', 'shared', 2, 'Kamar ekonomi untuk 2 orang'],
      ['Perkutut', 'private', 1, 'Kamar dengan akses ke teras']
    ];

    await db.run('DELETE FROM rooms');

    for (const [room_name, room_type, capacity, notes] of defaultRooms) {
      await db.run(
        'INSERT INTO rooms (room_name, room_type, capacity, notes) VALUES (?, ?, ?, ?)',
        [room_name, room_type, capacity, notes || '']
      );
    }
    console.log('✅ Default rooms inserted');

    // ALWAYS CREATE ADMIN USER (even if exists, update password)
    console.log('👑 Creating/Updating admin user...');
    const hashedPassword = await bcrypt.hash('admin123', 10);

    // Check if admin exists
    const adminExists = await db.get('SELECT id FROM users WHERE username = ?', ['admin']);

    if (adminExists) {
      // Update existing admin password
      await db.run(
        'UPDATE users SET password_hash = ?, full_name = ?, role = ?, email = ?, is_active = 1 WHERE username = ?',
        [hashedPassword, 'Administrator Utama', 'admin', 'admin@pantiwk.com', 'admin']
      );
      console.log('✅ Admin user password updated');
    } else {
      // Create new admin
      await db.run(
        'INSERT INTO users (username, password_hash, full_name, role, email) VALUES (?, ?, ?, ?, ?)',
        ['admin', hashedPassword, 'Administrator Utama', 'admin', 'admin@pantiwk.com']
      );
      console.log('✅ Admin user created');
    }

    // ALWAYS CREATE STAFF USER
    console.log('👥 Creating/Updating staff user...');
    const staffHashedPassword = await bcrypt.hash('staff123', 10);

    const staffExists = await db.get('SELECT id FROM users WHERE username = ?', ['staff']);

    if (staffExists) {
      // Update existing staff password
      await db.run(
        'UPDATE users SET password_hash = ?, full_name = ?, role = ?, email = ?, is_active = 1 WHERE username = ?',
        [staffHashedPassword, 'Staff Demo', 'staff', 'staff@pantiwk.com', 'staff']
      );
      console.log('✅ Staff user password updated');
    } else {
      // Create new staff
      await db.run(
        'INSERT INTO users (username, password_hash, full_name, role, email) VALUES (?, ?, ?, ?, ?)',
        ['staff', staffHashedPassword, 'Staff Demo', 'staff', 'staff@pantiwk.com']
      );
      console.log('✅ Staff user created');
    }

    console.log('🎉 Default data insertion completed!');
    console.log('🔑 Login credentials:');
    console.log('   👑 Admin: admin / admin123');
    console.log('   👥 Staff: staff / staff123');

  } catch (error) {
    console.error('❌ Error inserting default data:', error);
    throw error; // Re-throw to handle in initializeDatabase
  }
}

async function checkDatabaseStructure() {
  try {
    console.log('🔍 Checking database structure...');

    // Check if tables exist
    const tables = await db.all("SELECT name FROM sqlite_master WHERE type='table'");
    console.log('📊 Database tables:', tables.map(t => t.name).join(', '));

    // Check specific tables
    const requiredTables = ['residents', 'activity_types', 'daily_records', 'guardians'];
    for (const table of requiredTables) {
      const exists = tables.some(t => t.name === table);
      console.log(`${table}: ${exists ? '✅' : '❌'}`);
    }

    // Check activity_types data
    const activityTypesCount = await db.get('SELECT COUNT(*) as count FROM activity_types');
    console.log(`Activity types count: ${activityTypesCount.count}`);

  } catch (error) {
    console.error('Error checking database structure:', error);
  }
}

// ================== RESIDENTS API ==================
// GET single resident by ID
app.get('/api/residents/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🔍 GET /api/residents/${id} - Fetching resident data`);

    // Get resident basic info
    const resident = await db.get(`
      SELECT r.*, 
            rm.room_name,
            rm.room_type,
            rm.capacity as room_capacity,
            rm.notes as room_notes
      FROM residents r
      LEFT JOIN rooms rm ON r.room_id = rm.id
      WHERE r.id = ?
    `, [id]);
    console.log('📄 Resident query result:', resident ? 'Found' : 'Not found');

    if (!resident) {
      console.log(`❌ Resident with id ${id} not found in database`);
      return res.status(404).json({
        error: 'Resident not found',
        message: `No resident found with ID: ${id}`
      });
    }

    console.log(`✅ Found resident: ${resident.name} (ID: ${resident.id})`);

    // Get guardians
    let guardians = [];
    try {
      guardians = await db.all('SELECT * FROM guardians WHERE resident_id = ? ORDER BY is_primary DESC', [id]);
      console.log(`👥 Found ${guardians.length} guardians for resident ${id}:`, guardians);
    } catch (guardianError) {
      console.warn('⚠️ Could not fetch guardians:', guardianError.message);
      // Continue without guardians
    }

    // Get medications
    let medications = [];
    try {
      medications = await db.all('SELECT * FROM medications WHERE resident_id = ?', [id]);
      console.log(`💊 Found ${medications.length} medications for resident ${id}`);
    } catch (medicationError) {
      console.warn('⚠️ Could not fetch medications:', medicationError.message);
    }

    // Get hematology data (latest)
    let hematology = null;
    try {
      hematology = await db.get(
        `SELECT * FROM health_records 
         WHERE resident_id = ? AND record_type = 'hematology'
         ORDER BY recorded_date DESC LIMIT 1`,
        [id]
      );
      console.log('🩸 Hematology data:', hematology ? 'Found' : 'Not found');
    } catch (hematologyError) {
      console.warn('⚠️ Could not fetch hematology:', hematologyError.message);
    }

    // Get blood sugar data (latest)
    let bloodSugar = null;
    try {
      bloodSugar = await db.get(
        `SELECT * FROM health_records 
         WHERE resident_id = ? AND record_type = 'blood_sugar'
         ORDER BY recorded_date DESC LIMIT 1`,
        [id]
      );
      console.log('🩺 Blood sugar data:', bloodSugar ? 'Found' : 'Not found');
    } catch (bloodSugarError) {
      console.warn('⚠️ Could not fetch blood sugar:', bloodSugarError.message);
    }

    // Get recent daily records (last 10)
    let recentRecords = [];
    try {
      recentRecords = await db.all(`
        SELECT dr.*, at.name as activity_name, at.icon as activity_icon, at.color_code as activity_color
        FROM daily_records dr
        JOIN activity_types at ON dr.activity_type_id = at.id
        WHERE dr.resident_id = ?
        ORDER BY dr.record_datetime DESC
        LIMIT 10
      `, [id]);
      console.log(`📋 Found ${recentRecords.length} recent records`);
    } catch (recordsError) {
      console.warn('⚠️ Could not fetch recent records:', recordsError.message);
    }

    // Format the response
    const response = {
      // Basic info
      id: resident.id,
      resident_id: resident.resident_id,
      name: resident.name,
      age: resident.age,
      gender: resident.gender,
      birthDate: resident.birth_date,
      birth_place: resident.birth_place,
      address: resident.address,
      religion: resident.religion,
      joinDate: resident.join_date,
      condition: resident.condition,
      status: resident.status || 'Aktif',
      medicalHistory: resident.medical_history,
      allergies: resident.allergies,
      smoking: resident.smoking,
      alcohol: resident.alcohol,
      functional_walking: resident.functional_walking,
      functional_eating: resident.functional_eating,
      mental_emotion: resident.mental_emotion,
      mental_consciousness: resident.mental_consciousness,
      photo_path: resident.photo_path,
      audio_path: resident.audio_path,

      // Room information - ADD THIS SECTION
      room_id: resident.room_id,
      room_name: resident.room_name,
      room_type: resident.room_type,
      room_capacity: resident.room_capacity,
      room_notes: resident.room_notes,

      // Arrays
      guardians: guardians,
      medications: medications,
      recent_records: recentRecords,

      // Nested objects for frontend
      medication: medications.length > 0 ? {
        status: 'Ya',
        type: medications[0].medication_name,
        dosage: medications[0].dosage,
        schedule: medications[0].schedule
      } : { status: 'Tidak' },

      hematology: hematology ? {
        hemoglobin: hematology.hemoglobin,
        leukocyte: hematology.leukocyte,
        erythrocyte: hematology.erythrocyte
      } : null,

      bloodSugar: bloodSugar ? {
        random: bloodSugar.blood_sugar_random,
        fasting: bloodSugar.blood_sugar_fasting,
        twoHour: bloodSugar.blood_sugar_two_hour
      } : null,

      functional: {
        walking: resident.functional_walking || 'Mandiri',
        eating: resident.functional_eating || 'Mandiri'
      },

      mental: {
        emotion: resident.mental_emotion || 'Stabil',
        consciousness: resident.mental_consciousness || 'Compos Mentis'
      },

      guardian: guardians.length > 0 ? {
        name: guardians[0].name,
        idNumber: guardians[0].id_number,
        email: guardians[0].email,
        phone: guardians[0].phone,
        relationship: guardians[0].relationship
      } : null
    };

    console.log(`✅ Successfully prepared response for resident: ${resident.name}`);
    res.json(response);

  } catch (error) {
    console.error('❌ ERROR in GET /api/residents/:id:', error);
    console.error('Error stack:', error.stack);

    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      code: error.code,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }
});


app.get('/api/rooms', async (req, res) => {
  try {
    const rooms = await db.all(`
      SELECT 
        r.*,
        COUNT(res.id) as current_occupants,
        r.capacity - COUNT(res.id) as available_beds,
        CASE 
          WHEN COUNT(res.id) = 0 THEN 'empty'
          WHEN COUNT(res.id) < r.capacity THEN 'partially_occupied'
          ELSE 'full'
        END as occupancy_status
      FROM rooms r
      LEFT JOIN residents res ON r.id = res.room_id AND res.status = 'Aktif'
      GROUP BY r.id
      ORDER BY r.room_name
    `);

    res.json(rooms);
  } catch (error) {
    console.error('Error fetching rooms:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET available rooms (for assignment)
app.get('/api/rooms/available', async (req, res) => {
  try {
    const availableRooms = await db.all(`
      SELECT r.*, 
             COUNT(res.id) as current_occupants
      FROM rooms r
      LEFT JOIN residents res ON r.id = res.room_id
      GROUP BY r.id
      HAVING current_occupants < r.capacity
      ORDER BY r.room_name
    `);

    res.json(availableRooms.map(room => ({
      ...room,
      available_beds: room.capacity - room.current_occupants
    })));
  } catch (error) {
    console.error('Error fetching available rooms:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST create new room
app.post('/api/rooms', async (req, res) => {
  try {
    const { room_name, room_type, capacity, notes } = req.body;

    const result = await db.run(`
      INSERT INTO rooms (room_name, room_type, capacity, notes)
      VALUES (?, ?, ?, ?)
    `, [room_name, room_type, capacity, notes || '']);

    res.status(201).json({
      id: result.lastID,
      message: 'Room created successfully'
    });
  } catch (error) {
    console.error('Error creating room:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT update room
app.put('/api/rooms/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { room_name, room_type, capacity, notes, status } = req.body;

    // Get current room with current occupants
    const room = await db.get(`
      SELECT r.*, 
             COUNT(res.id) as current_occupants
      FROM rooms r
      LEFT JOIN residents res ON r.id = res.room_id
      WHERE r.id = ?
      GROUP BY r.id
    `, [id]);

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Validate new capacity
    if (capacity < room.current_occupants) {
      return res.status(400).json({
        error: `Cannot set capacity to ${capacity} because there are currently ${room.current_occupants} occupants.`
      });
    }

    // Update room
    const result = await db.run(`
      UPDATE rooms 
      SET room_name = ?, room_type = ?, capacity = ?, notes = ?, status = ?
      WHERE id = ?
    `, [room_name, room_type, capacity, notes || '', status || 'available', id]);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Room not found' });
    }

    res.json({
      success: true,
      message: 'Room updated successfully'
    });
  } catch (error) {
    console.error('Error updating room:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ================== ROOM MANAGEMENT API ==================

// GET all rooms
app.get('/api/rooms', async (req, res) => {
  try {
    const rooms = await db.all(`
      SELECT r.*, 
             COUNT(res.id) as current_occupants,
             GROUP_CONCAT(res.name, ', ') as resident_names
      FROM rooms r
      LEFT JOIN residents res ON r.id = res.room_id
      GROUP BY r.id
      ORDER BY r.room_name
    `);

    // Calculate availability
    const roomsWithAvailability = rooms.map(room => ({
      ...room,
      is_available: room.current_occupants < room.capacity,
      available_beds: room.capacity - room.current_occupants
    }));

    res.json(roomsWithAvailability);
  } catch (error) {
    console.error('Error fetching rooms:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET available rooms (for assignment)
app.get('/api/rooms/available', async (req, res) => {
  try {
    // Get all rooms with their current occupants
    const rooms = await db.all(`
      SELECT r.*, 
             COUNT(res.id) as current_occupants
      FROM rooms r
      LEFT JOIN residents res ON r.id = res.room_id AND res.status = 'Aktif'
      GROUP BY r.id
      ORDER BY r.room_name
    `);

    // Filter rooms that are available AND have at least 1 bed available
    const availableRooms = rooms.filter(room => {
      const availableBeds = room.capacity - (room.current_occupants || 0);
      return room.status === 'available' && availableBeds > 0;
    });

    // Add available_beds calculation
    const roomsWithAvailability = availableRooms.map(room => ({
      ...room,
      available_beds: room.capacity - (room.current_occupants || 0)
    }));

    res.json(roomsWithAvailability);
  } catch (error) {
    console.error('Error fetching available rooms:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/rooms/all-detailed', async (req, res) => {
  try {
    const rooms = await db.all(`
      SELECT 
        r.*,
        COUNT(res.id) as current_occupants,
        GROUP_CONCAT(
          CASE 
            WHEN res.id IS NOT NULL 
            THEN '• ' || res.name || ' (' || res.resident_id || ')'
            ELSE NULL
          END, 
          '\n'
        ) as resident_names,
        r.capacity - COUNT(res.id) as available_beds,
        CASE 
          WHEN COUNT(res.id) = 0 THEN 'empty'
          WHEN COUNT(res.id) < r.capacity THEN 'partially_occupied'
          ELSE 'full'
        END as occupancy_status
      FROM rooms r
      LEFT JOIN residents res ON r.id = res.room_id AND res.status = 'Aktif'
      GROUP BY r.id
      ORDER BY r.room_name
    `);

    res.json(rooms);
  } catch (error) {
    console.error('Error fetching detailed rooms:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST create new room
app.post('/api/rooms', async (req, res) => {
  try {
    const { room_name, room_type, capacity, notes } = req.body;

    const result = await db.run(`
      INSERT INTO rooms (room_name, room_type, capacity, notes)
      VALUES (?, ?, ?, ?)
    `, [room_name, room_type, capacity, notes || '']);

    res.status(201).json({
      id: result.lastID,
      message: 'Room created successfully'
    });
  } catch (error) {
    console.error('Error creating room:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT update room
app.put('/api/rooms/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { room_name, room_type, capacity, notes, status } = req.body;

    const result = await db.run(`
      UPDATE rooms 
      SET room_name = ?, room_type = ?, capacity = ?, notes = ?, status = ?
      WHERE id = ?
    `, [room_name, room_type, capacity, notes || '', status || 'available', id]);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Room not found' });
    }

    res.json({ message: 'Room updated successfully' });
  } catch (error) {
    console.error('Error updating room:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE room
app.delete('/api/rooms/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if room has residents
    const residentsCount = await db.get(
      'SELECT COUNT(*) as count FROM residents WHERE room_id = ?',
      [id]
    );

    if (residentsCount.count > 0) {
      return res.status(400).json({
        error: 'Cannot delete room with assigned residents'
      });
    }

    const result = await db.run('DELETE FROM rooms WHERE id = ?', [id]);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Room not found' });
    }

    res.json({ message: 'Room deleted successfully' });
  } catch (error) {
    console.error('Error deleting room:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Assign room to resident
app.put('/api/residents/:id/assign-room', async (req, res) => {
  try {
    const { id } = req.params;
    const { room_id, previous_room_id } = req.body;

    // Start transaction
    await db.run('BEGIN TRANSACTION');

    try {
      // If moving from previous room, decrement its occupant count
      if (previous_room_id) {
        await db.run(`
          UPDATE rooms 
          SET current_occupants = current_occupants - 1 
          WHERE id = ?
        `, [previous_room_id]);
      }

      // Update resident's room
      await db.run('UPDATE residents SET room_id = ? WHERE id = ?', [room_id || null, id]);

      // If assigning to new room, increment its occupant count
      if (room_id) {
        await db.run(`
          UPDATE rooms 
          SET current_occupants = current_occupants + 1 
          WHERE id = ?
        `, [room_id]);
      }

      await db.run('COMMIT');

      res.json({
        message: room_id ? 'Room assigned successfully' : 'Room assignment removed successfully'
      });
    } catch (error) {
      await db.run('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Error assigning room:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get room occupancy report
app.get('/api/rooms/occupancy-report', async (req, res) => {
  try {
    const report = await db.all(`
      SELECT 
        r.room_name,
        r.room_type,
        r.capacity,
        COUNT(res.id) as current_occupants,
        r.capacity - COUNT(res.id) as available_beds,
        CASE 
          WHEN COUNT(res.id) = 0 THEN 'empty'
          WHEN COUNT(res.id) < r.capacity THEN 'partially_occupied'
          ELSE 'full'
        END as occupancy_status,
        GROUP_CONCAT(res.name, ', ') as resident_names
      FROM rooms r
      LEFT JOIN residents res ON r.id = res.room_id AND res.status = 'Aktif'
      GROUP BY r.id
      ORDER BY r.room_name
    `);

    res.json(report);
  } catch (error) {
    console.error('Error fetching occupancy report:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ================== DAILY RECORDS API ==================
// Get daily records with filters
app.get('/api/records', async (req, res) => {
  try {
    const { resident_id, date_from, date_to, activity_type_id } = req.query;

    console.log('GET /api/records - Query:', { resident_id, date_from, date_to, activity_type_id });

    let query = `
      SELECT 
        dr.*, 
        r.name as resident_name, 
        r.gender,
        CASE 
          WHEN r.gender = 'male' THEN 'Opa' 
          ELSE 'Oma' 
        END as resident_type,
        at.name as activity_name, 
        at.icon as activity_icon,
        at.color_code as activity_color
      FROM daily_records dr
      JOIN residents r ON dr.resident_id = r.id
      LEFT JOIN activity_types at ON dr.activity_type_id = at.id
      WHERE 1=1
    `;
    const params = [];

    if (resident_id) {
      query += ' AND dr.resident_id = ?';
      params.push(resident_id);
    }

    if (date_from) {
      query += ' AND DATE(dr.record_datetime) >= ?';
      params.push(date_from);
    }

    if (date_to) {
      query += ' AND DATE(dr.record_datetime) <= ?';
      params.push(date_to);
    }

    if (activity_type_id) {
      query += ' AND dr.activity_type_id = ?';
      params.push(activity_type_id);
    }

    query += ' ORDER BY dr.record_datetime DESC';

    console.log('SQL Query:', query);
    console.log('SQL Params:', params);

    const records = await db.all(query, params);
    console.log(`Found ${records.length} records`);

    res.json(records);
  } catch (error) {
    console.error('❌ Error fetching records:', error);
    console.error('Error details:', error.message);

    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      code: error.code
    });
  }
});

// Create new daily record
app.post('/api/records', async (req, res) => {
  try {
    let { resident_id, activity_type_id, record_datetime, condition, notes, recorded_by } = req.body;

    // Ensure record_datetime has seconds if not provided
    if (record_datetime && record_datetime.length === 16) { // YYYY-MM-DDTHH:MM format
      record_datetime += ':00'; // Add seconds
    }

    console.log('POST /api/records - Creating record:', {
      resident_id, activity_type_id, record_datetime, condition
    });

    const result = await db.run(`
      INSERT INTO daily_records 
      (resident_id, activity_type_id, record_datetime, condition, notes, recorded_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [resident_id, activity_type_id, record_datetime, condition, notes, recorded_by || 'System']);

    console.log('✅ Record created with ID:', result.lastID);

    res.status(201).json({
      id: result.lastID,
      message: 'Record created successfully'
    });
  } catch (error) {
    console.error('❌ Error creating record:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Get financial summary
app.get('/api/financial-summary', async (req, res) => {
  try {
    const { year } = req.query;
    const currentYear = year || new Date().getFullYear().toString();

    // Get totals
    const summary = await db.get(`
      SELECT 
        COALESCE(SUM(CASE WHEN dc.type = 'income' THEN t.amount ELSE 0 END), 0) as total_income,
        COALESCE(SUM(CASE WHEN dc.type = 'expense' THEN t.amount ELSE 0 END), 0) as total_expense,
        COALESCE(SUM(CASE WHEN dc.type = 'income' THEN t.amount ELSE -t.amount END), 0) as balance
      FROM transactions t
      JOIN donation_categories dc ON t.category_id = dc.id
      WHERE strftime('%Y', t.transaction_date) = ?
    `, [currentYear]);

    // Get monthly breakdown
    const monthly = await db.all(`
      SELECT 
        strftime('%Y-%m', t.transaction_date) as month,
        COALESCE(SUM(CASE WHEN dc.type = 'income' THEN t.amount ELSE 0 END), 0) as income,
        COALESCE(SUM(CASE WHEN dc.type = 'expense' THEN t.amount ELSE 0 END), 0) as expense
      FROM transactions t
      JOIN donation_categories dc ON t.category_id = dc.id
      WHERE strftime('%Y', t.transaction_date) = ?
      GROUP BY strftime('%Y-%m', t.transaction_date)
      ORDER BY month DESC
    `, [currentYear]);

    res.json({
      summary,
      monthly_breakdown: monthly,
      current_year: currentYear
    });
  } catch (error) {
    console.error('Error fetching financial summary:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ================== UTILITY ENDPOINTS ==================
// Get activity types
app.get('/api/activity-types', async (req, res) => {
  try {
    console.log('GET /api/activity-types - Fetching activity types');
    const activityTypes = await db.all('SELECT * FROM activity_types ORDER BY name');
    console.log(`Found ${activityTypes.length} activity types`);
    res.json(activityTypes);
  } catch (error) {
    console.error('Error fetching activity types:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Get donation categories
app.get('/api/donation-categories', async (req, res) => {
  try {
    const categories = await db.all('SELECT * FROM donation_categories ORDER BY name');
    res.json(categories);
  } catch (error) {
    console.error('Error fetching donation categories:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ================== USER MANAGEMENT API ==================

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

const attendanceStatuses = {
  H: 'Hadir',
  S: 'Sakit',
  I: 'Izin',
  A: 'Alpa',
  O: 'Off',
  K: 'Kebijakan',
};

function isValidMonth(month) {
  return /^\d{4}-\d{2}$/.test(month || '');
}

function isValidDateValue(dateValue) {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateValue || '');
}

function getDaysInMonth(month) {
  const [year, monthNumber] = month.split('-').map(Number);
  return new Date(year, monthNumber, 0).getDate();
}

function csvEscape(value) {
  const text = value === null || value === undefined ? '' : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

// Ambil absensi 1 bulan
app.get('/api/employee-attendance', async (req, res) => {
  try {
    const month = req.query.month || new Date().toISOString().slice(0, 7);

    if (!isValidMonth(month)) {
      return res.status(400).json({
        error: 'Format bulan harus YYYY-MM, contoh: 2026-01',
      });
    }

    const daysInMonth = getDaysInMonth(month);
    const startDate = `${month}-01`;
    const endDate = `${month}-${String(daysInMonth).padStart(2, '0')}`;

    const employees = await db.all(`
      SELECT id, name, gender, position, salary, salary_type
      FROM employees
      ORDER BY name ASC
    `);

    const rows = await db.all(
      `
      SELECT id, employee_id, attendance_date, status, notes
      FROM employee_attendance
      WHERE attendance_date BETWEEN ? AND ?
      ORDER BY attendance_date ASC
    `,
      [startDate, endDate]
    );

    const attendanceByEmployee = {};

    for (const row of rows) {
      const day = Number(row.attendance_date.split('-')[2]);

      if (!attendanceByEmployee[row.employee_id]) {
        attendanceByEmployee[row.employee_id] = {};
      }

      attendanceByEmployee[row.employee_id][day] = {
        id: row.id,
        status: row.status,
        notes: row.notes || '',
      };
    }

    const data = employees.map((employee) => {
      const attendance = attendanceByEmployee[employee.id] || {};

      const summary = Object.values(attendance).reduce(
        (acc, item) => {
          acc[item.status] = (acc[item.status] || 0) + 1;
          return acc;
        },
        { H: 0, S: 0, I: 0, A: 0, O: 0, K: 0 }
      );

      return {
        ...employee,
        attendance,
        summary,
        total_present: summary.H || 0,
        total_absent: summary.A || 0,
      };
    });

    res.json({
      month,
      daysInMonth,
      statuses: attendanceStatuses,
      employees: data,
    });
  } catch (error) {
    console.error('Error fetching employee attendance:', error);
    res.status(500).json({ error: 'Gagal mengambil data absensi karyawan' });
  }
});

// Simpan absensi 1 cell
app.post('/api/employee-attendance', async (req, res) => {
  try {
    const { employee_id, attendance_date, status, notes, recorded_by } = req.body;

    if (!employee_id || !isValidDateValue(attendance_date)) {
      return res.status(400).json({
        error: 'employee_id dan attendance_date wajib diisi',
      });
    }

    const employee = await db.get('SELECT id FROM employees WHERE id = ?', [
      employee_id,
    ]);

    if (!employee) {
      return res.status(404).json({ error: 'Karyawan tidak ditemukan' });
    }

    if (!status) {
      await db.run(
        'DELETE FROM employee_attendance WHERE employee_id = ? AND attendance_date = ?',
        [employee_id, attendance_date]
      );

      return res.json({
        success: true,
        message: 'Absensi berhasil dikosongkan',
      });
    }

    if (!attendanceStatuses[status]) {
      return res.status(400).json({
        error: 'Status absensi tidak valid. Gunakan H, S, I, A, O, atau K',
      });
    }

    const result = await db.run(
      `
      INSERT INTO employee_attendance 
      (employee_id, attendance_date, status, notes, recorded_by)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(employee_id, attendance_date) DO UPDATE SET
        status = excluded.status,
        notes = excluded.notes,
        recorded_by = excluded.recorded_by,
        updated_at = CURRENT_TIMESTAMP
    `,
      [employee_id, attendance_date, status, notes || '', recorded_by || 'admin']
    );

    const saved = await db.get(
      `
      SELECT *
      FROM employee_attendance
      WHERE employee_id = ? AND attendance_date = ?
    `,
      [employee_id, attendance_date]
    );

    res.json({
      success: true,
      message: 'Absensi berhasil disimpan',
      data: saved,
      id: result.lastID,
    });
  } catch (error) {
    console.error('Error saving employee attendance:', error);
    res.status(500).json({ error: 'Gagal menyimpan absensi karyawan' });
  }
});

// Tandai semua karyawan hadir pada tanggal tertentu
app.post('/api/employee-attendance/mark-all', async (req, res) => {
  try {
    const { attendance_date, status = 'H', recorded_by } = req.body;

    if (!isValidDateValue(attendance_date)) {
      return res.status(400).json({
        error: 'attendance_date wajib format YYYY-MM-DD',
      });
    }

    if (!attendanceStatuses[status]) {
      return res.status(400).json({
        error: 'Status absensi tidak valid. Gunakan H, S, I, A, O, atau K',
      });
    }

    const employees = await db.all('SELECT id FROM employees');

    for (const employee of employees) {
      await db.run(
        `
        INSERT INTO employee_attendance 
        (employee_id, attendance_date, status, notes, recorded_by)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(employee_id, attendance_date) DO UPDATE SET
          status = excluded.status,
          notes = excluded.notes,
          recorded_by = excluded.recorded_by,
          updated_at = CURRENT_TIMESTAMP
      `,
        [employee.id, attendance_date, status, '', recorded_by || 'admin']
      );
    }

    res.json({
      success: true,
      message: `Berhasil menandai ${employees.length} karyawan`,
      total: employees.length,
    });
  } catch (error) {
    console.error('Error marking all employee attendance:', error);
    res.status(500).json({
      error: 'Gagal menandai semua absensi karyawan',
    });
  }
});

// Export absensi ke CSV, bisa dibuka Excel
app.get('/api/employee-attendance/export', async (req, res) => {
  try {
    const month = req.query.month || new Date().toISOString().slice(0, 7);

    if (!isValidMonth(month)) {
      return res.status(400).json({
        error: 'Format bulan harus YYYY-MM, contoh: 2026-01',
      });
    }

    const daysInMonth = getDaysInMonth(month);
    const startDate = `${month}-01`;
    const endDate = `${month}-${String(daysInMonth).padStart(2, '0')}`;

    const employees = await db.all(`
      SELECT id, name, position
      FROM employees
      ORDER BY name ASC
    `);

    const rows = await db.all(
      `
      SELECT employee_id, attendance_date, status
      FROM employee_attendance
      WHERE attendance_date BETWEEN ? AND ?
    `,
      [startDate, endDate]
    );

    const attendanceByEmployee = {};

    for (const row of rows) {
      const day = Number(row.attendance_date.split('-')[2]);

      if (!attendanceByEmployee[row.employee_id]) {
        attendanceByEmployee[row.employee_id] = {};
      }

      attendanceByEmployee[row.employee_id][day] = row.status;
    }

    const header = ['Nama', 'Posisi'];

    for (let day = 1; day <= daysInMonth; day++) {
      header.push(String(day));
    }

    header.push('Total Hadir', 'Total Alpa');

    const csvRows = [header.map(csvEscape).join(',')];

    for (const employee of employees) {
      const attendance = attendanceByEmployee[employee.id] || {};
      let totalHadir = 0;
      let totalAlpa = 0;

      const row = [employee.name, employee.position || '-'];

      for (let day = 1; day <= daysInMonth; day++) {
        const status = attendance[day] || '';

        if (status === 'H') totalHadir += 1;
        if (status === 'A') totalAlpa += 1;

        row.push(status);
      }

      row.push(totalHadir, totalAlpa);
      csvRows.push(row.map(csvEscape).join(','));
    }

    const csvContent = '\ufeff' + csvRows.join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="absensi-karyawan-${month}.csv"`
    );

    res.send(csvContent);
  } catch (error) {
    console.error('Error exporting employee attendance:', error);
    res.status(500).json({
      error: 'Gagal export absensi karyawan',
    });
  }
});
// Error handling yang lebih baik
app.use((err, req, res, next) => {
  console.error('Server Error:', err.stack);
  res.status(500).json({
    error: 'Something went wrong!',
    message: err.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// GET all users (admin only)
app.get('/api/users', async (req, res) => {
  try {
    const users = await db.all(`
      SELECT id, username, full_name, role, email, phone, is_active, 
             last_login, created_at 
      FROM users 
      ORDER BY role, username
    `);
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST create new user (admin only)
app.post('/api/users', async (req, res) => {
  try {
    const { username, password, full_name, role, email, phone } = req.body;

    // Check if username already exists
    const existingUser = await db.get(
      'SELECT id FROM users WHERE username = ?',
      [username]
    );

    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await db.run(`
      INSERT INTO users (username, password_hash, full_name, role, email, phone)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [username, hashedPassword, full_name, role, email, phone]);

    // Get created user without password
    const newUser = await db.get(`
      SELECT id, username, full_name, role, email, phone, is_active, created_at
      FROM users WHERE id = ?
    `, [result.lastID]);

    res.status(201).json({
      ...newUser,
      message: 'User created successfully'
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE user (admin only)
app.delete('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent deleting self
    if (id === '1') { // Assuming admin ID is 1
      return res.status(400).json({ error: 'Cannot delete main admin account' });
    }

    const result = await db.run('DELETE FROM users WHERE id = ?', [id]);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update login endpoint to use database users
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Get user from database
    const user = await db.get(
      'SELECT * FROM users WHERE username = ? AND is_active = 1',
      [username]
    );

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Compare password
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last login
    await db.run(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
      [user.id]
    );

    // Remove password from response
    const { password_hash, ...userWithoutPassword } = user;

    res.json({
      user: userWithoutPassword,
      token: 'demo-token-123', // In production, use JWT
      message: 'Login successful'
    });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/users/:id/password', async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    // Check if user exists
    const user = await db.get('SELECT id FROM users WHERE id = ?', [id]);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Validate new password
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update the password
    await db.run(
      'UPDATE users SET password_hash = ? WHERE id = ?',
      [hashedPassword, id]
    );

    res.json({
      success: true,
      message: 'Password updated successfully'
    });
  } catch (error) {
    console.error('Error updating password:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add these endpoints to server.js after the existing endpoints

// ================== MEDICATIONS API ==================

// GET all medications for a resident
app.get('/api/residents/:residentId/medications', async (req, res) => {
  try {
    const { residentId } = req.params;
    const medications = await db.all(
      'SELECT * FROM medications WHERE resident_id = ? ORDER BY created_at DESC',
      [residentId]
    );
    res.json(medications);
  } catch (error) {
    console.error('Error fetching medications:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST add new medication for a resident
app.post('/api/residents/:residentId/medications', async (req, res) => {
  try {
    const { residentId } = req.params;
    const {
      medication_name,
      dosage,
      schedule,
      status,
      start_date,
      prescribing_doctor,
      pharmacy,
      notes
    } = req.body;

    const result = await db.run(`
      INSERT INTO medications 
      (resident_id, medication_name, dosage, schedule, status, start_date, prescribing_doctor, pharmacy, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      residentId,
      medication_name,
      dosage || null,
      schedule || null,
      status || 'Active',
      start_date || new Date().toISOString().split('T')[0],
      prescribing_doctor || null,
      pharmacy || null,
      notes || null
    ]);

    // Get the newly created medication
    const newMedication = await db.get(
      'SELECT * FROM medications WHERE id = ?',
      [result.lastID]
    );

    res.status(201).json({
      success: true,
      message: 'Obat berhasil ditambahkan',
      medication: newMedication
    });
  } catch (error) {
    console.error('Error adding medication:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT update medication
app.put('/api/medications/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      medication_name,
      dosage,
      schedule,
      status,
      start_date,
      prescribing_doctor,
      pharmacy,
      notes
    } = req.body;

    const result = await db.run(`
      UPDATE medications 
      SET medication_name = ?, dosage = ?, schedule = ?, status = ?, 
          start_date = ?, prescribing_doctor = ?, pharmacy = ?, notes = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      medication_name,
      dosage || null,
      schedule || null,
      status || 'Active',
      start_date,
      prescribing_doctor || null,
      pharmacy || null,
      notes || null,
      id
    ]);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Data obat tidak ditemukan' });
    }

    // Get updated medication
    const updatedMedication = await db.get(
      'SELECT * FROM medications WHERE id = ?',
      [id]
    );

    res.json({
      success: true,
      message: 'Data obat berhasil diperbarui',
      medication: updatedMedication
    });
  } catch (error) {
    console.error('Error updating medication:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE medication
app.delete('/api/medications/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if medication exists
    const medication = await db.get('SELECT * FROM medications WHERE id = ?', [id]);
    if (!medication) {
      return res.status(404).json({ error: 'Data obat tidak ditemukan' });
    }

    const result = await db.run('DELETE FROM medications WHERE id = ?', [id]);

    res.json({
      success: true,
      message: 'Data obat berhasil dihapus'
    });
  } catch (error) {
    console.error('Error deleting medication:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ================== GUARDIANS API ==================

// GET all guardians for a resident
app.get('/api/residents/:residentId/guardians', async (req, res) => {
  try {
    const { residentId } = req.params;
    const guardians = await db.all(
      'SELECT * FROM guardians WHERE resident_id = ? ORDER BY is_primary DESC, created_at DESC',
      [residentId]
    );
    res.json(guardians);
  } catch (error) {
    console.error('Error fetching guardians:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST add new guardian for a resident
app.post('/api/residents/:residentId/guardians', async (req, res) => {
  try {
    const { residentId } = req.params;
    const {
      name,
      id_number,
      email,
      phone,
      relationship,
      address,
      is_primary
    } = req.body;

    // If setting as primary, unset other primaries
    if (is_primary) {
      await db.run(
        'UPDATE guardians SET is_primary = 0 WHERE resident_id = ?',
        [residentId]
      );
    }

    const result = await db.run(`
      INSERT INTO guardians 
      (resident_id, name, id_number, email, phone, relationship, address, is_primary)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      residentId,
      name,
      id_number || null,
      email || null,
      phone,
      relationship || null,
      address || null,
      is_primary ? 1 : 0
    ]);

    // Get the newly created guardian
    const newGuardian = await db.get(
      'SELECT * FROM guardians WHERE id = ?',
      [result.lastID]
    );

    res.status(201).json({
      success: true,
      message: 'Data wali berhasil ditambahkan',
      guardian: newGuardian
    });
  } catch (error) {
    console.error('Error adding guardian:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT update guardian
app.put('/api/guardians/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      id_number,
      email,
      phone,
      relationship,
      address,
      is_primary
    } = req.body;

    // Get current guardian to check resident_id
    const currentGuardian = await db.get(
      'SELECT resident_id FROM guardians WHERE id = ?',
      [id]
    );

    if (!currentGuardian) {
      return res.status(404).json({ error: 'Data wali tidak ditemukan' });
    }

    // If setting as primary, unset other primaries for this resident
    if (is_primary) {
      await db.run(
        'UPDATE guardians SET is_primary = 0 WHERE resident_id = ? AND id != ?',
        [currentGuardian.resident_id, id]
      );
    }

    const result = await db.run(`
      UPDATE guardians 
      SET name = ?, id_number = ?, email = ?, phone = ?, 
          relationship = ?, address = ?, is_primary = ?
      WHERE id = ?
    `, [
      name,
      id_number || null,
      email || null,
      phone,
      relationship || null,
      address || null,
      is_primary ? 1 : 0,
      id
    ]);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Data wali tidak ditemukan' });
    }

    // Get updated guardian
    const updatedGuardian = await db.get(
      'SELECT * FROM guardians WHERE id = ?',
      [id]
    );

    res.json({
      success: true,
      message: 'Data wali berhasil diperbarui',
      guardian: updatedGuardian
    });
  } catch (error) {
    console.error('Error updating guardian:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE guardian
app.delete('/api/guardians/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if guardian exists
    const guardian = await db.get('SELECT * FROM guardians WHERE id = ?', [id]);
    if (!guardian) {
      return res.status(404).json({ error: 'Data wali tidak ditemukan' });
    }

    // Check if it's the only guardian
    const guardianCount = await db.get(
      'SELECT COUNT(*) as count FROM guardians WHERE resident_id = ?',
      [guardian.resident_id]
    );

    if (guardianCount.count <= 1) {
      return res.status(400).json({
        error: 'Tidak dapat menghapus wali terakhir',
        message: 'Setiap penghuni harus memiliki minimal satu wali'
      });
    }

    const result = await db.run('DELETE FROM guardians WHERE id = ?', [id]);

    res.json({
      success: true,
      message: 'Data wali berhasil dihapus'
    });
  } catch (error) {
    console.error('Error deleting guardian:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ================= EMPLOYEES API =================

// GET ALL EMPLOYEES
app.get('/api/employees', async (req, res) => {
  try {
    const employees = await db.all(`
      SELECT *
      FROM employees
      ORDER BY id DESC
    `);

    res.json(employees);
  } catch (error) {
    console.error('Error fetching employees:', error);

    res.status(500).json({
      error: 'Gagal mengambil data karyawan'
    });
  }
});


// GET EMPLOYEE BY ID
app.get('/api/employees/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const employee = await db.get(`
      SELECT *
      FROM employees
      WHERE id = ?
    `, [id]);

    if (!employee) {
      return res.status(404).json({
        error: 'Data karyawan tidak ditemukan'
      });
    }

    res.json(employee);

  } catch (error) {
    console.error('Error fetching employee detail:', error);

    res.status(500).json({
      error: 'Gagal mengambil detail karyawan'
    });
  }
});


// CREATE EMPLOYEE
app.post('/api/employees', async (req, res) => {
  try {
    const {
      name,
      gender,
      birth_date,
      religion,
      phone,
      address,
      position,
      salary,
      salary_type,
      additional_variable,
      bpjs
    } = req.body;

    const result = await db.run(`
      INSERT INTO employees (
        name,
        gender,
        birth_date,
        religion,
        phone,
        address,
        position,
        salary,
        salary_type,
        additional_variable,
        bpjs
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      name,
      gender,
      birth_date,
      religion,
      phone,
      address,
      position,
      salary,
      salary_type,
      additional_variable,
      bpjs
    ]);

    res.status(201).json({
      success: true,
      message: 'Data karyawan berhasil ditambahkan',
      employee_id: result.lastID
    });
  } catch (error) {
    console.error('Error creating employee:', error);

    res.status(500).json({
      error: 'Gagal menambahkan data karyawan'
    });
  }
});

// UPDATE EMPLOYEE
app.put('/api/employees/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const {
      religion,
      phone,
      address,
      position,
      salary,
      salary_type,
      additional_variable,
      bpjs
    } = req.body;

    await db.run(`
      UPDATE employees
      SET
        religion = ?,
        phone = ?,
        address = ?,
        position = ?,
        salary = ?,
        salary_type = ?,
        additional_variable = ?,
        bpjs = ?
      WHERE id = ?
    `, [
      religion,
      phone,
      address,
      position,
      salary,
      salary_type,
      additional_variable,
      bpjs,
      id
    ]);

    res.json({
      success: true,
      message: 'Data karyawan berhasil diperbarui'
    });

  } catch (error) {
    console.error('Error updating employee:', error);

    res.status(500).json({
      error: 'Gagal memperbarui data karyawan'
    });
  }
});

// DELETE EMPLOYEE
app.delete('/api/employees/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await db.run(`
      DELETE FROM employees
      WHERE id = ?
    `, [id]);

    res.json({
      success: true,
      message: 'Data karyawan berhasil dihapus'
    });
  } catch (error) {
    console.error('Error deleting employee:', error);

    res.status(500).json({
      error: 'Gagal menghapus data karyawan'
    });
  }
});

// ================= EMPLOYEE PAYROLL API =================

const parseMoneyValue = (value) => {
  if (value === null || value === undefined || value === '' || value === '-') {
    return 0;
  }

  const numberValue = Number(value);

  if (Number.isNaN(numberValue)) {
    return 0;
  }

  return numberValue;
};

// GET PAYROLL SUMMARY BY MONTH
app.get('/api/employee-payrolls', async (req, res) => {
  try {
    const payrollMonth = req.query.month || new Date().toISOString().slice(0, 7);

    if (!/^\d{4}-\d{2}$/.test(payrollMonth)) {
      return res.status(400).json({
        error: 'Format bulan harus YYYY-MM, contoh: 2026-06'
      });
    }

    const [year, month] = payrollMonth.split('-').map(Number);

    const employees = await db.all(`
      SELECT *
      FROM employees
      ORDER BY name ASC
    `);

    const payrolls = [];

    for (const employee of employees) {
      const savedPayroll = await db.get(`
        SELECT *
        FROM employee_payrolls
        WHERE employee_id = ?
        AND payroll_month = ?
      `, [employee.id, payrollMonth]);

      const currentLoanInstallment = await db.get(`
        SELECT eli.*
        FROM employee_loan_installments eli
        JOIN employee_loans el ON eli.loan_id = el.id
        WHERE eli.employee_id = ?
        AND eli.month = ?
        AND eli.year = ?
        AND el.status = 'Aktif'
        LIMIT 1
      `, [employee.id, month, year]);

      const baseSalary = parseMoneyValue(employee.salary);
      const additionalVariable = parseMoneyValue(employee.additional_variable);
      const bpjsDeduction = parseMoneyValue(employee.bpjs);

      const loanDeduction =
        currentLoanInstallment && currentLoanInstallment.status !== 'SUDAH BAYAR'
          ? parseMoneyValue(currentLoanInstallment.bill_amount)
          : 0;

      const totalSalary =
        baseSalary + additionalVariable - bpjsDeduction - loanDeduction;

      payrolls.push({
        employee_id: employee.id,
        employee_name: employee.name,
        position: employee.position,
        salary_type: employee.salary_type,

        base_salary: savedPayroll ? savedPayroll.base_salary : baseSalary,
        additional_variable: savedPayroll ? savedPayroll.additional_variable : additionalVariable,
        bpjs_deduction: savedPayroll ? savedPayroll.bpjs_deduction : bpjsDeduction,
        loan_deduction: savedPayroll ? savedPayroll.loan_deduction : loanDeduction,
        total_salary: savedPayroll ? savedPayroll.total_salary : totalSalary,

        status: savedPayroll ? savedPayroll.status : 'Belum Dibayar',
        paid_at: savedPayroll ? savedPayroll.paid_at : null,

        loan_installment_id: currentLoanInstallment ? currentLoanInstallment.id : null,
        loan_installment_status: currentLoanInstallment ? currentLoanInstallment.status : null
      });
    }

    const summary = payrolls.reduce(
      (acc, item) => {
        acc.total_base_salary += item.base_salary;
        acc.total_additional_variable += item.additional_variable;
        acc.total_bpjs_deduction += item.bpjs_deduction;
        acc.total_loan_deduction += item.loan_deduction;
        acc.total_salary += item.total_salary;

        if (item.status === 'Sudah Dibayar') {
          acc.total_paid += 1;
        } else {
          acc.total_unpaid += 1;
        }

        return acc;
      },
      {
        total_base_salary: 0,
        total_additional_variable: 0,
        total_bpjs_deduction: 0,
        total_loan_deduction: 0,
        total_salary: 0,
        total_paid: 0,
        total_unpaid: 0
      }
    );

    res.json({
      payroll_month: payrollMonth,
      payrolls,
      summary
    });

  } catch (error) {
    console.error('Error fetching employee payrolls:', error);

    res.status(500).json({
      error: 'Gagal mengambil data rekap gaji karyawan'
    });
  }
});


// PAY ONE EMPLOYEE SALARY
app.post('/api/employee-payrolls/pay', async (req, res) => {
  try {
    const { employee_id, payroll_month } = req.body;

    if (!employee_id || !payroll_month) {
      return res.status(400).json({
        error: 'employee_id dan payroll_month wajib diisi'
      });
    }

    if (!/^\d{4}-\d{2}$/.test(payroll_month)) {
      return res.status(400).json({
        error: 'Format bulan harus YYYY-MM'
      });
    }

    const employee = await db.get(`
      SELECT *
      FROM employees
      WHERE id = ?
    `, [employee_id]);

    if (!employee) {
      return res.status(404).json({
        error: 'Karyawan tidak ditemukan'
      });
    }

    const existingPayroll = await db.get(`
      SELECT *
      FROM employee_payrolls
      WHERE employee_id = ?
      AND payroll_month = ?
    `, [employee_id, payroll_month]);

    if (existingPayroll && existingPayroll.status === 'Sudah Dibayar') {
      return res.status(400).json({
        error: 'Gaji karyawan bulan ini sudah dibayar'
      });
    }

    const [year, month] = payroll_month.split('-').map(Number);

    const currentLoanInstallment = await db.get(`
      SELECT eli.*
      FROM employee_loan_installments eli
      JOIN employee_loans el ON eli.loan_id = el.id
      WHERE eli.employee_id = ?
      AND eli.month = ?
      AND eli.year = ?
      AND el.status = 'Aktif'
      LIMIT 1
    `, [employee_id, month, year]);

    const baseSalary = parseMoneyValue(employee.salary);
    const additionalVariable = parseMoneyValue(employee.additional_variable);
    const bpjsDeduction = parseMoneyValue(employee.bpjs);

    const loanDeduction =
      currentLoanInstallment && currentLoanInstallment.status !== 'SUDAH BAYAR'
        ? parseMoneyValue(currentLoanInstallment.bill_amount)
        : 0;

    const totalSalary =
      baseSalary + additionalVariable - bpjsDeduction - loanDeduction;

    await db.run('BEGIN TRANSACTION');

    try {
      await db.run(`
        INSERT INTO employee_payrolls (
          employee_id,
          payroll_month,
          base_salary,
          additional_variable,
          bpjs_deduction,
          loan_deduction,
          total_salary,
          status,
          paid_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, 'Sudah Dibayar', CURRENT_TIMESTAMP)
        ON CONFLICT(employee_id, payroll_month) DO UPDATE SET
          base_salary = excluded.base_salary,
          additional_variable = excluded.additional_variable,
          bpjs_deduction = excluded.bpjs_deduction,
          loan_deduction = excluded.loan_deduction,
          total_salary = excluded.total_salary,
          status = 'Sudah Dibayar',
          paid_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      `, [
        employee_id,
        payroll_month,
        baseSalary,
        additionalVariable,
        bpjsDeduction,
        loanDeduction,
        totalSalary
      ]);

      if (currentLoanInstallment && currentLoanInstallment.status !== 'SUDAH BAYAR') {
        await db.run(`
          UPDATE employee_loan_installments
          SET status = 'SUDAH BAYAR',
              paid_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [currentLoanInstallment.id]);

        const unpaidInstallments = await db.all(`
          SELECT *
          FROM employee_loan_installments
          WHERE loan_id = ?
          AND status != 'SUDAH BAYAR'
        `, [currentLoanInstallment.loan_id]);

        const newRemaining = unpaidInstallments.reduce((total, item) => {
          return total + item.bill_amount;
        }, 0);

        await db.run(`
          UPDATE employee_loans
          SET remaining_amount = ?,
              status = ?
          WHERE id = ?
        `, [
          newRemaining,
          newRemaining <= 0 ? 'Lunas' : 'Aktif',
          currentLoanInstallment.loan_id
        ]);
      }

      await db.run('COMMIT');

      res.json({
        success: true,
        message: 'Gaji karyawan berhasil dibayar',
        total_salary: totalSalary
      });

    } catch (error) {
      await db.run('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('Error paying employee salary:', error);

    res.status(500).json({
      error: 'Gagal membayar gaji karyawan'
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server Error:', err.stack);
  res.status(500).json({
    error: 'Something went wrong!',
    message: err.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// EMPLOYEE LOANS API

// GET EMPLOYEE LOAN DETAIL
app.get('/api/employees/:id/loans', async (req, res) => {
  try {
    const { id } = req.params;
    const year = req.query.year || new Date().getFullYear();

    const activeLoan = await db.get(`
      SELECT *
      FROM employee_loans
      WHERE employee_id = ?
      AND status = 'Aktif'
      ORDER BY created_at DESC
      LIMIT 1
    `, [id]);

    if (!activeLoan) {
      return res.json({
        activeLoan: null,
        installments: [],
        summary: {
          total_amount: 0,
          remaining_amount: 0,
          monthly_installment: 0,
          target_month: null,
          target_year: null
        }
      });
    }

    const installments = await db.all(`
      SELECT *
      FROM employee_loan_installments
      WHERE loan_id = ?
      AND year = ?
      ORDER BY year ASC, month ASC
    `, [activeLoan.id, year]);

    res.json({
      activeLoan,
      installments,
      summary: {
        total_amount: activeLoan.total_amount,
        remaining_amount: activeLoan.remaining_amount,
        monthly_installment: activeLoan.monthly_installment,
        target_month: activeLoan.target_month,
        target_year: activeLoan.target_year
      }
    });

  } catch (error) {
    console.error('Error fetching employee loan:', error);

    res.status(500).json({
      error: 'Gagal mengambil data pinjaman karyawan'
    });
  }
});


// CREATE EMPLOYEE LOAN
app.post('/api/employees/:id/loans', async (req, res) => {
  try {
    const { id } = req.params;
    const { total_amount, monthly_installment } = req.body;

    if (!total_amount || !monthly_installment) {
      return res.status(400).json({
        error: 'Jumlah pinjaman dan cicilan per bulan wajib diisi'
      });
    }

    if (Number(total_amount) <= 0 || Number(monthly_installment) <= 0) {
      return res.status(400).json({
        error: 'Jumlah pinjaman dan cicilan harus lebih dari 0'
      });
    }

    const existingLoan = await db.get(`
      SELECT *
      FROM employee_loans
      WHERE employee_id = ?
      AND status = 'Aktif'
    `, [id]);

    if (existingLoan) {
      return res.status(400).json({
        error: 'Karyawan ini masih memiliki pinjaman aktif'
      });
    }

    const now = new Date();

    let startMonth = now.getMonth() + 1;
    let startYear = now.getFullYear();

    const totalAmount = Number(total_amount);
    const monthlyInstallment = Number(monthly_installment);

    let remaining = totalAmount;
    let month = startMonth;
    let year = startYear;
    let targetMonth = startMonth;
    let targetYear = startYear;

    const loanResult = await db.run(`
      INSERT INTO employee_loans (
        employee_id,
        total_amount,
        monthly_installment,
        remaining_amount,
        start_month,
        start_year,
        target_month,
        target_year,
        status
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      totalAmount,
      monthlyInstallment,
      totalAmount,
      startMonth,
      startYear,
      startMonth,
      startYear,
      'Aktif'
    ]);

    const loanId = loanResult.lastID;

    while (remaining > 0) {
      const billAmount = remaining >= monthlyInstallment
        ? monthlyInstallment
        : remaining;

      remaining -= billAmount;

      await db.run(`
        INSERT INTO employee_loan_installments (
          loan_id,
          employee_id,
          month,
          year,
          bill_amount,
          remaining_after,
          status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        loanId,
        id,
        month,
        year,
        billAmount,
        remaining,
        'BELUM BAYAR'
      ]);

      targetMonth = month;
      targetYear = year;

      month++;

      if (month > 12) {
        month = 1;
        year++;
      }
    }

    await db.run(`
      UPDATE employee_loans
      SET target_month = ?, target_year = ?
      WHERE id = ?
    `, [targetMonth, targetYear, loanId]);

    res.json({
      success: true,
      message: 'Pinjaman berhasil ditambahkan',
      loan_id: loanId
    });

  } catch (error) {
    console.error('Error creating employee loan:', error);

    res.status(500).json({
      error: 'Gagal menambahkan pinjaman karyawan'
    });
  }
});


// UPDATE INSTALLMENT STATUS
app.put('/api/employee-loan-installments/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const installment = await db.get(`
      SELECT *
      FROM employee_loan_installments
      WHERE id = ?
    `, [id]);

    if (!installment) {
      return res.status(404).json({
        error: 'Data cicilan tidak ditemukan'
      });
    }

    await db.run(`
      UPDATE employee_loan_installments
      SET status = ?,
          paid_at = CASE WHEN ? = 'SUDAH BAYAR' THEN CURRENT_TIMESTAMP ELSE NULL END
      WHERE id = ?
    `, [status, status, id]);

    const unpaidInstallments = await db.all(`
      SELECT *
      FROM employee_loan_installments
      WHERE loan_id = ?
      AND status != 'SUDAH BAYAR'
      ORDER BY year ASC, month ASC
    `, [installment.loan_id]);

    const newRemaining = unpaidInstallments.reduce((total, item) => {
      return total + item.bill_amount;
    }, 0);

    await db.run(`
      UPDATE employee_loans
      SET remaining_amount = ?,
          status = ?
      WHERE id = ?
    `, [
      newRemaining,
      newRemaining <= 0 ? 'Lunas' : 'Aktif',
      installment.loan_id
    ]);

    res.json({
      success: true,
      message: 'Status cicilan berhasil diperbarui'
    });

  } catch (error) {
    console.error('Error updating installment status:', error);

    res.status(500).json({
      error: 'Gagal memperbarui status cicilan'
    });
  }
});

// Initialize database and start server
async function startServer() {
  try {
    await initializeDatabase();
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`📁 Database: nursing_home.db`);
      console.log(`📊 API endpoints available at http://localhost:${PORT}/api/`);
      console.log(`🔑 Default login: admin / admin123`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down server...');
  if (db) {
    await db.close();
    console.log('✅ Database connection closed');
  }
  process.exit(0);
});

startServer();