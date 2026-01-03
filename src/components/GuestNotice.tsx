import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { LogIn } from 'lucide-react';

interface GuestNoticeProps {
  message?: string;
}

export function GuestNotice({ message = "Log in to save your data across devices" }: GuestNoticeProps) {
  const navigate = useNavigate();

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
      <LogIn className="h-4 w-4 shrink-0" />
      <span>{message}</span>
      <Button variant="link" size="sm" className="ml-auto p-0 h-auto" onClick={() => navigate('/auth')}>
        Sign in
      </Button>
    </div>
  );
}
