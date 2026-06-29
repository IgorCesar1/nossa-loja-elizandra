import { auth, db } from './firebase-config.js';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { collection, addDoc, getDocs, deleteDoc, doc, query, orderBy } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// Elementos
const loginScreen = document.getElementById('login-screen');
const adminPanel = document.getElementById('admin-panel');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const logoutBtn = document.getElementById('logout-btn');

const addProductForm = document.getElementById('add-product-form');
const productImageInput = document.getElementById('product-image');
const imagePreview = document.getElementById('image-preview');
const imagePreviewContainer = document.getElementById('image-preview-container');
const submitProductBtn = document.getElementById('submit-product-btn');
const adminProductsContainer = document.getElementById('admin-products-container');

// Estado da imagem
let base64ImageString = null;

// Verifica Autenticação
if (auth) {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            loginScreen.classList.add('hidden');
            adminPanel.classList.remove('hidden');
            loadAdminProducts();
        } else {
            loginScreen.classList.remove('hidden');
            adminPanel.classList.add('hidden');
        }
    });
} else {
    document.body.innerHTML = '<h2 style="text-align:center; padding: 2rem;">Configure o Firebase no firebase-config.js primeiro.</h2>';
}

// Login
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    try {
        await signInWithEmailAndPassword(auth, email, password);
        loginError.style.display = 'none';
    } catch (error) {
        console.error("Erro de login:", error);
        loginError.style.display = 'block';
        if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
             loginError.textContent = 'E-mail ou senha incorretos. Você já criou esse usuário no painel do Firebase?';
        } else if (error.code === 'auth/network-request-failed') {
             loginError.textContent = 'Erro de rede. Você está conectado à internet ou bloqueado por antivírus?';
        } else {
             loginError.textContent = 'Erro: ' + error.message;
        }
    }
});

// Logout
logoutBtn.addEventListener('click', () => {
    signOut(auth);
});

// Preview e Compressão de Imagem (Base64)
productImageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
            // Aumentando limite para 1000px para ficar em HD e melhorar nitidez
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 1000; // Tamanho HD
            const scaleSize = MAX_WIDTH / img.width;
            canvas.width = MAX_WIDTH;
            canvas.height = img.height * scaleSize;

            const ctx = canvas.getContext('2d');
            
            // Filtro para melhorar as cores e dar um aspecto mais "nítido/vivo"
            ctx.filter = 'contrast(1.05) saturate(1.1)';
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            // Converte para Base64 com qualidade de 80%
            base64ImageString = canvas.toDataURL('image/jpeg', 0.8);
            
            // Mostra o preview
            imagePreview.src = base64ImageString;
            imagePreview.style.display = 'block';
            imagePreviewContainer.querySelector('span').style.display = 'none';
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
});

// Adicionar Produto
addProductForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!base64ImageString) {
        alert('Por favor, selecione uma foto para o produto.');
        return;
    }

    const name = document.getElementById('product-name').value;
    const price = parseFloat(document.getElementById('product-price').value);
    const stock = parseInt(document.getElementById('product-stock').value);

    submitProductBtn.disabled = true;
    submitProductBtn.textContent = 'Salvando produto...';

    try {
        const timestamp = Date.now();
        
        // Salvar direto no Firestore (sem usar o Storage pago)
        await addDoc(collection(db, "products"), {
            name: name,
            price: price,
            stock: stock,
            imageUrl: base64ImageString, // A imagem salva como texto
            createdAt: timestamp
        });

        alert('Produto adicionado com sucesso!');
        addProductForm.reset();
        imagePreview.style.display = 'none';
        imagePreviewContainer.querySelector('span').style.display = 'block';
        base64ImageString = null;
        
        loadAdminProducts(); // Recarrega a lista

    } catch (error) {
        console.error("Erro ao adicionar produto:", error);
        alert('Erro ao adicionar produto. O arquivo pode estar muito grande.');
    } finally {
        submitProductBtn.disabled = false;
        submitProductBtn.textContent = 'Salvar Produto';
    }
});

