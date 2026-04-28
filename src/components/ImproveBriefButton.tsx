"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Botón "Mejorar con IA" — se monta junto al label del Brief.
 *
 * Encuentra el form padre vía DOM y lee `[name="title"]` + `[name="description"]`.
 * Llama a /api/ai/improve-brief y reemplaza el textarea con la versión mejorada,
 * dejando un link "Deshacer" disponible por 8s.
 */
export function ImproveBriefButton() {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [loading, setLoading] = useState(false);
  const [previousValue, setPreviousValue] = useState<string | null>(null);
  const [message, setMessage] = useState<{ kind: "error" | "info"; text: string } | null>(null);

  // Auto-clear el undo después de 8 segundos
  useEffect(() => {
    if (previousValue === null) return;
    const t = setTimeout(() => setPreviousValue(null), 8000);
    return () => clearTimeout(t);
  }, [previousValue]);

  // Auto-clear mensajes después de 4 segundos
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(null), 4000);
    return () => clearTimeout(t);
  }, [message]);

  function findFields(): { title: HTMLInputElement | null; desc: HTMLTextAreaElement | null; form: HTMLFormElement | null } {
    const form = buttonRef.current?.closest("form") ?? null;
    const title = form?.querySelector<HTMLInputElement>('[name="title"]') ?? null;
    const desc = form?.querySelector<HTMLTextAreaElement>('[name="description"]') ?? null;
    return { title, desc, form };
  }

  async function handleImprove() {
    const { title, desc } = findFields();
    if (!title || !desc) {
      setMessage({ kind: "error", text: "No encontré los campos del form." });
      return;
    }

    const titleValue = title.value.trim();
    if (!titleValue) {
      setMessage({ kind: "error", text: "Escribe un título primero." });
      title.focus();
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/ai/improve-brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: titleValue, description: desc.value }),
      });
      const data = (await res.json().catch(() => ({}))) as { improved?: string; error?: string };

      if (!res.ok || !data.improved) {
        setMessage({ kind: "error", text: data.error ?? `Error ${res.status}` });
        return;
      }

      setPreviousValue(desc.value);
      setNativeValue(desc, data.improved);
      desc.focus();
    } catch (e: unknown) {
      const text = e instanceof Error ? e.message : "Error de red.";
      setMessage({ kind: "error", text });
    } finally {
      setLoading(false);
    }
  }

  function handleUndo() {
    if (previousValue === null) return;
    const { desc } = findFields();
    if (desc) setNativeValue(desc, previousValue);
    setPreviousValue(null);
    setMessage({ kind: "info", text: "Restaurado." });
  }

  return (
    <div className="flex items-center gap-2">
      <button
        ref={buttonRef}
        type="button"
        onClick={handleImprove}
        disabled={loading}
        className={[
          "group inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] uppercase tracking-[0.18em]",
          "ring-1 ring-ink-900/10 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
          loading
            ? "bg-ink-900/[0.06] text-ink-500"
            : "bg-accent-lime/30 text-ink-900 hover:bg-accent-lime hover:scale-[1.03] active:scale-95",
        ].join(" ")}
      >
        {loading ? <Spinner /> : <SparkleIcon />}
        <span>{loading ? "Mejorando…" : "Mejorar con IA"}</span>
      </button>

      {previousValue !== null && !loading && (
        <button
          type="button"
          onClick={handleUndo}
          className="text-[10px] uppercase tracking-[0.18em] text-ink-500 underline-offset-4 hover:text-ink-900 hover:underline"
        >
          Deshacer
        </button>
      )}

      {message && (
        <span
          className={`text-[10px] uppercase tracking-[0.18em] ${
            message.kind === "error" ? "text-accent-rust" : "text-ink-500"
          }`}
        >
          {message.text}
        </span>
      )}
    </div>
  );
}

/**
 * React 19 / Next 15 — escribir directo en .value de un input/textarea no
 * dispara el evento `input` que React escucha en componentes controlados.
 * Para forms uncontrolled (los nuestros usan defaultValue), basta con .value,
 * pero por si en el futuro alguien convierte el textarea en controlado, uso
 * el setter del prototipo nativo + un evento `input` para que se sincronice.
 */
function setNativeValue(el: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
  if (setter) {
    setter.call(el, value);
  } else {
    el.value = value;
  }
  el.dispatchEvent(new Event("input", { bubbles: true }));
}

function SparkleIcon() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="transition-transform duration-300 group-hover:rotate-12"
    >
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="animate-spin">
      <path d="M12 3a9 9 0 1 0 9 9" />
    </svg>
  );
}
