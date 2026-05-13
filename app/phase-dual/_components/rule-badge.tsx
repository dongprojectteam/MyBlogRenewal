import Image from "next/image";

import { ruleEnglishLabel, ruleIconPath, ruleLabel, type PhaseDualLinkRule } from "../_lib/engine";

export function RuleBadge({ rule }: { rule: PhaseDualLinkRule }) {
  return (
    <div className="phase-dual-rule-badge" aria-label={`연동 규칙 ${ruleLabel(rule)}`}>
      <Image src={ruleIconPath(rule)} alt={ruleLabel(rule)} width={36} height={36} className="phase-dual-rule-icon" />
      <div className="phase-dual-rule-badge-text">
        <strong>{ruleLabel(rule)}</strong>
        <span>{ruleEnglishLabel(rule)}</span>
      </div>
    </div>
  );
}
