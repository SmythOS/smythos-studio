import {
  FaBezierCurve,
  FaBuildingColumns,
  FaGear,
  FaGears,
  FaHandshakeAngle,
  FaHelmetSafety,
  FaMessage,
  FaPenNib,
  FaRegPenToSquare,
  FaRocket,
  FaSuitcase,
  FaUser,
  FaUserGraduate,
} from 'react-icons/fa6';

export interface ISingleTeam {
  name: string;
  value: string;
  category?: string;
  icon: React.ElementType;
}

export const UserOnboardingTeams: ISingleTeam[] = [
  // category is a legacy property, sent to Hubspot to keep the old data structure
  { name: 'Engineering', icon: FaGear, value: 'engineering', category: 'Developer/IT' },
  { name: 'Marketing', icon: FaRocket, value: 'marketing', category: 'Marketing/Sales' },
  { name: 'HR & Legal', icon: FaSuitcase, value: 'hr_legal', category: 'HR' },
  { name: 'Operations', icon: FaBezierCurve, value: 'operations', category: 'HR' },
  { name: 'Finance', icon: FaBuildingColumns, value: 'finance', category: 'Finance' },
  {
    name: 'Product & Design',
    icon: FaRegPenToSquare,
    value: 'product_design',
    category: 'Developer/IT',
  },
  { name: 'Creative Production', icon: FaPenNib, value: 'creative_production', category: 'Other' },
  {
    name: 'Customer Service',
    icon: FaMessage,
    value: 'customer_service',
    category: 'Student/Other',
  },
  { name: 'IT & Support', icon: FaGears, value: 'it_support', category: 'Developer/IT' },
  {
    name: 'Manufacturing',
    icon: FaHelmetSafety,
    value: 'manufacturing',
    category: 'Student/Other',
  },
  {
    name: 'Sales & Account Management',
    icon: FaHandshakeAngle,
    value: 'sales_account_management',
    category: 'Marketing/Sales',
  },
  { name: 'Other / Personal', icon: FaUser, value: 'other_personal', category: 'Student/Other' },
  { name: 'Student', icon: FaUserGraduate, value: 'student', category: 'Student/Other' },
];
