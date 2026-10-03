import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-950 text-center">
      <h1 className="text-3xl font-bold text-white">404</h1>
      <p className="text-sm text-slate-400">Page not found.</p>
      <Link to="/dashboard" className="text-sm text-indigo-400 underline">
        Go to dashboard
      </Link>
    </div>
  )
}
