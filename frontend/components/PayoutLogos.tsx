export const GcashIcon = ({ className = "w-20 h-20" }) => (
  <svg viewBox="0 0 100 100" className={className} xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="50" r="48" fill="#007DFE" />
    <circle cx="50" cy="50" r="35" stroke="white" strokeWidth="8" fill="none" />
    <circle cx="50" cy="50" r="22" stroke="white" strokeWidth="4" fill="none" opacity="0.4" />
    <text x="50" y="65" textAnchor="middle" fill="white" fontSize="42" fontWeight="900" fontFamily="Inter, system-ui, sans-serif">G</text>
  </svg>
);

export const MayaIcon = ({ className = "w-20 h-20" }) => (
  <svg viewBox="0 0 100 100" className={className} xmlns="http://www.w3.org/2000/svg">
    <rect width="100" height="100" rx="24" fill="#00D26E" />
    <text x="50" y="68" textAnchor="middle" fill="white" fontSize="48" fontWeight="800" fontFamily="Inter, system-ui, sans-serif" letterSpacing="-2">m</text>
  </svg>
);

export const BankIcon = ({ className = "w-20 h-20", color = "#2E2E2F" }) => (
  <svg viewBox="0 0 100 100" className={className} xmlns="http://www.w3.org/2000/svg">
    <rect width="100" height="100" rx="24" fill={color} opacity="0.05" />
    <path d="M20 75H80V70H20V75ZM20 40H25V65H20V40ZM47.5 40H52.5V65H47.5V40ZM75 40H80V65H75V40ZM15 35L50 15L85 35V40H15V35ZM50 22.5L72.5 35H27.5L50 22.5Z" fill={color} />
    <circle cx="50" cy="50" r="8" stroke={color} strokeWidth="2" fill="none" opacity="0.2" />
  </svg>
);
