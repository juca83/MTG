import { useState, useRef } from 'react'
import { Upload, FileText, CheckCircle, AlertCircle, X } from 'lucide-react'
import { importManabox } from '../api'
import toast from 'react-hot-toast'

export default function ImportCSV({ onClose, onImported }) {
  const [dragging, setDragging] = useState(false)
  const [file, setFile] = useState(null)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState(null)
  const fileRef = useRef(null)

  const handleFile = (f) => {
    if (f?.name.endsWith('.csv')) {
      setFile(f)
      setResult(null)
    } else {
      toast.error('Please select a CSV file')
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    handleFile(f)
  }

  const handleImport = async () => {
    if (!file) return
    setImporting(true)
    try {
      const r = await importManabox(file)
      setResult(r)
      toast.success(`Imported ${r.imported} cards`)
      onImported?.()
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Import failed')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center">
      <div className="bg-app-surface w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl border border-app-border max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-app-border">
          <h2 className="font-semibold text-lg">Import from Manabox</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-app-border">
            <X size={18} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Instructions */}
          <div className="bg-app-surface2 rounded-xl p-3 text-sm text-gray-400 space-y-1">
            <p className="font-medium text-gray-200">Manabox CSV Export</p>
            <p>Categories mapped:</p>
            <ul className="space-y-0.5 ml-3">
              <li>• <span className="text-gray-200">staples</span> → Classeurs Staples (by color)</li>
              <li>• <span className="text-gray-200">legendaries</span> → Classeurs Légendaires</li>
              <li>• <span className="text-gray-200">bulks</span> → Rangement Bulk</li>
              <li>• <span className="text-gray-200">for trades</span> → À échanger</li>
              <li>• <span className="text-gray-200">lent to arthur</span> → Prêté à Arthur</li>
              <li>• <span className="text-gray-200">proxy</span> → Marked as proxy</li>
            </ul>
          </div>

          {/* Drop zone */}
          {!result && (
            <div
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                dragging
                  ? 'border-app-accent bg-purple-900/20'
                  : file
                  ? 'border-green-600 bg-green-900/10'
                  : 'border-app-border hover:border-app-accent'
              }`}
            >
              <input
                ref={fileRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={e => handleFile(e.target.files[0])}
              />
              {file ? (
                <>
                  <FileText size={32} className="text-green-400 mx-auto mb-2" />
                  <p className="text-green-300 font-medium">{file.name}</p>
                  <p className="text-sm text-gray-400">{(file.size / 1024).toFixed(1)} KB</p>
                </>
              ) : (
                <>
                  <Upload size={32} className="text-gray-500 mx-auto mb-2" />
                  <p className="text-gray-300">Drop CSV file here</p>
                  <p className="text-sm text-gray-500">or tap to browse</p>
                </>
              )}
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-green-400">
                <CheckCircle size={20} />
                <span className="font-medium">Import complete</span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-app-surface2 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-green-400">{result.imported}</p>
                  <p className="text-xs text-gray-400">Imported</p>
                </div>
                <div className="bg-app-surface2 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-yellow-400">{result.skipped}</p>
                  <p className="text-xs text-gray-400">Skipped</p>
                </div>
                <div className="bg-app-surface2 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-gray-200">{result.total_rows}</p>
                  <p className="text-xs text-gray-400">Total</p>
                </div>
              </div>
              {result.errors?.length > 0 && (
                <div className="bg-red-900/20 border border-red-800/40 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle size={16} className="text-red-400" />
                    <span className="text-sm text-red-300">Errors ({result.errors.length})</span>
                  </div>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {result.errors.map((e, i) => (
                      <p key={i} className="text-xs text-red-300">{e}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={onClose} className="btn-secondary flex-1">
              {result ? 'Done' : 'Cancel'}
            </button>
            {!result && file && (
              <button onClick={handleImport} disabled={importing} className="btn-primary flex-1">
                {importing ? 'Importing...' : 'Import'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
