"use server";

import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function createStudent(formData: {
  fullName: string;
  email: string;
  password: string;
  gymId: string;
}) {
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: formData.email,
    password: formData.password,
    email_confirm: true,
    user_metadata: { full_name: formData.fullName },
  });

  if (authError) return { success: false, error: authError.message };

  const { error: profileError } = await supabaseAdmin
    .from("profiles")
    .update({
      full_name: formData.fullName,
      gym_id: formData.gymId,
      role: "student",
    })
    .eq("id", authData.user.id);

  if (profileError) return { success: false, error: profileError.message };
  return { success: true, userId: authData.user.id };
}

export async function getStudents(gymId: string) {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select(`
      id,
      full_name,
      role,
      student_programs (
        id,
        status,
        current_week_number,
        current_day_number,
        programs ( name )
      )
    `)
    .eq("gym_id", gymId)
    .eq("role", "student")
    .order("full_name");

  if (error) return { success: false, error: error.message, data: [] };
  return { success: true, data: data || [] };
}

export async function getGymId(userEmail: string) {
  const { data: authUser } = await supabaseAdmin.auth.admin.listUsers();
  const user = authUser?.users?.find(u => u.email === userEmail);
  if (!user) return null;

  const { data } = await supabaseAdmin
    .from("profiles")
    .select("gym_id")
    .eq("id", user.id)
    .single();

  return data?.gym_id || null;
}

export async function assignProgram(studentId: string, programId: string) {
  const { data: existing } = await supabaseAdmin
    .from("student_programs")
    .select("id")
    .eq("student_id", studentId)
    .eq("status", "active")
    .single();

  if (existing) {
    await supabaseAdmin
      .from("student_programs")
      .update({ status: "paused" })
      .eq("id", existing.id);
  }

  const { error } = await supabaseAdmin
    .from("student_programs")
    .insert({
      student_id: studentId,
      program_id: programId,
      status: "active",
      start_date: new Date().toISOString().split("T")[0],
      current_week_number: 1,
      current_day_number: 1,
    });

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function getPrograms(gymId: string) {
  const { data, error } = await supabaseAdmin
    .from("programs")
    .select("id, name")
    .eq("gym_id", gymId)
    .eq("status", "active")
    .order("name");

  if (error) return { success: false, error: error.message, data: [] };
  return { success: true, data: data || [] };
}

export async function getStudentCurrentDay(studentId: string) {
  // 1. Buscar programa activo del alumno
  const { data: sp, error: spError } = await supabaseAdmin
    .from("student_programs")
    .select(`
      id,
      current_week_number,
      current_day_number,
      programs ( id, name )
    `)
    .eq("student_id", studentId)
    .eq("status", "active")
    .single();

  if (spError || !sp) return { success: false, error: "Sin programa asignado", data: null };

  const program = sp.programs as { id: string; name: string } | null;
  if (!program) return { success: false, error: "Programa no encontrado", data: null };

  // 2. Buscar la semana actual
  const { data: week } = await supabaseAdmin
    .from("weeks")
    .select("id, number, name")
    .eq("program_id", program.id)
    .eq("number", sp.current_week_number)
    .single();

  if (!week) return {
    success: true,
    data: {
      programName: program.name,
      weekNumber: sp.current_week_number,
      dayNumber: sp.current_day_number,
      dayName: null,
      muscles: [],
      exercises: [],
      studentProgramId: sp.id,
    }
  };

  // 3. Buscar el día actual
  const { data: day } = await supabaseAdmin
    .from("days")
    .select("id, number, name, muscle_groups")
    .eq("week_id", week.id)
    .eq("number", sp.current_day_number)
    .single();

  if (!day) return {
    success: true,
    data: {
      programName: program.name,
      weekNumber: sp.current_week_number,
      dayNumber: sp.current_day_number,
      dayName: null,
      muscles: [],
      exercises: [],
      studentProgramId: sp.id,
    }
  };

  // 4. Buscar ejercicios del día
  const { data: exercises } = await supabaseAdmin
    .from("workout_exercises")
    .select(`
      id,
      order_index,
      sets,
      reps,
      target_weight,
      rest_seconds,
      notes,
      exercises ( id, name, muscle_group )
    `)
    .eq("day_id", day.id)
    .order("order_index");

  return {
    success: true,
    data: {
      programName: program.name,
      weekNumber: sp.current_week_number,
      dayNumber: sp.current_day_number,
      dayName: day.name,
      muscles: day.muscle_groups || [],
      exercises: (exercises || []).map(e => ({
        id: e.id,
        name: (e.exercises as { name: string } | null)?.name || "Ejercicio",
        sets: e.sets,
        reps: e.reps,
        kg: Number(e.target_weight) || 0,
        rest: e.rest_seconds || 90,
        notes: e.notes || "",
      })),
      studentProgramId: sp.id,
    }
  };
}