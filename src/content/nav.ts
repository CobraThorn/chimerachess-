export interface NavDropdownItem {
  label: string;
  description?: string;
  href: string;
  badge?: string;
}

export interface NavItem {
  id: string;
  label: string;
  href: string;
  dropdown?: NavDropdownItem[];
}

export const PLAY_MENU: NavDropdownItem[] = [
  { label: "Quick Match", description: "Instant pairing", href: "#play-quick" },
  { label: "Ranked", description: "Elo on the line", href: "#play-ranked", badge: "LIVE" },
  { label: "Blitz", href: "#play-blitz", description: "3+2 online pool" },
  { label: "Bullet", href: "#play-bullet", description: "1+0 online pool" },
  { label: "Rapid", href: "#play-rapid", description: "10+5 online pool" },
  { label: "Classical", href: "#play-classical" },
  { label: "AI Match", description: "Neural opponent", href: "#play" },
  { label: "Custom Game", href: "#play-custom" },
  { label: "Tournament", href: "#play-tournament" },
  { label: "Puzzle Rush", href: "#play-puzzle-rush" },
];

export const ANALYZE_MENU: NavDropdownItem[] = [
  { label: "Game Review", description: "Deep post-mortem", href: "#analyze-review" },
  { label: "Live Analysis", description: "Real-time engine", href: "#analyze-live", badge: "NEW" },
  { label: "Opening Explorer", href: "#analyze-openings" },
  { label: "Endgame Lab", href: "#analyze-endgame" },
  { label: "Cognitive Heatmaps", href: "#analyze-heatmaps" },
  { label: "Accuracy Reports", href: "#analyze-accuracy" },
  { label: "Style Analysis", href: "#analyze-style" },
];

export const TRAIN_MENU: NavDropdownItem[] = [
  { label: "Today's Focus", description: "Adaptive daily plan", href: "#train-focus", badge: "TODAY" },
  { label: "Tactical Training", href: "#train-tactics" },
  { label: "Opening Drills", description: "10 interactive lines", href: "#train-openings", badge: "NEW" },
  { label: "Positional Challenges", href: "#train-positional" },
  { label: "Visualization Training", href: "#train-visualization" },
  { label: "Memory Exercises", href: "#train-memory" },
  { label: "AI Coaching", href: "#train-coaching" },
  { label: "Adaptive Weakness Training", href: "#train-weakness" },
];

export const PRIMARY_NAV: NavItem[] = [
  { id: "home", label: "Home", href: "#home" },
  { id: "play", label: "Play", href: "#play", dropdown: PLAY_MENU },
  { id: "analyze", label: "Analyze", href: "#analyze", dropdown: ANALYZE_MENU },
  { id: "train", label: "Train", href: "#train", dropdown: TRAIN_MENU },
  { id: "legends", label: "Legends", href: "#legends" },
  { id: "social", label: "Social", href: "#social" },
  { id: "profile", label: "Profile", href: "#profile" },
  { id: "account", label: "Account", href: "#account" },
];

export const MOBILE_DOCK = [
  { id: "home", label: "Home", href: "#home", icon: "home" as const },
  { id: "analyze", label: "Analyze", href: "#analyze", icon: "analyze" as const },
  { id: "play", label: "Play", href: "#play", icon: "play" as const, primary: true },
  { id: "train", label: "Train", href: "#train", icon: "train" as const },
  { id: "profile", label: "Profile", href: "#profile", icon: "profile" as const },
];
