import { useState, useEffect, useCallback } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const SECTION_META = {
    earthworks: { label: 'Earthworks', icon: '⛏️', color: '#a16207' },
    concrete_works: { label: 'Concrete Works', icon: '🧱', color: '#6366f1' },
    masonry_works: { label: 'Masonry Works', icon: '🏗️', color: '#0891b2' },
    finishes: { label: 'Finishes', icon: '🎨', color: '#059669' },
    doors_windows: { label: 'Doors & Windows', icon: '🚪', color: '#d97706' },
    mep_works: { label: 'MEP Works', icon: '⚡', color: '#dc2626' },
};

const SOURCE_BADGE = {
    system_default: { label: 'Default', bg: 'rgba(99,102,241,0.15)', color: '#818cf8' },
    manual: { label: 'Manual', bg: 'rgba(34,197,94,0.15)', color: '#4ade80' },
    csv_import: { label: 'CSV', bg: 'rgba(234,179,8,0.15)', color: '#facc15' },
    config_default: { label: 'Config', bg: 'rgba(148,163,184,0.15)', color: '#94a3b8' },
};

const MaterialRatesAdmin = () => {
    // ── State ────────────────────────────────────────────────
    const [rates, setRates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeSection, setActiveSection] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [editValues, setEditValues] = useState({});
    const [showAddModal, setShowAddModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [seeding, setSeeding] = useState(false);
    const [toast, setToast] = useState(null);

    const [newRate, setNewRate] = useState({
        section: 'earthworks', itemCode: '', itemName: '',
        unit: 'm²', materialType: 'standard', rate: ''
    });

    // ── Helpers ──────────────────────────────────────────────
    const showToast = (msg, type = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    // ── Fetch Rates ──────────────────────────────────────────
    const fetchRates = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const url = activeSection === 'all'
                ? `${API_BASE}/api/rates?active=true`
                : `${API_BASE}/api/rates?section=${activeSection}&active=true`;
            const res = await fetch(url);
            const json = await res.json();
            if (json.success) {
                setRates(json.data.rates || []);
            } else {
                setError(json.message || 'Failed to fetch rates');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [activeSection]);

    useEffect(() => { fetchRates(); }, [fetchRates]);

    // ── Seed Defaults ────────────────────────────────────────
    const handleSeed = async () => {
        setSeeding(true);
        try {
            const res = await fetch(`${API_BASE}/api/rates/seed`, { method: 'POST' });
            const json = await res.json();
            showToast(json.message || `Seeded ${json.data?.seeded || 0} rates`);
            fetchRates();
        } catch (err) {
            showToast(err.message, 'error');
        } finally {
            setSeeding(false);
        }
    };

    // ── Inline Edit ──────────────────────────────────────────
    const startEdit = (rate) => {
        setEditingId(rate._id);
        setEditValues({
            rate: rate.rate,
            itemName: rate.itemName,
            unit: rate.unit,
            materialType: rate.materialType,
        });
    };

    const cancelEdit = () => { setEditingId(null); setEditValues({}); };

    const saveEdit = async (id) => {
        setSaving(true);
        try {
            const res = await fetch(`${API_BASE}/api/rates/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editValues)
            });
            const json = await res.json();
            if (json.success) {
                showToast('Rate updated');
                cancelEdit();
                fetchRates();
            } else {
                showToast(json.message || 'Update failed', 'error');
            }
        } catch (err) {
            showToast(err.message, 'error');
        } finally {
            setSaving(false);
        }
    };

    // ── Add New Rate ─────────────────────────────────────────
    const handleAdd = async () => {
        if (!newRate.itemCode || !newRate.itemName || !newRate.rate) {
            showToast('Please fill all required fields', 'error');
            return;
        }
        setSaving(true);
        try {
            const res = await fetch(`${API_BASE}/api/rates`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...newRate, rate: parseFloat(newRate.rate) })
            });
            const json = await res.json();
            if (json.success) {
                showToast('Rate created');
                setShowAddModal(false);
                setNewRate({ section: 'earthworks', itemCode: '', itemName: '', unit: 'm²', materialType: 'standard', rate: '' });
                fetchRates();
            } else {
                showToast(json.message || 'Create failed', 'error');
            }
        } catch (err) {
            showToast(err.message, 'error');
        } finally {
            setSaving(false);
        }
    };

    // ── Filter ───────────────────────────────────────────────
    const filteredRates = rates.filter(r => {
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            return r.itemName?.toLowerCase().includes(q)
                || r.itemCode?.toLowerCase().includes(q)
                || r.materialType?.toLowerCase().includes(q);
        }
        return true;
    });

    // Group by section for display
    const grouped = {};
    filteredRates.forEach(r => {
        const s = r.section || 'unknown';
        if (!grouped[s]) grouped[s] = [];
        grouped[s].push(r);
    });

    // ── Format currency ──────────────────────────────────────
    const fmt = (v) => 'LKR ' + Number(v).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    // ══════════════════════════════════════════════════════════
    // RENDER
    // ══════════════════════════════════════════════════════════
    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            {/* ── Header ──────────────────────────────────── */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        💰 Material Rate Management
                    </h1>
                    <p className="text-sm text-gray-400 mt-1">
                        Manage construction rates for BOQ pricing • {rates.length} rates loaded
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleSeed}
                        disabled={seeding}
                        className="px-4 py-2 text-sm rounded-lg border border-indigo-500/30 text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 transition-colors disabled:opacity-50"
                    >
                        {seeding ? '⏳ Seeding...' : '🌱 Seed Defaults'}
                    </button>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="px-4 py-2 text-sm rounded-lg bg-gradient-to-r from-green-600 to-green-500 text-white font-medium hover:from-green-500 hover:to-green-400 transition-all"
                    >
                        + Add Rate
                    </button>
                </div>
            </div>

            {/* ── Section Tabs ────────────────────────────── */}
            <div className="flex gap-2 flex-wrap">
                <button
                    onClick={() => setActiveSection('all')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${activeSection === 'all'
                            ? 'bg-white/10 border-white/20 text-white'
                            : 'bg-transparent border-white/5 text-gray-500 hover:text-gray-300 hover:border-white/10'
                        }`}
                >
                    All Sections
                </button>
                {Object.entries(SECTION_META).map(([key, meta]) => (
                    <button
                        key={key}
                        onClick={() => setActiveSection(key)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all flex items-center gap-1.5 ${activeSection === key
                                ? 'border-white/20 text-white'
                                : 'bg-transparent border-white/5 text-gray-500 hover:text-gray-300 hover:border-white/10'
                            }`}
                        style={activeSection === key ? { backgroundColor: meta.color + '25' } : {}}
                    >
                        <span>{meta.icon}</span>
                        {meta.label}
                    </button>
                ))}
            </div>

            {/* ── Search ──────────────────────────────────── */}
            <div className="relative">
                <input
                    type="text"
                    placeholder="Search by name, code, or material type..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-900/60 border border-slate-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/20"
                />
                {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white text-sm">✕</button>
                )}
            </div>

            {/* ── Error / Empty ────────────────────────────── */}
            {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-300 text-sm">
                    ❌ {error}
                </div>
            )}

            {!loading && filteredRates.length === 0 && !error && (
                <div className="text-center py-16">
                    <p className="text-4xl mb-4">📦</p>
                    <p className="text-gray-400 text-lg">No rates found</p>
                    <p className="text-gray-500 text-sm mt-1">Click "Seed Defaults" to populate with standard construction rates</p>
                </div>
            )}

            {/* ── Loading skeleton ────────────────────────── */}
            {loading && (
                <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="h-14 bg-slate-800/50 rounded-lg animate-pulse" />
                    ))}
                </div>
            )}

            {/* ── Rates Table by Section ──────────────────── */}
            {!loading && Object.entries(grouped).map(([section, sectionRates]) => {
                const meta = SECTION_META[section] || { label: section, icon: '📦', color: '#64748b' };
                return (
                    <div key={section} className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
                        {/* Section Header */}
                        <div
                            className="px-4 py-3 border-b border-slate-800 flex items-center gap-2"
                            style={{ background: `linear-gradient(135deg, ${meta.color}15, transparent)` }}
                        >
                            <span className="text-lg">{meta.icon}</span>
                            <h3 className="text-sm font-bold text-white">{meta.label}</h3>
                            <span className="ml-auto text-xs text-gray-500">{sectionRates.length} items</span>
                        </div>

                        {/* Table */}
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="text-xs text-gray-500 uppercase tracking-wider">
                                        <th className="text-left px-4 py-2.5 font-medium">Code</th>
                                        <th className="text-left px-4 py-2.5 font-medium">Item Name</th>
                                        <th className="text-left px-4 py-2.5 font-medium">Material</th>
                                        <th className="text-left px-4 py-2.5 font-medium">Unit</th>
                                        <th className="text-right px-4 py-2.5 font-medium">Rate (LKR)</th>
                                        <th className="text-center px-4 py-2.5 font-medium">Source</th>
                                        <th className="text-right px-4 py-2.5 font-medium">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/50">
                                    {sectionRates.map(rate => {
                                        const isEditing = editingId === rate._id;
                                        const src = SOURCE_BADGE[rate.source] || SOURCE_BADGE.manual;

                                        return (
                                            <tr
                                                key={rate._id}
                                                className={`transition-colors ${isEditing ? 'bg-green-500/5' : 'hover:bg-white/[0.02]'}`}
                                            >
                                                {/* Code */}
                                                <td className="px-4 py-3">
                                                    <span className="font-mono text-xs text-green-400 bg-green-500/10 px-2 py-0.5 rounded">
                                                        {rate.itemCode}
                                                    </span>
                                                </td>

                                                {/* Item Name */}
                                                <td className="px-4 py-3">
                                                    {isEditing ? (
                                                        <input
                                                            value={editValues.itemName}
                                                            onChange={e => setEditValues({ ...editValues, itemName: e.target.value })}
                                                            className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-green-500"
                                                        />
                                                    ) : (
                                                        <span className="text-sm text-gray-200">{rate.itemName}</span>
                                                    )}
                                                </td>

                                                {/* Material Type */}
                                                <td className="px-4 py-3">
                                                    {isEditing ? (
                                                        <input
                                                            value={editValues.materialType}
                                                            onChange={e => setEditValues({ ...editValues, materialType: e.target.value })}
                                                            className="w-24 bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-green-500"
                                                        />
                                                    ) : (
                                                        <span className="text-xs text-gray-400 capitalize">{rate.materialType}</span>
                                                    )}
                                                </td>

                                                {/* Unit */}
                                                <td className="px-4 py-3">
                                                    {isEditing ? (
                                                        <input
                                                            value={editValues.unit}
                                                            onChange={e => setEditValues({ ...editValues, unit: e.target.value })}
                                                            className="w-16 bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-green-500"
                                                        />
                                                    ) : (
                                                        <span className="text-xs text-gray-500">{rate.unit}</span>
                                                    )}
                                                </td>

                                                {/* Rate */}
                                                <td className="px-4 py-3 text-right">
                                                    {isEditing ? (
                                                        <input
                                                            type="number"
                                                            value={editValues.rate}
                                                            onChange={e => setEditValues({ ...editValues, rate: e.target.value })}
                                                            className="w-28 bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-white text-right focus:outline-none focus:border-green-500"
                                                        />
                                                    ) : (
                                                        <span className="text-sm font-mono text-white font-medium">{fmt(rate.rate)}</span>
                                                    )}
                                                </td>

                                                {/* Source */}
                                                <td className="px-4 py-3 text-center">
                                                    <span
                                                        className="text-xs px-2 py-0.5 rounded-full"
                                                        style={{ background: src.bg, color: src.color }}
                                                    >
                                                        {src.label}
                                                    </span>
                                                </td>

                                                {/* Actions */}
                                                <td className="px-4 py-3 text-right">
                                                    {isEditing ? (
                                                        <div className="flex gap-1 justify-end">
                                                            <button
                                                                onClick={() => saveEdit(rate._id)}
                                                                disabled={saving}
                                                                className="px-2.5 py-1 text-xs bg-green-600/20 text-green-400 rounded border border-green-600/30 hover:bg-green-600/30 transition-colors disabled:opacity-50"
                                                            >
                                                                {saving ? '...' : '✓ Save'}
                                                            </button>
                                                            <button
                                                                onClick={cancelEdit}
                                                                className="px-2.5 py-1 text-xs bg-slate-700/50 text-gray-400 rounded border border-slate-600 hover:bg-slate-700 transition-colors"
                                                            >
                                                                ✕
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={() => startEdit(rate)}
                                                            className="px-2.5 py-1 text-xs text-gray-500 hover:text-white hover:bg-white/5 rounded transition-colors"
                                                        >
                                                            ✏️ Edit
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                );
            })}

            {/* ── Add Rate Modal ──────────────────────────── */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold text-white">Add New Rate</h3>
                            <button onClick={() => setShowAddModal(false)} className="text-gray-500 hover:text-white text-lg">✕</button>
                        </div>

                        {/* Section */}
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">Section *</label>
                            <select
                                value={newRate.section}
                                onChange={e => setNewRate({ ...newRate, section: e.target.value })}
                                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500"
                            >
                                {Object.entries(SECTION_META).map(([key, meta]) => (
                                    <option key={key} value={key}>{meta.icon} {meta.label}</option>
                                ))}
                            </select>
                        </div>

                        {/* Item Code + Name */}
                        <div className="grid grid-cols-3 gap-3">
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">Item Code *</label>
                                <input
                                    value={newRate.itemCode}
                                    onChange={e => setNewRate({ ...newRate, itemCode: e.target.value.toUpperCase() })}
                                    placeholder="A01"
                                    className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-green-500"
                                />
                            </div>
                            <div className="col-span-2">
                                <label className="block text-xs text-gray-400 mb-1">Item Name *</label>
                                <input
                                    value={newRate.itemName}
                                    onChange={e => setNewRate({ ...newRate, itemName: e.target.value })}
                                    placeholder="Site Clearance"
                                    className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500"
                                />
                            </div>
                        </div>

                        {/* Unit + Material + Rate */}
                        <div className="grid grid-cols-3 gap-3">
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">Unit *</label>
                                <select
                                    value={newRate.unit}
                                    onChange={e => setNewRate({ ...newRate, unit: e.target.value })}
                                    className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500"
                                >
                                    {['m²', 'm³', 'm', 'kg', 'No.', 'set', 'L'].map(u => (
                                        <option key={u} value={u}>{u}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">Material</label>
                                <input
                                    value={newRate.materialType}
                                    onChange={e => setNewRate({ ...newRate, materialType: e.target.value })}
                                    placeholder="standard"
                                    className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">Rate (LKR) *</label>
                                <input
                                    type="number"
                                    value={newRate.rate}
                                    onChange={e => setNewRate({ ...newRate, rate: e.target.value })}
                                    placeholder="2500"
                                    className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500"
                                />
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 pt-2">
                            <button
                                onClick={handleAdd}
                                disabled={saving}
                                className="flex-1 py-2.5 rounded-lg bg-gradient-to-r from-green-600 to-green-500 text-white font-medium text-sm hover:from-green-500 hover:to-green-400 transition-all disabled:opacity-50"
                            >
                                {saving ? 'Creating...' : '✓ Create Rate'}
                            </button>
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="px-4 py-2.5 rounded-lg bg-slate-800 border border-slate-600 text-gray-400 text-sm hover:bg-slate-700 transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Toast ───────────────────────────────────── */}
            {toast && (
                <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg shadow-xl text-sm font-medium animate-fade-in
                    ${toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-green-600 text-white'}`}>
                    {toast.msg}
                </div>
            )}
        </div>
    );
};

export default MaterialRatesAdmin;
