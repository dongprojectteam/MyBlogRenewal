import Link from "next/link";

import type { Visualization } from "@/types";

export function UtilityCard({ item }: { item: Visualization }) {
  const hasImage = Boolean(item.image_url);

  return (
    <Link href={item.url} className="card utility-card" aria-label={`${item.title} 열기`}>
      <div className="utility-head">
        <h3>{item.title}</h3>
        <div className="utility-path">{item.url}</div>
      </div>
      <div className={hasImage ? "utility-detail has-image" : "utility-detail"}>
        {item.image_url ? (
          <img className="utility-image" src={item.image_url} alt={`${item.title} preview`} loading="lazy" />
        ) : null}
        <p className="utility-description">{item.description}</p>
      </div>
      <div className="utility-description-overlay" aria-hidden="true">
        {item.description}
      </div>
    </Link>
  );
}
