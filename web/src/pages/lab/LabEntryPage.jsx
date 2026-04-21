import { useEffect, useState } from 'react';
import { ClipboardList } from 'lucide-react';
import { PageShell } from '../../components/PageShell.jsx';
import { apiFetch } from '../../apiClient.js';
import { DateQuickPicks } from '../../components/lab/DateQuickPicks.jsx';
import { TestCodeQuickPicks } from '../../components/lab/TestCodeQuickPicks.jsx';
import { KitToggle } from '../../components/lab/KitToggle.jsx';
import { HairlineRule } from '../../components/nexus/HairlineRule.jsx';
import { SectionMarker } from '../../components/nexus/SectionMarker.jsx';

function todayIso() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
}

export function LabEntryPage() {
    const [machines, setMachines] = useState([]);
    const [machineId, setMachineId] = useState('');
    const [params, setParams] = useState([]);
    const [values, setValues] = useState({});
    const [kitsUsed, setKitsUsed] = useState(0);
    const [date, setDate] = useState(todayIso);
    const [buId, setBuId] = useState('');
    const [testCode, setTestCode] = useState('');
    const [qcEnabled, setQcEnabled] = useState(false);
    const [qcKits, setQcKits] = useState(0);
    const [repeatEnabled, setRepeatEnabled] = useState(false);
    const [repeatRuns, setRepeatRuns] = useState(0);
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
            const normalisedTestCode = testCode.trim().toUpperCase();
            if (!normalisedTestCode) {
                throw new Error('Test code is required.');
            }
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
                    kits_used_total: kitsUsed,
                    qc_kits: qcEnabled ? Number(qcKits) || 0 : null,
                    repeat_runs: repeatEnabled ? Number(repeatRuns) || 0 : null,
                    test_code: normalisedTestCode
                })
            });
            const d = await res.json();
            if (!res.ok) throw new Error(d.error || 'Save failed');
            setMessage(`Saved ${d.count} row(s).`);
            setValues({});
            setKitsUsed(0);
            setQcKits(0);
            setRepeatRuns(0);
            // date, testCode and toggle positions are kept on purpose — lab techs
            // typically submit several machines back-to-back for the same date and test.
        } catch (err) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleTestCodeBlur = (e) => {
        const v = e.target.value.trim().toUpperCase().slice(0, 16);
        if (v !== testCode) setTestCode(v);
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
            <form onSubmit={submit} className="lab-card p-5 md:p-6 shadow-card space-y-5">
                <div className="space-y-2.5">
                    <SectionMarker number={1} label="When" />
                    <label
                        className="block text-xs font-medium text-ink-2 mb-1.5"
                        htmlFor="lab-date"
                    >
                        Date
                    </label>
                    <div className="flex flex-col md:flex-row md:items-center md:gap-3 gap-2">
                        <input
                            id="lab-date"
                            type="date"
                            className="lab-input md:w-auto md:min-w-[12rem]"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            required
                        />
                        <DateQuickPicks value={date} onChange={setDate} />
                    </div>
                </div>

                <HairlineRule tone="soft" />

                <div className="space-y-2.5">
                    <SectionMarker number={2} label="What" />
                    <label
                        className="block text-xs font-medium text-ink-2 mb-1.5"
                        htmlFor="lab-testcode"
                    >
                        Test code <span className="text-accent font-normal">*</span>
                    </label>
                    <input
                        id="lab-testcode"
                        type="text"
                        maxLength={16}
                        autoComplete="off"
                        spellCheck={false}
                        required
                        aria-required="true"
                        className="lab-input w-full font-mono uppercase tracking-wider"
                        placeholder="e.g. BI221"
                        value={testCode}
                        onChange={(e) => setTestCode(e.target.value)}
                        onBlur={handleTestCodeBlur}
                    />
                    <TestCodeQuickPicks value={testCode} onChange={setTestCode} />
                    <p className="text-xs text-ink-3">
                        Tags every row in this submission with the same test code. Required for traceability.
                    </p>
                </div>

                <HairlineRule tone="soft" />

                <div className="space-y-2.5">
                    <SectionMarker number={3} label="Machine & values" />
                    <label
                        className="block text-xs font-medium text-ink-2 mb-1.5"
                        htmlFor="lab-machine"
                    >
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
                    {params.map((p) => (
                        <div key={p.id}>
                            <label
                                className="block text-xs font-medium text-ink-2 mb-1.5"
                                htmlFor={`p-${p.id}`}
                            >
                                {p.name}
                            </label>
                            <input
                                id={`p-${p.id}`}
                                type="number"
                                step="any"
                                className="lab-input w-full"
                                value={values[p.id] ?? ''}
                                onChange={(e) =>
                                    setValues({ ...values, [p.id]: e.target.value })
                                }
                            />
                        </div>
                    ))}
                </div>

                <HairlineRule tone="soft" />

                <div className="space-y-2.5">
                    <SectionMarker number={4} label="Samples Run" />
                    <label
                        className="block text-xs font-medium text-ink-2 mb-1.5"
                        htmlFor="lab-kits"
                    >
                        Samples run (total for machine)
                    </label>
                    <p className="text-xs text-ink-3 -mt-1">
                        Total tests executed on this machine. A single kit can support many samples
                        (e.g. 100 TSH tests per kit).
                    </p>
                    <input
                        id="lab-kits"
                        type="number"
                        min={0}
                        className="lab-input w-full"
                        value={kitsUsed}
                        onChange={(e) => setKitsUsed(Number(e.target.value))}
                    />
                </div>

                <HairlineRule tone="soft" />

                <div className="space-y-3">
                    <SectionMarker number={5} label="Quality controls & repeats" />
                    <KitToggle
                        id="lab-qc-kits"
                        label="QC / Calibration"
                        enabled={qcEnabled}
                        onToggle={(v) => {
                            setQcEnabled(v);
                            if (!v) setQcKits(0);
                        }}
                        value={qcKits}
                        onValueChange={setQcKits}
                        inputLabel="QC / Calibration count"
                    />
                    <KitToggle
                        id="lab-repeat-runs"
                        label="Repeat runs"
                        enabled={repeatEnabled}
                        onToggle={(v) => {
                            setRepeatEnabled(v);
                            if (!v) setRepeatRuns(0);
                        }}
                        value={repeatRuns}
                        onValueChange={setRepeatRuns}
                        inputLabel="Repeat run count"
                    />
                </div>

                <button
                    type="submit"
                    disabled={submitting}
                    className="btn-primary py-2.5 px-6 text-sm disabled:opacity-60"
                >
                    {submitting ? 'Saving…' : 'Save entry'}
                </button>
            </form>
        </PageShell>
    );
}
