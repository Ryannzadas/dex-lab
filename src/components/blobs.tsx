import { animated, useSpring } from "@react-spring/web";
import { usePrefersReducedMotion } from "@/lib/state";
import { TYPE_INFO, type TypeName } from "@/lib/types";

const FALLBACK = ["#fb7185", "#fbbf24", "#86efac"];

/**
 * Manchas de cor grandes e desfocadas no fundo (estilo react-spring.dev).
 * As cores seguem os tipos do time e mudam com efeito de mola.
 */
export function Blobs({ types }: { types: TypeName[] }) {
  const reduce = usePrefersReducedMotion();
  const colors = [...new Set(types)].map((t) => TYPE_INFO[t].color);
  const [a, b, c] = [0, 1, 2].map((i) => colors[i] ?? colors[0] ?? FALLBACK[i]);

  const config = { tension: 60, friction: 26 };
  const s1 = useSpring({ background: a, config, immediate: reduce });
  const s2 = useSpring({ background: b, config, immediate: reduce });
  const s3 = useSpring({ background: c, config, immediate: reduce });

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
      <animated.div
        style={s1}
        className="absolute -top-[20%] -right-[15%] size-[70vmax] rounded-full opacity-45 blur-[90px] dark:opacity-25 motion-safe:animate-[float_22s_ease-in-out_infinite_alternate]"
      />
      <animated.div
        style={s2}
        className="absolute top-[45%] -left-[20%] size-[45vmax] rounded-full opacity-40 blur-[90px] dark:opacity-20 motion-safe:animate-[float_26s_ease-in-out_infinite_alternate-reverse]"
      />
      <animated.div
        style={s3}
        className="absolute -bottom-[25%] right-[10%] size-[50vmax] rounded-full opacity-35 blur-[100px] dark:opacity-20 motion-safe:animate-[float_30s_ease-in-out_infinite_alternate]"
      />
    </div>
  );
}
