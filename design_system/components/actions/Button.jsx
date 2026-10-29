import React, { useState } from "react";

/** Primary/secondary/dark/success action button. Values lifted from prototype. */
export function Button({ variant = "primary", size = "md", icon, children, disabled, style, ...rest }) {
  const [hover, setHover] = useState(false);
  const base = {
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7,
    border: "none", borderRadius: "var(--radius-md)", cursor: disabled ? "not-allowed" : "pointer",
    fontFamily: "var(--font-body)", fontWeight: 600, transition: "var(--transition-fast)",
    whiteSpace: "nowrap",
  };
  const sizes = {
    sm: { padding: "0 14px", height: 32, fontSize: 13 },
    md: { padding: "0 16px", height: 36, fontSize: 13 },
    lg: { padding: "0 20px", height: 40, fontSize: 14 },
  };
  const variants = {
    primary: { background: disabled ? "var(--color-border)" : hover ? "var(--action-primary-hover)" : "var(--action-primary)", color: disabled ? "var(--color-text-muted)" : "#FFFFFF" },
    secondary: { background: "#FFFFFF", border: "1px solid var(--color-border)", color: "var(--color-text-3)" },
    dark: { background: "var(--color-navy)", color: "#FFFFFF" },
    success: { background: "var(--color-success)", color: "#FFFFFF" },
    ghost: { background: hover ? "#EDF3FD" : "transparent", color: "var(--color-royal)" },
  };
  return (
    <button
      disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ ...base, ...sizes[size], ...variants[variant], ...style }}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
}
