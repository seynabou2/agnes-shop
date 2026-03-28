import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { CartProvider } from "./context/CartContext";
import { CustomerProvider } from "./context/CustomerContext";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <CustomerProvider>
    <CartProvider>
      <App />
    </CartProvider>
  </CustomerProvider>
);
