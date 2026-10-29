import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { apiFetch, apiGetJson, apiDownload } from '../utils/api'

const formatSize = (bytes) =>
  bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`

const formatDateTime = (iso) =>
  new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', second: '2-digit' })

const AdminPage = () => {
  useAuth('staff')

  const [backupInfo, setBackupInfo] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [busy, setBusy] = useState('')

  useEffect(() => {
    fetchBackups()
  }, [])

  const fetchBackups = async () => {
    try {
      setBackupInfo(await apiGetJson('/api/admin/backups'))
      setLoadError('')
    } catch (error) {
      console.error('Failed to load backups:', error)
      setLoadError(`Couldn't load backups: ${error.message}`)
    }
  }

  // Runs one action at a time and reports failures, so a slow download can't be started twice
  const run = async (label, action) => {
    setBusy(label)
    try {
      await action()
    } catch (error) {
      alert(error.message)
    } finally {
      setBusy('')
    }
  }

  const backUpNow = () => run('backup', async () => {
    const res = await apiFetch('/api/admin/backups', { method: 'POST' })
    if (!res.ok) {
      const error = await res.json().catch(() => ({}))
      throw new Error(error.error || 'Backup failed')
    }
    await fetchBackups()
  })

  return (
    <div className="container">
      {loadError && <div className="connection-banner" role="alert">{loadError}</div>}
      <div className="judge-management-header">
        <h2>Admin</h2>
      </div>

      <div className="admin-section">
        <h3>Database</h3>
        <p>Download a copy of the entire database as it is right now: tournaments, rings, packets, judges and chat.</p>
        <button
          className="btn-add-judge"
          disabled={!!busy}
          onClick={() => run('download', () => apiDownload('/api/admin/database', 'tournament.db'))}
        >
          {busy === 'download' ? 'Preparing…' : 'Download Current Database'}
        </button>
      </div>

      <div className="admin-section">
        <h3>Automatic Backups</h3>
        {backupInfo && (
          <p>
            The server saves a backup every {backupInfo.interval_minutes} minutes when anything has changed,
            and keeps the newest {backupInfo.keep}. Backups are stored on the server; download one to keep a copy elsewhere.
          </p>
        )}
        <button className="btn-add-judge" disabled={!!busy} onClick={backUpNow}>
          {busy === 'backup' ? 'Backing up…' : 'Back Up Now'}
        </button>

        {backupInfo && (backupInfo.backups.length === 0 ? (
          <div className="no-tournaments-message">
            <p>No backups yet. The first one is made shortly after the server starts.</p>
          </div>
        ) : (
          <div className="judges-table-container" style={{ marginTop: '1rem' }}>
            <table className="judges-table">
              <thead>
                <tr>
                  <th>Created</th>
                  <th>Type</th>
                  <th>Size</th>
                  <th>Download</th>
                </tr>
              </thead>
              <tbody>
                {backupInfo.backups.map(backup => (
                  <tr key={backup.name}>
                    <td>{formatDateTime(backup.created_at)}</td>
                    <td>{backup.manual ? 'Manual' : 'Automatic'}</td>
                    <td>{formatSize(backup.size)}</td>
                    <td>
                      <button
                        className="btn-edit-judge"
                        disabled={!!busy}
                        onClick={() => run(backup.name, () => apiDownload(`/api/admin/backups/${backup.name}`, backup.name))}
                      >
                        {busy === backup.name ? 'Downloading…' : 'Download'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  )
}

export default AdminPage
