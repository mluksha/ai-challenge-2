import React from 'react';
import type { FilterOptions } from '../types/employee';
import './FilterForm.css';

interface FilterFormProps {
  filterOptions: FilterOptions;
  onFilterChange: (options: FilterOptions) => void;
  years: number[];
  quarters: number[];
  categories: string[];
}

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
      year: value === '' ? '' : parseInt(value),
    });
  };

  const handleQuarterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    onFilterChange({
      ...filterOptions,
      quarter: value === '' ? '' : parseInt(value),
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
    <form className="filter-form">
      <div className="form-group">
        <label htmlFor="year">Year</label>
        <select id="year" value={filterOptions.year} onChange={handleYearChange}>
          <option value="">All Years</option>
          {years.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="quarter">Quarter</label>
        <select id="quarter" value={filterOptions.quarter} onChange={handleQuarterChange}>
          <option value="">All Quarters</option>
          {quarters.map((q) => (
            <option key={q} value={q}>
              Q{q}
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="category">Category</label>
        <select id="category" value={filterOptions.category} onChange={handleCategoryChange}>
          <option value="">All Categories</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      <div className="form-group search-group">
        <label htmlFor="search">Search Employee</label>
        <input
          id="search"
          type="text"
          placeholder="Search by name or position..."
          value={filterOptions.searchTerm}
          onChange={handleSearchChange}
        />
      </div>
    </form>
  );
};
