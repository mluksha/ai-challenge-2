import React from "react";
import type { Employee } from "../types/employee";
import "./PedestalCard.css";

interface PedestalProps {
  employees: Employee[];
}

export const Pedestal: React.FC<PedestalProps> = ({ employees }) => {
  const getTopThree = () => {
    return employees.slice(0, 3).sort((a, b) => a.rank - b.rank);
  };

  const topThree = getTopThree();

  const getMedalColor = (rank: number) => {
    switch (rank) {
      case 1:
        return "gold";
      case 2:
        return "silver";
      case 3:
        return "bronze";
      default:
        return "default";
    }
  };

  return (
    <div className="pedestal-container">
      <h2 className="pedestal-title">🏆 Top 3 Performers</h2>
      <div className="pedestal">
        {/* Second Place - Left */}
        {topThree[1] && (
          <div className="pedestal-position second">
            <div className={`medal ${getMedalColor(topThree[1].rank)}`}>
              <span className="medal-number">2</span>
            </div>
            <img
              src={topThree[1].avatar}
              alt={topThree[1].name}
              className="avatar"
            />
            <div className="employee-info">
              <h3>{topThree[1].name}</h3>
              <p className="position">{topThree[1].jobPosition}</p>
              <p className="score">
                {topThree[1].totalScore.toLocaleString()} pts
              </p>
            </div>
          </div>
        )}

        {/* First Place - Center */}
        {topThree[0] && (
          <div className="pedestal-position first">
            <div className={`medal ${getMedalColor(topThree[0].rank)}`}>
              <span className="medal-number">1</span>
            </div>
            <img
              src={topThree[0].avatar}
              alt={topThree[0].name}
              className="avatar"
            />
            <div className="employee-info">
              <h3>{topThree[0].name}</h3>
              <p className="position">{topThree[0].jobPosition}</p>
              <p className="score">
                {topThree[0].totalScore.toLocaleString()} pts
              </p>
            </div>
          </div>
        )}

        {/* Third Place - Right */}
        {topThree[2] && (
          <div className="pedestal-position third">
            <div className={`medal ${getMedalColor(topThree[2].rank)}`}>
              <span className="medal-number">3</span>
            </div>
            <img
              src={topThree[2].avatar}
              alt={topThree[2].name}
              className="avatar"
            />
            <div className="employee-info">
              <h3>{topThree[2].name}</h3>
              <p className="position">{topThree[2].jobPosition}</p>
              <p className="score">
                {topThree[2].totalScore.toLocaleString()} pts
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
