import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Callout, Closing, Group, Header, Paragraph, Row, Rows, TextLink } from '@instinct/files';
import { mountWorld, SceneId, WorldHandle } from './world';
import { BUILD, Story, stories } from './data';

const byId = (id: SceneId) => stories.find((s) => s.id === id)!;

function Scene({ onPick, handle }: { onPick: (id: SceneId) => void; handle: React.MutableRefObject<WorldHandle | null> }) {
    const ref = useRef<HTMLCanvasElement>(null);
    useEffect(() => {
        if (!ref.current) return;
        handle.current = mountWorld(ref.current, { onPick });
        return () => { handle.current?.dispose(); handle.current = null; };
    }, [onPick, handle]);
    return <div className="nw-scene">
        <canvas ref={ref} className="nw-canvas" aria-label="A floating meadow with nineteen tiny 3D scenes: a flat where four friends play GTA VI, the Odisha coast as cyclone Akvan weakens, a cricket ground with the India and New Zealand score, a stock exchange showing Sensex and Nifty, an EPFO office with a queue outside, cheetah cubs at Kuno, a restaurant with a bill, a PUC testing bay, a foggy railway platform, a parked SpiceJet aircraft, Uttarakhand homestays, a hospital billing desk, a living room with an air purifier, a pharmacy counter, a Signal phone behind a shield, Voyager 1 in deep space, a travel-insurance payout bar, a toll plaza with a local pass lane, and a family checking motor insurance covers. Cars drive winding roads between them and a plane crosses the sky." />
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
                fact="Nineteen stories, reports 13-21 Nov 2026"
                factKnown
                intro="One floating meadow, nineteen tiny 3D stories. The camera roams by itself: it pulls back, picks a story at random, drops in and slowly circles it."
            />
            <p className="nw-tap-tip">Drag to roam, pinch or scroll to zoom around your fingers, twist two fingers to spin the view, tap a scene to read the story and its sources. The camera stays where you leave it and wanders again after a quiet minute. Cars, a plane and birds pass through now and then; they are just the world being alive.</p>
            <p className="nw-build">Last build: {BUILD.at}. Each story keeps its own time below; rebuilding the page does not make the news fresher.</p>
            <p className="nw-build">While this page is open it asks your browser to keep the screen awake, so it should not lock mid-tour. Some browsers or battery-saving modes may still ignore the request.</p>
            <Group label="The nineteen stories" heading>
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
                <Callout title="Plans and approvals" tone="note">
                    The PUC commencement date has not been established here, and no existing certificate is automatically extended. The EPFO changes were approved by its board on 19 November, with no start date announced. The four-part motor policy structure applies to new policies from 15 December. The FASTag local annual pass sells at eligible plazas from 1 November, and on the Rajmargyatra app from 1 December. The scenes show the announcements, not systems or rules that are already running.
                </Callout>
                <Callout title="Fixed numbers, not live" tone="note">
                    The stock market board shows the closing levels of 20 November and the cricket board shows the day 2 stumps score. Neither updates by itself. The page is refreshed by hand.
                </Callout>
            </Group>
            <Closing>Facts checked against the linked sources on 20-21 Nov 2026.</Closing>
        </div>
    </div>;
}

// Ask the browser to keep the screen on while this page is visible.
// Best effort: unsupported browsers and denied requests are ignored quietly.
type WakeLockSentinelLike = { release: () => Promise<void>; addEventListener?: (type: 'release', listener: () => void) => void };
type WakeLockNavigator = Navigator & { wakeLock?: { request: (type: 'screen') => Promise<WakeLockSentinelLike> } };

function useScreenWakeLock() {
    useEffect(() => {
        const nav = navigator as WakeLockNavigator;
        if (!nav.wakeLock) return;
        let sentinel: WakeLockSentinelLike | null = null;
        let stopped = false;
        const acquire = async () => {
            if (stopped || sentinel || document.visibilityState !== 'visible') return;
            try {
                const s = await nav.wakeLock!.request('screen');
                if (stopped) { s.release().catch(() => undefined); return; }
                sentinel = s;
                // The browser releases the lock itself (e.g. when the tab hides);
                // forget it so we request again when the page is visible again.
                s.addEventListener?.('release', () => { if (sentinel === s) sentinel = null; });
            } catch {
                // Unsupported, denied, or no user engagement yet: stay quiet.
            }
        };
        const onVisibility = () => {
            if (document.visibilityState === 'visible') acquire();
            else sentinel = null; // the browser auto-releases a hidden page's lock
        };
        const onGesture = () => acquire();
        acquire();
        document.addEventListener('visibilitychange', onVisibility);
        window.addEventListener('pointerdown', onGesture);
        window.addEventListener('keydown', onGesture);
        return () => {
            stopped = true;
            document.removeEventListener('visibilitychange', onVisibility);
            window.removeEventListener('pointerdown', onGesture);
            window.removeEventListener('keydown', onGesture);
            sentinel?.release().catch(() => undefined);
            sentinel = null;
        };
    }, []);
}

export function App() {
    const [open, setOpen] = useState<SceneId | null>(null);
    const [infoOpen, setInfoOpen] = useState(false);
    const handle = useRef<WorldHandle | null>(null);
    const story = open ? byId(open) : null;

    const onPick = useCallback((id: SceneId) => setOpen(id), []);
    useScreenWakeLock();

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
        <Scene onPick={onPick} handle={handle} />
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
