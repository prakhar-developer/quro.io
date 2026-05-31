import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, X, Users, Activity, HardDrive, CheckCircle2, Search, ShieldAlert, Trash2, Mail, Send, Loader2 } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { fetchAdminStats, fetchAdminUsers, toggleAdminStatus, deleteUser, sendBroadcastEmail } from '../../services/api';
import type { UserProfile } from '../../services/api';

interface AdminStats {
  users: { total: number; verified: number; admins: number };
  sessions: { document_sessions: number; guest_sessions: number };
  system: { status: string; version: string };
}

interface AdminUser extends UserProfile {
  created_at: string;
  session_count: number;
}

export const AdminPanel: React.FC = () => {
  const { showAdminPanel, setShowAdminPanel, user: currentUser } = useAppStore();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [activeTab, setActiveTab] = useState<'users' | 'broadcast'>('users');
  const [broadcastSubject, setBroadcastSubject] = useState('');
  const [broadcastBody, setBroadcastBody] = useState('');
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [broadcastStatus, setBroadcastStatus] = useState({ message: '', error: false });
  
  useEffect(() => {
    if (showAdminPanel && currentUser?.is_admin) {
      loadData();
    }
  }, [showAdminPanel, currentUser]);
  
  const loadData = async () => {
    setIsLoading(true);
    try {
      const [statsData, usersData] = await Promise.all([
        fetchAdminStats(),
        fetchAdminUsers(0, 50)
      ]);
      setStats(statsData);
      setUsers(usersData.users);
    } catch (e) {
      console.error("Failed to load admin data", e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleAdmin = async (userId: string) => {
    try {
      await toggleAdminStatus(userId);
      await loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (window.confirm("Are you sure you want to completely delete this user? This cannot be undone.")) {
      try {
        await deleteUser(userId);
        await loadData();
      } catch (e) {
        console.error(e);
      }
    }
  };

  if (!showAdminPanel) return null;

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastSubject || !broadcastBody) return;
    
    setIsBroadcasting(true);
    setBroadcastStatus({ message: '', error: false });
    try {
      const res = await sendBroadcastEmail(broadcastSubject, broadcastBody);
      setBroadcastStatus({ message: res.message || 'Broadcast queued successfully!', error: false });
      setBroadcastSubject('');
      setBroadcastBody('');
    } catch (err: any) {
      setBroadcastStatus({ message: err.message || 'Failed to send broadcast.', error: true });
    } finally {
      setIsBroadcasting(false);
    }
  };

  const filteredUsers = users.filter(u => u.email.toLowerCase().includes(searchQuery.toLowerCase()));

  const StatCard = ({ title, value, subtitle, icon: Icon, colorClass }: any) => (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#121318] border border-white/[0.06] rounded-xl p-5 relative overflow-hidden"
    >
      <div className={`absolute top-0 right-0 w-32 h-32 bg-${colorClass}-500/5 rounded-full blur-3xl -mr-10 -mt-10`} />
      <div className="flex items-center justify-between mb-4 relative z-10">
        <h3 className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">{title}</h3>
        <div className={`w-8 h-8 rounded-lg bg-${colorClass}-500/10 border border-${colorClass}-500/20 flex items-center justify-center`}>
          <Icon className={`w-4 h-4 text-${colorClass}-400`} />
        </div>
      </div>
      <div className="relative z-10">
        <div className="text-3xl font-bold text-white mb-1">{value}</div>
        <div className="text-[11px] text-slate-500">{subtitle}</div>
      </div>
    </motion.div>
  );

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex flex-col bg-[#0c0d10]">
        {/* Header */}
        <div className="h-16 border-b border-white/[0.06] bg-[#0c0d10]/80 backdrop-blur-xl flex items-center justify-between px-6 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center justify-center">
              <Shield className="w-4 h-4 text-emerald-500" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white leading-tight">Admin Control Center</h2>
              <p className="text-[10px] text-emerald-400">System metrics and user management</p>
            </div>
          </div>
          <button 
            onClick={() => setShowAdminPanel(false)}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/[0.05] transition-colors"
          >
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-[1200px] mx-auto space-y-8">
            
            <div className="flex items-center gap-4 border-b border-white/[0.06] pb-2">
              <button onClick={() => setActiveTab('users')} className={`px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'users' ? 'text-emerald-400 border-b-2 border-emerald-500' : 'text-slate-400 hover:text-white'}`}>Overview & Users</button>
              <button onClick={() => setActiveTab('broadcast')} className={`px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'broadcast' ? 'text-emerald-400 border-b-2 border-emerald-500' : 'text-slate-400 hover:text-white'}`}>Broadcast Email</button>
            </div>
            
            {activeTab === 'users' ? (
              <>
                {/* Stats Grid */}
                {stats && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard 
                  title="Total Users" 
                  value={stats.users.total} 
                  subtitle={`${stats.users.verified} verified accounts`}
                  icon={Users}
                  colorClass="emerald"
                />
                <StatCard 
                  title="Active Documents" 
                  value={stats.sessions.document_sessions} 
                  subtitle="Persistent user workspaces"
                  icon={HardDrive}
                  colorClass="blue"
                />
                <StatCard 
                  title="System Status" 
                  value={stats.system.status} 
                  subtitle={`v${stats.system.version} running perfectly`}
                  icon={Activity}
                  colorClass="emerald"
                />
                <StatCard 
                  title="Administrators" 
                  value={stats.users.admins} 
                  subtitle="Full access granted"
                  icon={ShieldAlert}
                  colorClass="purple"
                />
              </div>
            )}

            {/* Users Table */}
            <div className="bg-[#121318] border border-white/[0.06] rounded-xl overflow-hidden flex flex-col">
              <div className="p-5 border-b border-white/[0.06] flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-500" />
                  User Directory
                </h3>
                
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-black/40 border border-white/[0.06] rounded-lg pl-9 pr-4 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/50 w-64 transition-colors"
                  />
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-black/20 text-[10px] uppercase tracking-wider text-slate-500 border-b border-white/[0.06]">
                      <th className="px-5 py-3 font-medium">Account</th>
                      <th className="px-5 py-3 font-medium">Status</th>
                      <th className="px-5 py-3 font-medium">Role</th>
                      <th className="px-5 py-3 font-medium text-center">Sessions</th>
                      <th className="px-5 py-3 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      <tr>
                        <td colSpan={5} className="px-5 py-8 text-center text-xs text-slate-500">
                          Loading user data...
                        </td>
                      </tr>
                    ) : filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-5 py-8 text-center text-xs text-slate-500">
                          No users found.
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((u) => (
                        <tr key={u.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors group">
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-[10px] font-bold text-emerald-500">
                                {u.email.slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <div className="text-xs font-medium text-slate-200">{u.email}</div>
                                <div className="text-[10px] text-slate-600 font-mono mt-0.5">{u.id.split('-')[0]}...</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3">
                            {u.is_verified ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-400">
                                <CheckCircle2 className="w-2.5 h-2.5" /> Verified
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-500/10 border border-slate-500/20 text-[10px] text-slate-400">
                                Pending
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-3">
                            {u.is_admin ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-[10px] text-purple-400 font-medium">
                                <Shield className="w-2.5 h-2.5" /> Admin
                              </span>
                            ) : (
                              <span className="text-[11px] text-slate-500">Standard</span>
                            )}
                          </td>
                          <td className="px-5 py-3 text-center text-[11px] text-slate-400">
                            {u.session_count}
                          </td>
                          <td className="px-5 py-3 text-right">
                            {u.id !== currentUser?.id && (
                              <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                  onClick={() => handleToggleAdmin(u.id)}
                                  className={`px-3 py-1 rounded text-[10px] font-medium transition-colors ${u.is_admin ? 'bg-orange-500/10 text-orange-400 hover:bg-orange-500/20' : 'bg-purple-500/10 text-purple-400 hover:bg-purple-500/20'}`}
                                >
                                  {u.is_admin ? 'Revoke Admin' : 'Make Admin'}
                                </button>
                                <button 
                                  onClick={() => handleDeleteUser(u.id)}
                                  className="w-6 h-6 flex items-center justify-center rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
              </>
            ) : (
              <div className="bg-[#121318] border border-white/[0.06] rounded-xl p-8">
                <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                  <Mail className="w-5 h-5 text-emerald-500" />
                  Broadcast Promotional Email
                </h3>
                <p className="text-sm text-slate-400 mb-8">Send an HTML-rich promotional email to all verified users in your platform. Powered by Resend.</p>
                
                {broadcastStatus.message && (
                  <div className={`p-4 rounded-lg mb-6 text-sm ${broadcastStatus.error ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                    {broadcastStatus.message}
                  </div>
                )}
                
                <form onSubmit={handleBroadcast} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Email Subject</label>
                    <input type="text" value={broadcastSubject} onChange={e => setBroadcastSubject(e.target.value)} required placeholder="e.g. Introducing Quro AI 2.0 🚀" className="w-full bg-black/40 border border-white/[0.06] rounded-lg px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/50 transition-colors" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">HTML Content</label>
                    <textarea value={broadcastBody} onChange={e => setBroadcastBody(e.target.value)} required rows={12} placeholder="<h1>Big News!</h1><p>Check out our new features!</p>" className="w-full bg-black/40 border border-white/[0.06] rounded-lg px-4 py-4 text-sm text-emerald-400 placeholder-slate-600 focus:outline-none focus:border-emerald-500/50 font-mono transition-colors" />
                    <p className="text-[11px] text-slate-500 mt-2">This content will be securely injected inside the central Quro AI email template.</p>
                  </div>
                  <div className="flex justify-end pt-4">
                    <button type="submit" disabled={isBroadcasting} className="btn-solid flex items-center gap-2 py-3 px-6 text-sm">
                      {isBroadcasting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      {isBroadcasting ? 'Queueing Broadcast...' : 'Broadcast to Verified Users'}
                    </button>
                  </div>
                </form>
              </div>
            )}
            
          </div>
        </div>
      </div>
    </AnimatePresence>
  );
};
