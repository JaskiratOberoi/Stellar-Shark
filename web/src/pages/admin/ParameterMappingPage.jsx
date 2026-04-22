import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ReactFlow,
    ReactFlowProvider,
    Background,
    Controls,
    MiniMap,
    useNodesState,
    useEdgesState,
    addEdge,
    MarkerType
} from '@xyflow/react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Link2 } from 'lucide-react';
import { PageShell } from '../../components/PageShell.jsx';
import { apiFetch } from '../../apiClient.js';

function readLayoutDims() {
    if (typeof window === 'undefined') {
        return { w: 220, gapY: 72, leftX: 40, rightX: 420 };
    }
    return window.matchMedia('(max-width: 640px)').matches
        ? { w: 160, gapY: 56, leftX: 24, rightX: 200 }
        : { w: 220, gapY: 72, leftX: 40, rightX: 420 };
}

export function ParameterMappingPage() {
    const [parameters, setParameters] = useState([]);
    const [machines, setMachines] = useState([]);
    const [mappings, setMappings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    const buildNodesEdges = useCallback((params, machs, maps, savedLayout, dim = readLayoutDims()) => {
        const { w, gapY, leftX, rightX } = dim;
        const nodes = [];
        const edges = [];
        const posMap = new Map();
        if (savedLayout?.nodes && Array.isArray(savedLayout.nodes)) {
            for (const n of savedLayout.nodes) {
                posMap.set(n.id, n.position);
            }
        }
        params.forEach((p, i) => {
            const id = `p-${p.id}`;
            const pos = posMap.get(id) || { x: leftX, y: 40 + i * gapY };
            nodes.push({
                id,
                position: pos,
                data: { label: p.name },
                type: 'default',
                style: {
                    width: w,
                    borderRadius: 16,
                    border: '1px solid #e2e8f0',
                    padding: 12,
                    fontSize: 13,
                    fontWeight: 600,
                    background: '#fff'
                }
            });
        });
        machs.forEach((m, i) => {
            const id = `m-${m.id}`;
            const pos = posMap.get(id) || { x: rightX, y: 40 + i * gapY };
            nodes.push({
                id,
                position: pos,
                data: { label: `${m.name} (${m.model})` },
                type: 'default',
                style: {
                    width: w,
                    borderRadius: 16,
                    border: '1px solid #0f172a',
                    padding: 12,
                    fontSize: 13,
                    fontWeight: 600,
                    background: '#0f172a',
                    color: '#fff'
                }
            });
        });
        const mapSet = new Set(maps.map((x) => `${x.parameter_id}|${x.machine_id}`));
        maps.forEach((mp) => {
            edges.push({
                id: `e-${mp.parameter_id}-${mp.machine_id}`,
                source: `p-${mp.parameter_id}`,
                target: `m-${mp.machine_id}`,
                markerEnd: { type: MarkerType.ArrowClosed, color: '#2563eb' },
                style: { stroke: '#2563eb', strokeWidth: 1.5 }
            });
        });
        if (savedLayout?.edges && Array.isArray(savedLayout.edges)) {
            const have = new Set(edges.map((e) => e.id));
            for (const e of savedLayout.edges) {
                if (!have.has(e.id) && e.source && e.target) {
                    edges.push({
                        ...e,
                        markerEnd: { type: MarkerType.ArrowClosed, color: '#2563eb' },
                        style: { stroke: '#2563eb', strokeWidth: 1.5 }
                    });
                }
            }
        }
        return { nodes, edges };
    }, []);

    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [pr, mr, mapr, layr] = await Promise.all([
                apiFetch('/api/admin/parameters'),
                apiFetch('/api/admin/machines'),
                apiFetch('/api/admin/parameter-mappings'),
                apiFetch('/api/admin/parameter-mapping-ui')
            ]);
            const pj = await pr.json();
            const mj = await mr.json();
            const mapj = await mapr.json();
            const layj = await layr.json();
            if (!pr.ok) throw new Error(pj.error || 'Failed parameters');
            setParameters(pj.parameters || []);
            setMachines(mj.machines || []);
            setMappings(mapj.mappings || []);
            const layout = layj.layout && typeof layj.layout === 'object' ? layj.layout : { nodes: [], edges: [] };
            const { nodes: n, edges: e } = buildNodesEdges(
                pj.parameters || [],
                mj.machines || [],
                mapj.mappings || [],
                layout,
                readLayoutDims()
            );
            setNodes(n);
            setEdges(e);
        } catch (err) {
            setError(err.message || String(err));
        } finally {
            setLoading(false);
        }
    }, [buildNodesEdges, setEdges, setNodes]);

    useEffect(() => {
        load();
    }, [load]);

    const onConnect = useCallback(
        async (connection) => {
            if (!connection.source || !connection.target) return;
            const paramId = connection.source.replace(/^p-/, '');
            const machineId = connection.target.replace(/^m-/, '');
            setEdges((eds) => addEdge({ ...connection, markerEnd: { type: MarkerType.ArrowClosed } }, eds));
            try {
                const res = await apiFetch('/api/admin/parameter-mappings', {
                    method: 'POST',
                    body: JSON.stringify({ parameter_id: paramId, machine_id: machineId })
                });
                if (!res.ok) {
                    const j = await res.json().catch(() => ({}));
                    throw new Error(j.error || 'Save failed');
                }
                setMappings((m) => [...m, { parameter_id: paramId, machine_id: machineId }]);
            } catch (e) {
                setError(e.message || String(e));
            }
        },
        [setEdges]
    );

    const persistLayout = useCallback(async () => {
        setSaving(true);
        setError(null);
        try {
            const layout = {
                nodes: nodes.map((n) => ({ id: n.id, position: n.position })),
                edges: edges.map((e) => ({ id: e.id, source: e.source, target: e.target }))
            };
            const res = await apiFetch('/api/admin/parameter-mapping-ui', {
                method: 'PUT',
                body: JSON.stringify({ layout })
            });
            const j = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(j.error || 'Save layout failed');
        } catch (e) {
            setError(e.message || String(e));
        } finally {
            setSaving(false);
        }
    }, [nodes, edges]);

    const flowKey = useMemo(() => `${parameters.length}-${machines.length}`, [parameters.length, machines.length]);

    const backLink = (
        <Link
            to="/admin/parameters"
            className="btn-ghost px-4 py-2.5 text-sm inline-flex items-center gap-2 shrink-0"
        >
            <ArrowLeft className="w-4 h-4" aria-hidden />
            Parameters
        </Link>
    );

    const headerActions = (
        <>
            {backLink}
            <button
                type="button"
                onClick={persistLayout}
                disabled={saving}
                className="btn-primary px-5 py-2.5 text-sm shrink-0 disabled:opacity-60"
            >
                {saving ? 'Saving…' : 'Save layout'}
            </button>
        </>
    );

    if (loading) {
        return (
            <PageShell
                badge="Admin · Catalog"
                badgeIcon={Link2}
                title="Parameter ↔ Machine mapping"
                description="Drag from a parameter (left) to a machine (right). Save layout to persist positions."
                maxWidthClass="max-w-[1400px]"
                headerAction={backLink}
            >
                <p className="text-sm text-ink-muted py-6">Loading mapping…</p>
            </PageShell>
        );
    }

    return (
        <PageShell
            badge="Admin · Catalog"
            badgeIcon={Link2}
            title="Parameter ↔ Machine mapping"
            description="Drag from a parameter (left) to a machine (right). Save layout to persist positions."
            error={error}
            maxWidthClass="max-w-[1400px]"
            headerAction={headerActions}
        >
            <p className="mb-3 text-sm text-ink-3 border border-dashed border-ink-3/30 rounded-lg px-3 py-2 bg-surface-2/50 md:hidden">
                Best viewed on a larger screen for editing.
            </p>
            <div className="lab-card p-0 overflow-hidden shadow-card" style={{ height: 'min(70vh, 640px)' }}>
                <ReactFlowProvider>
                    <ReactFlow
                        key={flowKey}
                        nodes={nodes}
                        edges={edges}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        onConnect={onConnect}
                        fitView
                        fitViewOptions={{ padding: 0.2 }}
                        proOptions={{ hideAttribution: true }}
                    >
                        <Background gap={20} color="#e2e8f0" />
                        <MiniMap zoomable pannable />
                        <Controls />
                    </ReactFlow>
                </ReactFlowProvider>
            </div>
        </PageShell>
    );
}
