// components/RegistrationProvider.js
// Broadcasts whether public registration is currently open to the client CTA
// components (navbar, hero, footer, tier cards…) so they can hide/disable the
// "Register" actions without every page threading a prop. Fed by the (site)
// layout from the cached active event. Defaults to true so a missing provider
// never blocks the CTAs.
"use client";

import { createContext, useContext } from "react";

const RegistrationCtx = createContext(true);

export function RegistrationProvider({ open, children }) {
    return <RegistrationCtx.Provider value={open !== false}>{children}</RegistrationCtx.Provider>;
}

export const useRegistrationOpen = () => useContext(RegistrationCtx);
