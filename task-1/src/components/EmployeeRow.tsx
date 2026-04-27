import React, { useState } from "react";
import type { Employee, Activity } from "../types/employee";
import "./EmployeeRow.css";

interface EmployeeRowProps {
  employee: Employee;
}

const ComputerIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="2" y="3" width="20" height="14" rx="2" />
    <line x1="8" y1="21" x2="16" y2="21" />
    <line x1="12" y1="17" x2="12" y2="21" />
  </svg>
);

const GraduationIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
    <path d="M6 12v5c3 3 9 3 12 0v-5" />
  </svg>
);

const StarIcon = () => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
  >
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

const ChevronDownIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const ChevronUpIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="18 15 12 9 6 15" />
  </svg>
);

const EDU_KEYWORDS = ["education", "mentoring", "training", "learning"];

const isEducationCategory = (category: string) =>
  EDU_KEYWORDS.some((k) => category.toLowerCase().includes(k));

const getActivityGroups = (activities: Activity[]) => {
  const groups: { icon: "work" | "edu"; count: number }[] = [];
  let workCount = 0;
  let eduCount = 0;
  let firstIsEdu: boolean | null = null;

  activities.forEach((act) => {
    const isEdu = isEducationCategory(act.category);
    if (firstIsEdu === null) firstIsEdu = isEdu;
    if (isEdu) eduCount++;
    else workCount++;
  });

  if (firstIsEdu) {
    if (eduCount > 0) groups.push({ icon: "edu", count: eduCount });
    if (workCount > 0) groups.push({ icon: "work", count: workCount });
  } else {
    if (workCount > 0) groups.push({ icon: "work", count: workCount });
    if (eduCount > 0) groups.push({ icon: "edu", count: eduCount });
  }

  return groups;
};

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  const day = date.getDate().toString().padStart(2, "0");
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return `${day}-${months[date.getMonth()]}-${date.getFullYear()}`;
};

export const EmployeeRow: React.FC<EmployeeRowProps> = ({ employee }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const activityGroups = getActivityGroups(employee.activities);
  const totalScore = employee.activities.reduce(
    (sum, activity) => sum + activity.points,
    0,
  );

  const toggle = () => setIsExpanded((prev) => !prev);

  return (
    <div
      className={`employee-row${isExpanded ? " employee-row--expanded" : ""}`}
    >
      <div
        className="employee-row-header"
        onClick={toggle}
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            toggle();
          }
        }}
      >
        <div className="row-rank">{employee.rank}</div>
        <img src={employee.avatar} alt={employee.name} className="row-avatar" />
        <div className="row-info">
          <div className="row-name">{employee.name}</div>
          <div className="row-position">{employee.jobPosition}</div>
        </div>

        <div className="row-activity-groups">
          {activityGroups.map((g, i) => (
            <div key={i} className="activity-group">
              <div className="activity-icon">
                {g.icon === "work" ? <ComputerIcon /> : <GraduationIcon />}
              </div>
              <div className="activity-count">{g.count}</div>
            </div>
          ))}
        </div>

        <div className="row-score-section">
          <div className="row-score-label">TOTAL</div>
          <div className="row-score">
            <StarIcon />
            <span>{totalScore.toLocaleString()}</span>
          </div>
        </div>

        <button
          className={`expand-button${isExpanded ? " expand-button--up" : ""}`}
          aria-label={isExpanded ? "Collapse" : "Expand"}
          tabIndex={-1}
        >
          {isExpanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
        </button>
      </div>

      {isExpanded && (
        <div className="employee-row-details">
          <div className="activities-label">RECENT ACTIVITY</div>
          <table className="activities-table">
            <thead>
              <tr>
                <th>ACTIVITY</th>
                <th>CATEGORY</th>
                <th>DATE</th>
                <th className="col-points">POINTS</th>
              </tr>
            </thead>
            <tbody>
              {employee.activities.map((act) => (
                <tr key={act.id}>
                  <td className="act-name">{act.activity}</td>
                  <td>
                    <span className="cat-badge">{act.category}</span>
                  </td>
                  <td className="act-date">{formatDate(act.date)}</td>
                  <td className="act-points">+{act.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