// Carregar produtos no painel
async function loadAdminProducts() {
    try {
        const q = query(collection(db, "products"), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        
        adminProductsContainer.innerHTML = '';
        
        if (querySnapshot.empty) {
            adminProductsContainer.innerHTML = '<p style="text-align:center; color: var(--text-muted);">Nenhum produto cadastrado.</p>';
            return;
        }

        querySnapshot.forEach((docSnap) => {
            const product = docSnap.data();
            const stockLabel = product.stock <= 0
                ? `<span style="color: var(--danger); font-weight: 600;">Esgotado</span>`
                : `<span style="color: var(--primary-color); font-weight: 600;">Estoque: ${product.stock}</span>`;

            const div = document.createElement('div');
            div.className = 'admin-product-item';
            div.id = `product-item-${docSnap.id}`;
            div.innerHTML = `
                <div style="display: flex; align-items: center; flex: 1; gap: 0.75rem;">
                    <img src="${product.imageUrl}" alt="${product.name}" style="width:55px;height:55px;border-radius:8px;object-fit:cover;flex-shrink:0;">
                    <div style="flex:1;">
                        <div id="view-${docSnap.id}">
                            <strong>${product.name}</strong><br>
                            <span style="color: var(--text-muted); font-size: 0.8rem;">R$ ${parseFloat(product.price).toFixed(2).replace('.',',')} &nbsp;|&nbsp; ${stockLabel}</span>
                        </div>
                        <div id="edit-${docSnap.id}" style="display:none; margin-top: 0.5rem;">
                            <input type="text" id="edit-name-${docSnap.id}" value="${product.name}" placeholder="Nome" style="width:100%; padding:6px; border:1px solid var(--border-color); border-radius:6px; margin-bottom:6px; font-family:inherit;">
                            <div style="display:flex; gap:6px;">
                                <input type="number" id="edit-price-${docSnap.id}" value="${product.price}" placeholder="Preço" step="0.01" style="width:50%; padding:6px; border:1px solid var(--border-color); border-radius:6px; font-family:inherit;">
                                <input type="number" id="edit-stock-${docSnap.id}" value="${product.stock}" placeholder="Estoque" style="width:50%; padding:6px; border:1px solid var(--border-color); border-radius:6px; font-family:inherit;">
                            </div>
                        </div>
                    </div>
                </div>
                <div style="display:flex; flex-direction:column; gap:6px; margin-left:8px;">
                    <button id="btn-edit-${docSnap.id}" class="btn-edit" onclick="toggleEdit('${docSnap.id}')">✏️ Editar</button>
                    <button id="btn-save-${docSnap.id}" class="btn-save hidden" onclick="saveEdit('${docSnap.id}')">💾 Salvar</button>
                    <button class="btn-danger" onclick="deleteProduct('${docSnap.id}')">🗑️ Excluir</button>
                </div>
            `;
            adminProductsContainer.appendChild(div);
        });
    } catch (error) {
        console.error("Erro ao listar:", error);
        adminProductsContainer.innerHTML = '<p>Erro ao listar produtos.</p>';
    }
}

// Alternar modo de edição
window.toggleEdit = function(id) {
    const viewDiv = document.getElementById(`view-${id}`);
    const editDiv = document.getElementById(`edit-${id}`);
    const btnEdit = document.getElementById(`btn-edit-${id}`);
    const btnSave = document.getElementById(`btn-save-${id}`);

    const isEditing = !editDiv.classList.contains('hidden') && editDiv.style.display !== 'none';
    
    if (isEditing) {
        // Cancelar edição
        viewDiv.style.display = 'block';
        editDiv.style.display = 'none';
        btnEdit.textContent = '✏️ Editar';
        btnSave.classList.add('hidden');
    } else {
        // Abrir edição
        viewDiv.style.display = 'none';
        editDiv.style.display = 'block';
        btnEdit.textContent = '❌ Cancelar';
        btnSave.classList.remove('hidden');
    }
}

// Salvar edição
window.saveEdit = async function(id) {
    const { updateDoc, doc: firestoreDoc } = await import("https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js");
    
    const name = document.getElementById(`edit-name-${id}`).value.trim();
    const price = parseFloat(document.getElementById(`edit-price-${id}`).value);
    const stock = parseInt(document.getElementById(`edit-stock-${id}`).value);
    
    if (!name || isNaN(price) || isNaN(stock)) {
        alert('Preencha todos os campos corretamente.');
        return;
    }

    try {
        await updateDoc(firestoreDoc(db, "products", id), { name, price, stock });
        alert('Produto atualizado com sucesso!');
        loadAdminProducts();
    } catch (error) {
        console.error("Erro ao salvar:", error);
        alert('Erro ao salvar. Tente novamente.');
    }
}

// Excluir produto
window.deleteProduct = async function(id) {
    if (confirm('Tem certeza que deseja excluir este produto?')) {
        try {
            await deleteDoc(doc(db, "products", id));
            loadAdminProducts();
        } catch (error) {
            console.error("Erro ao excluir:", error);
            alert("Erro ao excluir produto.");
        }
    }
}
