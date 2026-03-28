import { createContext, useContext, useState, useEffect } from "react";
import { getMyProfile } from "../services/api";

const CustomerContext = createContext();

export function useCustomer() {
  return useContext(CustomerContext);
}

export function CustomerProvider({ children }) {
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);

  // Vérifier si déjà connecté au chargement
  useEffect(() => {
    const token = localStorage.getItem("customerToken");
    if (token) {
      getMyProfile()
        .then((data) => setCustomer(data))
        .catch(() => {
          localStorage.removeItem("customerToken");
          setCustomer(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  function loginSuccess(customerData, token) {
    localStorage.setItem("customerToken", token);
    setCustomer(customerData);
  }

  function logout() {
    localStorage.removeItem("customerToken");
    setCustomer(null);
  }

  return (
    <CustomerContext.Provider value={{ customer, loading, loginSuccess, logout }}>
      {children}
    </CustomerContext.Provider>
  );
}
