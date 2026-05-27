"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";

const C = {
  bg: "#080808", s1: "#0f0f0f", s2: "#161616", s3: "#1f1f1f",
  border: "#2e2e2e", w: "#eeeeee", muted: "#5a5a5a",
  green: "#4ade80", red: "#f87171",
};
const Fh = "'Barlow Condensed', sans-serif";
const Fb = "'Barlow', sans-serif";

export default function LoginPage() {
  const router  = useRouter();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError("Email o contraseña incorrectos");
      setLoading(false);
    } else {
      router.push("/");
      router.refresh();
    }
  };

  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      minHeight: "100vh", background: C.bg, fontFamily: Fb,
    }}>
      <div style={{
        width: 360, background: C.s1, border: `1px solid ${C.border}`,
        borderRadius: 12, padding: "40px 36px",
      }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 5, justifyContent: "center" }}>
            <span style={{ fontFamily: Fh, fontWeight: 900, fontSize: 13, color: C.muted, letterSpacing: 1 }}>//</span>
            <span style={{ fontFamily: Fh, fontWeight: 900, fontSize: 28, letterSpacing: 6, color: C.w }}>ACTIVE</span>
          </div>
          <div style={{ fontSize: 9, color: C.muted, letterSpacing: 3, marginTop: 4 }}>GYM SYSTEM</div>
        </div>

        <div style={{ fontSize: 9, color: C.muted, letterSpacing: 2.5, fontFamily: Fh, fontWeight: 700, marginBottom: 20 }}>
          INICIAR SESIÓN
        </div>

        {/* Email */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 10, color: C.muted, fontFamily: Fh, letterSpacing: 2, display: "block", marginBottom: 6 }}>
            EMAIL
          </label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleLogin()}
            placeholder="tu@email.com"
            style={{
              width: "100%", background: C.s2, border: `1px solid ${C.border}`,
              borderRadius: 6, padding: "10px 14px", fontSize: 13,
              color: C.w, fontFamily: Fb, outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* Password */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ fontSize: 10, color: C.muted, fontFamily: Fh, letterSpacing: 2, display: "block", marginBottom: 6 }}>
            CONTRASEÑA
          </label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleLogin()}
            placeholder="••••••••"
            style={{
              width: "100%", background: C.s2, border: `1px solid ${C.border}`,
              borderRadius: 6, padding: "10px 14px", fontSize: 13,
              color: C.w, fontFamily: Fb, outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* Error */}
        {error && (
          <div style={{
            marginBottom: 16, padding: "10px 14px", borderRadius: 6,
            background: C.red + "22", border: `1px solid ${C.red}44`,
            fontSize: 12, color: C.red,
          }}>{error}</div>
        )}

        {/* Button */}
        <button
          onClick={handleLogin}
          disabled={loading || !email || !password}
          style={{
            width: "100%", padding: "12px", borderRadius: 6, border: "none",
            background: loading || !email || !password ? C.s3 : C.w,
            color: loading || !email || !password ? C.muted : C.bg,
            fontFamily: Fh, fontWeight: 700, fontSize: 13, letterSpacing: 2,
            cursor: loading || !email || !password ? "not-allowed" : "pointer",
            transition: "all 0.15s",
          }}
        >
          {loading ? "INGRESANDO..." : "INGRESAR"}
        </button>
      </div>
    </div>
  );
}