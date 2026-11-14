"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { getToken } from "@/lib/api";

/** Entry point: send the visitor to their documents or to sign in. */
export default function Home() {
  const router = useRouter();
  useEffect(() => {
    router.replace(getToken() ? "/dashboard/" : "/signin/");
  }, [router]);
  return null;
}
