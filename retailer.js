let cart = [];
let upiQRCode = null;
let billCounter = parseInt(localStorage.getItem('billCounter') || '1000');
let selectedProducts = [];

// Load products on page load
window.onload = function() {
    checkUser();
    updateCartDisplay();
    // Focus on search input
    document.getElementById('searchProduct').focus();
};

function checkUser() {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if(!user || user.role !== 'retailer') {
        window.location.href = 'index.html';
    }
}

function logout() {
    localStorage.removeItem('currentUser');
    window.location.href = 'index.html';
}

// Search and select products
function searchProducts() {
    const searchTerm = document.getElementById('searchProduct').value.toLowerCase();
    const resultsDiv = document.getElementById('searchResults');
    
    if(searchTerm.length === 0) {
        resultsDiv.style.display = 'none';
        return;
    }
    
    const products = JSON.parse(localStorage.getItem('products') || '[]');
    const filtered = products.filter(p => 
        p.name.toLowerCase().includes(searchTerm) ||
        (p.barcode && p.barcode.includes(searchTerm))
    );
    
    resultsDiv.innerHTML = '';
    
    if(filtered.length === 0) {
        resultsDiv.innerHTML = '<div class="no-results">No products found</div>';
        resultsDiv.style.display = 'block';
        return;
    }
    
    filtered.forEach(product => {
        const item = document.createElement('div');
        item.className = 'search-result-item';
        item.innerHTML = `
            <div class="product-info">
                <strong>${product.name}</strong>
                <span class="price">₹${product.price}/${getWeightUnit(product)}</span>
            </div>
            <small>${product.category || 'Uncategorized'}</small>
        `;
        item.onclick = () => {
            addToSelectedProducts(product);
            resultsDiv.style.display = 'none';
            document.getElementById('searchProduct').value = '';
            document.getElementById('searchProduct').focus();
        };
        resultsDiv.appendChild(item);
    });
    
    resultsDiv.style.display = 'block';
}

function getWeightUnit(product) {
    if(product.weightUnit === 'kg') return 'kg';
    if(product.weightUnit === 'gram') return 'g';
    return 'piece';
}

function addToSelectedProducts(product) {
    // Check if already selected
    const alreadySelected = selectedProducts.find(p => p.id === product.id);
    if(!alreadySelected) {
        selectedProducts.push({...product});
        updateSelectedProductsList();
    }
    
    // Open quantity modal immediately
    openQuantityModal(product);
}

function updateSelectedProductsList() {
    const container = document.getElementById('selectedProductsList');
    container.innerHTML = '';
    
    if(selectedProducts.length === 0) {
        container.innerHTML = '<p class="no-selected">No products selected</p>';
        return;
    }
    
    selectedProducts.forEach(product => {
        const item = document.createElement('div');
        item.className = 'selected-product-item';
        item.innerHTML = `
            <span>${product.name}</span>
            <span class="price-tag">₹${product.price}/${getWeightUnit(product)}</span>
            <button onclick="openQuantityModal(${product.id})" class="add-btn">
                <i class="fas fa-plus"></i>
            </button>
        `;
        container.appendChild(item);
    });
}

