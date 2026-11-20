import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Callout, Closing, Group, Header, Paragraph, Row, Rows, TextLink } from '@instinct/files';
import { mountWorld, SceneId, TOUR, WorldHandle } from './world';
import { Story, stories } from './data';

const byId = (id: SceneId) => stories.find((s) => s.id === id)!;

function Scene({ onPick, onFocus, handle }: { onPick: (id: SceneId) => void; onFocus: (id: SceneId) => void; handle: React.MutableRefObject<WorldHandle | null> }) {
    const ref = useRef<HTMLCanvasElement>(null);
    useEffect(() => {
        if (!ref.current) return;
        handle.current = mountWorld(ref.current, { onPick, onFocus });
        return () => { handle.current?.dispose(); handle.current = null; };
    }, [onPick, onFocus, handle]);
    return <div className="nw-scene">
        <canvas ref={ref} className="nw-canvas" aria-label="A flat canvas with four tiny 3D scenes: a flat where two people play GTA VI, the Odisha coast at cyclone landfall, a cricket ground with the India and New Zealand score, and a stock exchange showing Sensex and Nifty" />
    </div>;
}

function StoryPanel({ story, onClose }: { story: Story; onClose: () => void }) {
    return <div className="nw-panel" role="dialog" aria-label={story.headline}>
        <div className="nw-panel-head">
            <div>
                <div className="nw-panel-title">{story.headline}</div>
                <div className="nw-panel-where">{story.asOf}</div>
            </div>
            <button type="button" className="nw-close" onClick={onClose} aria-label="Close story">×</button>
        </div>
        <ul className="nw-bullets">
            {story.bullets.map((b) => <li key={b}>{b}</li>)}
        </ul>
        <p className="nw-note">{story.note}</p>
        {story.sources.map((s) => <div key={s.href}><TextLink href={s.href}>{s.label}</TextLink></div>)}
    </div>;
}

function InfoPanel({ onClose }: { onClose: () => void }) {
    return <div className="nw-info-overlay" role="dialog" aria-modal="true" aria-label="About this page">
        <button type="button" className="nw-info-backdrop" onClick={onClose} aria-label="Close information" tabIndex={-1} />
        <div className="nw-info-panel">
            <button type="button" className="nw-close nw-info-close" onClick={onClose} aria-label="Close information" autoFocus>×</button>
            <Header
                title="The news, in miniature"
                fact="Four stories, Fri 20 Nov 2026"
                factKnown
                intro="One flat canvas, four tiny 3D scenes. The camera tours them slowly, zooming out and in between stories."
            />
            <p className="nw-tap-tip">The tour runs by itself. Drag to move around, pinch or scroll to zoom, tap a scene to read the story and sources. The dots at the top jump to a story.</p>
            <Group label="The four stories" heading>
                <Rows>
                    {stories.map((s, i) => (
                        <Row key={s.id} number={i + 1} name={s.headline} detail={`${s.asOf.replace(/\.$/, '')}. ${s.bullets[0]}`} />
                    ))}
                </Rows>
                <Paragraph>
                    Sources:{' '}
                    {stories.flatMap((s) => s.sources).map((s, i) => (
                        <span key={s.href}>{i > 0 && ' · '}<TextLink href={s.href}>{s.label}</TextLink></span>
                    ))}
                </Paragraph>
                <Callout title="Illustration, not footage" tone="note">
                    Every scene is a hand-built toy model and a visual metaphor. Nothing here is real video. The cyclone scene shows rain, a rough sea, small puddles and people walking to a shelter, not destruction.
                </Callout>
                <Callout title="Fixed numbers, not live" tone="note">
                    The stock market board shows the 12:00 PM IST reading and the cricket board shows the day 2 stumps score. Neither updates by itself. The page is refreshed by hand.
                </Callout>
            </Group>
            <Closing>Facts checked against the linked sources on 20 Nov 2026, around 12:40 PM IST.</Closing>
        </div>
    </div>;
}

export function App() {
    const [open, setOpen] = useState<SceneId | null>(null);
    const [infoOpen, setInfoOpen] = useState(false);
    const [focus, setFocus] = useState<SceneId>('gta');
    const handle = useRef<WorldHandle | null>(null);
    const story = open ? byId(open) : null;

    const onPick = useCallback((id: SceneId) => setOpen(id), []);
    const onFocus = useCallback((id: SceneId) => setFocus(id), []);

    useEffect(() => { handle.current?.setHold(!!open || infoOpen); }, [open, infoOpen]);
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key !== 'Escape') return;
            if (infoOpen) setInfoOpen(false);
            else if (open) setOpen(null);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [infoOpen, open]);

    return <>
        <Scene onPick={onPick} onFocus={onFocus} handle={handle} />
        <div className="nw-tour" aria-live="polite">
            <div className="nw-tour-title">{byId(focus).title}</div>
            <div className="nw-tour-dots" role="group" aria-label="Jump to a story">
                {TOUR.map((id) => (
                    <button
                        key={id}
                        type="button"
                        className={`nw-dot${id === focus ? ' nw-dot-on' : ''}`}
                        aria-label={byId(id).title}
                        aria-current={id === focus}
                        onClick={() => handle.current?.flyTo(id)}
                    />
                ))}
            </div>
        </div>
        <button
            type="button"
            className="nw-info-btn"
            onClick={() => setInfoOpen(true)}
            aria-label="About this page: stories, sources and notes"
            aria-expanded={infoOpen}
        >
            <span aria-hidden="true">i</span>
        </button>
        {story && <StoryPanel story={story} onClose={() => setOpen(null)} />}
        {infoOpen && <InfoPanel onClose={() => setInfoOpen(false)} />}
    </>;
}
