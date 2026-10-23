import { CircleCheck, Info, TriangleAlert } from 'lucide-react'

const ICONS = { ok: CircleCheck, info: Info, warn: TriangleAlert }

export default function EventLog({ log }) {
  if (!log.length) return <p className="empty-note">No actions yet.</p>
  return (
    <ol className="log">
      {log.map((e) => {
        const Icon = ICONS[e.kind]
        return (
          <li key={e.id} className={e.kind}>
            <Icon size={15} />
            <span>{e.text}</span>
          </li>
        )
      })}
    </ol>
  )
}
