import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-4 px-5 py-24 text-center">
      <p className="text-[13px] font-bold uppercase tracking-widest" style={{ color: 'var(--violet-400)' }}>
        404
      </p>
      <h1 className="text-[28px]">Not in the directory</h1>
      <p className="prose-body text-[15px]">
        This page does not exist, or the creator it pointed to is no longer listed. Profiles
        come down when a creator is archived or their listing is withdrawn.
      </p>
      <div className="mt-2 flex flex-wrap justify-center gap-3">
        <Link href="/creators" className="btn btn-primary">Browse creators</Link>
        <Link href="/" className="btn btn-ghost">Go home</Link>
      </div>
    </div>
  );
}
