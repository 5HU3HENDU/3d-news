// Local stand-ins for the hosted-page layout components used by App.tsx.
// Plain markup only: no account metadata, no hosting wrapper.
import React, { ReactNode } from 'react';

export function FileRouter({ children }: { children?: ReactNode }) {
    return <>{children}</>;
}

export function FileCard({ children }: { children?: ReactNode }) {
    return <main className="nw-card">{children}</main>;
}

export function Header({ title, fact, intro }: { title: string; fact?: string; factKnown?: boolean; intro?: string }) {
    return <header className="nw-header">
        <h1 className="nw-title">{title}</h1>
        {fact && <div className="nw-fact">{fact}</div>}
        {intro && <p className="nw-intro">{intro}</p>}
    </header>;
}

export function Group({ label, heading, children }: { label?: string; heading?: boolean; children?: ReactNode }) {
    return <section className="nw-group">
        {label && (heading ? <h2 className="nw-group-label">{label}</h2> : <div className="nw-group-label">{label}</div>)}
        {children}
    </section>;
}

export function Rows({ children }: { children?: ReactNode }) {
    return <div className="nw-rows">{children}</div>;
}

export function Row({ number, name, detail }: { number?: number; name: string; detail?: string }) {
    return <div className="nw-row">
        {typeof number === 'number' && <div className="nw-row-num">{number}</div>}
        <div className="nw-row-body">
            <div className="nw-row-name">{name}</div>
            {detail && <div className="nw-row-detail">{detail}</div>}
        </div>
    </div>;
}

export function Paragraph({ children }: { children?: ReactNode }) {
    return <p className="nw-para">{children}</p>;
}

export function Callout({ title, children }: { title?: string; tone?: string; children?: ReactNode }) {
    return <aside className="nw-callout">
        {title && <div className="nw-callout-title">{title}</div>}
        <div className="nw-callout-body">{children}</div>
    </aside>;
}

export function Closing({ children }: { children?: ReactNode }) {
    return <footer className="nw-closing">{children}</footer>;
}

export function TextLink({ href, children }: { href: string; children?: ReactNode }) {
    return <a className="nw-link" href={href} target="_blank" rel="noopener noreferrer">{children}</a>;
}
