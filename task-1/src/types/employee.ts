export interface Activity {
  id: string;
  activity: string;
  category: string;
  date: string;
  points: number;
}

export interface Employee {
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

export interface FilterOptions {
  year: number | '';
  quarter: number | '';
  category: string;
  searchTerm: string;
}
