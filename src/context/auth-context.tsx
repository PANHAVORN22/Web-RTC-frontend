"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { api, setCsrfToken } from "@/lib/api";

export interface User {
  id: string;
  email: string;
  displayName: string;
  systemRole: string;
  professionalRole: string;
  isActive: boolean;
  mustChangePassword?: boolean;
  fullName?: string;
  role?: string;
}

export interface Project {
  id: string;
  name: string;
  key: string;
  description?: string | null;
  status: string;
  version: number;
  currentUserRole?: "OWNER" | "MANAGER" | "CONTRIBUTOR" | "VIEWER";
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthContextType {
  user: User | null;
  projects: Project[];
  currentProject: Project | null;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  register: (email: string, pass: string, displayName?: string) => Promise<void>;
  logout: () => Promise<void>;
  setCurrentProject: (proj: Project | null) => void;
  refreshProjects: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  projects: [],
  currentProject: null,
  isLoading: true,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
  setCurrentProject: () => {},
  refreshProjects: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProjectState] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const setCurrentProject = (p: Project | null) => {
    setCurrentProjectState(p);
    if (p && typeof window !== "undefined") {
      localStorage.setItem("aiw_current_project", JSON.stringify(p));
    } else if (typeof window !== "undefined") {
      localStorage.removeItem("aiw_current_project");
    }
  };

  const refreshProjects = async () => {
    try {
      const list = await api.projects.list();
      setProjects(list || []);
      if (list && list.length > 0) {
        const saved = localStorage.getItem("aiw_current_project");
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            const found = list.find((p: Project) => p.id === parsed.id);
            setCurrentProjectState(found || list[0]);
          } catch {
            setCurrentProjectState(list[0]);
          }
        } else {
          setCurrentProjectState((prev) => prev || list[0]);
        }
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    async function init() {
      try {
        // Always refresh CSRF token first so POST requests work after page reload
        await api.auth.csrf();
        const me = await api.auth.me();
        setUser(me);
        await refreshProjects();
      } catch {
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, []);

  const login = async (email: string, pass: string) => {
    setIsLoading(true);
    try {
      const data = await api.auth.login(email, pass);
      setUser(data.user);
      await refreshProjects();
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, pass: string, displayName?: string) => {
    setIsLoading(true);
    try {
      const data = await api.auth.register(email, pass, displayName);
      setUser(data.user);
      await refreshProjects();
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await api.auth.logout();
    } catch {
      // ignore
    }
    setUser(null);
    setProjects([]);
    setCurrentProject(null);
    setCsrfToken(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        projects,
        currentProject,
        isLoading,
        login,
        register,
        logout,
        setCurrentProject,
        refreshProjects,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
