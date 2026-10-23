import { useMemo, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { HUB_TAB_ORDER, HUB_VIEW_LABELS, type HubViewId } from '@/components/hub-sidebar';
import { useStore } from '@/hooks/useStore';
import type { HubTabPrefs } from '@/stores/ui-store';
import './tab-organizer.scss';

const DEFAULT_ORDER: string[] = HUB_TAB_ORDER;
const DEFAULT_LABELS: Record<string, string> = HUB_VIEW_LABELS as Record<string, string>;

type Draft = {
    order: string[];
    hidden: string[];
    labels: Record<string, string>;
};

const toDraft = (prefs: HubTabPrefs): Draft => {
    const known = new Set(DEFAULT_ORDER);
    const order = (prefs.order ?? []).filter(v => known.has(v));
    for (const v of DEFAULT_ORDER) if (!order.includes(v)) order.push(v);
    return {
        order,
        hidden: (prefs.hidden ?? []).filter(v => known.has(v)),
        labels: { ...(prefs.labels ?? {}) },
    };
};

const HandleIcon = () => (
    <svg width='14' height='18' viewBox='0 0 14 18' aria-hidden='true'>
        <g fill='#94a3b8'>
            {[3, 9, 15].map(y => [2, 7].map(x => <circle key={`${x}-${y}`} cx={x} cy={y} r='1.5' />))}
        </g>
    </svg>
);

const EyeIcon = ({ off }: { off: boolean }) => (
    <svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.7' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true'>
        <path d='M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12z' />
        <circle cx='12' cy='12' r='3' />
        {off && <path d='M4 20 20 4' strokeWidth='2' />}
    </svg>
);

const ResetIcon = () => (
    <svg width='15' height='15' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true'>
        <path d='M3 12a9 9 0 1 0 2.8-6.5' />
        <path d='M3 4v5h5' />
    </svg>
);

const CloseIcon = () => (
    <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' aria-hidden='true'>
        <path d='M6 6l12 12M18 6 6 18' />
    </svg>
);

const TabOrganizer = observer(() => {
    const { ui } = useStore();
    const [draft, setDraft] = useState<Draft | null>(null);
    const [dragIndex, setDragIndex] = useState<number | null>(null);
    const [overIndex, setOverIndex] = useState<number | null>(null);

    const open = ui.is_tab_organizer_open;
    const state = useMemo(() => draft ?? toDraft(ui.hub_tab_prefs), [draft, ui.hub_tab_prefs]);

    if (!open) return null;

    const close = (apply?: HubTabPrefs) => {
        if (apply) ui.setHubTabPrefs(apply);
        setDraft(null);
        setDragIndex(null);
        setOverIndex(null);
        ui.setTabOrganizerOpen(false);
    };

    const edit = (next: Partial<Draft>) => setDraft({ ...state, ...next });

    const toggleHidden = (view: string) => {
        const hidden = state.hidden.includes(view)
            ? state.hidden.filter(v => v !== view)
            : [...state.hidden, view];
        edit({ hidden });
        if (hidden.includes(view) && ui.active_view === view) ui.setActiveView('dashboard');
    };

    const reorder = (from: number, to: number) => {
        if (from === to || from < 0 || to < 0) return;
        const order = [...state.order];
        const [moved] = order.splice(from, 1);
        order.splice(to, 0, moved);
        edit({ order });
    };

    const apply = () => {
        const prefs: HubTabPrefs = {
            order: state.order,
            hidden: state.hidden,
            labels: Object.fromEntries(Object.entries(state.labels).filter(([k, v]) => v.trim() && v !== DEFAULT_LABELS[k])),
        };
        close(prefs);
    };

    const reset = () => setDraft({ order: [...DEFAULT_ORDER], hidden: [], labels: {} });

    return (
        <div className='tab-organizer__overlay' onClick={() => close()} role='presentation'>
            <div
                className='tab-organizer'
                role='dialog'
                aria-label='Arrange navigation tabs'
                onClick={e => e.stopPropagation()}
            >
                <div className='tab-organizer__head'>
                    <div>
                        <h3 className='tab-organizer__title'>Arrange navigation tabs</h3>
                        <p className='tab-organizer__subtitle'>Drag tabs, rename them, or hide the ones you do not use.</p>
                    </div>
                    <button type='button' className='tab-organizer__close' aria-label='Close' onClick={() => close()}>
                        <CloseIcon />
                    </button>
                </div>

                <div className='tab-organizer__list'>
                    {state.order.map((view, index) => {
                        const hidden = state.hidden.includes(view);
                        const label = state.labels[view] ?? DEFAULT_LABELS[view] ?? view;
                        return (
                            <div
                                key={view}
                                className={[
                                    'tab-organizer__row',
                                    dragIndex === index ? 'tab-organizer__row--dragging' : '',
                                    overIndex === index && dragIndex !== null && dragIndex !== index ? 'tab-organizer__row--over' : '',
                                    hidden ? 'tab-organizer__row--hidden' : '',
                                ].filter(Boolean).join(' ')}
                                draggable
                                onDragStart={e => {
                                    setDragIndex(index);
                                    e.dataTransfer.effectAllowed = 'move';
                                }}
                                onDragOver={e => {
                                    e.preventDefault();
                                    setOverIndex(index);
                                }}
                                onDragLeave={() => setOverIndex(prev => (prev === index ? null : prev))}
                                onDrop={e => {
                                    e.preventDefault();
                                    if (dragIndex !== null) reorder(dragIndex, index);
                                    setDragIndex(null);
                                    setOverIndex(null);
                                }}
                                onDragEnd={() => {
                                    setDragIndex(null);
                                    setOverIndex(null);
                                }}
                            >
                                <span className='tab-organizer__handle' aria-hidden='true'>
                                    <HandleIcon />
                                </span>
                                <input
                                    className='tab-organizer__name'
                                    type='text'
                                    value={label}
                                    onChange={e => edit({ labels: { ...state.labels, [view]: e.target.value } })}
                                    aria-label={`Rename ${DEFAULT_LABELS[view] ?? view}`}
                                />
                                <button
                                    type='button'
                                    className={`tab-organizer__eye ${hidden ? 'tab-organizer__eye--off' : ''}`}
                                    aria-label={hidden ? `Show ${label}` : `Hide ${label}`}
                                    onClick={() => toggleHidden(view)}
                                >
                                    <EyeIcon off={hidden} />
                                </button>
                            </div>
                        );
                    })}
                </div>

                <div className='tab-organizer__footer'>
                    <button type='button' className='tab-organizer__reset' onClick={reset}>
                        <ResetIcon />
                        <span>Reset</span>
                    </button>
                    <div className='tab-organizer__actions'>
                        <button type='button' className='tab-organizer__cancel' onClick={() => close()}>
                            Cancel
                        </button>
                        <button type='button' className='tab-organizer__save' onClick={apply}>
                            Save arrangement
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
});

export default TabOrganizer;
