
import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { fetchUserProfile } from "@/services/projectService";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Menu, 
  X, 
  Search,
  Bell,
  LogOut,
  User,
  Link,
  Home,
  ListTodo,
  Users,
  BarChart2,
  UserCircle
} from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { Badge } from "./ui/badge";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: <Home className="h-5 w-5" /> },
  { name: "Projects", href: "/projects", icon: <ListTodo className="h-5 w-5" /> },
  { name: "Teams", href: "/teams", icon: <Users className="h-5 w-5" /> },
  { name: "Reports", href: "/reports", icon: <BarChart2 className="h-5 w-5" /> },
];


interface HeaderProps {
  setSearchQuery?: (query: string) => void;
  handleGlobalSearch?: (e: React.FormEvent<HTMLFormElement>) => void;
}

export function Header({ setSearchQuery, handleGlobalSearch }: HeaderProps) {
  const { user, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const location = useLocation();

  const { data: userProfile } = useQuery({
    queryKey: ['userProfile', user?.id],
    queryFn: () => fetchUserProfile(user?.id || ""),
    enabled: !!user,
  });

  const isActive = (path: string) => location.pathname === path;

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchInput(e.target.value);
    if (setSearchQuery) {
      setSearchQuery(e.target.value);
    }
  };

  const submitSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (handleGlobalSearch) {
      handleGlobalSearch(e);
    }
    setSearchOpen(false);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <header className="backdrop-blur-sm bg-white/70 dark:bg-gray-900/70 sticky top-0 z-40 w-full border-b">
      <nav className="mx-auto flex max-w-7xl items-center justify-between p-3 lg:px-8" aria-label="Global">
        <div className="flex lg:flex-1">
          <NavLink to="/" className="-m-1.5 p-1.5 flex items-center gap-2">
            <div className="bg-gradient-to-r from-purple-600 to-blue-500 h-8 w-8 rounded-lg flex items-center justify-center text-white font-bold">
              FB
            </div>
            <span className="font-semibold text-lg dark:text-white">FlowBoard</span>
            <Badge variant="outline" className="hidden sm:flex">Alpha</Badge>
          </NavLink>
        </div>
        <div className="flex lg:hidden">
          <button
            type="button"
            className="-m-2.5 inline-flex items-center justify-center rounded-md p-2.5 dark:text-gray-300"
            onClick={() => setMobileMenuOpen(true)}
          >
            <span className="sr-only">Open main menu</span>
            <Menu className="h-6 w-6" aria-hidden="true" />
          </button>
        </div>
        
        {/* Desktop Navigation */}
        <div className="hidden lg:flex lg:gap-x-4">
          {navigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              className={({ isActive }) => cn(
                isActive
                  ? "text-primary font-semibold"
                  : "text-muted-foreground hover:text-primary",
                "rounded-md px-3 py-2 text-sm"
              )}
            >
              {item.name}
            </NavLink>
          ))}
        </div>
        
        <div className="hidden lg:flex lg:flex-1 lg:justify-end lg:gap-x-2">
          {/* Search button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSearchOpen(true)}
            className="rounded-full"
          >
            <Search className="h-5 w-5" />
            <span className="sr-only">Search</span>
          </Button>
          
          {/* Theme toggle */}
          <ThemeToggle />
          
          {/* Notifications (placeholder) */}
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
          >
            <Bell className="h-5 w-5" />
            <span className="sr-only">Notifications</span>
          </Button>
          
          {/* User menu */}
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-9 w-9 rounded-full"
                >
                  <Avatar className="h-9 w-9">
                    <AvatarImage src="" alt="" />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                    {userProfile?.username 
    ? userProfile.username[0].toUpperCase()
    : user?.email?.charAt(0).toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
    <p className="text-sm font-medium leading-none">
      {userProfile?.username || user?.email?.split("@")[0]}
    </p>
    <p className="text-xs leading-none text-muted-foreground">
      {user?.email}
    </p>
  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem asChild>
                    <NavLink to="/profile">Profile</NavLink>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <NavLink to="/projects">Projects</NavLink>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <NavLink to="/teams">Teams</NavLink>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-red-600 focus:bg-red-50"
                  onClick={handleSignOut}
                >
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </nav>
      
      {/* Mobile menu */}
      {mobileMenuOpen && (
  <div className="md:hidden border-t">
    <div className="container py-2">
      <div className="flex justify-between items-center py-2">
        
        <ThemeToggle />
        <button
          onClick={() => setMobileMenuOpen(false)}
          className="p-2 rounded-md hover:bg-accent"
        >
          <X className="h-6 w-6" />
        </button>
      </div>

      {handleGlobalSearch && (
        <form onSubmit={handleGlobalSearch} className="py-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search..."
              className="w-full pl-8"
              onChange={(e) => setSearchQuery?.(e.target.value)}
            />
          </div>
        </form>
      )}

      <nav className="flex flex-col space-y-1 py-2">
        {navigation.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            className={({ isActive }) => cn(
              "flex items-center rounded-md px-3 py-2 text-sm font-medium",
              isActive 
                ? "bg-accent text-accent-foreground" 
                : "hover:bg-accent hover:text-accent-foreground"
            )}
            onClick={() => setMobileMenuOpen(false)}
          >
            {item.icon}
            <span className="ml-2">{item.name}</span>
          </NavLink>
        ))}
        
        <Separator className="my-2" />
        
        
        <NavLink
          to="/profile"
          className={({ isActive }) => cn(
            "flex items-center rounded-md px-3 py-2 text-sm font-medium",
            isActive
              ? "bg-accent text-accent-foreground"
              : "hover:bg-accent hover:text-accent-foreground"
          )}
          onClick={() => setMobileMenuOpen(false)}
        >
          <UserCircle className="h-5 w-5 mr-2" />
          Profile
        </NavLink>
        
        <button
          onClick={handleSignOut}
          className="flex w-full items-center rounded-md px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10"
        >
          <LogOut className="h-5 w-5 mr-2" />
          Log out
        </button>
      </nav>
    </div>
  </div>
)}
      
      {/* Global search dialog */}
      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Search</DialogTitle>
            <DialogDescription>
              Search for tasks, projects, or team members.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submitSearch}>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search..."
                className="pl-8"
                value={searchInput}
                onChange={handleSearchChange}
                autoFocus
              />
            </div>
            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => setSearchOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Search</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </header>
  );
}
