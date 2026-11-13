import { redirect } from 'next/navigation';

/** `proxy.ts` already routes "/" by session; this is the safe fallback. */
export default function Home() {
  redirect('/login');
}
