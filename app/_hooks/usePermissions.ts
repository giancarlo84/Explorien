// app/_hooks/usePermissions.ts
import { useAuth } from '@/_context/AuthContext';

export function useBuilderPermissions() {
  const { userRole } = useAuth();
  
  // Only these roles can use the builder tool
  const allowedRoles = ['pathfinder', 'expeditionary', 'admin'];
  
  // Check if current user role is in the allowed roles
  const canUseBuilder = userRole ? allowedRoles.includes(userRole) : false;
  
  return { canUseBuilder };
}