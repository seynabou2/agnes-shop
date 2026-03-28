import React from "react";
import { useCart } from "../context/CartContext";
import "../index.css";

function ProductCard({ product }) {
  const { addToCart } = useCart();

  return (
    <div className="card">
      <img src={product.image} alt={product.name} />
      <h3>{product.name}</h3>
      <p>{product.price.toLocaleString()} FCFA</p>
      <button className="button" onClick={() => addToCart(product)}>
        Ajouter au panier
      </button>
    </div>
  );
}

export default ProductCard;
