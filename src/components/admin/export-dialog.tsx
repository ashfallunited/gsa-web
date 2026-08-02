'use client'

import { useState } from 'react'
import { X, Download } from 'lucide-react'

export type ExportFormat = 'pdf' | 'png'
export type ExportScope = 'player' | 'team'

export default function ExportDialog({
  open,
  onClose,
  playerSelected,
  onExport,
  exporting,
}: {
  open: boolean
  onClose: () => void
  playerSelected: boolean
  onExport: (format: ExportFormat, scope: ExportScope) => void
  exporting: boolean
}) {
  const [format, setFormat] = useState<ExportFormat>('pdf')
  const [scope, setScope] = useState<ExportScope>(playerSelected ? 'player' : 'team')

  if (!open) return null

  // PNG can only capture whatever section is actually rendered on screen right now.
  const pngScopeMismatch = format === 'png' && ((scope === 'team') === playerSelected)
  const scopeUnavailable = scope === 'player' && !playerSelected
  const canExport = !scopeUnavailable && !pngScopeMismatch

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div className="bg-white w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-[#01255f]">Export Report</h3>
          <button type="button" onClick={onClose} className="text-[#5a6478] hover:text-[#01255f]">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-[10px] uppercase tracking-widest font-bold text-[#5a6478] mb-1.5">Format</p>
            <div className="grid grid-cols-2 gap-2">
              {(['pdf', 'png'] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFormat(f)}
                  className={`py-2 text-sm font-bold uppercase border transition-colors ${
                    format === f ? 'bg-[#01255f] text-white border-[#01255f]' : 'bg-white text-[#5a6478] border-gray-200'
                  }`}
                >
                  {f.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[10px] uppercase tracking-widest font-bold text-[#5a6478] mb-1.5">Scope</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={!playerSelected}
                onClick={() => setScope('player')}
                className={`py-2 text-sm font-bold border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                  scope === 'player' ? 'bg-[#01255f] text-white border-[#01255f]' : 'bg-white text-[#5a6478] border-gray-200'
                }`}
              >
                Player
              </button>
              <button
                type="button"
                onClick={() => setScope('team')}
                className={`py-2 text-sm font-bold border transition-colors ${
                  scope === 'team' ? 'bg-[#01255f] text-white border-[#01255f]' : 'bg-white text-[#5a6478] border-gray-200'
                }`}
              >
                Team
              </button>
            </div>
            {scopeUnavailable && (
              <p className="text-[11px] text-[#5a6478] mt-1.5">Select a player to export their individual report.</p>
            )}
            {pngScopeMismatch && !scopeUnavailable && (
              <p className="text-[11px] text-amber-700 mt-1.5">
                PNG captures what&apos;s on screen — {scope === 'team' ? 'clear the selected player' : 'select a player'} to switch views first, or use PDF instead.
              </p>
            )}
          </div>

          <button
            type="button"
            disabled={!canExport || exporting}
            onClick={() => onExport(format, scope)}
            className="w-full inline-flex items-center justify-center gap-2 bg-[#fee11b] text-[#01255f] px-4 py-2.5 text-sm font-black disabled:opacity-50"
          >
            <Download size={15} /> {exporting ? 'Exporting…' : 'Download'}
          </button>
        </div>
      </div>
    </div>
  )
}
