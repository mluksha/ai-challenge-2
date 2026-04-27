import React from "react";
import type { FilterOptions } from "../types/employee";
import "./FilterForm.css";

interface FilterFormProps {
  filterOptions: FilterOptions;
  onFilterChange: (options: FilterOptions) => void;
  years: number[];
  quarters: number[];
  categories: string[];
}

const SearchIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

export const FilterForm: React.FC<FilterFormProps> = ({
  filterOptions,
  onFilterChange,
  years,
  quarters,
  categories,
}) => {
  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    onFilterChange({
      ...filterOptions,
      year: value === "" ? "" : parseInt(value),
    });
  };

  const handleQuarterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    onFilterChange({
      ...filterOptions,
      quarter: value === "" ? "" : parseInt(value),
    });
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFilterChange({
      ...filterOptions,
      category: e.target.value,
    });
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFilterChange({
      ...filterOptions,
      searchTerm: e.target.value,
    });
  };

  return (
    <form className="filter-form" onSubmit={(e) => e.preventDefault()}>
      <select
        id="year"
        className="filter-select"
        value={filterOptions.year}
        onChange={handleYearChange}
        aria-label="Filter by year"
      >
        <option value="">All Years</option>
        {years.map((year) => (
          <option key={year} value={year}>
            {year}
          </option>
        ))}
      </select>

      <select
        id="quarter"
        className="filter-select"
        value={filterOptions.quarter}
        onChange={handleQuarterChange}
        aria-label="Filter by quarter"
      >
        <option value="">All Quarters</option>
        {quarters.map((q) => (
          <option key={q} value={q}>
            Q{q}
          </option>
        ))}
      </select>

      <select
        id="category"
        className="filter-select"
        value={filterOptions.category}
        onChange={handleCategoryChange}
        aria-label="Filter by category"
      >
        <option value="">All Categories</option>
        {categories.map((cat) => (
          <option key={cat} value={cat}>
            {cat}
          </option>
        ))}
      </select>

      <div className="search-wrapper">
        <span className="search-icon-wrapper" aria-hidden="true">
          <SearchIcon />
        </span>
        <input
          id="search"
          type="text"
          className="search-input"
          placeholder="Search employee..."
          value={filterOptions.searchTerm}
          onChange={handleSearchChange}
          aria-label="Search employees"
        />
      </div>
    </form>
  );
};
