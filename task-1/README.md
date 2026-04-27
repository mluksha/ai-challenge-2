# Employee Leaderboard Application

A modern, responsive React + TypeScript application for displaying and managing employee performance rankings, activities, and achievements.

## 🎯 Features

- **Top 3 Pedestal Display** - Visual representation of top performers with gold, silver, and bronze medals
- **Advanced Filtering** - Filter employees by year, quarter, and activity category
- **Search Functionality** - Real-time search by employee name or job position
- **Expandable Details** - Click any employee to view recent activities and scoring breakdown
- **Responsive Design** - Fully responsive layout for mobile, tablet, and desktop
- **Rich Styling** - Modern gradients and smooth animations throughout

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ and npm

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

The application will be available at `http://localhost:5173`

## 📁 Project Structure

```
src/
├── components/              # React components
│   ├── Leaderboard.tsx      # Main container component
│   ├── Leaderboard.css
│   ├── FilterForm.tsx       # Filter and search form
│   ├── FilterForm.css
│   ├── PedestalCard.tsx     # Top 3 performers display
│   ├── PedestalCard.css
│   ├── EmployeeRow.tsx      # Individual employee row with expandable details
│   └── EmployeeRow.css
├── types/
│   └── employee.ts          # TypeScript interfaces
├── data/
│   └── employees.json       # Employee data with 10 sample records
├── App.tsx                  # Root component
├── App.css
├── main.tsx                 # Application entry point
└── index.css                # Global styles

.github/
└── copilot-instructions.md  # GitHub Copilot custom instructions

.vscode/
├── settings.json            # VS Code workspace settings
└── extensions.json          # Recommended VS Code extensions

.cursor/
└── rules.json              # Custom agent rules for Copilot
```

## 📊 Data Structure

### Employee
```typescript
interface Employee {
  id: string;
  rank: number;
  name: string;
  avatar: string;
  jobPosition: string;
  totalScore: number;
  year: number;
  quarter: number;
  activities: Activity[];
}
```

### Activity
```typescript
interface Activity {
  id: string;
  activity: string;
  category: string;
  date: string;
  points: number;
}
```

### FilterOptions
```typescript
interface FilterOptions {
  year: number | '';
  quarter: number | '';
  category: string;
  searchTerm: string;
}
```

## 🎨 Styling Guide

### Color Palette
- Primary Gradient: `linear-gradient(135deg, #667eea 0%, #764ba2 100%)`
- Background Gradient: `linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)`
- Text Primary: `#333`
- Text Secondary: `#666`
- Text Light: `#999`

### Spacing Scale
- `0.5rem`, `1rem`, `1.5rem`, `2rem`, `3rem`

### Typography
- Font Family: System fonts (SF Pro Display, Segoe UI, Roboto)
- Font Sizes: `0.85rem`, `0.9rem`, `0.95rem`, `1rem`, `1.1rem`, `1.2rem`, `1.4rem`

## 🔧 Adding New Features

### Add a New Employee
1. Open `src/data/employees.json`
2. Add a new employee object following the Employee interface
3. Ensure unique `id` and appropriate `rank`
4. Include at least one activity entry

### Add a New Filter Option
1. Update `FilterOptions` in `src/types/employee.ts`
2. Add form field in `FilterForm.tsx`
3. Implement filter logic in `Leaderboard.tsx`

### Create a New Component
1. Create `ComponentName.tsx` in `src/components/`
2. Create `ComponentName.css` in same directory
3. Export as named component with TypeScript typing
4. Update relevant imports

## 📱 Responsive Breakpoints

- **Desktop**: 1200px max-width container
- **Tablet**: Adjustments at 768px
- **Mobile**: Full width with adjusted spacing

## ♿ Accessibility

- Semantic HTML structure
- ARIA labels on interactive elements
- Keyboard navigation support
- Color contrast compliant
- Proper heading hierarchy

## 🧪 Testing

- Test filtering with various combinations
- Verify responsive layout across devices
- Validate expandable/collapsible functionality
- Test search with partial name/position matches
- Ensure rank sorting is maintained

## 🛠 Development Workflow

### Code Style
- TypeScript strict mode enabled
- ESLint for code quality
- Prettier for code formatting
- 2-space indentation

### Available Scripts
```bash
npm run dev         # Start dev server with HMR
npm run build       # Build for production
npm run preview     # Preview production build locally
npm run lint        # Run ESLint
npm run type-check  # Type-check TypeScript
```

## 📈 Performance Optimizations

- `useMemo` hooks for expensive filtering operations
- CSS classes instead of inline styles
- Proper React keys on list items
- Image optimization via external CDN (dicebear)
- Lazy loading for expandable details

## 🌐 Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## 📚 Technologies Used

- **React 18+** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **CSS3** - Styling with gradients and flexbox
- **DiceBear API** - Avatar generation

## 🚀 Future Enhancements

- [ ] Authentication and user roles
- [ ] Real-time data updates with WebSocket
- [ ] Data export (CSV, PDF)
- [ ] Employee profile pages
- [ ] Activity timeline visualization
- [ ] Backend API integration
- [ ] Dark mode support
- [ ] Advanced analytics

## 📖 Documentation

For more detailed information, see:
- `.github/copilot-instructions.md` - GitHub Copilot instructions
- `.cursor/rules.json` - Copilot agent definitions

## 📝 License

This project is part of the AI Challenge 2 exercise.
```
