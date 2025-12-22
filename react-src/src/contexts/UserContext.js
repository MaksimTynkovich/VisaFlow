import React, { createContext, useContext, useState, useEffect } from "react";
import { apiRequest, tokenStorage } from "../utils/api";

const UserContext = createContext(null);

export function UserProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadUser = async () => {
      if (!tokenStorage.has()) {
        if (isMounted) {
          setCurrentUser(null);
          setLoading(false);
        }
        return;
      }

      try {
        const res = await apiRequest("/api/admin/me");
        if (!isMounted) return;

        if (res.ok) {
          const data = await res.json();
          const userData = data.data || data;
          if (userData && (userData.role === "admin" || userData.role === "manager")) {
            setCurrentUser(userData);
          } else {
            setCurrentUser(null);
            tokenStorage.remove();
          }
        } else {
          setCurrentUser(null);
          tokenStorage.remove();
        }
      } catch (error) {
        console.error("Ошибка загрузки пользователя:", error);
        if (isMounted) {
          setCurrentUser(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadUser();

    return () => {
      isMounted = false;
    };
  }, []);

  const refreshUser = async () => {
    if (!tokenStorage.has()) {
      setCurrentUser(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = await apiRequest("/api/admin/me");
      if (res.ok) {
        const data = await res.json();
        const userData = data.data || data;
        if (userData && (userData.role === "admin" || userData.role === "manager")) {
          setCurrentUser(userData);
        } else {
          setCurrentUser(null);
          tokenStorage.remove();
        }
      } else {
        setCurrentUser(null);
        tokenStorage.remove();
      }
    } catch (error) {
      console.error("Ошибка обновления пользователя:", error);
      setCurrentUser(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <UserContext.Provider value={{ currentUser, loading, refreshUser }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within UserProvider");
  }
  return context;
}

