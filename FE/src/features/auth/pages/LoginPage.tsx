import { LoginForm } from '../components/LoginForm'
import { Link } from 'react-router-dom'

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400 bg-clip-text text-4xl font-extrabold tracking-tight text-transparent">
            Shared Hub
          </h1>
          <p className="text-sm text-slate-400">Sign in to continue</p>
        </div>
        <LoginForm />
        <p className="text-center text-sm text-slate-300">
          <Link to="/expert/register" className="underline underline-offset-4">
            Explore expert registration
          </Link>
        </p>
      </div>
    </div>
  )
}
