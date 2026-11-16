import { animated, useSpring } from "@react-spring/web";
import { useEffect, useRef, useState } from "react";
import { artworkUrl, displayName, type Pokemon } from "@/lib/pokeapi";
import { usePrefersReducedMotion } from "@/lib/state";

/** Toca o grito do Pokémon. Os arquivos são .ogg; se o navegador não tocar, avisa. */
export function CryButton({ pokemon }: { pokemon: Pokemon }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [state, setState] = useState<"idle" | "playing" | "error">("idle");

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, [pokemon.id]);

  if (!pokemon.cry) return null;
  const name = displayName(pokemon.name);

  const play = async () => {
    try {
      audioRef.current?.pause();
      const audio = new Audio(pokemon.cry!);
      audio.volume = 0.5;
      audioRef.current = audio;
      audio.onended = () => setState("idle");
      setState("playing");
      await audio.play();
    } catch {
      setState("error");
      setTimeout(() => setState("idle"), 2600);
    }
  };

  return (
    <button
      type="button"
      onClick={play}
      aria-label={`Ouvir o grito de ${name}`}
      title={state === "error" ? "Este navegador não tocou o som" : `Ouvir ${name}`}
      className={`grid size-9 place-items-center rounded-full border transition ${
        state === "playing" ? "border-ink bg-ink text-bg" : "border-line bg-surface-solid/80 text-muted hover:border-ink hover:text-ink"
      }`}
    >
      {state === "error" ? (
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M11 5 6 9H3v6h3l5 4V5ZM22 9l-6 6M16 9l6 6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M11 5 6 9H3v6h3l5 4V5Z" strokeLinejoin="round" />
          <path
            d="M15.5 8.5a5 5 0 0 1 0 7"
            strokeLinecap="round"
            className={state === "playing" ? "motion-safe:animate-pulse" : ""}
          />
          <path
            d="M18.5 5.5a9 9 0 0 1 0 13"
            strokeLinecap="round"
            className={state === "playing" ? "motion-safe:animate-pulse [animation-delay:150ms]" : ""}
          />
        </svg>
      )}
      <span className="sr-only" aria-live="polite">
        {state === "error" ? "Não foi possível tocar o som neste navegador." : ""}
      </span>
    </button>
  );
}

/**
 * Arte oficial com botão para ver a versão shiny.
 * Ao trocar, a imagem gira e cresce com mola e solta umas faíscas.
 */
export function ShinyArtwork({ pokemon, size = 160 }: { pokemon: Pokemon; size?: number }) {
  const [shiny, setShiny] = useState(false);
  const [burst, setBurst] = useState(0);
  const reduce = usePrefersReducedMotion();
  const name = displayName(pokemon.name);

  const [spring, api] = useSpring(() => ({
    transform: "scale(1) rotateY(0deg)",
    opacity: 1,
    config: { tension: 300, friction: 16 },
  }));

  const toggle = () => {
    setShiny((s) => !s);
    setBurst((b) => b + 1);
    // Gira e cresce com mola só quando o botão é apertado.
    api.start({
      from: { transform: "scale(0.7) rotateY(-90deg)", opacity: 0.4 },
      to: { transform: "scale(1) rotateY(0deg)", opacity: 1 },
      immediate: reduce,
    });
  };

  // Pré-carrega a versão shiny para a troca não piscar.
  const preload = () => {
    const img = new Image();
    img.src = artworkUrl(pokemon.id, true);
  };

  return (
    <div className="relative" style={{ perspective: 600 }}>
      <animated.img
        src={artworkUrl(pokemon.id, shiny)}
        alt={shiny ? `${name} shiny` : name}
        width={size}
        height={size}
        style={spring}
        className="drop-shadow-[0_10px_16px_rgb(0_0_0/0.2)]"
      />

      {burst > 0 && shiny && !reduce && (
        <div key={burst} className="pointer-events-none absolute inset-0" aria-hidden="true">
          {Array.from({ length: 8 }, (_, i) => (
            <span
              key={i}
              className="sparkle absolute top-1/2 left-1/2 text-amber-400"
              style={{ "--a": `${i * 45}deg` } as React.CSSProperties}
            >
              ✦
            </span>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={toggle}
        onPointerEnter={preload}
        onFocus={preload}
        aria-pressed={shiny}
        aria-label={shiny ? `Ver ${name} normal` : `Ver ${name} shiny`}
        title={shiny ? "Ver normal" : "Ver shiny"}
        className={`absolute -right-1 bottom-1 grid size-9 place-items-center rounded-full border text-base transition ${
          shiny
            ? "border-amber-400 bg-amber-400 text-white shadow-[0_0_18px_rgb(251_191_36/0.7)]"
            : "border-line bg-surface-solid/90 text-muted hover:border-amber-400 hover:text-amber-500"
        }`}
      >
        <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden="true">
          <path d="M12 2.5l1.8 5.2 5.2 1.8-5.2 1.8L12 16.5l-1.8-5.2L5 9.5l5.2-1.8L12 2.5Z" />
          <path d="M18.5 14l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2Z" />
        </svg>
      </button>
    </div>
  );
}
