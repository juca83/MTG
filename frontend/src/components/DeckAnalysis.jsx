import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

const MANA_COLORS = {
  W: '#f8f6d8',
  U: '#0e68ab',
  B: '#6b7280',
  R: '#d3202a',
  G: '#00733e',
  C: '#8c8c8c',
}

const TYPE_COLORS = {
  Creature: '#7c3aed',
  Instant: '#0e68ab',
  Sorcery: '#d3202a',
  Enchantment: '#00733e',
  Artifact: '#8c8c8c',
  Planeswalker: '#c8a84b',
  Land: '#6b4c2a',
  Other: '#4b5563',
}

export default function DeckAnalysis({ analysis }) {
  if (!analysis) return null

  const { mana_curve, type_breakdown, color_distribution } = analysis

  const curveData = Array.from({ length: 8 }, (_, i) => ({
    cmc: i === 7 ? '7+' : String(i),
    count: mana_curve?.[String(i)] || 0,
  }))

  const typeData = Object.entries(type_breakdown || {}).map(([name, value]) => ({ name, value }))

  const colorData = Object.entries(color_distribution || {}).map(([name, value]) => ({
    name,
    value,
    fill: MANA_COLORS[name] || '#8c8c8c',
  }))

  return (
    <div className="space-y-6">
      {/* Mana Curve */}
      <div>
        <h3 className="text-sm font-semibold text-gray-300 mb-3">Mana Curve</h3>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={curveData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2a4a" />
            <XAxis dataKey="cmc" tick={{ fill: '#9ca3af', fontSize: 12 }} />
            <YAxis tick={{ fill: '#9ca3af', fontSize: 12 }} />
            <Tooltip
              contentStyle={{ background: '#1a1a2e', border: '1px solid #2a2a4a', borderRadius: 8 }}
              labelStyle={{ color: '#e5e7eb' }}
              itemStyle={{ color: '#a855f7' }}
            />
            <Bar dataKey="count" fill="#7c3aed" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Card Types */}
      <div>
        <h3 className="text-sm font-semibold text-gray-300 mb-3">Card Types</h3>
        <div className="space-y-2">
          {typeData.map(({ name, value }) => {
            const total = typeData.reduce((sum, d) => sum + d.value, 0)
            const pct = total > 0 ? Math.round((value / total) * 100) : 0
            return (
              <div key={name} className="flex items-center gap-2">
                <span className="text-xs text-gray-400 w-20">{name}</span>
                <div className="flex-1 bg-app-surface2 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${pct}%`,
                      background: TYPE_COLORS[name] || '#4b5563',
                    }}
                  />
                </div>
                <span className="text-xs text-gray-400 w-8 text-right">{value}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Color Distribution */}
      {colorData.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-300 mb-3">Color Distribution</h3>
          <div className="flex items-center gap-4">
            <PieChart width={100} height={100}>
              <Pie
                data={colorData}
                cx={45}
                cy={45}
                innerRadius={25}
                outerRadius={45}
                dataKey="value"
                strokeWidth={0}
              >
                {colorData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Pie>
            </PieChart>
            <div className="space-y-1">
              {colorData.map(({ name, value, fill }) => (
                <div key={name} className="flex items-center gap-2 text-xs">
                  <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: fill }} />
                  <span className="text-gray-400">{name}</span>
                  <span className="text-gray-200">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
