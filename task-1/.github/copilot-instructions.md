# GitHub Copilot Custom Instructions for Leaderboard Application

## Project Overview
Employee Leaderboard Application built with React + TypeScript + Vite. A single-page application for displaying and ranking employees based on performance metrics, with filtering, search, and detailed activity tracking capabilities.

## Technology Stack
- **Frontend Framework**: React 18+ with TypeScript
- **Build Tool**: Vite
- **Styling**: CSS with modern gradients and flexbox/grid layouts
- **Type Safety**: Full TypeScript support with interfaces for all data structures

## Project Structure
```
src/
├── components/          # React components
│   ├── Leaderboard.tsx & Leaderboard.css     # Main container component
│   ├── FilterForm.tsx & FilterForm.css        # Filter & search UI
│   ├── PedestalCard.tsx & PedestalCard.css    # Top 3 display
│   └── EmployeeRow.tsx & EmployeeRow.css     # Employee list item with expandable details
├── types/
│   └── employee.ts      # TypeScript interfaces (Employee, Activity, FilterOptions)
├── data/
│   └── employees.json   # Mock employee data with 10 sample employees
├── App.tsx              # Main application component
├── App.css              # Application styles
├── main.tsx             # React entry point
└── index.css            # Global styles
```

## Key Features
1. **Top 3 Pedestal Display** - Shows top performers with medals (gold, silver, bronze)
2. **Filtering System** - Filter by Year, Quarter, and Category
3. **Search Functionality** - Search employees by name or job position
4. **Expandable Employee Details** - Click to view recent activities with scoring breakdown
5. **Responsive Design** - Mobile-friendly layout

## Data Structure
- **Employee**: id, rank, name, avatar, jobPosition, totalScore, year, quarter, activities[]
- **Activity**: id, activity, category, date, points
- **FilterOptions**: year, quarter, category, searchTerm

## Development Guidelines
- Use TypeScript strictly - avoid `any` types
- Keep components focused and reusable
- CSS files are co-located with components for better organization
- Use semantic HTML for accessibility
- Implement proper error handling for data filtering
- Maintain responsive design patterns for mobile/tablet views

## Styling Conventions
- Primary gradient: `linear-gradient(135deg, #667eea 0%, #764ba2 100%)`
- Background gradient: `linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)`
- Use box-shadow for depth: `0 8px 32px rgba(102, 126, 234, 0.2)`
- Color for text: #333 (dark) to #999 (light gray)
- Smooth transitions: `transition: all 0.3s ease`

## Common Tasks

### Adding a New Employee
1. Add to `src/data/employees.json`
2. Maintain the Employee interface structure
3. Include at least one activity entry

### Adding a New Filter Option
1. Extend FilterOptions interface in `src/types/employee.ts`
2. Add form field in `FilterForm.tsx`
3. Implement filtering logic in `Leaderboard.tsx` useMemo hook

### Creating New UI Components
1. Create component file with .tsx extension in `src/components/`
2. Create corresponding .css file in same directory
3. Export named component with proper TypeScript typing
4. Use CSS classes matching component name (e.g., `.component-name`)

## Performance Considerations
- Use `useMemo` for expensive filtering operations
- React keys are properly set on list items
- CSS modules prevent style conflicts
- Avatar images use external CDN (dicebear API)

## Browser Compatibility
- Target modern browsers (Chrome, Firefox, Safari, Edge)
- Use CSS Grid and Flexbox for layouts
- Mobile breakpoint: 768px

## Quality Standards
- All components should have proper TypeScript typing
- Maintain accessibility with proper ARIA labels
- Keep component complexity manageable (single responsibility)
- Use meaningful variable and function names
- Comment complex logic and non-obvious implementations

## Testing Recommendations
- Test filtering functionality with various combinations
- Verify responsive layout on mobile, tablet, desktop
- Validate employee data expansion/collapse
- Test search with partial name matches
- Verify sorting by rank is maintained

## Future Enhancements
- Add authentication and user roles
- Implement real-time data updates
- Add data export functionality (CSV/PDF)
- Implement employee profile pages
- Add activity timeline visualization
- Integrate with backend API
