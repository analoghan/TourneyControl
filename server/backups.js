const fs = require('fs');
const os = require('os');
const path = require('path');
const sqlite3 = require('sqlite3');

const DB_FILE = path.join(__dirname, 'tournament.db');
const BACKUP_DIR = process.env.BACKUP_DIR || path.join(__dirname, 'backups');
const INTERVAL_MINUTES = Number(process.env.BACKUP_INTERVAL_MINUTES) || 15;
const KEEP = Number(process.env.BACKUP_KEEP) || 96; // a day of backups at the default interval

// Backups are named by UTC time, so sorting by name sorts by age; "-manual" marks Back Up Now
const NAME_PATTERN = /^tournament-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}Z(-manual)?\.db$/;

const timestamp = () => new Date().toISOString().replace(/\.\d+Z$/, 'Z').replace(/:/g, '-');

// VACUUM INTO writes a consistent copy of the live database. It runs on its own read-only connection,
// because it can't run while the app's connection has other queries in progress.
const snapshot = (target) => new Promise((resolve, reject) => {
  const conn = new sqlite3.Database(DB_FILE, sqlite3.OPEN_READONLY, (err) => {
    if (err) return reject(err);
    conn.configure('busyTimeout', 5000);
    conn.run('VACUUM INTO ?', [target], (err) => {
      conn.close();
      return err ? reject(err) : resolve(target);
    });
  });
});

const backupFiles = () => {
  if (!fs.existsSync(BACKUP_DIR)) return [];
  return fs.readdirSync(BACKUP_DIR).filter(name => NAME_PATTERN.test(name)).sort().reverse();
};

const listBackups = () => backupFiles().map(name => {
  const stats = fs.statSync(path.join(BACKUP_DIR, name));
  return { name, size: stats.size, created_at: stats.mtime.toISOString(), manual: name.endsWith('-manual.db') };
});

const pruneBackups = () => {
  backupFiles().slice(KEEP).forEach(name => fs.unlinkSync(path.join(BACKUP_DIR, name)));
};

const createBackup = async ({ manual = false } = {}) => {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const name = `tournament-${timestamp()}${manual ? '-manual' : ''}.db`;
  await snapshot(path.join(BACKUP_DIR, name));
  pruneBackups();
  return listBackups().find(b => b.name === name);
};

// Full path of a stored backup, or null if the name isn't one of ours (guards against path tricks)
const backupPath = (name) => {
  if (!NAME_PATTERN.test(name)) return null;
  const file = path.join(BACKUP_DIR, name);
  return fs.existsSync(file) ? file : null;
};

// A fresh snapshot in a temporary file, for downloading the current database; the caller deletes it
const snapshotForDownload = async () => {
  const name = `tournament-${timestamp()}.db`;
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'tourney-')), name);
  await snapshot(file);
  return { name, file };
};

// Back up only when the database has changed since the newest backup, so quiet periods don't fill the folder
const backupIfChanged = async () => {
  try {
    const newest = backupFiles()[0];
    const dbModified = fs.statSync(DB_FILE).mtimeMs;
    if (newest && fs.statSync(path.join(BACKUP_DIR, newest)).mtimeMs >= dbModified) return;
    const backup = await createBackup();
    console.log(`Database backed up to ${backup.name}`);
  } catch (err) {
    console.error('Automatic database backup failed:', err);
  }
};

const startAutomaticBackups = () => {
  backupIfChanged();
  setInterval(backupIfChanged, INTERVAL_MINUTES * 60 * 1000);
  console.log(`Automatic backups every ${INTERVAL_MINUTES} minutes to ${BACKUP_DIR} (keeping ${KEEP})`);
};

module.exports = {
  INTERVAL_MINUTES,
  KEEP,
  listBackups,
  createBackup,
  backupPath,
  snapshotForDownload,
  startAutomaticBackups
};
