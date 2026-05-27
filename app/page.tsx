"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase";
import { createStudent, getStudents, getGymId, assignProgram, getPrograms, getStudentCurrentDay } from "@/app/actions/students";
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell
} from "recharts";

const C = {
  bg: "#080808", s1: "#0f0f0f", s2: "#161616", s3: "#1f1f1f",
  s4: "#272727", border: "#2e2e2e", w: "#eeeeee",
  muted: "#5a5a5a", dim: "#363636",
  green: "#4ade80", orange: "#fb923c", red: "#f87171", blue: "#60a5fa"
};
const Fh = "'Barlow Condensed', sans-serif";
const Fb = "'Barlow', sans-serif";
const card = (x: Record<string, unknown> = {}) => ({
  background: C.s2, border: `1px solid ${C.border}`, borderRadius: 8, padding: "20px 24px", ...x
});

interface Exercise { id: number; name: string; sets: number; reps: string; kg: number; rest: number; notes: string; }
interface Day { id: number; number: number; name: string; muscles: string[]; exercises: Exercise[]; }
interface Week { id: number; number: number; name: string; days: Day[]; }
interface Program { id: number; name: string; coach: string; studentsAssigned: number; totalWeeks: number; weeks: Week[]; }
interface StudentDayData {
  programName: string;
  weekNumber: number;
  dayNumber: number;
  dayName: string | null;
  muscles: string[];
  exercises: { id: string; name: string; sets: number; reps: string; kg: number; rest: number; notes: string }[];
  studentProgramId: string;
}

interface SetState { set: number; weight: number; reps: number; done: boolean; }
interface RealStudent {
  id: string;
  full_name: string;
  role: string;
  student_programs: Array<{
    id: string;
    status: string;
    current_week_number: number;
    current_day_number: number;
    programs: { name: string } | null;
  }>;
}

const PROGRAMS: Program[] = [
  {
    id: 1, name: "HIPERTROFIA 3×", coach: "Marcos G.", studentsAssigned: 4, totalWeeks: 8,
    weeks: [
      {
        id: 1, number: 1, name: "BASE",
        days: [
          {
            id: 1, number: 1, name: "PECHO + TRÍCEPS", muscles: ["Pecho", "Tríceps"],
            exercises: [
              { id: 1, name: "Press de Banca", sets: 4, reps: "6-8", kg: 80, rest: 120, notes: "Bajar 3 seg controlado" },
              { id: 2, name: "Press Inclinado Barra", sets: 3, reps: "8-10", kg: 60, rest: 90, notes: "" },
              { id: 3, name: "Aperturas Mancuernas", sets: 3, reps: "12-15", kg: 20, rest: 60, notes: "Rango completo" },
              { id: 4, name: "Fondos en Paralelas", sets: 3, reps: "10-12", kg: 0, rest: 75, notes: "" },
              { id: 5, name: "Extensiones Tríceps Polea", sets: 3, reps: "12-15", kg: 30, rest: 60, notes: "" },
            ]
          },
          {
            id: 2, number: 2, name: "ESPALDA + BÍCEPS", muscles: ["Espalda", "Bíceps"],
            exercises: [
              { id: 6, name: "Dominadas", sets: 4, reps: "5-7", kg: 0, rest: 120, notes: "" },
              { id: 7, name: "Remo con Barra", sets: 4, reps: "8-10", kg: 70, rest: 90, notes: "" },
              { id: 8, name: "Jalón al Pecho", sets: 3, reps: "10-12", kg: 55, rest: 75, notes: "" },
              { id: 9, name: "Curl con Barra", sets: 3, reps: "10-12", kg: 30, rest: 60, notes: "" },
            ]
          },
          {
            id: 3, number: 3, name: "PIERNAS + HOMBROS", muscles: ["Cuádriceps", "Isquiotibiales", "Hombros"],
            exercises: [
              { id: 10, name: "Sentadilla", sets: 4, reps: "6-8", kg: 100, rest: 150, notes: "Profundidad paralela o más" },
              { id: 11, name: "Prensa de Piernas", sets: 3, reps: "10-12", kg: 160, rest: 90, notes: "" },
              { id: 12, name: "Peso Muerto Rumano", sets: 3, reps: "10-12", kg: 70, rest: 90, notes: "" },
              { id: 13, name: "Press Militar", sets: 3, reps: "8-10", kg: 50, rest: 90, notes: "" },
              { id: 14, name: "Elevaciones Laterales", sets: 3, reps: "15-20", kg: 12, rest: 45, notes: "" },
            ]
          },
        ]
      },
      {
        id: 2, number: 2, name: "PROGRESIÓN",
        days: [
          { id: 4, number: 1, name: "PECHO + TRÍCEPS", muscles: ["Pecho", "Tríceps"], exercises: [] },
          { id: 5, number: 2, name: "ESPALDA + BÍCEPS", muscles: ["Espalda", "Bíceps"], exercises: [] },
          { id: 6, number: 3, name: "PIERNAS + HOMBROS", muscles: ["Cuádriceps", "Isquiotibiales", "Hombros"], exercises: [] },
        ]
      },
      { id: 3, number: 3, name: "SOBRECARGA", days: [] },
    ]
  },
  { id: 2, name: "FUERZA 5×5", coach: "Ana P.", studentsAssigned: 6, totalWeeks: 12, weeks: [] },
  { id: 3, name: "ACONDICIONAMIENTO", coach: "Marcos G.", studentsAssigned: 3, totalWeeks: 6, weeks: [] },
];

const BENCH_PROGRESS = [
  { w: "S1", kg: 70 }, { w: "S2", kg: 72.5 }, { w: "S3", kg: 75 },
  { w: "S4", kg: 75 }, { w: "S5", kg: 77.5 }, { w: "S6", kg: 80 }, { w: "HOY", kg: 82.5 },
];
const WEEKLY_VOL = [
  { d: "L", v: 15200 }, { d: "M", v: 0 }, { d: "X", v: 13400 },
  { d: "J", v: 0 }, { d: "V", v: 17800 }, { d: "S", v: 0 }, { d: "D", v: 0 },
];

