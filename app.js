import { db } from './firebase-config.js';
import { collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// ==========================================
// CONFIGURAÇÕES
// ==========================================
// TODO: COLOQUE SEU NÚMERO DE WHATSAPP AQUI (Com código do país e DDD. Ex: 5511999999999)
const WHATSAPP_NUMBER = "5581986140871"; 

// Estado do Carrinho
let cart = [];
let products = [];

// Elementos da DOM
const productsContainer = document.getElementById('products-container');
const cartCount = document.getElementById('cart-count');
const cartModal = document.getElementById('cart-modal');
const openCartBtn = document.getElementById('open-cart-btn');
const closeCartBtn = document.getElementById('close-cart-btn');
const cartItemsContainer = document.getElementById('cart-items');
const cartTotalValue = document.getElementById('cart-total-value');
const checkoutBtn = document.getElementById('checkout-btn');
const searchInput = document.getElementById('search-input');

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    if (!db) {
        productsContainer.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--danger);">Erro: Conecte o Firebase no arquivo firebase-config.js para ver os produtos.</p>';
        return;
    }
    loadProducts();
});

// Buscar produtos do Firestore
async function loadProducts() {
    try {
        const q = query(collection(db, "products"), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        
        products = [];
        querySnapshot.forEach((doc) => {
            products.push({ id: doc.id, ...doc.data() });
        });

        renderProducts(products);
    } catch (error) {
        console.error("Erro ao carregar produtos:", error);
        productsContainer.innerHTML = '<p style="grid-column: 1/-1; text-align: center;">Erro ao carregar os produtos.</p>';
    }
}

// Renderizar produtos na tela
function renderProducts(productsToRender) {
    productsContainer.innerHTML = '';

    if (productsToRender.length === 0) {
        productsContainer.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-muted);">Nenhum produto encontrado.</p>';
        return;
    }

    productsToRender.forEach(product => {
        const div = document.createElement('div');
        div.className = 'product-card';
        
        const isOutOfStock = product.stock <= 0;
        
        div.innerHTML = `
            <div class="product-img-container">
                <div class="product-stock" style="color: ${isOutOfStock ? 'var(--danger)' : 'inherit'}">
                    ${isOutOfStock ? 'Esgotado' : `Estoque: ${product.stock}`}
                </div>
                <img src="${product.imageUrl || 'https://via.placeholder.com/300'}" alt="${product.name}" class="product-img">
            </div>
            <div class="product-info">
                <h3 class="product-title">${product.name}</h3>
                <div class="product-price">R$ ${parseFloat(product.price).toFixed(2).replace('.', ',')}</div>
                <button class="add-to-cart-btn" onclick="addToCart('${product.id}')" ${isOutOfStock ? 'disabled' : ''}>
                    ${isOutOfStock ? 'Sem Estoque' : 'Adicionar ao Carrinho'}
                </button>
            </div>
        `;
        productsContainer.appendChild(div);
    });
}

// Filtro de Busca
searchInput.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    const filtered = products.filter(p => p.name.toLowerCase().includes(term));
    renderProducts(filtered);
});

// Funções do Carrinho
window.addToCart = function(productId) {
    const product = products.find(p => p.id === productId);
    if (!product || product.stock <= 0) return;

    const existingItem = cart.find(item => item.id === productId);
    
    if (existingItem) {
        if (existingItem.quantity < product.stock) {
            existingItem.quantity++;
        } else {
            alert('Quantidade máxima em estoque atingida para este produto!');
        }
    } else {
        cart.push({
            id: product.id,
            name: product.name,
            price: product.price,
            imageUrl: product.imageUrl,
            quantity: 1,
            maxStock: product.stock
        });
    }
    
    updateCartUI();
};

window.updateQuantity = function(productId, delta) {
    const item = cart.find(item => item.id === productId);
    if (!item) return;

    const newQty = item.quantity + delta;
    
    if (newQty <= 0) {
        cart = cart.filter(i => i.id !== productId);
    } else if (newQty <= item.maxStock) {
        item.quantity = newQty;
    } else {
        alert('Quantidade máxima em estoque atingida para este produto!');
    }
    
    updateCartUI();
};

function updateCartUI() {
    // Atualizar contador da bolinha
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    cartCount.textContent = totalItems;

    // Atualizar lista no modal
    if (cart.length === 0) {
        cartItemsContainer.innerHTML = '<p class="empty-cart-msg">Seu carrinho está vazio.</p>';
        cartTotalValue.textContent = 'R$ 0,00';
        checkoutBtn.disabled = true;
        return;
    }

    cartItemsContainer.innerHTML = '';
    let total = 0;

    cart.forEach(item => {
        total += item.price * item.quantity;
        
        const div = document.createElement('div');
        div.className = 'cart-item';
        div.innerHTML = `
            <img src="${item.imageUrl || 'https://via.placeholder.com/60'}" class="cart-item-img" alt="${item.name}">
            <div class="cart-item-info">
                <div class="cart-item-title">${item.name}</div>
                <div class="cart-item-price">R$ ${parseFloat(item.price).toFixed(2).replace('.', ',')}</div>
                <div class="cart-item-controls">
                    <button class="qty-btn" onclick="updateQuantity('${item.id}', -1)">-</button>
                    <span>${item.quantity}</span>
                    <button class="qty-btn" onclick="updateQuantity('${item.id}', 1)">+</button>
                </div>
            </div>
        `;
        cartItemsContainer.appendChild(div);
    });

    cartTotalValue.textContent = `R$ ${total.toFixed(2).replace('.', ',')}`;
    checkoutBtn.disabled = false;
}

// Eventos do Modal
openCartBtn.addEventListener('click', () => cartModal.classList.add('active'));
closeCartBtn.addEventListener('click', () => cartModal.classList.remove('active'));
cartModal.addEventListener('click', (e) => {
    if (e.target === cartModal) cartModal.classList.remove('active');
});

// ... (mais adiante no checkoutBtn.addEventListener)
checkoutBtn.addEventListener('click', () => {
    if (cart.length === 0) return;

    const now = new Date();
    const formattedDate = now.toLocaleDateString('pt-BR');
    const formattedTime = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    let message = `*Esse é o meu pedido!*\n`;
    message += `Data e horário do pedido: ${formattedDate} às ${formattedTime}\n\n`;
    
    let total = 0;

    cart.forEach(item => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        message += `🛍️ *${item.name}*\n`;
        message += `Quantidade: ${item.quantity}\n`;
        message += `Valor unitário: R$ ${parseFloat(item.price).toFixed(2).replace('.', ',')}\n`;
        message += `Subtotal: R$ ${itemTotal.toFixed(2).replace('.', ',')}\n`;
        message += `------------------------\n`;
    });

    message += `\n💰 *VALOR TOTAL: R$ ${total.toFixed(2).replace('.', ',')}*`;

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://api.whatsapp.com/send?phone=${WHATSAPP_NUMBER}&text=${encodedMessage}`;
    
    window.open(whatsappUrl, '_blank');
});
