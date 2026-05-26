type Props = {
  title?: string
  message: string
}

export default function AdminLoadError({ title = 'Could not load data', message }: Props) {
  const isFirebaseConfig = message.includes('Firebase Admin credentials')

  return (
    <div className="mb-6 border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-800 leading-relaxed">
      <p className="font-bold mb-1">{title}</p>
      <p>{message}</p>
      {isFirebaseConfig && (
        <p className="mt-2 text-xs text-red-700/90">
          This app stores players, blog posts, inquiries, and similar data in{' '}
          <strong>Firebase Firestore</strong> (not Supabase). Add{' '}
          <code className="font-mono">FIREBASE_SERVICE_ACCOUNT_KEY</code> or the three split fields to{' '}
          <code className="font-mono">.env.local</code>, then restart <code className="font-mono">npm run dev</code>.
          Supabase keys are only for image uploads.
        </p>
      )}
    </div>
  )
}
