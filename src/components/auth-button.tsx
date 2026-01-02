'use client';

import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { LogIn, LogOut, User, Loader2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface UserProfile {
  isLoggedIn: boolean;
  characterName?: string;
  characterId?: number;
}

export function AuthButton() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUser() {
      try {
        setLoading(true);
        const res = await fetch('/api/auth/eve/me');
        const data = await res.json();
        setUser(data);
      } catch (error) {
        console.error("Failed to fetch user status", error);
        setUser({ isLoggedIn: false });
      } finally {
        setLoading(false);
      }
    }
    fetchUser();
  }, []);

  if (loading) {
    return <Button variant="outline" size="icon" disabled><Loader2 className="h-4 w-4 animate-spin" /></Button>;
  }

  if (user && user.isLoggedIn) {
    const avatarUrl = `https://images.evetech.net/characters/${user.characterId}/portrait?size=64`;
    const fallback = user.characterName?.substring(0, 2).toUpperCase() || '??';

    return (
       <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-8 w-8 rounded-full">
            <Avatar className="h-8 w-8">
              <AvatarImage src={avatarUrl} alt={user.characterName} />
              <AvatarFallback>{fallback}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">{user.characterName}</p>
              <p className="text-xs leading-none text-muted-foreground">
                ID: {user.characterId}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <a href="/api/auth/eve/logout">
            <DropdownMenuItem>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Выйти</span>
            </DropdownMenuItem>
          </a>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <a href="/api/auth/eve/login">
      <Button variant="outline">
        <LogIn className="mr-2 h-4 w-4" />
        Login with EVE Online
      </Button>
    </a>
  );
}