// Quantity Modal Functions
function openQuantityModal(product) {
    if(typeof product === 'number') {
        // If product ID is passed
        const products = JSON.parse(localStorage.getItem('products') || '[]');
        product = products.find(p => p.id === product);
        if(!product) return;
    }
    
    // Create modal
    const modal = document.createElement('div');
    modal.className = 'quantity-modal';
    
    const isWeightProduct = product.weightUnit === 'kg' || product.weightUnit === 'gram';
    const unit = isWeightProduct ? (product.weightUnit === 'kg' ? 'kg' : 'g') : 'piece';
    
    modal.innerHTML = `
        <div class="quantity-modal-content">
            <div class="modal-header">
                <h3>${product.name}</h3>
                <button class="close-modal-btn" onclick="closeQuantityModal()">&times;</button>
            </div>
            
            <div class="product-details">
                <p class="price-display">Price: ₹${product.price} per ${unit}</p>
                <p class="category">${product.category}</p>
            </div>
            
            <div class="quantity-input-section">
                ${isWeightProduct ? `
                    <div class="weight-input">
                        <label>Weight (in ${unit === 'kg' ? 'grams' : 'grams'}):</label>
                        <div class="weight-controls">
                            <button onclick="decreaseWeight()">-</button>
                            <input type="number" id="weightValue" value="${unit === 'kg' ? '1000' : '1'}" 
                                   min="1" step="${unit === 'kg' ? '100' : '1'}" onchange="updateWeightPrice()">
                            <span class="unit">${unit === 'kg' ? 'g' : 'g'}</span>
                            <button onclick="increaseWeight()">+</button>
                        </div>
                        <div class="weight-conversion">
                            <small id="weightConversion"></small>
                        </div>
                    </div>
                ` : `
                    <div class="piece-input">
                        <label>Quantity:</label>
                        <div class="piece-controls">
                            <button onclick="decreaseQuantity()">-</button>
                            <input type="number" id="productQuantity" value="1" min="1" onchange="updatePiecePrice()">
                            <button onclick="increaseQuantity()">+</button>
                        </div>
                    </div>
                `}
                
                <div class="total-price">
                    <span>Total Price:</span>
                    <span class="price-amount">₹<span id="modalTotalPrice">${product.price}</span></span>
                </div>
            </div>
            
            <div class="modal-actions">
                <button onclick="addToCartWithDetails(${product.id})" class="add-to-cart-btn">
                    <i class="fas fa-cart-plus"></i> Add to Bill
                </button>
                <button onclick="closeQuantityModal()" class="cancel-btn">
                    Cancel
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Focus on input
    if(isWeightProduct) {
        document.getElementById('weightValue').focus();
        updateWeightPrice();
    } else {
        document.getElementById('productQuantity').focus();
        updatePiecePrice();
    }
}

function closeQuantityModal() {
    const modal = document.querySelector('.quantity-modal');
    if(modal) modal.remove();
}

// Weight-based product functions
function increaseWeight() {
    const input = document.getElementById('weightValue');
    const unit = input.nextElementSibling.textContent;
    const step = unit === 'g' ? 100 : 1;
    input.value = parseInt(input.value) + step;
    updateWeightPrice();
}

function decreaseWeight() {
    const input = document.getElementById('weightValue');
    const unit = input.nextElementSibling.textContent;
    const step = unit === 'g' ? 100 : 1;
    const current = parseInt(input.value);
    if(current > step) {
        input.value = current - step;
        updateWeightPrice();
    }
}

function updateWeightPrice() {
    const weight = parseFloat(document.getElementById('weightValue').value);
    const unit = document.getElementById('weightValue').nextElementSibling.textContent;
    
    // Get product details from modal
    const productName = document.querySelector('.quantity-modal-content h3').textContent;
    const products = JSON.parse(localStorage.getItem('products') || '[]');
    const product = products.find(p => p.name === productName);
    
    if(!product) return;
    
    let totalPrice = 0;
    
    if(product.weightUnit === 'kg') {
        // Price per kg, weight in grams
        const pricePerGram = product.price / 1000;
        totalPrice = pricePerGram * weight;
        
        // Update conversion display
        const kg = weight / 1000;
        document.getElementById('weightConversion').textContent = 
            `= ${kg.toFixed(3)} kg (${weight} grams)`;
    } else if(product.weightUnit === 'gram') {
        // Price per gram
        totalPrice = product.price * weight;
        document.getElementById('weightConversion').textContent = '';
    }
    
    document.getElementById('modalTotalPrice').textContent = totalPrice.toFixed(2);
}

// Piece-based product functions
function increaseQuantity() {
    const input = document.getElementById('productQuantity');
    input.value = parseInt(input.value) + 1;
    updatePiecePrice();
}

function decreaseQuantity() {
    const input = document.getElementById('productQuantity');
    if(parseInt(input.value) > 1) {
        input.value = parseInt(input.value) - 1;
        updatePiecePrice();
    }
}

function updatePiecePrice() {
    const quantity = parseInt(document.getElementById('productQuantity').value);
    
    // Get product details from modal
    const productName = document.querySelector('.quantity-modal-content h3').textContent;
    const products = JSON.parse(localStorage.getItem('products') || '[]');
    const product = products.find(p => p.name === productName);
    
    if(!product) return;
    
    const totalPrice = product.price * quantity;
    document.getElementById('modalTotalPrice').textContent = totalPrice.toFixed(2);
}

function addToCartWithDetails(productId) {
    const productName = document.querySelector('.quantity-modal-content h3').textContent;
    const products = JSON.parse(localStorage.getItem('products') || '[]');
    const product = products.find(p => p.id === productId);
    
    if(!product) return;
    
    let quantity = 1;
    let weight = null;
    let totalPrice = 0;
    
    if(product.weightUnit === 'kg' || product.weightUnit === 'gram') {
        // Weight-based product
        weight = parseFloat(document.getElementById('weightValue').value);
        
        if(product.weightUnit === 'kg') {
            // Price per kg, weight in grams
            const pricePerGram = product.price / 1000;
            totalPrice = pricePerGram * weight;
            quantity = weight / 1000; // Store in kg for display
        } else {
            // Price per gram
            totalPrice = product.price * weight;
            quantity = weight; // Store in grams
        }
    } else {
        // Piece-based product
        quantity = parseInt(document.getElementById('productQuantity').value);
        totalPrice = product.price * quantity;
        weight = null;
    }
    
    const existingItem = cart.find(item => item.id === productId && 
        (product.weightUnit === 'piece' || item.weight === weight));
    
    if(existingItem) {
        existingItem.quantity += quantity;
        existingItem.totalPrice += totalPrice;
    } else {
        cart.push({
            id: product.id,
            name: product.name,
            price: product.price,
            quantity: quantity,
            weight: weight,
            weightUnit: product.weightUnit,
            totalPrice: totalPrice,
            category: product.category
        });
    }
    
    updateCartDisplay();
    closeQuantityModal();
}

// Cart Functions
function updateCartDisplay() {
    const cartItemsDiv = document.getElementById('cartItems');
    const totalAmountSpan = document.getElementById('totalAmount');
    const totalItemsSpan = document.getElementById('totalItems');
    
    cartItemsDiv.innerHTML = '';
    let total = 0;
    let itemCount = 0;
    
    if(cart.length === 0) {
        cartItemsDiv.innerHTML = '<p class="empty-cart">No products added</p>';
        totalAmountSpan.textContent = '0.00';
        totalItemsSpan.textContent = '0';
        document.getElementById('changeAmount').textContent = '0.00';
        return;
    }
    
    cart.forEach((item, index) => {
        total += item.totalPrice;
        itemCount += 1;
        
        const itemDiv = document.createElement('div');
        itemDiv.className = 'cart-item';
        
        let quantityDisplay = '';
        if(item.weightUnit === 'kg') {
            quantityDisplay = `${(item.quantity).toFixed(3)} kg (${item.weight} g)`;
        } else if(item.weightUnit === 'gram') {
            quantityDisplay = `${item.quantity} g`;
        } else {
            quantityDisplay = `${item.quantity} piece${item.quantity > 1 ? 's' : ''}`;
        }
        
        itemDiv.innerHTML = `
            <div class="cart-item-info">
                <div class="cart-item-header">
                    <span class="cart-item-name">${item.name}</span>
                    <span class="cart-item-price">₹${item.totalPrice.toFixed(2)}</span>
                </div>
                <div class="cart-item-details">
                    <span class="quantity-info">${quantityDisplay}</span>
                    <span class="unit-price">@ ₹${item.price}/${getWeightUnit(item)}</span>
                </div>
                <div class="cart-item-actions">
                    <button class="edit-btn" onclick="editCartItem(${index})">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                </div>
            </div>
            <button class="remove-item" onclick="removeFromCart(${index})" title="Remove">
                <i class="fas fa-times"></i>
            </button>
        `;
        cartItemsDiv.appendChild(itemDiv);
    });
    
    totalAmountSpan.textContent = total.toFixed(2);
    totalItemsSpan.textContent = itemCount;
    calculateChange();
}

function editCartItem(index) {
    const products = JSON.parse(localStorage.getItem('products') || '[]');
    const product = products.find(p => p.id === cart[index].id);
    
    if(product) {
        openQuantityModal(product);
        // Remove from cart so it can be readded with new quantity
        setTimeout(() => {
            cart.splice(index, 1);
            updateCartDisplay();
        }, 100);
    }
}

function removeFromCart(index) {
    cart.splice(index, 1);
    updateCartDisplay();
}

function clearCart() {
    if(cart.length === 0) return;
    
    if(confirm('Clear all items from the bill?')) {
        cart = [];
        updateCartDisplay();
        document.getElementById('cashReceived').value = '';
        showCashSection();
    }
}

// Payment Functions (same as before, but updated)
function showCashSection() {
    document.getElementById('cashSection').style.display = 'block';
    document.getElementById('upiSection').style.display = 'none';
    document.getElementById('cashReceived').value = '';
    calculateChange();
}

function showUPISection() {
    document.getElementById('cashSection').style.display = 'none';
    document.getElementById('upiSection').style.display = 'block';
    generateUPIQR();
}

function showCreditSection() {
    document.getElementById('cashSection').style.display = 'none';
    document.getElementById('upiSection').style.display = 'none';
}

function calculateChange() {
    const total = parseFloat(document.getElementById('totalAmount').textContent) || 0;
    const received = parseFloat(document.getElementById('cashReceived').value) || 0;
    const change = received - total;
    
    const changeElement = document.getElementById('changeAmount');
    changeElement.textContent = Math.abs(change).toFixed(2);
    
    if(change < 0) {
        changeElement.parentElement.className = 'change-amount negative';
        changeElement.parentElement.innerHTML = `₹<span id="changeAmount">${Math.abs(change).toFixed(2)}</span> (Due)`;
    } else if(change > 0) {
        changeElement.parentElement.className = 'change-amount positive';
        changeElement.parentElement.innerHTML = `₹<span id="changeAmount">${change.toFixed(2)}</span> (Return)`;
    } else {
        changeElement.parentElement.className = 'change-amount';
        changeElement.parentElement.innerHTML = `₹<span id="changeAmount">0.00</span>`;
    }
}

function generateUPIQR() {
    const total = document.getElementById('totalAmount').textContent;
    const qrcodeDiv = document.getElementById('qrcode');
    qrcodeDiv.innerHTML = '';
    
    const upiId = "shop@upi";
    const qrData = `upi://pay?pa=${upiId}&am=${total}&cu=INR&tn=Grocery%20Shop%20Bill`;
    
    if(window.QRCode) {
        new QRCode(qrcodeDiv, {
            text: qrData,
            width: 150,
            height: 150
        });
    }
}

