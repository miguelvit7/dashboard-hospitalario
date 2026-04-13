"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const ORDEN_MESES = [
  "ENERO","FEBRERO","MARZO","ABRIL","MAYO","JUNIO",
  "JULIO","AGOSTO","SEPTIEMBRE","OCTUBRE","NOVIEMBRE","DICIEMBRE"
];

// ── Tarjeta KPI ──────────────────────────────────────────
function KpiCard({ label, value, sub, color }: {
  label: string; value: string | number; sub?: string; color: string;
}) {
  const colores: Record<string, { border: string; bg: string; text: string }> = {
    blue:   { border: "border-blue-500",   bg: "bg-blue-50",   text: "text-blue-700"   },
    green:  { border: "border-emerald-500",bg: "bg-emerald-50",text: "text-emerald-700"},
    violet: { border: "border-violet-500", bg: "bg-violet-50", text: "text-violet-700" },
    amber:  { border: "border-amber-500",  bg: "bg-amber-50",  text: "text-amber-700"  },
    rose:   { border: "border-rose-500",   bg: "bg-rose-50",   text: "text-rose-700"   },
    teal:   { border: "border-teal-500",   bg: "bg-teal-50",   text: "text-teal-700"   },
  };
  const c = colores[color] ?? colores.blue;
  return (
    <div className={`rounded-xl border-t-4 ${c.border} ${c.bg} p-5 shadow-sm`}>
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">{label}</p>
      <p className={`text-3xl font-bold ${c.text}`}>{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  );
}

// ── Barra de ocupación ───────────────────────────────────
function OcupacionBar({ value }: { value: number }) {
  const color = value < 70 ? "bg-amber-400" : value <= 85 ? "bg-emerald-500" : "bg-rose-500";
  return (
    <div className="rounded-xl border-t-4 border-amber-500 bg-amber-50 p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Ocupación Hospitalaria</p>
      <p className="text-3xl font-bold text-amber-700">{value}%</p>
      <div className="mt-3 bg-slate-200 h-2.5 rounded-full overflow-hidden">
        <div className={`${color} h-full rounded-full transition-all`} style={{ width: `${Math.min(value, 100)}%` }} />
      </div>
      <div className="flex justify-between text-xs text-slate-400 mt-1">
        <span>0%</span><span className="text-emerald-600 font-medium">Óptimo 75–85%</span><span>100%</span>
      </div>
    </div>
  );
}

// ── Barra de mortalidad ──────────────────────────────────
function MortalidadBar({ value }: { value: number }) {
  const color = value <= 2 ? "bg-emerald-500" : value <= 4 ? "bg-amber-400" : "bg-rose-500";
  return (
    <div className="rounded-xl border-t-4 border-rose-500 bg-rose-50 p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Tasa Mortalidad Bruta</p>
      <p className="text-3xl font-bold text-rose-700">{value}%</p>
      <div className="mt-3 bg-slate-200 h-2.5 rounded-full overflow-hidden">
        <div className={`${color} h-full rounded-full transition-all`} style={{ width: `${Math.min(value * 10, 100)}%` }} />
      </div>
      <div className="flex justify-between text-xs text-slate-400 mt-1">
        <span className="text-emerald-600">≤2% bueno</span><span className="text-rose-600">≥5% crítico</span>
      </div>
    </div>
  );
}

// ── Componente principal ─────────────────────────────────
export default function DashboardHospitalizacion() {
  const [todos, setTodos] = useState<any[]>([]);
  const [filtrados, setFiltrados] = useState<any[]>([]);
  const [anio, setAnio] = useState("Todos");
  const [mes, setMes] = useState("Todos");
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
  async function cargar() {
    const { data, error } = await supabase.from('hospitalizacion_datos').select('*');
    if (!error && data) {
      console.log("Columnas del primer registro:", Object.keys(data[0]));
      console.log("Primer registro completo:", data[0]);
      setTodos(data); 
      setFiltrados(data);
    }
    setCargando(false);
  }
  cargar();
}, []);

  useEffect(() => {
    let f = todos;
    if (anio !== "Todos") f = f.filter(d => String(d.ANO) === anio);
    if (mes  !== "Todos") f = f.filter(d => d.MES === mes);
    setFiltrados(f);
  }, [anio, mes, todos]);

  const anios = ["Todos", ...Array.from(new Set(todos.map(d => String(d.ANO)))).sort()];
  const meses = ["Todos", ...ORDEN_MESES.filter(m => todos.some(d => d.MES === m))];

  // KPIs
  const totalIngresos     = filtrados.reduce((a, c) => a + (c["Ingresos Programados"] || 0), 0);
  const totalAltas        = filtrados.reduce((a, c) => a + (c["Altas"] || 0), 0);
  const totalDiasEstada   = filtrados.reduce((a, c) => a + (c["Total dias de estada"] || 0), 0);
  const totalDiasPaciente = filtrados.reduce((a, c) => a + (c["Total dias paciente"] || 0), 0);
  const totalCamasDisp    = filtrados.reduce((a, c) => a + (c["Dias camas func (disp.)"] || 0), 0);
  const totalDefLess48    = filtrados.reduce((a, c) => a + (c["Defunciones < 48 h"] || 0), 0);
  const totalDefMore48    = filtrados.reduce((a, c) => a + (c["Defunciones > 48 h"] || 0), 0);
  const totalDefunciones  = totalDefLess48 + totalDefMore48;

  const promedioEstancia = totalAltas > 0 ? (totalDiasEstada / totalAltas).toFixed(1) : "0";
  const tasaMortalidad   = totalAltas > 0 ? +((totalDefunciones / totalAltas) * 100).toFixed(2) : 0;
  const pctOcupacion     = totalCamasDisp > 0 ? +((totalDiasPaciente / totalCamasDisp) * 100).toFixed(1) : 0;

  // Datos para gráfica agrupados por servicio
  const porServicio = Object.values(
    filtrados.reduce((acc: any, row) => {
      const key = (row["SERVICIO"] || "").trim();
      if (!acc[key]) acc[key] = { servicio: key, Altas: 0, "Días Paciente": 0 };
      acc[key].Altas            += row["Altas"] || 0;
      acc[key]["Días Paciente"] += row["Total dias paciente"] || 0;
      return acc;
    }, {})
  ).sort((a: any, b: any) => b.Altas - a.Altas);

  if (cargando) return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50">
      <p className="text-slate-500 animate-pulse text-sm">Cargando datos...</p>
    </div>
  );

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* HEADER */}
        <div>
          <p className="text-xs font-semibold text-blue-600 uppercase tracking-widest mb-1">Producción Activa</p>
          <h1 className="text-3xl font-bold text-slate-900">Dashboard Hospitalario HEG</h1>
          <p className="text-slate-500 text-sm mt-1">Visualización de datos de Hospitalización en Tiempo Real</p>
        </div>

        {/* FILTROS */}
        <div className="bg-white rounded-xl shadow-sm p-4 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 text-slate-500">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"/>
            </svg>
            <span className="text-sm font-semibold text-slate-600">Filtros</span>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-slate-500 uppercase">Año</label>
            <select
              value={anio}
              onChange={e => setAnio(e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
              {anios.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-slate-500 uppercase">Mes</label>
            <select
              value={mes}
              onChange={e => setMes(e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
              {meses.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          {(anio !== "Todos" || mes !== "Todos") && (
            <button
              onClick={() => { setAnio("Todos"); setMes("Todos"); }}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors ml-auto"
            >
              Limpiar filtros ✕
            </button>
          )}
        </div>

        {/* KPIs FILA 1 */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <KpiCard
            label="Total Ingresos"
            value={totalIngresos.toLocaleString()}
            sub="Pacientes ingresados en el período"
            color="blue"
          />
          <KpiCard
            label="Total Altas"
            value={totalAltas.toLocaleString()}
            sub="Egresos registrados en el período"
            color="green"
          />
          <KpiCard
            label="Total Defunciones"
            value={totalDefunciones.toLocaleString()}
            sub={`< 48h: ${totalDefLess48}  |  > 48h: ${totalDefMore48}`}
            color="rose"
          />
        </div>

        {/* KPIs FILA 2 */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <KpiCard
            label="Promedio Días Estancia"
            value={`${promedioEstancia} días`}
            sub="Meta institucional: < 5.0 días"
            color="teal"
          />
          <MortalidadBar value={tasaMortalidad} />
          <OcupacionBar  value={pctOcupacion}  />
        </div>

        {/* GRÁFICA */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-base font-semibold text-slate-700 mb-4">
            Altas vs Días Paciente por Servicio
          </h2>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={porServicio} margin={{ top: 5, right: 20, left: 0, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="servicio"
                tick={{ fontSize: 11, fill: "#64748b" }}
                angle={-35}
                textAnchor="end"
                interval={0}
              />
              <YAxis tick={{ fontSize: 11, fill: "#64748b" }} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 16 }} />
              <Bar dataKey="Altas"          fill="#10b981" radius={[4,4,0,0]} />
              <Bar dataKey="Días Paciente"  fill="#f59e0b" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

      </div>
    </main>
  );
}
