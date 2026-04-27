import React, { useState, useMemo } from "react";
import type { Employee, FilterOptions } from "../types/employee";
import employeesData from "../data/employees.json";
import { FilterForm } from "./FilterForm";
import { Pedestal } from "./PedestalCard";
import { EmployeeRow } from "./EmployeeRow";
import "./Leaderboard.css";

const getTotalScore = (employee: Employee) =>
  employee.activities.reduce((sum, activity) => sum + activity.points, 0);

export const Leaderboard: React.FC = () => {
  const employees: Employee[] = employeesData;

  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    year: "",
    quarter: "",
    category: "",
    searchTerm: "",
  });

  // Get unique years, quarters, and categories from employees
  const years = useMemo(() => {
    return [...new Set(employees.map((emp) => emp.year))].sort((a, b) => b - a);
  }, []);

  const quarters = useMemo(() => {
    return [...new Set(employees.map((emp) => emp.quarter))].sort(
      (a, b) => a - b,
    );
  }, []);

  const categories = useMemo(() => {
    const cats = new Set<string>();
    employees.forEach((emp) => {
      emp.activities.forEach((act) => {
        cats.add(act.category);
      });
    });
    return Array.from(cats).sort();
  }, []);

  // Filter and sort employees
  const filteredEmployees = useMemo(() => {
    let filtered = employees;

    // Filter by year
    if (filterOptions.year !== "") {
      filtered = filtered.filter((emp) => emp.year === filterOptions.year);
    }

    // Filter by quarter
    if (filterOptions.quarter !== "") {
      filtered = filtered.filter(
        (emp) => emp.quarter === filterOptions.quarter,
      );
    }

    // Filter by category in activities
    if (filterOptions.category !== "") {
      filtered = filtered.filter((emp) =>
        emp.activities.some((act) => act.category === filterOptions.category),
      );
    }

    // Filter by search term (name or position)
    if (filterOptions.searchTerm !== "") {
      const searchLower = filterOptions.searchTerm.toLowerCase();
      filtered = filtered.filter(
        (emp) =>
          emp.name.toLowerCase().includes(searchLower) ||
          emp.jobPosition.toLowerCase().includes(searchLower),
      );
    }

    // Sort by computed total score (descending) so highest performer is first.
    return filtered.sort((a, b) => {
      const scoreDiff = getTotalScore(b) - getTotalScore(a);
      if (scoreDiff !== 0) return scoreDiff;
      return a.rank - b.rank;
    });
  }, [filterOptions]);

  return (
    <div className="leaderboard-container">
      <div className="leaderboard-top-card">
        <header className="leaderboard-header">
          <h1>Leaderboard</h1>
          <p>Top performers based on contributions and activity</p>
        </header>

        <div className="leaderboard-form-card">
          <FilterForm
            filterOptions={filterOptions}
            onFilterChange={setFilterOptions}
            years={years}
            quarters={quarters}
            categories={categories}
          />
        </div>

        <Pedestal employees={filteredEmployees} />

        <div className="employees-list">
          {filteredEmployees.length > 0 ? (
            filteredEmployees.map((employee) => (
              <EmployeeRow key={employee.id} employee={employee} />
            ))
          ) : (
            <div className="no-results">
              <p>No employees found matching your filters.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
