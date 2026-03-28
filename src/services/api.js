// Service centralisé pour toutes les appels à l'API backend

const BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

// ── Helpers ──────────────────────────────────────────────────
function getToken() {
  return localStorage.getItem("adminToken");
}

function authHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${getToken()}`,
  };
}

async function handleResponse(res) {
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Erreur serveur");
  return data;
}

// ── Auth Admin ───────────────────────────────────────────────
export async function loginAdmin(password) {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  return handleResponse(res);
}

export async function verifyToken() {
  const token = getToken();
  if (!token) return false;
  try {
    const res = await fetch(`${BASE_URL}/api/auth/verify`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    return data.valid === true;
  } catch {
    return false;
  }
}

// ── Produits ─────────────────────────────────────────────────
export async function getProducts({ category, search } = {}) {
  const params = new URLSearchParams();
  if (category) params.append("category", category);
  if (search) params.append("search", search);
  const res = await fetch(`${BASE_URL}/api/products?${params}`);
  return handleResponse(res);
}

export async function getCategories() {
  const res = await fetch(`${BASE_URL}/api/products/categories`);
  return handleResponse(res);
}

export async function addProduct(formData) {
  // formData peut être un objet JSON ou un FormData (si image uploadée)
  const isFormData = formData instanceof FormData;
  const res = await fetch(`${BASE_URL}/api/products`, {
    method: "POST",
    headers: isFormData
      ? { Authorization: `Bearer ${getToken()}` }
      : authHeaders(),
    body: isFormData ? formData : JSON.stringify(formData),
  });
  return handleResponse(res);
}

export async function updateProduct(id, formData) {
  const isFormData = formData instanceof FormData;
  const res = await fetch(`${BASE_URL}/api/products/${id}`, {
    method: "PUT",
    headers: isFormData
      ? { Authorization: `Bearer ${getToken()}` }
      : authHeaders(),
    body: isFormData ? formData : JSON.stringify(formData),
  });
  return handleResponse(res);
}

export async function deleteProduct(id) {
  const res = await fetch(`${BASE_URL}/api/products/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  return handleResponse(res);
}

// ── Commandes ─────────────────────────────────────────────────
export async function placeOrder(orderData) {
  const res = await fetch(`${BASE_URL}/api/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(orderData),
  });
  return handleResponse(res);
}

export async function getOrders() {
  const res = await fetch(`${BASE_URL}/api/orders`, {
    headers: authHeaders(),
  });
  return handleResponse(res);
}

export async function updateOrderStatus(id, status, payment_status = null) {
  const body = {};
  if (status) body.status = status;
  if (payment_status) body.payment_status = payment_status;
  const res = await fetch(`${BASE_URL}/api/orders/${id}/status`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  return handleResponse(res);
}

// ── Clients ───────────────────────────────────────────────────
function getCustomerToken() {
  return localStorage.getItem("customerToken");
}

function customerHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${getCustomerToken()}`,
  };
}

export async function registerCustomer(data) {
  const res = await fetch(`${BASE_URL}/api/customers/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function loginCustomer(email, password) {
  const res = await fetch(`${BASE_URL}/api/customers/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return handleResponse(res);
}

export async function getMyProfile() {
  const res = await fetch(`${BASE_URL}/api/customers/me`, {
    headers: customerHeaders(),
  });
  return handleResponse(res);
}

export async function getMyOrders() {
  const res = await fetch(`${BASE_URL}/api/customers/my-orders`, {
    headers: customerHeaders(),
  });
  return handleResponse(res);
}

// ── Paiement ──────────────────────────────────────────────────
export async function updatePaymentStatus(orderId, { payment_status, payment_ref, transaction_id }) {
  const res = await fetch(`${BASE_URL}/api/orders/${orderId}/payment`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ payment_status, payment_ref, transaction_id }),
  });
  return handleResponse(res);
}

// ── Paramètres boutique ────────────────────────────────────────
export async function getSettings() {
  const res = await fetch(`${BASE_URL}/api/settings`);
  return handleResponse(res);
}

export async function updateSettings(settings) {
  const res = await fetch(`${BASE_URL}/api/settings`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(settings),
  });
  return handleResponse(res);
}

export async function refundOrder(id, data) {
  const res = await fetch(`${BASE_URL}/api/orders/${id}/refund`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

// ── Contact ───────────────────────────────────────────────────
export async function sendContact(data) {
  const res = await fetch(`${BASE_URL}/api/contact`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function getContactMessages() {
  const res = await fetch(`${BASE_URL}/api/contact`, {
    headers: authHeaders(),
  });
  return handleResponse(res);
}

export async function markMessageRead(id) {
  const res = await fetch(`${BASE_URL}/api/contact/${id}/read`, {
    method: "PATCH",
    headers: authHeaders(),
  });
  return handleResponse(res);
}

export async function deleteContactMessage(id) {
  const res = await fetch(`${BASE_URL}/api/contact/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  return handleResponse(res);
}

// ── Stats admin ───────────────────────────────────────────────
export async function getOrderStats() {
  const res = await fetch(`${BASE_URL}/api/orders/stats`, {
    headers: authHeaders(),
  });
  return handleResponse(res);
}

export async function getOrdersFiltered({ status } = {}) {
  const params = new URLSearchParams();
  if (status) params.append("status", status);
  const res = await fetch(`${BASE_URL}/api/orders?${params}`, {
    headers: authHeaders(),
  });
  return handleResponse(res);
}
