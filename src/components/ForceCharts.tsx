import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { AnalysisResult } from '../lib/types';

interface ForceChartsProps {
  result: AnalysisResult;
}

export function ForceCharts({ result }: ForceChartsProps) {
  // To plot Depth (y-axis inverted) vs Force, we can format the data
  // Recharts handles X vs Y where Y goes up. For depth, we usually plot Y going down.
  // We can just negate depth or use reversed YAxis.

  return (
    <div className="flex flex-col gap-8 w-full mt-2">
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Stem Forces */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-sm font-black uppercase text-slate-800 tracking-wider mb-6 flex items-center gap-2">
             Efforts dans le voile
          </h3>
          <div className="h-[300px] w-full flex">
             <ResponsiveContainer width="50%" height="100%">
              <LineChart data={result.stemForces} layout="vertical" margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" dataKey="shear" name="Cisaillement (V)" stroke="#64748b" fontSize={12} domain={['auto', 'auto']} />
                <YAxis type="number" dataKey="depth" name="Profondeur" reversed stroke="#64748b" fontSize={12} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="shear" stroke="#0ea5e9" strokeWidth={2} dot={false} name="V (kN)" />
              </LineChart>
            </ResponsiveContainer>
             <ResponsiveContainer width="50%" height="100%">
              <LineChart data={result.stemForces} layout="vertical" margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" dataKey="moment" name="Moment (M)" stroke="#64748b" fontSize={12} domain={['auto', 'auto']} />
                <YAxis type="number" dataKey="depth" name="Profondeur" reversed hide />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="moment" stroke="#ec4899" strokeWidth={2} dot={false} name="M (kNm)" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Patin et talon : une carte chacune */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div>
              <h3 className="text-sm font-black uppercase text-slate-800 tracking-wider mb-4 flex items-center gap-2">
                 Patin (avant)
              </h3>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={result.toeForces} margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="x" type="number" name="x (m)" stroke="#64748b" fontSize={12} />
                    <YAxis stroke="#64748b" fontSize={12} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="shear" stroke="#0ea5e9" strokeWidth={2} dot={false} name="V (kN)" />
                    <Line type="monotone" dataKey="moment" stroke="#ec4899" strokeWidth={2} dot={false} name="M (kNm)" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div>
              <h3 className="text-sm font-black uppercase text-slate-800 tracking-wider mb-4 flex items-center gap-2">
                 Talon (arrière)
              </h3>
               <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={result.heelForces} margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="x" type="number" name="x (m)" stroke="#64748b" fontSize={12} />
                    <YAxis stroke="#64748b" fontSize={12} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="shear" stroke="#0ea5e9" strokeWidth={2} dot={false} name="V (kN)" />
                    <Line type="monotone" dataKey="moment" stroke="#ec4899" strokeWidth={2} dot={false} name="M (kNm)" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
          </div>
        </div>

      </div>
    </div>
  );
}
