"use client";

import { useEffect, useState } from "react";

export default function Home() {
  const [me, setMe] = useState<any>(null);

  async function loadMe() {
    const r = await fetch("/api/auth/me", { cache: "no-store" });
    setMe(await r.json());
  }

  useEffect(() => {
    loadMe();
  }, []);

  return (
    <div className="min-h-screen p-10 text-white bg-black">
      <h1 className="text-3xl font-bold mb-6">Rental CRM</h1>

      <div className="p-4 rounded-xl border border-white/20 max-w-xl">
        <div className="mb-4">
          <div className="text-sm opacity-70 mb-2">Auth status</div>
          <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(me, null, 2)}</pre>
        </div>

        <div className="flex gap-3">
          <a
            className="px-4 py-2 rounded-lg bg-white text-black font-semibold"
            href="/api/auth/login"
          >
            Connect Google
          </a>

          <button
            className="px-4 py-2 rounded-lg border border-white/20"
            onClick={loadMe}
          >
            Refresh /me
          </button>
        </div>
      </div>
    </div>
  );
}