function markUPIPaid() {
    if(cart.length === 0) {
        alert('Cart is empty!');
        return;
    }
    
    if(confirm('Mark UPI payment as received?')) {
        completeSale('upi');
    }
}

// Complete Sale
function completeSale(paymentMethod = null) {
    if(cart.length === 0) {
        alert('Cart is empty!');
        return;
    }
    
    if(!paymentMethod) {
        paymentMethod = document.querySelector('input[name="payment"]:checked').value;
    }
    
    if(paymentMethod === 'cash') {
        const received = parseFloat(document.getElementById('cashReceived').value) || 0;
        const total = parseFloat(document.getElementById('totalAmount').textContent);
        
        if(received < total) {
            alert('Insufficient cash received!');
            return;
        }
    }
    
    // Generate bill number
    const billNo = billCounter++;
    localStorage.setItem('billCounter', billCounter);
    
    // Record sale
    const sale = {
        id: Date.now(),
        billNo: billNo,
        items: JSON.parse(JSON.stringify(cart)),
        total: parseFloat(document.getElementById('totalAmount').textContent),
        paymentMethod: paymentMethod,
        timestamp: new Date().toISOString(),
        date: new Date().toISOString().split('T')[0]
    };
    
    // Save to sales
    const sales = JSON.parse(localStorage.getItem('sales') || '[]');
    sales.push(sale);
    localStorage.setItem('sales', JSON.stringify(sales));
    
    // Update daily sales
    updateDailySales(sale);
    
    // Print receipt
    printReceipt(sale);
    
    // Clear cart
    clearCart();
    
    alert(`Sale completed!\nBill No: ${billNo}\nTotal: ₹${sale.total}`);
    
    // Reset focus
    document.getElementById('searchProduct').focus();
}

