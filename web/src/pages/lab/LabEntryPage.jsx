import { useEffect, useState } from 'react';
import { ClipboardList } from 'lucide-react';
import { PageShell } from '../../components/PageShell.jsx';
import { apiFetch } from '../../apiClient.js';

export function LabEntryPage() {
    const [machines, setMachines] = useState([]);
    const [machineId, setMachineId] = useState('');
    const [params, setParams] = useState([]);
    const [values, setValues] = useState({});
    const [kitsUsed, setKitsUsed] = useState(0);
    const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
    const [buId, setBuId] = useState('');
    const [message, setMessage] = useState(null);
    const [error, setError] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                const res = await apiFetch('/api/lab/machines');
                const d = await res.json();
                if (!res.ok) throw new Error(d.error || 'Failed');
                const list = d.machines || [];
                setMachines(list);
                if (list[0]) {
                    setMachineId((id) => id || list[0].id);
                    setBuId((b) => b || list[0].bu_id);
                }
            } catch (e) {
                setError(e.message);
            }
        })();
    }, []);

    useEffect(() => {
        if (!machineId) return;
        (async () => {
            const res = await apiFetch(`/api/lab/machines/${machineId}/parameters`);
            const d = await res.json();
            if (!res.ok) {
                setParams([]);
                return;
            }
            setParams(d.parameters || []);
            const m = machines.find((x) => x.id === machineId);
            if (m) setBuId(m.bu_id);
            setValues({});
        })();
    }, [machineId, machines]);

    const submit = async (e) => {
        e.preventDefault();
        setError(null);
        setMessage(null);
        setSubmitting(true);
        try {
            const rows = params.map((p) => ({
                parameter_id: p.id,
                value: values[p.id] != null && values[p.id] !== '' ? Number(values[p.id]) : null,
                kits_used: 0
            }));
            const res = await apiFetch('/api/lab/entries', {
                method: 'POST',
                body: JSON.stringify({
                    date,
                    machine_id: machineId,
                    bu_id: buId,
                    rows,
                    kits_used_total: kitsUsed
                })
            });
            const d = await res.json();
            if (!res.ok) throw new Error(d.error || 'Save failed');
            setMessage(`Saved ${d.count} row(s).`);
            setValues({});
            setKitsUsed(0);
        } catch (err) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <PageShell
            badge="Lab"
            badgeIcon={ClipboardList}
            title="Lab data entry"
            description="Enter values for your assigned business unit machines for the selected day."
            error={error}
            success={message}
            maxWidthClass="max-w-2xl"
        >
            <form onSubmit={submit} className="lab-card p-5 md:p-6 shadow-card space-y-4">
                <div>
                    <label className="block text-xs font-medium text-ink-secondary mb-1.5" htmlFor="lab-date">
                        Date
                    </label>
                    <input
                        id="lab-date"
                        type="date"
                        className="lab-input w-full"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        required
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium text-ink-secondary mb-1.5" htmlFor="lab-machine">
                        Machine
                    </label>
                    <select
                        id="lab-machine"
                        className="lab-input w-full"
                        value={machineId}
                        onChange={(e) => setMachineId(e.target.value)}
                        required
                    >
                        {machines.map((m) => (
                            <option key={m.id} value={m.id}>
                                {m.name} — {m.bu_name}
                            </option>
                        ))}
                    </select>
                </div>
                {params.map((p) => (
                    <div key={p.id}>
                        <label className="block text-xs font-medium text-ink-secondary mb-1.5" htmlFor={`p-${p.id}`}>
                            {p.name}
                        </label>
                        <input
                            id={`p-${p.id}`}
                            type="number"
                            step="any"
                            className="lab-input w-full"
                            value={values[p.id] ?? ''}
                            onChange={(e) => setValues({ ...values, [p.id]: e.target.value })}
                        />
                    </div>
                ))}
                <div>
                    <label className="block text-xs font-medium text-ink-secondary mb-1.5" htmlFor="lab-kits">
                        Kits used (total for machine)
                    </label>
                    <input
                        id="lab-kits"
                        type="number"
                        min={0}
                        className="lab-input w-full"
                        value={kitsUsed}
                        onChange={(e) => setKitsUsed(Number(e.target.value))}
                    />
                </div>
                <button type="submit" disabled={submitting} className="btn-primary py-2.5 px-6 text-sm disabled:opacity-60">
                    {submitting ? 'Saving…' : 'Save entry'}
                </button>
            </form>
        </PageShell>
    );
}
