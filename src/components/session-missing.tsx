import Link from "next/link";

export function SessionMissing({ loading }: { loading: boolean }) {
  return (
    <div className="mx-auto mt-[30px] max-w-[440px] rounded-card bg-surface px-8 py-12 text-center">
      {loading ? (
        <p className="text-[13px] font-semibold text-muted">Loading session…</p>
      ) : (
        <>
          <h1 className="text-[17px] font-bold">Session not found</h1>
          <p className="mt-1.5 text-[13px] font-semibold text-muted">It may have been cancelled by the Koach.</p>
          <Link href="/sessions" className="mt-5 inline-flex h-10 items-center rounded-[10px] bg-primary px-5 text-[13px] font-bold text-white">
            See all sessions
          </Link>
        </>
      )}
    </div>
  );
}
