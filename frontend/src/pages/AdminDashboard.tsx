import { useStore } from '@/store/useStore';
import { StatCard } from '@/components/shared/StatCard';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { EmergencyBanner } from '@/components/shared/EmergencyBanner';
import { LiveMap } from '@/components/map/LiveMap';
import {
  Ambulance,
  Building2,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Activity,
  Users,
  Zap,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  LineChart,
  Line,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const responseTimeData = [
  { hour: '00:00', time: 7.2 }, { hour: '04:00', time: 5.1 }, { hour: '08:00', time: 9.8 },
  { hour: '12:00', time: 11.2 }, { hour: '16:00', time: 10.5 }, { hour: '20:00', time: 8.3 },
];

const assignmentData = [
  { day: 'Mon', completed: 18, pending: 3 }, { day: 'Tue', completed: 22, pending: 5 },
  { day: 'Wed', completed: 15, pending: 2 }, { day: 'Thu', completed: 28, pending: 7 },
  { day: 'Fri', completed: 20, pending: 4 }, { day: 'Sat', completed: 12, pending: 1 },
  { day: 'Sun', completed: 10, pending: 2 },
];

const severityData = [
  { name: 'Critical', value: 8, color: 'hsl(0, 85%, 55%)' },
  { name: 'High', value: 15, color: 'hsl(38, 92%, 50%)' },
  { name: 'Medium', value: 22, color: 'hsl(200, 80%, 55%)' },
  { name: 'Low', value: 12, color: 'hsl(215, 15%, 55%)' },
];

export default function AdminDashboard() {
  const { stats, ambulances, assignments, hospitals } = useStore();
  const criticalAssignments = assignments.filter(
    (a) => a.patientInfo.emergencyLevel === 'critical' && a.status !== 'completed'
  );

  return (
    <div className="space-y-4 animate-slide-in-up">
      {/* Emergency Alerts */}
      {criticalAssignments.length > 0 && (
        <EmergencyBanner
          message={`${criticalAssignments.length} CRITICAL ASSIGNMENT(S) ACTIVE — IMMEDIATE RESPONSE REQUIRED`}
        />
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard title="Active Units" value={stats.activeAmbulances} subtitle={`of ${stats.totalAmbulances} total`} icon={Ambulance} variant="info" />
        <StatCard title="Available Hospitals" value={stats.availableHospitals} subtitle={`of ${stats.totalHospitals} total`} icon={Building2} variant="success" />
        <StatCard title="Avg Response" value={`${stats.avgResponseTime}m`} subtitle="Target: < 8 min" icon={Clock} variant={stats.avgResponseTime > 8 ? 'warning' : 'success'} />
        <StatCard title="Critical Alerts" value={stats.criticalAlerts} subtitle="Requires attention" icon={AlertTriangle} variant="emergency" />
      </div>

      {/* Map + Assignments */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Live Map */}
        <div className="lg:col-span-2 rounded-lg border border-border bg-card overflow-hidden">
          <div className="px-4 py-2.5 border-b border-border flex items-center justify-between">
            <span className="panel-header">Live Tracking</span>
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-success" />
              </span>
              <span className="text-[10px] font-mono text-success tracking-wider">LIVE</span>
            </div>
          </div>
          <LiveMap className="h-[350px]" />
        </div>

        {/* Active Assignments */}
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="px-4 py-2.5 border-b border-border">
            <span className="panel-header">Active Assignments</span>
          </div>
          <div className="divide-y divide-border max-h-[350px] overflow-auto">
            {assignments.map((asg) => {
              const amb = ambulances.find((a) => a.id === asg.ambulanceId);
              const hosp = hospitals.find((h) => h.id === asg.hospitalId);
              return (
                <div
                  key={asg.id}
                  className={`p-3 transition-colors ${
                    asg.patientInfo.emergencyLevel === 'critical' ? 'emergency-flash' : 'hover:bg-secondary/30'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-mono font-bold">{asg.id}</span>
                    <StatusBadge status={asg.patientInfo.emergencyLevel} pulse={asg.patientInfo.emergencyLevel === 'critical'} />
                  </div>
                  <p className="text-xs text-foreground font-medium truncate">{asg.patientInfo.condition}</p>
                  <div className="mt-2 space-y-1 text-[11px] text-muted-foreground font-mono">
                    <div className="flex justify-between">
                      <span>🚑 {amb?.callSign ?? asg.ambulanceId}</span>
                      <span>ETA: {asg.eta}m</span>
                    </div>
                    <div className="flex justify-between">
                      <span>🏥 {hosp?.code ?? asg.hospitalId}</span>
                      <StatusBadge status={asg.status} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Ambulance Fleet Table */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="px-4 py-2.5 border-b border-border flex items-center justify-between">
          <span className="panel-header">Fleet Overview</span>
          <span className="text-[10px] font-mono text-muted-foreground">{ambulances.length} UNITS</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                <th className="text-left px-4 py-2 font-mono text-muted-foreground font-medium tracking-wider">CALL SIGN</th>
                <th className="text-left px-4 py-2 font-mono text-muted-foreground font-medium tracking-wider">TYPE</th>
                <th className="text-left px-4 py-2 font-mono text-muted-foreground font-medium tracking-wider">STATUS</th>
                <th className="text-left px-4 py-2 font-mono text-muted-foreground font-medium tracking-wider">CREW</th>
                <th className="text-left px-4 py-2 font-mono text-muted-foreground font-medium tracking-wider">ETA</th>
                <th className="text-left px-4 py-2 font-mono text-muted-foreground font-medium tracking-wider">POSITION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {ambulances.map((amb) => (
                <tr key={amb.id} className="hover:bg-secondary/20 transition-colors">
                  <td className="px-4 py-2.5 font-mono font-bold">{amb.callSign}</td>
                  <td className="px-4 py-2.5 font-mono text-muted-foreground">{amb.vehicleType}</td>
                  <td className="px-4 py-2.5"><StatusBadge status={amb.status} pulse={amb.status === 'en-route'} /></td>
                  <td className="px-4 py-2.5 text-muted-foreground">{amb.crew.join(', ')}</td>
                  <td className="px-4 py-2.5 font-mono">{amb.eta ? `${amb.eta} min` : '—'}</td>
                  <td className="px-4 py-2.5 font-mono text-muted-foreground text-[10px]">
                    {amb.location.lat.toFixed(4)}, {amb.location.lng.toFixed(4)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Analytics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Response Time Chart */}
        <div className="rounded-lg border border-border bg-card p-4">
          <span className="panel-header">Response Time (24h)</span>
          <div className="h-48 mt-3">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={responseTimeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 15%)" />
                <XAxis dataKey="hour" tick={{ fontSize: 10, fill: 'hsl(215, 15%, 55%)' }} />
                <YAxis tick={{ fontSize: 10, fill: 'hsl(215, 15%, 55%)' }} />
                <Tooltip contentStyle={{ background: 'hsl(220, 18%, 10%)', border: '1px solid hsl(220, 15%, 18%)', borderRadius: '6px', fontSize: 11 }} />
                <Line type="monotone" dataKey="time" stroke="hsl(185, 70%, 50%)" strokeWidth={2} dot={{ fill: 'hsl(185, 70%, 50%)', r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Weekly Assignments */}
        <div className="rounded-lg border border-border bg-card p-4">
          <span className="panel-header">Weekly Assignments</span>
          <div className="h-48 mt-3">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={assignmentData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 15%)" />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'hsl(215, 15%, 55%)' }} />
                <YAxis tick={{ fontSize: 10, fill: 'hsl(215, 15%, 55%)' }} />
                <Tooltip contentStyle={{ background: 'hsl(220, 18%, 10%)', border: '1px solid hsl(220, 15%, 18%)', borderRadius: '6px', fontSize: 11 }} />
                <Bar dataKey="completed" fill="hsl(142, 70%, 45%)" radius={[3, 3, 0, 0]} />
                <Bar dataKey="pending" fill="hsl(38, 92%, 50%)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Severity Distribution */}
        <div className="rounded-lg border border-border bg-card p-4">
          <span className="panel-header">Severity Distribution</span>
          <div className="h-48 mt-3 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={severityData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={3} dataKey="value">
                  {severityData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: 'hsl(220, 18%, 10%)', border: '1px solid hsl(220, 15%, 18%)', borderRadius: '6px', fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-3 justify-center mt-1">
            {severityData.map((s) => (
              <div key={s.name} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                <span className="text-[10px] font-mono text-muted-foreground">{s.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