// ── SHARED ────────────────────────────────────────────────────────
function Tag({ label, color = C.blue }: { label: string; color?: string }) {
  return <span style={{ padding: "2px 9px", borderRadius: 4, fontSize: 9, fontWeight: 700, letterSpacing: 1.5, fontFamily: Fh, background: color + "22", color, border: `1px solid ${color}44` }}>{label}</span>;
}

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div style={{ ...card(), flex: 1 }}>
      <div style={{ fontSize: 9, color: C.muted, letterSpacing: 2.5, fontFamily: Fh, fontWeight: 700, marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 38, fontFamily: Fh, fontWeight: 800, color: color || C.w, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: C.muted, marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

function Btn({ children, onClick, variant = "primary", small, disabled }: {
  children: React.ReactNode; onClick?: () => void;
  variant?: "primary" | "ghost" | "green"; small?: boolean; disabled?: boolean;
}) {
  const s = {
    primary: { background: disabled ? C.s3 : C.w, color: disabled ? C.muted : C.bg, border: "none" },
    ghost:   { background: "transparent", color: C.w, border: `1px solid ${C.border}` },
    green:   { background: C.green + "22", color: C.green, border: `1px solid ${C.green}44` },
  }[variant];
  return (
    <button onClick={onClick} disabled={disabled} style={{
      ...s, padding: small ? "6px 14px" : "10px 22px",
      borderRadius: 6, fontSize: small ? 10 : 12,
      fontFamily: Fh, fontWeight: 700, letterSpacing: 2,
      cursor: disabled ? "not-allowed" : "pointer",
    }}>{children}</button>
  );
}

function Avatar({ initials, size = 32 }: { initials: string; size?: number }) {
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: C.s4, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.3, fontWeight: 700, flexShrink: 0 }}>{initials}</div>
  );
}

function Input({ label, type = "text", value, onChange, placeholder }: {
  label: string; type?: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ fontSize: 10, color: C.muted, fontFamily: Fh, letterSpacing: 2, display: "block", marginBottom: 6 }}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ width: "100%", background: C.s3, border: `1px solid ${C.border}`, borderRadius: 6, padding: "10px 14px", fontSize: 13, color: C.w, fontFamily: Fb, outline: "none", boxSizing: "border-box" }} />
    </div>
  );
}

// ── CREATE STUDENT MODAL ──────────────────────────────────────────
function CreateStudentModal({ gymId, onClose, onCreated }: { gymId: string; onClose: () => void; onCreated: () => void }) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("Active2026!");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  const handleCreate = async () => {
    if (!fullName || !email || !password) return;
    setLoading(true); setError("");
    const result = await createStudent({ fullName, email, password, gymId });
    if (result.success) { onCreated(); onClose(); }
    else { setError(result.error || "Error al crear el alumno"); setLoading(false); }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "#000000cc", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
      <div style={{ width: 400, background: C.s1, border: `1px solid ${C.border}`, borderRadius: 12, padding: "32px 36px" }}>
        <div style={{ fontFamily: Fh, fontWeight: 800, fontSize: 20, letterSpacing: 3, marginBottom: 24 }}>NUEVO ALUMNO</div>
        <Input label="NOMBRE COMPLETO" value={fullName} onChange={setFullName} placeholder="Juan García" />
        <Input label="EMAIL" type="email" value={email} onChange={setEmail} placeholder="juan@email.com" />
        <Input label="CONTRASEÑA INICIAL" type="text" value={password} onChange={setPassword} />
        {error && <div style={{ marginBottom: 16, padding: "10px 14px", borderRadius: 6, background: C.red + "22", border: `1px solid ${C.red}44`, fontSize: 12, color: C.red }}>{error}</div>}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
          <Btn variant="ghost" small onClick={onClose}>CANCELAR</Btn>
          <Btn small onClick={handleCreate} disabled={loading || !fullName || !email}>{loading ? "CREANDO..." : "CREAR ALUMNO"}</Btn>
        </div>
      </div>
    </div>
  );
}

