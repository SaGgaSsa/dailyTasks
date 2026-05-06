import { redirect } from 'next/navigation'
import { unstable_noStore } from 'next/cache'

export default function HomePage() {
  unstable_noStore()
  redirect('/inbox')
}