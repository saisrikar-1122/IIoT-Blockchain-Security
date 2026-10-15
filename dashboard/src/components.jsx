import React from "react";

export function Metric({ label, value, hint, tone = "" }) {
  return <div className={`metric ${tone}`}><span>{label}</span><strong>{value ?? "—"}</strong>{hint && <small>{hint}</small>}</div>;
}

export function Panel({ title, description, children, right }) {
  return <section className="panel"><div className="panel-head"><div><h2>{title}</h2>{description && <p>{description}</p>}</div>{right}</div>{children}</section>;
}

export function Notice({ notice }) {
  if (!notice) return null;
  return <div className={`notice ${notice.kind || "info"}`} role="status"><strong>{notice.title || "Result"}</strong><div>{notice.message}</div>{notice.hash && <code>Tx: {notice.hash}</code>}</div>;
}

export function StatusPill({ ok, children }) {
  return <span className={`pill ${ok ? "good" : "bad"}`}>{children}</span>;
}

export function Empty({ children = "No records yet." }) {
  return <div className="empty">{children}</div>;
}
