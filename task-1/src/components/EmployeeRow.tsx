import React, { useState } from 'react';
import type { Employee } from '../types/employee';
import './EmployeeRow.css';

interface EmployeeRowProps {
  employee: Employee;
}

export const EmployeeRow: React.FC<EmployeeRowProps> = ({ employee }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="employee-row">
      <div
        className="employee-header"
        onClick={() => setIsExpanded(!isExpanded)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            setIsExpanded(!isExpanded);
          }
        }}
      >
        <div className="rank-badge">{employee.rank}</div>
        <img src={employee.avatar} alt={employee.name} className="employee-avatar" />
        <div className="employee-basic-info">
          <h3>{employee.name}</h3>
          <p>{employee.jobPosition}</p>
        </div>
        <div className="score-section">
          <span className="score">{employee.totalScore.toLocaleString()}</span>
          <span className="score-label">pts</span>
        </div>
        <button className="expand-btn" aria-label={isExpanded ? 'Collapse' : 'Expand'}>
          <span className={`icon ${isExpanded ? 'expanded' : ''}`}>▼</span>
        </button>
      </div>

      {isExpanded && (
        <div className="employee-details">
          <div className="activities-section">
            <h4>Recent Activity</h4>
            <table className="activities-table">
              <thead>
                <tr>
                  <th>Activity</th>
                  <th>Category</th>
                  <th>Date</th>
                  <th>Points</th>
                </tr>
              </thead>
              <tbody>
                {employee.activities.map((activity) => (
                  <tr key={activity.id}>
                    <td className="activity-name">{activity.activity}</td>
                    <td>
                      <span className={`category-badge ${activity.category.toLowerCase().replace(/\s+/g, '-')}`}>
                        {activity.category}
                      </span>
                    </td>
                    <td className="date">{new Date(activity.date).toLocaleDateString()}</td>
                    <td className="points">{activity.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
