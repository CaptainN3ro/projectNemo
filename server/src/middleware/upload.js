const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads');
const PLUGINS_DIR = process.env.PLUGINS_DIR || path.join(__dirname, '../../plugins');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

const imageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(UPLOAD_DIR, 'images');
    ensureDir(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  }
});

const pdfStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(UPLOAD_DIR, 'bloodwork');
    ensureDir(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `${uuidv4()}.pdf`);
  }
});

const zipStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(UPLOAD_DIR, 'tmp');
    ensureDir(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `${uuidv4()}.zip`);
  }
});

const imageFilter = (req, file, cb) => {
  const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) cb(null, true);
  else cb(new Error('Only image files allowed'));
};

const pdfFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') cb(null, true);
  else cb(new Error('Only PDF files allowed'));
};

const zipFilter = (req, file, cb) => {
  if (file.mimetype === 'application/zip' || file.originalname.endsWith('.zip')) cb(null, true);
  else cb(new Error('Only ZIP files allowed'));
};

// General-purpose attachment storage (PDF, images, documents)
const attachmentStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(UPLOAD_DIR, 'attachments');
    ensureDir(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  }
});

const attachmentFilter = (req, file, cb) => {
  const allowed = ['.pdf', '.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic', '.doc', '.docx', '.txt'];
  if (allowed.includes(path.extname(file.originalname).toLowerCase())) cb(null, true);
  else cb(new Error('Dateityp nicht erlaubt'));
};

const uploadImage      = multer({ storage: imageStorage,      fileFilter: imageFilter,      limits: { fileSize: 10  * 1024 * 1024 } });
const uploadPdf        = multer({ storage: pdfStorage,        fileFilter: pdfFilter,        limits: { fileSize: 50  * 1024 * 1024 } });
const uploadZip        = multer({ storage: zipStorage,        fileFilter: zipFilter,        limits: { fileSize: 100 * 1024 * 1024 } });
const uploadAttachment = multer({ storage: attachmentStorage, fileFilter: attachmentFilter, limits: { fileSize: 50  * 1024 * 1024 } });

module.exports = { uploadImage, uploadPdf, uploadZip, uploadAttachment, UPLOAD_DIR, PLUGINS_DIR };
