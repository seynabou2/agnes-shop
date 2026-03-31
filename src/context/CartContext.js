import { createContext, useContext, useState, useEffect } from "react";

const CartContext = createContext();

export function useCart() {
  return useContext(CartContext);
}

// Génère une clé unique par variante (produit + couleur + taille)
function makeCartKey(product) {
  return `${product.id}__${product.selectedColor || ""}__${product.selectedSize || ""}`;
}

export function CartProvider({ children }) {
  const [cart, setCart] = useState(() => {
    try {
      const saved = localStorage.getItem("agnes_cart");
      const parsed = saved ? JSON.parse(saved) : [];
      // Migration : s'assurer que tous les items ont un cartKey
      return parsed.map((item) => ({
        ...item,
        cartKey: item.cartKey || makeCartKey(item),
      }));
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem("agnes_cart", JSON.stringify(cart));
  }, [cart]);

  // Ajouter au panier (avec gestion des variantes par cartKey)
  function addToCart(product) {
    const cartKey = makeCartKey(product);
    setCart((prev) => {
      const existing = prev.find((item) => item.cartKey === cartKey);
      if (existing) {
        return prev.map((item) =>
          item.cartKey === cartKey
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { ...product, cartKey, quantity: 1 }];
    });
  }

  // Retirer une unité (ou supprimer si qty = 1) — par cartKey
  function removeFromCart(cartKey) {
    setCart((prev) =>
      prev
        .map((item) =>
          item.cartKey === cartKey
            ? { ...item, quantity: item.quantity - 1 }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  }

  // Supprimer l'article complètement — par cartKey
  function deleteFromCart(cartKey) {
    setCart((prev) => prev.filter((item) => item.cartKey !== cartKey));
  }

  // Vider le panier
  function clearCart() {
    setCart([]);
  }

  // Nombre total d'articles
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Total en FCFA
  const totalPrice = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // Quantité totale d'un produit (toutes variantes confondues)
  function getProductQty(productId) {
    return cart
      .filter((item) => item.id === productId)
      .reduce((sum, item) => sum + item.quantity, 0);
  }

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        deleteFromCart,
        clearCart,
        totalItems,
        totalPrice,
        getProductQty,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}