function updateDailySales(sale) {
    const today = new Date().toISOString().split('T')[0];
    let dailySales = JSON.parse(localStorage.getItem('dailySales_' + today) || '{}');
    
    if(!dailySales.sales) dailySales.sales = [];
    
    dailySales.sales.push(sale);
    dailySales.totalAmount = (dailySales.totalAmount || 0) + sale.total;
    
    switch(sale.paymentMethod) {
        case 'cash': dailySales.cashSales = (dailySales.cashSales || 0) + sale.total; break;
        case 'upi': dailySales.upiSales = (dailySales.upiSales || 0) + sale.total; break;
        case 'credit': dailySales.creditSales = (dailySales.creditSales || 0) + sale.total; break;
    }
    
    localStorage.setItem('dailySales_' + today, JSON.stringify(dailySales));
}

// Print Functions
function printReceipt(sale) {
    const receiptWindow = window.open('', '_blank');
    
    let receipt = `
        <html>
        <head>
            <title>Receipt #${sale.billNo}</title>
            <style>
                body { font-family: 'Courier New', monospace; margin: 0; padding: 10px; }
                .receipt { width: 80mm; margin: 0 auto; }
                .header { text-align: center; margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px dashed #000; }
                .shop-name { font-size: 18px; font-weight: bold; margin: 5px 0; }
                .bill-no { font-weight: bold; margin: 5px 0; }
                .items-table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 12px; }
                .items-table th, .items-table td { padding: 3px 0; border-bottom: 1px dashed #ccc; }
                .items-table th { border-bottom: 2px solid #000; text-align: left; }
                .items-table td:last-child { text-align: right; }
                .total { text-align: right; font-size: 14px; font-weight: bold; margin-top: 15px; padding-top: 10px; border-top: 2px solid #000; }
                .footer { text-align: center; margin-top: 20px; font-size: 10px; padding-top: 10px; border-top: 1px dashed #000; }
                .payment-method { margin-top: 5px; }
                @media print {
                    body { margin: 0; padding: 0; }
                    .no-print { display: none; }
                }
            </style>
        </head>
        <body>
            <div class="receipt">
                <div class="header">
                    <div class="shop-name">GROCERY SHOP</div>
                    <div>${new Date(sale.timestamp).toLocaleDateString()}</div>
                    <div>${new Date(sale.timestamp).toLocaleTimeString()}</div>
                    <div class="bill-no">Bill No: ${sale.billNo}</div>
                </div>
                
                <table class="items-table">
                    <thead>
                        <tr>
                            <th>S.No</th>
                            <th>Item</th>
                            <th>Qty</th>
                            <th>Rate</th>
                            <th>Amount</th>
                        </tr>
                    </thead>
                    <tbody>
    `;
    
    sale.items.forEach((item, index) => {
        let quantityDisplay = '';
        if(item.weightUnit === 'kg') {
            quantityDisplay = `${(item.quantity).toFixed(3)} kg`;
        } else if(item.weightUnit === 'gram') {
            quantityDisplay = `${item.quantity} g`;
        } else {
            quantityDisplay = `${item.quantity}`;
        }
        
        let rateDisplay = '';
        if(item.weightUnit === 'kg') {
            rateDisplay = `₹${item.price}/kg`;
        } else if(item.weightUnit === 'gram') {
            rateDisplay = `₹${item.price}/g`;
        } else {
            rateDisplay = `₹${item.price}`;
        }
        
        receipt += `
            <tr>
                <td>${index + 1}</td>
                <td>${item.name}</td>
                <td>${quantityDisplay}</td>
                <td>${rateDisplay}</td>
                <td>₹${item.totalPrice.toFixed(2)}</td>
            </tr>
        `;
    });
    
    receipt += `
                    </tbody>
                </table>
                
                <div class="total">
                    <div>Net Total: ₹${sale.total.toFixed(2)}</div>
                    <div class="payment-method">Payment: ${sale.paymentMethod.toUpperCase()}</div>
                </div>
                
                <div class="footer">
                    <div>Thank you for shopping!</div>
                    <div>Visit again</div>
                </div>
                
                <button class="no-print" onclick="window.print()" style="margin-top: 20px; padding: 10px; width: 100%;">Print Receipt</button>
            </div>
        </body>
        </html>
    `;
    
    receiptWindow.document.write(receipt);
    receiptWindow.document.close();
}

function printBill() {
    if(cart.length === 0) {
        alert('No items in the bill to print!');
        return;
    }
    
    // Create temporary sale for printing
    const tempSale = {
        billNo: 'DRAFT',
        items: [...cart],
        total: parseFloat(document.getElementById('totalAmount').textContent),
        paymentMethod: document.querySelector('input[name="payment"]:checked').value,
        timestamp: new Date().toISOString()
    };
    
    printReceipt(tempSale);
}