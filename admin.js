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
            const div = document.createElement('div');
            div.className = 'admin-product-item';
            div.innerHTML = `
                <div style="display: flex; align-items: center;">
                    <img src="${product.imageUrl}" alt="${product.name}">
                    <div>
                        <strong>${product.name}</strong><br>
                        <span style="color: var(--text-muted); font-size: 0.875rem;">
                            R$ ${product.price.toFixed(2)} | Estoque: ${product.stock}
                        </span>
                    </div>
                </div>
                <button class="btn-danger" onclick="deleteProduct('${docSnap.id}')">Excluir</button>
            `;
            adminProductsContainer.appendChild(div);
        });
    } catch (error) {
        console.error("Erro ao listar:", error);
        adminProductsContainer.innerHTML = '<p>Erro ao listar produtos.</p>';
    }
}

// Excluir produto
window.deleteProduct = async function(id) {
    if (confirm('Tem certeza que deseja excluir este produto?')) {
        try {
            await deleteDoc(doc(db, "products", id));
            loadAdminProducts(); // Atualiza a lista
        } catch (error) {
            console.error("Erro ao excluir:", error);
            alert("Erro ao excluir produto.");
        }
    }
}
