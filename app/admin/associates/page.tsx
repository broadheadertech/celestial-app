'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import {
  ArrowLeft,
  UserPlus,
  Search,
  X,
  Edit3,
  Percent,
  Users,
  Eye,
  EyeOff,
  CheckCircle2,
  Award,
  Mail,
  Phone,
  Shield,
  Camera,
  Briefcase,
} from 'lucide-react';
import Card from '@/components/ui/Card';
import BottomNavbar from '@/components/common/BottomNavbar';
import SafeAreaProvider from '@/components/provider/SafeAreaProvider';

type Basis = 'revenue' | 'profit';
type Role = 'admin' | 'super_admin' | 'associate';

// Job titles shown on associate profiles + (later) the org chart. Not access roles.
const POSITIONS = ['Founder', 'Executive Assistant', 'Sales Manager', 'Aquaman', 'Associate', 'Staff'] as const;

interface Associate {
  _id: Id<'users'>;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role: 'admin' | 'super_admin' | 'client' | 'associate';
  isActive: boolean;
  commissionRate?: number;
  commissionBasis?: Basis;
  position?: string;
  profilePicture?: string;
  createdAt: number;
}

function AssociatesContent() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [showRegister, setShowRegister] = useState(false);
  const [editTarget, setEditTarget] = useState<Associate | null>(null);

  const associates = useQuery(api.services.admin.getAssociates) as Associate[] | undefined;
  const isLoading = associates === undefined;

  const filtered = useMemo(() => {
    if (!associates) return [];
    if (!search.trim()) return associates;
    const q = search.toLowerCase();
    return associates.filter(
      (a) =>
        `${a.firstName} ${a.lastName}`.toLowerCase().includes(q) ||
        a.email.toLowerCase().includes(q) ||
        (a.phone || '').toLowerCase().includes(q),
    );
  }, [associates, search]);

  const stats = useMemo(() => {
    if (!associates) return null;
    const active = associates.filter((a) => a.isActive);
    const withCommission = associates.filter((a) => a.commissionRate !== undefined && a.commissionBasis);
    const avgRate =
      withCommission.length > 0
        ? withCommission.reduce((s, a) => s + (a.commissionRate ?? 0), 0) / withCommission.length
        : 0;
    return {
      total: associates.length,
      active: active.length,
      withCommission: withCommission.length,
      avgRate,
    };
  }, [associates]);

  return (
    <div className="min-h-screen bg-background text-foreground pb-24 sm:pb-6">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-white/10 safe-area-top">
        <div className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 max-w-7xl mx-auto">
          <div className="flex items-center justify-between gap-2 sm:gap-3">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <button
                onClick={() => router.back()}
                className="p-2 rounded-lg bg-secondary/60 border border-white/10 hover:bg-white/10 active:scale-95 transition-all flex-shrink-0"
              >
                <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </button>
              <div className="min-w-0 flex-1">
                <h1 className="text-base sm:text-xl lg:text-2xl font-bold text-white truncate">Associates</h1>
                <p className="text-[11px] sm:text-xs text-white/50 truncate">Register and manage sales staff</p>
              </div>
            </div>
            <button
              onClick={() => setShowRegister(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-white text-xs sm:text-sm font-semibold hover:bg-primary/90 active:scale-95 transition-all flex-shrink-0"
            >
              <UserPlus className="w-4 h-4" />
              <span className="hidden sm:inline">Register Associate</span>
              <span className="sm:hidden">Register</span>
            </button>
          </div>
        </div>
      </div>

      <div className="px-3 sm:px-4 lg:px-6 py-3 sm:py-5 lg:py-6 max-w-7xl mx-auto space-y-3 sm:space-y-5">
        {/* KPIs */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
            <Kpi icon={Users} bg="bg-primary/10" accent="text-primary" label="Registered" value={String(stats.total)} sub="associates" />
            <Kpi icon={CheckCircle2} bg="bg-success/10" accent="text-success" label="Active" value={String(stats.active)} sub={`${stats.total - stats.active} inactive`} />
            <Kpi icon={Percent} bg="bg-warning/10" accent="text-warning" label="With commission" value={String(stats.withCommission)} sub={`${stats.total - stats.withCommission} unset`} />
            <Kpi icon={Award} bg="bg-info/10" accent="text-info" label="Avg rate" value={stats.withCommission > 0 ? `${stats.avgRate.toFixed(1)}%` : '—'} sub="across associates" />
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or phone..."
            className="w-full pl-10 pr-10 py-2.5 bg-secondary/40 border border-white/10 rounded-xl text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-white/10">
              <X className="w-3.5 h-3.5 text-white/60" />
            </button>
          )}
        </div>

        {/* List */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm text-white/60">Loading associates...</p>
          </div>
        ) : filtered.length === 0 ? (
          <Card variant="modern" padding="lg" className="text-center border border-white/10">
            <Award className="w-12 h-12 sm:w-16 sm:h-16 text-white/20 mx-auto mb-3 sm:mb-4" />
            <h3 className="text-base sm:text-xl font-bold text-white mb-2">
              {associates && associates.length === 0 ? 'No associates yet' : 'No matches'}
            </h3>
            <p className="text-xs sm:text-sm text-white/60 mb-4">
              {associates && associates.length === 0
                ? 'Register your first sales associate to start tracking attribution and commission.'
                : 'Try a different search term.'}
            </p>
            {associates && associates.length === 0 && (
              <button
                onClick={() => setShowRegister(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 active:scale-95 transition-all"
              >
                <UserPlus className="w-4 h-4" />
                Register associate
              </button>
            )}
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {filtered.map((a) => (
              <AssociateCard key={a._id} associate={a} onEdit={() => setEditTarget(a)} />
            ))}
          </div>
        )}
      </div>

      {showRegister && <RegisterModal onClose={() => setShowRegister(false)} />}
      {editTarget && <EditModal associate={editTarget} onClose={() => setEditTarget(null)} />}

      <BottomNavbar />
    </div>
  );
}

function AssociateCard({ associate, onEdit }: { associate: Associate; onEdit: () => void }) {
  const initials = `${associate.firstName[0] || ''}${associate.lastName[0] || ''}`.toUpperCase();
  const fullName = `${associate.firstName} ${associate.lastName}`;
  return (
    <div className={`rounded-xl border p-4 transition-colors ${associate.isActive ? 'bg-secondary/30 border-white/10 hover:border-white/20' : 'bg-secondary/20 border-white/5 opacity-70'}`}>
      <div className="flex items-start gap-3">
        <div className={`w-12 h-12 rounded-xl overflow-hidden flex items-center justify-center text-sm font-bold flex-shrink-0 ${associate.isActive ? 'bg-primary/15 text-primary border border-primary/30' : 'bg-white/5 text-white/40 border border-white/10'}`}>
          {associate.profilePicture ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={associate.profilePicture} alt={fullName} className="w-full h-full object-cover" />
          ) : (
            initials || <Users className="w-5 h-5" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-bold text-white text-sm sm:text-base truncate">{fullName}</h3>
              {associate.position && (
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-primary/90 truncate mb-0.5">
                  <Briefcase className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">{associate.position}</span>
                </div>
              )}
              <div className="flex items-center gap-1.5 text-[11px] text-white/50 truncate">
                <Mail className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{associate.email}</span>
              </div>
              {associate.phone && (
                <div className="flex items-center gap-1.5 text-[11px] text-white/50 truncate mt-0.5">
                  <Phone className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">{associate.phone}</span>
                </div>
              )}
            </div>
            <button
              onClick={onEdit}
              className="p-1.5 rounded-md bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 active:scale-95 transition-all flex-shrink-0"
              title="Edit associate"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-3">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase border ${associate.isActive ? 'bg-success/10 text-success border-success/30' : 'bg-white/5 text-white/40 border-white/10'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${associate.isActive ? 'bg-success' : 'bg-white/30'}`} />
              {associate.isActive ? 'Active' : 'Inactive'}
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase bg-white/5 text-white/60 border border-white/10">
              <Shield className="w-2.5 h-2.5" />
              {associate.role === 'super_admin' ? 'Super Admin' : associate.role === 'associate' ? 'Associate' : 'Admin'}
            </span>
            {associate.commissionRate !== undefined && associate.commissionBasis ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase bg-warning/10 text-warning border border-warning/30">
                <Percent className="w-2.5 h-2.5" />
                {associate.commissionRate}% of {associate.commissionBasis}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase bg-white/5 text-white/40 border border-white/10">
                No commission set
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function RegisterModal({ onClose }: { onClose: () => void }) {
  const register = useMutation(api.services.admin.registerAssociate);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [rate, setRate] = useState('');
  const [basis, setBasis] = useState<Basis>('revenue');
  const [role, setRole] = useState<Role>('admin');
  const [position, setPosition] = useState('');
  const [profilePicture, setProfilePicture] = useState<string | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit =
    firstName.trim() && lastName.trim() && email.trim() && password.length >= 8 && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const rateNum = rate.trim() ? parseFloat(rate) : undefined;
      if (rateNum !== undefined && (isNaN(rateNum) || rateNum < 0 || rateNum > 100)) {
        throw new Error('Commission rate must be a number between 0 and 100');
      }
      await register({
        email: email.trim(),
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim() || undefined,
        commissionRate: rateNum,
        commissionBasis: rateNum !== undefined ? basis : undefined,
        role,
        position: position || undefined,
        profilePicture,
      });
      onClose();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to register associate');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title="Register Sales Associate" onClose={onClose}>
      <div className="space-y-3">
        <AvatarPicker value={profilePicture} onChange={setProfilePicture} name={`${firstName} ${lastName}`} />
        <div className="grid grid-cols-2 gap-3">
          <Field label="First name *">
            <input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Maria" className={inputCls} />
          </Field>
          <Field label="Last name *">
            <input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Santos" className={inputCls} />
          </Field>
        </div>
        <PositionSelect value={position} onChange={setPosition} />
        <Field label="Email *">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="maria@celestial.ph" className={inputCls} />
        </Field>
        <Field label="Phone (optional)">
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+63 9XX XXX XXXX" className={inputCls} />
        </Field>
        <Field label="Password * (min 8 chars, with upper, lower, number)">
          <div className="relative">
            <input
              type={showPwd ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className={inputCls + ' pr-10'}
            />
            <button
              type="button"
              onClick={() => setShowPwd((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-white/50 hover:text-white"
              tabIndex={-1}
            >
              {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </Field>

        <div className="pt-2 border-t border-white/5">
          <p className="text-[11px] uppercase tracking-wider text-white/50 font-semibold mb-2">Commission (optional)</p>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Rate %">
              <input type="number" min="0" max="100" step="0.1" value={rate} onChange={(e) => setRate(e.target.value)} placeholder="5" className={inputCls} />
            </Field>
            <div className="col-span-2">
              <p className="block text-[11px] font-medium text-white/70 mb-1.5">Basis</p>
              <div className="inline-flex w-full p-[3px] rounded-lg border border-white/10 bg-background/40">
                {(['revenue', 'profit'] as const).map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setBasis(b)}
                    className={`flex-1 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all capitalize ${basis === b ? 'bg-primary text-white' : 'text-white/60 hover:text-white'}`}
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div>
          <p className="block text-[11px] font-medium text-white/70 mb-1.5">Role</p>
          <div className="inline-flex w-full p-[3px] rounded-lg border border-white/10 bg-background/40">
            {([{ v: 'associate' as Role, label: 'Associate' }, { v: 'admin' as Role, label: 'Admin' }, { v: 'super_admin' as Role, label: 'Super Admin' }]).map((o) => (
              <button
                key={o.v}
                type="button"
                onClick={() => setRole(o.v)}
                className={`flex-1 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all ${role === o.v ? 'bg-primary text-white' : 'text-white/60 hover:text-white'}`}
              >
                {o.label}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-white/40 mt-1.5">All get a login. Associate = limited role for sales staff (their own performance app is coming); Admin can use POS + manage inventory; Super Admin adds user management.</p>
        </div>
      </div>

      <div className="flex gap-2 pt-4 mt-4 border-t border-white/10">
        <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-lg border border-white/10 bg-transparent text-white/80 text-sm font-semibold hover:bg-white/5">
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="flex-1 px-4 py-2.5 rounded-lg bg-primary text-white text-sm font-bold hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {submitting ? 'Registering...' : 'Register associate'}
        </button>
      </div>
    </Modal>
  );
}

function EditModal({ associate, onClose }: { associate: Associate; onClose: () => void }) {
  const update = useMutation(api.services.admin.updateAssociate);
  const [firstName, setFirstName] = useState(associate.firstName);
  const [lastName, setLastName] = useState(associate.lastName);
  const [phone, setPhone] = useState(associate.phone || '');
  const [rate, setRate] = useState(associate.commissionRate !== undefined ? String(associate.commissionRate) : '');
  const [basis, setBasis] = useState<Basis>(associate.commissionBasis || 'revenue');
  const [isActive, setIsActive] = useState(associate.isActive);
  const [isSalesAssociate, setIsSalesAssociate] = useState(true);
  const [position, setPosition] = useState(associate.position || '');
  const [profilePicture, setProfilePicture] = useState<string | undefined>(associate.profilePicture);
  const [submitting, setSubmitting] = useState(false);

  const handleSave = async () => {
    setSubmitting(true);
    try {
      const rateNum = rate.trim() ? parseFloat(rate) : undefined;
      if (rateNum !== undefined && (isNaN(rateNum) || rateNum < 0 || rateNum > 100)) {
        throw new Error('Commission rate must be between 0 and 100');
      }
      await update({
        userId: associate._id,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim() || undefined,
        commissionRate: rateNum,
        commissionBasis: rateNum !== undefined ? basis : undefined,
        isActive,
        isSalesAssociate,
        position: position.trim(),
        profilePicture: profilePicture ?? '',
      });
      onClose();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to update associate');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title={`Edit ${associate.firstName} ${associate.lastName}`} onClose={onClose}>
      <div className="space-y-3">
        <AvatarPicker value={profilePicture} onChange={setProfilePicture} name={`${firstName} ${lastName}`} />
        <div className="grid grid-cols-2 gap-3">
          <Field label="First name">
            <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Last name">
            <input value={lastName} onChange={(e) => setLastName(e.target.value)} className={inputCls} />
          </Field>
        </div>
        <PositionSelect value={position} onChange={setPosition} />
        <Field label="Email (read-only)">
          <input value={associate.email} readOnly className={inputCls + ' opacity-60 cursor-not-allowed'} />
        </Field>
        <Field label="Phone">
          <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} />
        </Field>

        <div className="pt-2 border-t border-white/5">
          <p className="text-[11px] uppercase tracking-wider text-white/50 font-semibold mb-2">Commission</p>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Rate %">
              <input type="number" min="0" max="100" step="0.1" value={rate} onChange={(e) => setRate(e.target.value)} placeholder="0" className={inputCls} />
            </Field>
            <div className="col-span-2">
              <p className="block text-[11px] font-medium text-white/70 mb-1.5">Basis</p>
              <div className="inline-flex w-full p-[3px] rounded-lg border border-white/10 bg-background/40">
                {(['revenue', 'profit'] as const).map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setBasis(b)}
                    className={`flex-1 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all capitalize ${basis === b ? 'bg-primary text-white' : 'text-white/60 hover:text-white'}`}
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <p className="text-[10px] text-white/40 mt-1.5">Leave rate blank to remove commission.</p>
        </div>

        <div className="pt-2 border-t border-white/5 space-y-2">
          <Toggle label="Active" checked={isActive} onChange={setIsActive} hint="Inactive associates can't be selected on POS sales" />
          <Toggle label="Sales associate" checked={isSalesAssociate} onChange={setIsSalesAssociate} hint="Turning off removes from associates list (the user account stays)" />
        </div>
      </div>

      <div className="flex gap-2 pt-4 mt-4 border-t border-white/10">
        <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-lg border border-white/10 bg-transparent text-white/80 text-sm font-semibold hover:bg-white/5">
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={submitting}
          className="flex-1 px-4 py-2.5 rounded-lg bg-primary text-white text-sm font-bold hover:bg-primary/90 disabled:opacity-40"
        >
          {submitting ? 'Saving...' : 'Save changes'}
        </button>
      </div>
    </Modal>
  );
}

// ───── shared modal / form bits ─────

const inputCls =
  'w-full px-3 py-2.5 rounded-lg border border-white/10 bg-background/40 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-primary/50';

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-lg max-h-[90vh] overflow-y-auto bg-secondary/95 backdrop-blur border-t sm:border border-white/10 rounded-t-3xl sm:rounded-2xl shadow-2xl p-4 sm:p-6 safe-area-bottom">
        <div className="flex justify-center pt-1 pb-3 sm:hidden">
          <div className="w-12 h-1.5 bg-white/20 rounded-full" />
        </div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base sm:text-lg font-bold text-white">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-white/10 text-white/60">
            <X className="w-4 h-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="block text-[11px] font-medium text-white/70 mb-1.5">{label}</p>
      {children}
    </div>
  );
}

// Profile photo picker — uploads to Convex Storage and returns the public URL.
function AvatarPicker({ value, onChange, name }: { value?: string; onChange: (url: string | undefined) => void; name: string }) {
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const getFileUrl = useMutation(api.files.getFileUrl);
  const [uploading, setUploading] = useState(false);

  const initials = name.trim()
    ? name.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase()
    : '';

  const pick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      setUploading(true);
      try {
        const uploadUrl = await generateUploadUrl();
        const res = await fetch(uploadUrl, {
          method: 'POST',
          headers: { 'Content-Type': file.type },
          body: file,
        });
        if (!res.ok) throw new Error(`Upload failed: ${res.statusText}`);
        const { storageId } = await res.json();
        const url = await getFileUrl({ storageId });
        if (!url) throw new Error('Failed to get image URL');
        onChange(url);
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Image upload failed');
      } finally {
        setUploading(false);
      }
    };
    input.click();
  };

  return (
    <div className="flex items-center gap-3">
      <div className="w-16 h-16 rounded-2xl overflow-hidden flex items-center justify-center flex-shrink-0 bg-primary/15 border border-primary/30">
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="Profile" className="w-full h-full object-cover" />
        ) : (
          <span className="text-lg font-bold text-primary">{initials || <Users className="w-6 h-6" />}</span>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <button
          type="button"
          onClick={pick}
          disabled={uploading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs font-semibold text-white/80 hover:bg-white/10 active:scale-95 transition-all disabled:opacity-50"
        >
          <Camera className="w-3.5 h-3.5" />
          {uploading ? 'Uploading...' : value ? 'Change photo' : 'Upload photo'}
        </button>
        {value && !uploading && (
          <button
            type="button"
            onClick={() => onChange(undefined)}
            className="text-[11px] text-error/80 hover:text-error text-left"
          >
            Remove photo
          </button>
        )}
      </div>
    </div>
  );
}

// Job-title dropdown shared by the register + edit forms.
function PositionSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Field label="Position">
      <select value={value} onChange={(e) => onChange(e.target.value)} className={inputCls}>
        <option value="">— Select position —</option>
        {POSITIONS.map((p) => (
          <option key={p} value={p}>{p}</option>
        ))}
      </select>
    </Field>
  );
}

function Kpi({ icon: Icon, accent, bg, label, value, sub }: { icon: typeof Users; accent: string; bg: string; label: string; value: string; sub: string }) {
  return (
    <div className="bg-gradient-to-br from-secondary/60 to-secondary/30 rounded-xl p-3 sm:p-4 border border-white/10">
      <div className="flex items-center justify-between mb-2">
        <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg ${bg} flex items-center justify-center`}>
          <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${accent}`} />
        </div>
        <span className="text-[9px] sm:text-[10px] font-medium text-white/40 uppercase tracking-wider truncate">{label}</span>
      </div>
      <p className="text-base sm:text-xl lg:text-2xl font-bold text-white tabular-nums truncate">{value}</p>
      <p className="text-[11px] sm:text-xs text-white/50 mt-0.5 truncate">{sub}</p>
    </div>
  );
}

function Toggle({ label, checked, onChange, hint }: { label: string; checked: boolean; onChange: (v: boolean) => void; hint?: string }) {
  return (
    <label className="flex items-start justify-between gap-3 cursor-pointer">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-white">{label}</p>
        {hint && <p className="text-[10px] text-white/50 mt-0.5">{hint}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative w-10 h-6 rounded-full transition-colors flex-shrink-0 ${checked ? 'bg-primary' : 'bg-white/15'}`}
        aria-pressed={checked}
      >
        <span className={`absolute top-0.5 ${checked ? 'left-[18px]' : 'left-0.5'} w-5 h-5 rounded-full bg-white transition-all`} />
      </button>
    </label>
  );
}

export default function AssociatesPage() {
  return (
    <SafeAreaProvider applySafeArea={false}>
      <AssociatesContent />
    </SafeAreaProvider>
  );
}
