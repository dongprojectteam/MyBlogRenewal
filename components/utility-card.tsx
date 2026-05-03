import Link from "next/link";

import type { Visualization } from "@/types";

export function UtilityCard({ item }: { item: Visualization }) {
  return (
    <article className="card">
      <div className="utility-path">{item.url}</div>
      <h3>{item.title}</h3>
      <p className="utility-description">{item.description}</p>
      <Link href={item.url} className="utility-link">
        열어보기 <span aria-hidden>→</span>
      </Link>
    </article>
  );
}
