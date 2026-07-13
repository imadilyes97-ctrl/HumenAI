"use client";

import { useState, useEffect } from "react";

interface TenantInfo {
  id: string;
  name: string;
  plan: string;
  chatbotName: string;
}

export function useTenant() {
  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        // Extract tenant from hostname (subdomain)
        const hostname = window.location.hostname;
        const subdomain = hostname.split(".")[0];
        const isTenantSubdomain =
          subdomain &&
          !["www", "app", "localhost"].includes(subdomain) &&
          !hostname.includes("127.0.0.1");

        if (isTenantSubdomain) {
          const res = await fetch("/api/tenants", {
            headers: { "x-tenant-slug": subdomain },
          });
          if (res.ok) {
            const data = await res.json();
            setTenant(data);
          }
        }
      } catch {
        // Not on a tenant subdomain
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  return { tenant, loading, setTenant };
}
