'use client';

import {
  Coins,
  Clock,
  Zap,
  AlertCircle,
  CheckCircle,
  Wallet,
  LogOut,
  Copy,
  ExternalLink,
  Droplets,
  Github,
  Twitter,
  Globe,
  TrendingUp,
  Users,
  Activity,
  RefreshCw,
  Sun,
  Moon,
  Menu,
  X,
  LucideProps
} from 'lucide-react';

// Export all icons
export {
  Coins,
  Clock,
  Zap,
  AlertCircle,
  CheckCircle,
  Wallet,
  LogOut,
  Copy,
  ExternalLink,
  Droplets,
  Github,
  Twitter,
  Globe,
  TrendingUp,
  Users,
  Activity,
  RefreshCw,
  Sun,
  Moon,
  Menu,
  X
};

// ClientIcon component for dynamic icon rendering
interface ClientIconProps extends LucideProps {
  icon: React.ComponentType<LucideProps>;
}

const ClientIcon: React.FC<ClientIconProps> = ({ icon: Icon, ...props }) => {
  return <Icon {...props} />;
};

export default ClientIcon;