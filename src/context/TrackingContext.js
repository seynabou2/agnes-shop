import { createContext, useContext, useEffect, useRef, useCallback } from "react";
import { io } from "socket.io-client";
import { useLocation } from "react-router-dom";
import { useCustomer } from "./CustomerContext";
import { useCart } from "./CartContext";

const TrackingContext = createContext(null);

const PAGE_NAMES = {
  "/":            "Accueil",
  "/boutique":    "Boutique",
  "/panier":      "Panier",
  "/confirmation":"Confirmation",
  "/connexion":   "Connexion",
  "/mon-compte":  "Mon Compte",
  "/contact":     "Contact",
};

const SOCKET_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

export function TrackingProvider({ children }) {
  const socketRef = useRef(null);
  const location = useLocation();
  const { customer } = useCustomer();
  const { cart } = useCart();

  // Session ID persistant (visiteur anonyme ou client)
  const sessionId = useRef(null);
  useEffect(() => {
    let sid = localStorage.getItem("agnes_visitor_session");
    if (!sid) {
      sid = "v_" + Math.random().toString(36).substr(2, 9) + "_" + Date.now();
      localStorage.setItem("agnes_visitor_session", sid);
    }
    sessionId.current = sid;
  }, []);

  // Connexion socket (une seule fois)
  useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      reconnectionAttempts: 5,
    });
    socketRef.current = socket;
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  // Émettre une mise à jour visiteur
  const emitUpdate = useCallback((extra = {}) => {
    const socket = socketRef.current;
    if (!socket?.connected) return;
    socket.emit("visitor:update", {
      sessionId: sessionId.current,
      page: PAGE_NAMES[location.pathname] || location.pathname,
      pathname: location.pathname,
      customerName: customer ? `${customer.first_name} ${customer.last_name}` : null,
      customerEmail: customer?.email || null,
      isLoggedIn: !!customer,
      cartCount: cart.reduce((s, i) => s + i.quantity, 0),
      cartItems: cart.map((i) => ({ name: i.name, qty: i.quantity })),
      ...extra,
    });
  }, [location.pathname, customer, cart]);

  // Émettre à chaque changement de page, panier ou connexion
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;
    // Attendre que le socket soit connecté
    if (socket.connected) {
      emitUpdate();
    } else {
      socket.once("connect", () => emitUpdate());
    }
  }, [emitUpdate]);

  return (
    <TrackingContext.Provider value={{ socketRef, emitUpdate }}>
      {children}
    </TrackingContext.Provider>
  );
}

export function useTracking() {
  return useContext(TrackingContext);
}
