import React from "react";
import type { Employee } from "../types/employee";
import "./PedestalCard.css";

interface PedestalProps {
  employees: Employee[];
}

const StarIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
  >
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

type RankType = 1 | 2 | 3;

interface SlotProps {
  emp: Employee | null;
  rank: RankType;
  slotClass: string;
}

const PedestalSlot: React.FC<SlotProps> = ({ emp, rank, slotClass }) => {
  const ringClass =
    rank === 1
      ? "avatar-ring-gold"
      : rank === 2
        ? "avatar-ring-silver"
        : "avatar-ring-bronze";
  const dotClass =
    rank === 1
      ? "rank-dot-gold"
      : rank === 2
        ? "rank-dot-silver"
        : "rank-dot-bronze";
  const podiumClass = rank === 1 ? "podium-gold" : "podium-silver";

  if (!emp) {
    return (
      <div className={`pedestal-slot ${slotClass}`}>
        <div className={`podium ${podiumClass}`}>
          <span className="podium-rank">{rank}</span>
        </div>
      </div>
    );
  }

  const totalScore = emp.activities.reduce(
    (sum, activity) => sum + activity.points,
    0,
  );

  return (
    <div className={`pedestal-slot ${slotClass}`}>
      <div className="pedestal-player">
        <div className={`avatar-ring ${ringClass}`}>
          <img
            src={emp.avatar}
            alt={emp.name}
            className={`pedestal-avatar${rank === 1 ? " pedestal-avatar-lg" : ""}`}
          />
          <span className={`rank-dot ${dotClass}`}>{rank}</span>
        </div>
        <div className="player-name">{emp.name}</div>
        <div className="player-position">{emp.jobPosition}</div>
        <div className="score-badge">
          <StarIcon />
          <span>{totalScore.toLocaleString()}</span>
        </div>
      </div>
      <div className={`podium ${podiumClass}`}>
        <span className="podium-rank">{rank}</span>
      </div>
    </div>
  );
};

export const Pedestal: React.FC<PedestalProps> = ({ employees }) => {
  const topThree = employees.slice(0, 3);
  const first = topThree[0] ?? null;
  const second = topThree[1] ?? null;
  const third = topThree[2] ?? null;

  if (!first) return null;

  return (
    <div className="pedestal-section">
      <div className="pedestal-stage">
        <PedestalSlot emp={second} rank={2} slotClass="slot-second" />
        <PedestalSlot emp={first} rank={1} slotClass="slot-first" />
        <PedestalSlot emp={third} rank={3} slotClass="slot-third" />
      </div>
    </div>
  );
};
