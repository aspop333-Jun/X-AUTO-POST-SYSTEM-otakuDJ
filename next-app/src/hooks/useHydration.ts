"use client";

import { useEffect, useState } from "react";

/**
 * Hook to check if the component has been hydrated.
 * This prevents hydration mismatch errors when using Zustand with Next.js.
 */
export function useHydration() {
    const [hydrated, setHydrated] = useState(false);

    useEffect(() => {
        setHydrated(true);
    }, []);

    return hydrated;
}