// ── COACH — DASHBOARD ─────────────────────────────────────────────
function CoachDashboard({ navigate, students }: { navigate: (v: string) => void; students: RealStudent[] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "flex", gap: 14 }}>
        <StatCard label="ALUMNOS ACTIVOS" value={students.length} sub="en tu gimnasio" />
        <StatCard label="PROGRAMAS" value={PROGRAMS.length} sub="en biblioteca" />
        <StatCard label="CON PROGRAMA" value={students.filter(s => s.student_programs?.length > 0).length} color={C.green} />
        <StatCard label="SIN PROGRAMA" value={students.filter(s => !s.student_programs?.length).length} color={C.orange} />
      </div>
      <div style={card()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ fontFamily: Fh, fontWeight: 800, fontSize: 15, letterSpacing: 3 }}>ALUMNOS</div>
          <Btn variant="ghost" small onClick={() => navigate("students")}>VER TODOS →</Btn>
        </div>
        {students.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: C.muted, fontFamily: Fh, letterSpacing: 2, fontSize: 11 }}>
            AÚN NO HAY ALUMNOS — CREÁ EL PRIMERO EN ALUMNOS →
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                {["Alumno", "Programa", "Semana"].map(h => (
                  <th key={h} style={{ textAlign: "left", paddingBottom: 12, paddingRight: 20, fontSize: 9, color: C.muted, fontFamily: Fh, letterSpacing: 2, fontWeight: 700 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {students.slice(0, 5).map((s, i) => {
                const prog = s.student_programs?.[0];
                const initials = s.full_name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();
                return (
                  <tr key={s.id} style={{ borderBottom: i < Math.min(students.length, 5) - 1 ? `1px solid ${C.border}` : "none" }}>
                    <td style={{ padding: "14px 20px 14px 0" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <Avatar initials={initials} />
                        <span style={{ fontWeight: 500, fontSize: 13 }}>{s.full_name}</span>
                      </div>
                    </td>
                    <td style={{ paddingRight: 20, fontSize: 11, fontFamily: Fh, letterSpacing: 1, color: prog ? C.w : C.muted }}>
                      {prog?.programs?.name || <span style={{ color: C.orange }}>SIN ASIGNAR</span>}
                    </td>
                    <td style={{ color: C.muted, fontSize: 12 }}>
                      {prog ? `Sem ${prog.current_week_number} · Día ${prog.current_day_number}` : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      <div style={{ display: "flex", gap: 14 }}>
        {PROGRAMS.map(p => (
          <div key={p.id} onClick={() => navigate("programs")}
            onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = C.s3; }}
            onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = C.s2; }}
            style={{ ...card({ flex: 1, cursor: "pointer", transition: "all 0.15s" }) }}>
            <div style={{ fontFamily: Fh, fontWeight: 800, fontSize: 16, letterSpacing: 2, marginBottom: 6 }}>{p.name}</div>
            <div style={{ color: C.muted, fontSize: 11, marginBottom: 14 }}>{p.coach}</div>
            <div style={{ display: "flex", gap: 20 }}>
              <div><span style={{ fontFamily: Fh, fontWeight: 700, fontSize: 22 }}>{p.totalWeeks}</span><span style={{ color: C.muted, fontSize: 10, marginLeft: 4 }}>semanas</span></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── COACH — PROGRAMS ─────────────────────────────────────────────
function ProgramsView() {
  const [selProg, setSelProg]     = useState<Program>(PROGRAMS[0]);
  const [selWeekId, setSelWeekId] = useState<number | undefined>(PROGRAMS[0].weeks[0]?.id);
  const [selDayId, setSelDayId]   = useState<number | undefined>(PROGRAMS[0].weeks[0]?.days[0]?.id);
  const selWeek = selProg.weeks.find(w => w.id === selWeekId);
  const selDay  = selWeek?.days.find(d => d.id === selDayId);
  const pickProgram = (p: Program) => { setSelProg(p); setSelWeekId(p.weeks[0]?.id); setSelDayId(p.weeks[0]?.days[0]?.id); };

  return (
    <div style={{ display: "flex", gap: 16, height: "calc(100vh - 140px)", overflow: "hidden" }}>
      <div style={{ width: 188, flexShrink: 0, display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <div style={{ fontSize: 9, color: C.muted, letterSpacing: 2.5, fontFamily: Fh, fontWeight: 700 }}>BIBLIOTECA</div>
          <button style={{ background: C.w, color: C.bg, border: "none", borderRadius: 4, width: 20, height: 20, fontSize: 14, cursor: "pointer", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1, overflow: "auto" }}>
          {PROGRAMS.map(p => (
            <button key={p.id} onClick={() => pickProgram(p)} style={{ textAlign: "left", padding: "11px 14px", borderRadius: 6, background: selProg.id === p.id ? C.s3 : C.s2, border: `1px solid ${C.border}`, borderLeft: selProg.id === p.id ? `3px solid ${C.w}` : "3px solid transparent", cursor: "pointer" }}>
              <div style={{ fontFamily: Fh, fontWeight: 700, fontSize: 12, letterSpacing: 1.5, color: C.w, marginBottom: 3 }}>{p.name}</div>
              <div style={{ fontSize: 10, color: C.muted }}>{p.totalWeeks} semanas</div>
            </button>
          ))}
        </div>
      </div>
      <div style={{ width: 188, flexShrink: 0, background: C.s1, border: `1px solid ${C.border}`, borderRadius: 8, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ padding: "11px 16px", borderBottom: `1px solid ${C.border}`, fontSize: 9, color: C.muted, letterSpacing: 2.5, fontFamily: Fh, fontWeight: 700, flexShrink: 0 }}>ESTRUCTURA</div>
        <div style={{ flex: 1, overflow: "auto" }}>
          {selProg.weeks.map(week => (
            <div key={week.id}>
              <button onClick={() => setSelWeekId(selWeekId === week.id ? undefined : week.id)} style={{ width: "100%", textAlign: "left", padding: "10px 16px", background: "transparent", border: "none", cursor: "pointer", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontFamily: Fh, fontWeight: 700, fontSize: 11, color: C.w, letterSpacing: 1.5 }}>SEM {week.number}</div>
                  <div style={{ fontSize: 9, color: C.muted }}>{week.name}</div>
                </div>
                <span style={{ color: C.dim, fontSize: 10 }}>{selWeekId === week.id ? "▾" : "▸"}</span>
              </button>
              {selWeekId === week.id && week.days.map(day => (
                <button key={day.id} onClick={() => setSelDayId(day.id)} style={{ width: "100%", textAlign: "left", padding: "9px 16px 9px 28px", background: selDayId === day.id ? C.s3 : "transparent", border: "none", cursor: "pointer", borderLeft: selDayId === day.id ? `2px solid ${C.w}` : "2px solid transparent", borderBottom: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: 10, fontFamily: Fh, fontWeight: 700, color: selDayId === day.id ? C.w : C.muted, letterSpacing: 1 }}>DÍA {day.number}</div>
                  <div style={{ fontSize: 9, color: C.muted, marginTop: 1 }}>{day.muscles.slice(0, 2).join(" · ")}</div>
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
      <div style={{ flex: 1, background: C.s1, border: `1px solid ${C.border}`, borderRadius: 8, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {selDay ? (
          <>
            <div style={{ padding: "14px 24px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexShrink: 0 }}>
              <div>
                <div style={{ fontFamily: Fh, fontWeight: 800, fontSize: 20, letterSpacing: 2 }}>{selDay.name}</div>
                <div style={{ display: "flex", gap: 6, marginTop: 8 }}>{selDay.muscles.map(m => <Tag key={m} label={m} />)}</div>
              </div>
              <Btn small variant="ghost">+ EJERCICIO</Btn>
            </div>
            <div style={{ flex: 1, overflow: "auto" }}>
              <div style={{ display: "grid", gridTemplateColumns: "28px 1fr 56px 68px 88px 68px 1fr 32px", gap: 12, padding: "10px 24px", borderBottom: `1px solid ${C.border}`, position: "sticky", top: 0, background: C.s1 }}>
                {["#", "EJERCICIO", "SERIES", "REPS", "PESO (kg)", "DESCANSO", "NOTAS", ""].map(h => (
                  <div key={h} style={{ fontSize: 9, color: C.muted, fontFamily: Fh, letterSpacing: 2, fontWeight: 700 }}>{h}</div>
                ))}
              </div>
              {selDay.exercises.length > 0 ? selDay.exercises.map((ex, i) => (
                <div key={ex.id} style={{ display: "grid", gridTemplateColumns: "28px 1fr 56px 68px 88px 68px 1fr 32px", gap: 12, padding: "13px 24px", borderBottom: `1px solid ${C.border}`, alignItems: "center" }}>
                  <div style={{ fontFamily: Fh, fontWeight: 700, color: C.dim, fontSize: 12 }}>{String(i + 1).padStart(2, "0")}</div>
                  <div style={{ fontWeight: 500, fontSize: 13 }}>{ex.name}</div>
                  <div style={{ fontFamily: Fh, fontWeight: 700, fontSize: 14 }}>{ex.sets}</div>
                  <div style={{ fontFamily: Fh, fontWeight: 700, fontSize: 14 }}>{ex.reps}</div>
                  <input type="number" defaultValue={ex.kg || 0} style={{ width: 72, background: C.s3, border: `1px solid ${C.border}`, borderRadius: 5, padding: "5px 8px", fontSize: 13, fontFamily: Fh, fontWeight: 700, color: C.w }} />
                  <div style={{ fontSize: 12, color: C.muted }}>{ex.rest}s</div>
                  <div style={{ fontSize: 11, color: C.muted, fontStyle: ex.notes ? "normal" : "italic" }}>{ex.notes || "—"}</div>
                  <button style={{ background: "transparent", border: "none", color: C.dim, cursor: "pointer", fontSize: 16 }}>⋯</button>
                </div>
              )) : (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 0", gap: 12 }}>
                  <div style={{ fontFamily: Fh, fontSize: 11, color: C.muted, letterSpacing: 2 }}>SIN EJERCICIOS ASIGNADOS</div>
                  <Btn small variant="ghost">+ AGREGAR EJERCICIO</Btn>
                </div>
              )}
            </div>
          </>
        ) : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: C.muted, fontFamily: Fh, letterSpacing: 2, fontSize: 11 }}>SELECCIONÁ UN DÍA</div>
        )}
      </div>
    </div>
  );
}

// ── ASSIGN PROGRAM MODAL ─────────────────────────────────────────
function AssignProgramModal({ student, gymId, onClose, onAssigned }: {
  student: RealStudent; gymId: string; onClose: () => void; onAssigned: () => void;
}) {
  const [selectedProgId, setSelectedProgId] = useState("");
  const [loading, setLoading]               = useState(false);
  const [saving, setSaving]                 = useState(false);
  const [error, setError]                   = useState("");
  const [programs, setPrograms]             = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const result = await getPrograms(gymId);
      if (result.success) setPrograms(result.data as { id: string; name: string }[]);
      setLoading(false);
    };
    load();
  }, [gymId]);

  const handleAssign = async () => {
    if (!selectedProgId) return;
    setSaving(true); setError("");
    const result = await assignProgram(student.id, selectedProgId);
    if (result.success) { onAssigned(); onClose(); }
    else { setError(result.error || "Error al asignar"); setSaving(false); }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "#000000cc", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
      <div style={{ width: 420, background: C.s1, border: `1px solid ${C.border}`, borderRadius: 12, padding: "32px 36px" }}>
        <div style={{ fontFamily: Fh, fontWeight: 800, fontSize: 20, letterSpacing: 3, marginBottom: 6 }}>ASIGNAR PROGRAMA</div>
        <div style={{ fontSize: 12, color: C.muted, marginBottom: 24 }}>{student.full_name}</div>
        {loading ? (
          <div style={{ textAlign: "center", padding: "20px 0", color: C.muted, fontFamily: Fh, letterSpacing: 2, fontSize: 11 }}>CARGANDO PROGRAMAS...</div>
        ) : (
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 10, color: C.muted, fontFamily: Fh, letterSpacing: 2, display: "block", marginBottom: 10 }}>SELECCIONÁ UN PROGRAMA</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {programs.map(p => (
                <button key={p.id} onClick={() => setSelectedProgId(p.id)} style={{
                  textAlign: "left", padding: "12px 16px", borderRadius: 8,
                  background: selectedProgId === p.id ? C.w + "15" : C.s3,
                  border: `1px solid ${selectedProgId === p.id ? C.w : C.border}`,
                  cursor: "pointer", display: "flex", alignItems: "center", gap: 12,
                }}>
                  <div style={{ width: 16, height: 16, borderRadius: "50%", border: `2px solid ${selectedProgId === p.id ? C.w : C.dim}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {selectedProgId === p.id && <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.w }} />}
                  </div>
                  <span style={{ fontFamily: Fh, fontWeight: 700, fontSize: 14, letterSpacing: 1.5, color: C.w }}>{p.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        {error && <div style={{ marginBottom: 16, padding: "10px 14px", borderRadius: 6, background: C.red + "22", border: `1px solid ${C.red}44`, fontSize: 12, color: C.red }}>{error}</div>}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <Btn variant="ghost" small onClick={onClose}>CANCELAR</Btn>
          <Btn small onClick={handleAssign} disabled={saving || !selectedProgId}>{saving ? "ASIGNANDO..." : "CONFIRMAR"}</Btn>
        </div>
      </div>
    </div>
  );
}

// ── COACH — STUDENTS (DATOS REALES) ──────────────────────────────
function StudentsView({ students, loading, gymId, onRefresh }: {
  students: RealStudent[]; loading: boolean; gymId: string; onRefresh: () => void;
}) {
  const [showModal, setShowModal]         = useState(false);
  const [assignStudent, setAssignStudent] = useState<RealStudent | null>(null);

  return (
    <div style={card()}>
      {showModal && (
        <CreateStudentModal gymId={gymId} onClose={() => setShowModal(false)} onCreated={onRefresh} />
      )}
      {assignStudent && (
        <AssignProgramModal student={assignStudent} gymId={gymId} onClose={() => setAssignStudent(null)} onAssigned={() => { setAssignStudent(null); onRefresh(); }} />
      )}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div style={{ fontFamily: Fh, fontWeight: 800, fontSize: 18, letterSpacing: 3 }}>GESTIÓN DE ALUMNOS</div>
        <Btn small onClick={() => setShowModal(true)}>+ NUEVO ALUMNO</Btn>
      </div>
      {loading ? (
        <div style={{ textAlign: "center", padding: "40px 0", color: C.muted, fontFamily: Fh, letterSpacing: 2, fontSize: 11 }}>CARGANDO...</div>
      ) : students.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <div style={{ fontFamily: Fh, fontSize: 13, color: C.muted, letterSpacing: 2 }}>NO HAY ALUMNOS AÚN</div>
          <Btn small onClick={() => setShowModal(true)}>+ CREAR PRIMER ALUMNO</Btn>
        </div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${C.border}` }}>
              {["Alumno", "Programa", "Semana / Día", "Acciones"].map(h => (
                <th key={h} style={{ textAlign: "left", paddingBottom: 12, paddingRight: 16, fontSize: 9, color: C.muted, fontFamily: Fh, letterSpacing: 2, fontWeight: 700 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {students.map((s, i) => {
              const prog     = s.student_programs?.[0];
              const initials = s.full_name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();
              return (
                <tr key={s.id} style={{ borderBottom: i < students.length - 1 ? `1px solid ${C.border}` : "none" }}>
                  <td style={{ padding: "15px 16px 15px 0" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <Avatar initials={initials} />
                      <span style={{ fontWeight: 500, fontSize: 13 }}>{s.full_name}</span>
                    </div>
                  </td>
                  <td style={{ paddingRight: 16, fontSize: 11, fontFamily: Fh, letterSpacing: 1, color: prog ? C.w : C.muted }}>
                    {prog?.programs?.name || <span style={{ color: C.orange, fontSize: 10 }}>SIN ASIGNAR</span>}
                  </td>
                  <td style={{ paddingRight: 16, fontFamily: Fh, fontWeight: 700, fontSize: 14, color: C.muted }}>
                    {prog ? `Sem ${prog.current_week_number} · Día ${prog.current_day_number}` : "—"}
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 8 }}>
                      <Btn small variant="green" onClick={() => setAssignStudent(s)}>
                        {prog ? "CAMBIAR PROGRAMA" : "ASIGNAR PROGRAMA"}
                      </Btn>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ── STUDENT — HOME ────────────────────────────────────────────────
function StudentHome({ startSession, dayData }: { startSession: () => void; dayData: StudentDayData | null }) {
  const weekDays  = ["L", "M", "X", "J", "V", "S", "D"];
  const trained   = [2, 4];

  if (!dayData) {
    return (
      <div style={{ maxWidth: 560, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "40vh", gap: 16 }}>
        <div style={{ fontFamily: Fh, fontWeight: 800, fontSize: 20, letterSpacing: 3, color: C.muted }}>SIN PROGRAMA ASIGNADO</div>
        <div style={{ fontSize: 12, color: C.muted, textAlign: "center" }}>Tu entrenador todavía no te asignó un programa. Consultale.</div>
      </div>
    );
  }

  if (!dayData.dayName) {
    return (
      <div style={{ maxWidth: 560, display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ ...card({ borderLeft: `4px solid ${C.w}` }) }}>
          <div style={{ fontSize: 9, color: C.muted, letterSpacing: 3, fontFamily: Fh, fontWeight: 700, marginBottom: 8 }}>TU PROGRAMA</div>
          <div style={{ fontFamily: Fh, fontWeight: 800, fontSize: 24, letterSpacing: 2, marginBottom: 8 }}>{dayData.programName}</div>
          <div style={{ color: C.muted, fontSize: 12 }}>Semana {dayData.weekNumber} · Día {dayData.dayNumber}</div>
          <div style={{ marginTop: 16, color: C.muted, fontSize: 12 }}>Los ejercicios de este día aún no fueron cargados por tu entrenador.</div>
        </div>
      </div>
    );
  }

  const totalSets = dayData.exercises.reduce((a, e) => a + e.sets, 0);

  return (
    <div style={{ maxWidth: 560, display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ ...card({ position: "relative", overflow: "hidden", borderLeft: `4px solid ${C.w}` }) }}>
        <div style={{ position: "absolute", right: 20, top: "50%", transform: "translateY(-50%)", fontFamily: Fh, fontWeight: 900, fontSize: 140, color: C.w, opacity: 0.03, lineHeight: 1, pointerEvents: "none", userSelect: "none" }}>A</div>
        <div style={{ fontSize: 9, color: C.muted, letterSpacing: 3, fontFamily: Fh, fontWeight: 700, marginBottom: 8 }}>
          {dayData.programName} · SEM {dayData.weekNumber}
        </div>
        <div style={{ fontFamily: Fh, fontWeight: 800, fontSize: 28, letterSpacing: 2, marginBottom: 12 }}>{dayData.dayName}</div>
        <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
          {dayData.muscles.map(m => <Tag key={m} label={m} />)}
        </div>
        <div style={{ display: "flex", gap: 24, marginBottom: 24 }}>
          <div><span style={{ fontFamily: Fh, fontWeight: 800, fontSize: 24 }}>{dayData.exercises.length}</span><span style={{ color: C.muted, fontSize: 11, marginLeft: 5 }}>ejercicios</span></div>
          <div><span style={{ fontFamily: Fh, fontWeight: 800, fontSize: 24 }}>{totalSets}</span><span style={{ color: C.muted, fontSize: 11, marginLeft: 5 }}>series</span></div>
          <div><span style={{ fontFamily: Fh, fontWeight: 800, fontSize: 24 }}>~{Math.round(totalSets * 3.5)}</span><span style={{ color: C.muted, fontSize: 11, marginLeft: 5 }}>min</span></div>
        </div>
        <Btn onClick={startSession}>▶  INICIAR SESIÓN</Btn>
      </div>
      <div style={card()}>
        <div style={{ fontSize: 9, color: C.muted, letterSpacing: 3, fontFamily: Fh, fontWeight: 700, marginBottom: 14 }}>ESTA SEMANA</div>
        <div style={{ display: "flex", gap: 8 }}>
          {weekDays.map((d, i) => {
            const isTrained = trained.includes(i);
            const isToday   = i === 0;
            return (
              <div key={d} style={{ flex: 1, textAlign: "center" }}>
                <div style={{ fontSize: 9, color: C.muted, fontFamily: Fh, fontWeight: 700, marginBottom: 8 }}>{d}</div>
                <div style={{ height: 40, borderRadius: 5, background: isTrained ? C.green : C.s4, border: isToday ? `1px solid ${C.w}` : `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {isTrained && <span style={{ color: C.bg, fontWeight: 700, fontSize: 14 }}>✓</span>}
                  {isToday && !isTrained && <div style={{ width: 5, height: 5, borderRadius: "50%", background: C.w }} />}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {dayData.exercises.length > 0 && (
        <div style={card()}>
          <div style={{ fontSize: 9, color: C.muted, letterSpacing: 3, fontFamily: Fh, fontWeight: 700, marginBottom: 14 }}>EJERCICIOS DEL DÍA</div>
          {dayData.exercises.map((ex, i) => (
            <div key={ex.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 0", borderBottom: i < dayData.exercises.length - 1 ? `1px solid ${C.border}` : "none" }}>
              <div style={{ fontFamily: Fh, fontWeight: 700, color: C.dim, fontSize: 12, width: 20, textAlign: "right" }}>{i + 1}</div>
              <div style={{ flex: 1, fontWeight: 500 }}>{ex.name}</div>
              <div style={{ fontSize: 11, color: C.muted, fontFamily: Fh }}>{ex.sets} × {ex.reps}</div>
              <div style={{ fontFamily: Fh, fontWeight: 700, fontSize: 12, color: ex.kg > 0 ? C.w : C.muted, minWidth: 50, textAlign: "right" }}>{ex.kg > 0 ? `${ex.kg} kg` : "PC"}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── STUDENT — SESSION ─────────────────────────────────────────────
function ActiveSession({ sessionSets, toggleSetDone, updateSet, finishSession, totalDone, totalSets, done }: {
  sessionSets: Record<number, SetState[]>;
  toggleSetDone: (exId: number, setIdx: number) => void;
  updateSet: (exId: number, setIdx: number, field: string, value: number) => void;
  finishSession: () => void;
  totalDone: number; totalSets: number; done: boolean;
}) {
  const day     = PROGRAMS[0].weeks[0].days[0];
  const [expanded, setExpanded] = useState<number | null>(day.exercises[0]?.id);
  const progress = totalSets > 0 ? (totalDone / totalSets) * 100 : 0;
  const allDone  = totalDone === totalSets && totalSets > 0;

  if (done) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "60vh", gap: 16 }}>
      <div style={{ fontSize: 64 }}>🔥</div>
      <div style={{ fontFamily: Fh, fontWeight: 800, fontSize: 28, letterSpacing: 3, color: C.green }}>SESIÓN COMPLETADA</div>
      <div style={{ color: C.muted, fontSize: 12, letterSpacing: 1 }}>Registrando progreso...</div>
    </div>
  );

  return (
    <div style={{ maxWidth: 560, display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ ...card({ padding: "16px 24px" }), display: "flex", alignItems: "center", gap: 20 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: Fh, fontWeight: 800, fontSize: 16, letterSpacing: 2, marginBottom: 10 }}>{day.name}</div>
          <div style={{ height: 4, background: C.s4, borderRadius: 2 }}>
            <div style={{ height: 4, width: `${progress}%`, background: C.green, borderRadius: 2, transition: "width 0.3s ease" }} />
          </div>
        </div>
        <div style={{ fontFamily: Fh, fontWeight: 800, fontSize: 26, color: progress === 100 ? C.green : C.w, flexShrink: 0 }}>{totalDone}/{totalSets}</div>
      </div>
      {day.exercises.map((ex, exIdx) => {
        const sets      = sessionSets[ex.id] || [];
        const allExDone = sets.length > 0 && sets.every(s => s.done);
        const isOpen    = expanded === ex.id;
        return (
          <div key={ex.id} style={{ background: C.s2, borderRadius: 8, border: `1px solid ${allExDone ? C.green + "66" : C.border}`, borderLeft: `4px solid ${allExDone ? C.green : isOpen ? C.w : "transparent"}`, overflow: "hidden" }}>
            <button onClick={() => setExpanded(isOpen ? null : ex.id)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 14, padding: "14px 20px", background: "transparent", border: "none", cursor: "pointer", textAlign: "left" }}>
              <div style={{ width: 26, height: 26, borderRadius: "50%", flexShrink: 0, background: allExDone ? C.green : C.s4, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {allExDone ? <span style={{ color: C.bg, fontSize: 12, fontWeight: 700 }}>✓</span> : <span style={{ fontFamily: Fh, fontWeight: 700, fontSize: 11, color: C.muted }}>{String(exIdx + 1).padStart(2, "0")}</span>}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 13, color: allExDone ? C.muted : C.w }}>{ex.name}</div>
                <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{ex.sets} series · {ex.reps} reps{ex.kg > 0 ? ` · ${ex.kg} kg sugerido` : " · Peso corporal"}</div>
              </div>
              <div style={{ display: "flex", gap: 3, marginRight: 10 }}>
                {sets.map((s, i) => <div key={i} style={{ width: 8, height: 8, borderRadius: 2, background: s.done ? C.green : C.s4 }} />)}
              </div>
              <span style={{ color: C.dim, fontSize: 10 }}>{isOpen ? "▲" : "▼"}</span>
            </button>
            {isOpen && (
              <div style={{ borderTop: `1px solid ${C.border}`, padding: "8px 20px 16px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "44px 1fr 1fr 52px", gap: 10, padding: "8px 0 6px", borderBottom: `1px solid ${C.border}` }}>
                  {["SERIE", "PESO kg", "REPS", ""].map(h => <div key={h} style={{ fontSize: 9, color: C.muted, fontFamily: Fh, letterSpacing: 2, fontWeight: 700 }}>{h}</div>)}
                </div>
                {sets.map((s, setIdx) => (
                  <div key={setIdx} style={{ display: "grid", gridTemplateColumns: "44px 1fr 1fr 52px", gap: 10, alignItems: "center", padding: "6px 0", opacity: s.done ? 0.4 : 1 }}>
                    <div style={{ fontFamily: Fh, fontWeight: 700, fontSize: 15, color: C.muted }}>#{s.set}</div>
                    <input type="number" value={s.weight} onChange={e => updateSet(ex.id, setIdx, "weight", Number(e.target.value))} style={{ background: C.s3, border: `1px solid ${C.border}`, borderRadius: 6, padding: "8px 10px", fontSize: 16, fontFamily: Fh, fontWeight: 700, color: C.w, textAlign: "center", width: "100%" }} />
                    <input type="number" value={s.reps} onChange={e => updateSet(ex.id, setIdx, "reps", Number(e.target.value))} style={{ background: C.s3, border: `1px solid ${C.border}`, borderRadius: 6, padding: "8px 10px", fontSize: 16, fontFamily: Fh, fontWeight: 700, color: C.w, textAlign: "center", width: "100%" }} />
                    <button onClick={() => toggleSetDone(ex.id, setIdx)} style={{ height: 38, borderRadius: 6, cursor: "pointer", fontWeight: 700, fontSize: 16, background: s.done ? C.green : C.s3, border: `1px solid ${s.done ? C.green : C.border}`, color: s.done ? C.bg : C.dim }}>{s.done ? "✓" : "○"}</button>
                  </div>
                ))}
                {ex.notes && <div style={{ marginTop: 10, padding: "8px 12px", background: C.s3, borderRadius: 6, fontSize: 11, color: C.muted, borderLeft: `2px solid ${C.dim}` }}>💬 {ex.notes}</div>}
              </div>
            )}
          </div>
        );
      })}
      {allDone && <Btn onClick={finishSession}>🏁  FINALIZAR SESIÓN</Btn>}
    </div>
  );
}

// ── STUDENT — PROGRESS ────────────────────────────────────────────
function StudentProgress() {
  const sessions = [
    { date: "Hoy", day: "PECHO + TRÍCEPS", duration: "58 min", sets: 16, vol: "15.2t" },
    { date: "Hace 2 días", day: "PIERNAS + HOMBROS", duration: "65 min", sets: 19, vol: "17.8t" },
    { date: "Hace 4 días", day: "ESPALDA + BÍCEPS", duration: "52 min", sets: 14, vol: "13.4t" },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", gap: 14 }}>
        <StatCard label="SESIONES TOTALES" value="18" sub="últimos 60 días" />
        <StatCard label="BANCA HOY" value="82.5" sub="+12.5 kg desde inicio" color={C.green} />
        <StatCard label="RACHA ACTUAL" value="5d" sub="mejor: 12 días" />
        <StatCard label="VOLUMEN SEMANAL" value="46t" sub="kg acumulados" />
      </div>
      <div style={card()}>
        <div style={{ fontFamily: Fh, fontWeight: 800, fontSize: 15, letterSpacing: 3, marginBottom: 4 }}>PRESS DE BANCA — PROGRESIÓN</div>
        <div style={{ fontSize: 11, color: C.muted, marginBottom: 20 }}>Peso máximo por semana (kg)</div>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={BENCH_PROGRESS} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
            <XAxis dataKey="w" tick={{ fill: C.muted, fontSize: 10, fontFamily: Fh }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: C.muted, fontSize: 10 }} axisLine={false} tickLine={false} domain={[65, 90]} />
            <Tooltip contentStyle={{ background: C.s3, border: `1px solid ${C.border}`, borderRadius: 6, color: C.w }} formatter={(v) => [`${Number(v)} kg`, "Peso"]} />
            <Line type="monotone" dataKey="kg" stroke={C.green} strokeWidth={2.5} dot={{ fill: C.green, r: 4, strokeWidth: 0 }} activeDot={{ r: 6, fill: C.green, strokeWidth: 0 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div style={card()}>
        <div style={{ fontFamily: Fh, fontWeight: 800, fontSize: 15, letterSpacing: 3, marginBottom: 4 }}>VOLUMEN SEMANAL</div>
        <div style={{ fontSize: 11, color: C.muted, marginBottom: 20 }}>Tonelaje por día (kg)</div>
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={WEEKLY_VOL} barSize={32} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
            <XAxis dataKey="d" tick={{ fill: C.muted, fontSize: 11, fontFamily: Fh }} axisLine={false} tickLine={false} />
            <YAxis hide />
            <Tooltip contentStyle={{ background: C.s3, border: `1px solid ${C.border}`, borderRadius: 6, color: C.w }} formatter={(v) => Number(v ?? 0) > 0 ? [`${(Number(v) / 1000).toFixed(1)} t`, "Volumen"] : ["Descanso"]} />
            <Bar dataKey="v" radius={[4, 4, 0, 0]}>
              {WEEKLY_VOL.map((e, i) => <Cell key={i} fill={e.v > 0 ? C.blue : C.s4} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div style={card()}>
        <div style={{ fontFamily: Fh, fontWeight: 800, fontSize: 15, letterSpacing: 3, marginBottom: 16 }}>SESIONES RECIENTES</div>
        {sessions.map((s, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 16, padding: "12px 0", borderBottom: i < sessions.length - 1 ? `1px solid ${C.border}` : "none" }}>
            <div style={{ width: 40, height: 40, borderRadius: 6, background: C.s3, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>💪</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: Fh, fontWeight: 700, fontSize: 13, letterSpacing: 1 }}>{s.day}</div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{s.date} · {s.duration}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontFamily: Fh, fontWeight: 700, fontSize: 13 }}>{s.sets} series</div>
              <div style={{ fontSize: 11, color: C.muted }}>{s.vol}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── APP SHELL ─────────────────────────────────────────────────────
export default function Home() {
  const [role, setRole]               = useState<"coach" | "student">("coach");
  const [userRole, setUserRole]       = useState<"coach" | "student" | null>(null);
  const [view, setView]               = useState("dashboard");
  const [sessionSets, setSessionSets] = useState<Record<number, SetState[]>>({});
  const [sessionDone, setSessionDone] = useState(false);
  const [gymId, setGymId]             = useState<string>("");
  const [students, setStudents]       = useState<RealStudent[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ email: string; name: string }>({ email: "", name: "Cargando..." });
  const [dayData, setDayData]         = useState<StudentDayData | null>(null);
  const [isMobile, setIsMobile]       = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700;800;900&family=Barlow:wght@300;400;500;600&display=swap";
    document.head.appendChild(link);
  }, []);

  useEffect(() => {
    const loadUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) return;
      setCurrentUser({ email: user.email, name: user.user_metadata?.full_name || user.email.split("@")[0] });

      // Leer rol real desde profiles
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, gym_id")
        .eq("id", user.id)
        .single();

      if (profile) {
        const realRole = (profile.role === "coach" || profile.role === "admin") ? "coach" : "student";
        setUserRole(realRole);
        setRole(realRole);
        if (profile.gym_id) setGymId(profile.gym_id);

        // Si es alumno, cargar su rutina del día
        if (realRole === "student") {
          const dayResult = await getStudentCurrentDay(user.id);
          if (dayResult.success && dayResult.data) {
            setDayData(dayResult.data as StudentDayData);
          }
        }
      } else {
        const id = await getGymId(user.email);
        if (id) setGymId(id);
      }
    };
    loadUser();
  }, []);

  const loadStudents = useCallback(async () => {
    if (!gymId) return;
    setLoadingStudents(true);
    const result = await getStudents(gymId);
    if (result.success) setStudents(result.data as RealStudent[]);
    setLoadingStudents(false);
  }, [gymId]);

  useEffect(() => { loadStudents(); }, [loadStudents]);

  const switchRole = (r: "coach" | "student") => {
    setRole(r); setView("dashboard"); setSessionSets({}); setSessionDone(false);
  };

  const startSession = () => {
    const day = PROGRAMS[0].weeks[0].days[0];
    const init: Record<number, SetState[]> = {};
    day.exercises.forEach(ex => {
      init[ex.id] = Array.from({ length: ex.sets }, (_, i) => ({
        set: i + 1, weight: ex.kg, reps: parseInt(ex.reps.split("-")[0]), done: false,
      }));
    });
    setSessionSets(init); setSessionDone(false); setView("session");
  };

  const updateSet = (exId: number, setIdx: number, field: string, value: number) => {
    setSessionSets(prev => ({ ...prev, [exId]: prev[exId].map((s, i) => i === setIdx ? { ...s, [field]: value } : s) }));
  };

  const toggleSetDone = (exId: number, setIdx: number) => {
    setSessionSets(prev => ({ ...prev, [exId]: prev[exId].map((s, i) => i === setIdx ? { ...s, done: !s.done } : s) }));
  };

  const finishSession = () => {
    setSessionDone(true);
    setTimeout(() => setView("progress"), 2200);
  };

  const allSets   = Object.values(sessionSets).flat();
  const totalDone = allSets.filter(s => s.done).length;
  const totalSets = allSets.length;

  const coachNav   = [{ id: "dashboard", label: "DASHBOARD", icon: "📊" }, { id: "programs", label: "PROGRAMAS", icon: "📋" }, { id: "students", label: "ALUMNOS", icon: "👥" }];
  const studentNav = [{ id: "dashboard", label: "HOY", icon: "🏠" }, { id: "session", label: "SESIÓN", icon: "💪" }, { id: "progress", label: "PROGRESO", icon: "📈" }];
  const navItems   = role === "coach" ? coachNav : studentNav;

  const mainContent = (
    <>
      {role === "coach" && view === "dashboard" && <CoachDashboard navigate={setView} students={students} />}
      {role === "coach" && view === "programs"  && <ProgramsView />}
      {role === "coach" && view === "students"  && <StudentsView students={students} loading={loadingStudents} gymId={gymId} onRefresh={loadStudents} />}
      {role === "student" && view === "dashboard" && <StudentHome startSession={startSession} dayData={dayData} />}
      {role === "student" && view === "progress"  && <StudentProgress />}
      {role === "student" && view === "session"   && (
        totalSets === 0
          ? <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "50vh", gap: 16 }}>
              <div style={{ fontFamily: Fh, fontSize: 12, color: C.muted, letterSpacing: 2 }}>NO HAY SESIÓN ACTIVA</div>
              <Btn onClick={startSession}>▶  INICIAR SESIÓN</Btn>
            </div>
          : <ActiveSession sessionSets={sessionSets} toggleSetDone={toggleSetDone} updateSet={updateSet} finishSession={finishSession} totalDone={totalDone} totalSets={totalSets} done={sessionDone} />
      )}
    </>
  );

  const userInitials = currentUser.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() || "??";

  // ── MOBILE LAYOUT ─────────────────────────────────────────────
  if (isMobile) {
    return (
      <div style={{ minHeight: "100vh", background: C.bg, color: C.w, fontFamily: Fb, fontSize: 14 }}>
        {/* Header */}
        <header style={{ position: "sticky", top: 0, zIndex: 100, background: C.s1, borderBottom: `1px solid ${C.border}`, padding: "0 16px", height: 52, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
            <span style={{ fontFamily: Fh, fontWeight: 900, fontSize: 11, color: C.dim, letterSpacing: 1 }}>//</span>
            <span style={{ fontFamily: Fh, fontWeight: 900, fontSize: 18, letterSpacing: 4, color: C.w }}>ACTIVE</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* Toggle rol solo para coaches */}
            {userRole === "coach" && (
              <div style={{ display: "flex", background: C.s3, borderRadius: 5, padding: 2, gap: 2 }}>
                {(["coach", "student"] as const).map(r => (
                  <button key={r} onClick={() => switchRole(r)} style={{ padding: "4px 10px", borderRadius: 4, fontSize: 8, fontFamily: Fh, fontWeight: 700, letterSpacing: 1, border: "none", background: role === r ? C.w : "transparent", color: role === r ? C.bg : C.muted, cursor: "pointer" }}>
                    {r === "coach" ? "PROFE" : "ALUMNO"}
                  </button>
                ))}
              </div>
            )}
            <button onClick={async () => { const supabase = createClient(); await supabase.auth.signOut(); window.location.href = "/login"; }}
              style={{ background: "transparent", border: `1px solid ${C.border}`, borderRadius: 5, padding: "4px 10px", color: C.muted, fontFamily: Fh, fontWeight: 700, fontSize: 8, letterSpacing: 1.5, cursor: "pointer" }}>
              SALIR
            </button>
          </div>
        </header>

        {/* Content */}
        <div style={{ padding: "16px 16px 80px" }}>
          {mainContent}
        </div>

        {/* Bottom nav */}
        <nav style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: C.s1, borderTop: `1px solid ${C.border}`, display: "flex", height: 60, zIndex: 100 }}>
          {navItems.map(item => (
            <button key={item.id} onClick={() => setView(item.id)} style={{
              flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              gap: 3, border: "none", background: "transparent", cursor: "pointer",
              borderTop: view === item.id ? `2px solid ${C.w}` : "2px solid transparent",
              color: view === item.id ? C.w : C.muted,
            }}>
              <span style={{ fontSize: 16 }}>{item.icon}</span>
              <span style={{ fontSize: 8, fontFamily: Fh, fontWeight: 700, letterSpacing: 1.5 }}>{item.label}</span>
            </button>
          ))}
        </nav>
      </div>
    );
  }

  // ── DESKTOP LAYOUT ────────────────────────────────────────────
  return (
    <div style={{ display: "flex", height: "100vh", background: C.bg, color: C.w, fontFamily: Fb, fontSize: 14, overflow: "hidden" }}>
      <aside style={{ width: 220, background: C.s1, borderRight: `1px solid ${C.border}`, display: "flex", flexDirection: "column", flexShrink: 0 }}>
        <div style={{ padding: "22px 20px 18px", borderBottom: `1px solid ${C.border}` }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
            <span style={{ fontFamily: Fh, fontWeight: 900, fontSize: 13, color: C.dim, letterSpacing: 1 }}>//</span>
            <span style={{ fontFamily: Fh, fontWeight: 900, fontSize: 22, letterSpacing: 5, color: C.w }}>ACTIVE</span>
          </div>
          <div style={{ fontSize: 9, color: C.muted, letterSpacing: 3, marginTop: 3 }}>GYM SYSTEM</div>
        </div>
        {userRole === "coach" && (
          <div style={{ padding: "12px 14px", borderBottom: `1px solid ${C.border}` }}>
            <div style={{ display: "flex", background: C.s3, borderRadius: 6, padding: 3, gap: 3 }}>
              {(["coach", "student"] as const).map(r => (
                <button key={r} onClick={() => switchRole(r)} style={{ flex: 1, padding: "6px 0", borderRadius: 4, fontSize: 10, fontFamily: Fh, fontWeight: 700, letterSpacing: 1.5, border: "none", background: role === r ? C.w : "transparent", color: role === r ? C.bg : C.muted, transition: "all 0.15s" }}>
                  {r === "coach" ? "PROFE" : "ALUMNO"}
                </button>
              ))}
            </div>
          </div>
        )}
        <nav style={{ flex: 1, padding: "8px 10px" }}>
          {navItems.map(item => (
            <button key={item.id} onClick={() => setView(item.id)} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "10px 14px", borderRadius: 6, marginBottom: 2, border: "none", background: view === item.id ? C.s3 : "transparent", color: view === item.id ? C.w : C.muted, fontSize: 10, fontFamily: Fh, fontWeight: 700, letterSpacing: 2.5, borderLeft: view === item.id ? `2px solid ${C.w}` : "2px solid transparent", transition: "all 0.15s" }}>
              <span style={{ fontSize: 14 }}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
        <div style={{ padding: "14px", borderTop: `1px solid ${C.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <Avatar initials={userInitials} />
            <div>
              <div style={{ fontSize: 12, fontWeight: 600 }}>{currentUser.name}</div>
              <div style={{ fontSize: 10, color: C.muted }}>{role === "coach" ? "Entrenador" : "Alumno"}</div>
            </div>
          </div>
          <button onClick={async () => { const supabase = createClient(); await supabase.auth.signOut(); window.location.href = "/login"; }}
            style={{ width: "100%", padding: "7px", borderRadius: 6, border: `1px solid ${C.border}`, background: "transparent", color: C.muted, fontFamily: Fh, fontWeight: 700, fontSize: 9, letterSpacing: 2, cursor: "pointer" }}>
            CERRAR SESIÓN
          </button>
        </div>
      </aside>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <header style={{ height: 52, padding: "0 32px", borderBottom: `1px solid ${C.border}`, background: C.s1, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div style={{ fontFamily: Fh, fontWeight: 700, fontSize: 13, letterSpacing: 3, color: C.muted }}>{navItems.find(n => n.id === view)?.label || ""}</div>
          <div style={{ fontSize: 10, color: C.muted, letterSpacing: 1.5, fontFamily: Fh }}>/// ACTIVE GYM</div>
        </header>
        <div style={{ flex: 1, overflow: "auto", padding: "28px 32px" }}>
          {mainContent}
        </div>
      </div>
    </div>
  );
}