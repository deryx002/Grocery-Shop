// Admin Panel JavaScript
let currentEditingProductId = null;
let currentEditingCategoryId = null;

// Initialize on page load
window.onload = function() {
    checkAdminUser();
    loadDashboard();
    loadProductsTable();
    loadCategories();
    loadSalesReport();
    setupEventListeners();
    loadCategoriesToSelect();
};

// Check if user is admin
function checkAdminUser() {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if(!user || user.role !== 'admin') {
        window.location.href = 'index.html';
    }
    
    // Display current user
    document.getElementById('currentUser').textContent = user.username;
}

// Logout function
function logout() {
    localStorage.removeItem('currentUser');
    window.location.href = 'index.html';
}

// Setup event listeners
function setupEventListeners() {
    // Search products
    document.getElementById('searchAdminProduct')?.addEventListener('input', function(e) {
        filterProductsTable(e.target.value);
    });
    
    // Auto-update dates
    const today = new Date().toISOString().split('T')[0];
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');
    
    if(startDateInput) startDateInput.value = today;
    if(endDateInput) endDateInput.value = today;
}

// Dashboard Functions
function showDashboard() {
    hideAllTabs();
    document.getElementById('dashboardContent').style.display = 'block';
    updateActiveMenu('dashboard');
    loadDashboard();
}

function loadDashboard() {
    // Load today's sales
    const today = new Date().toISOString().split('T')[0];
    const dailySales = JSON.parse(localStorage.getItem('dailySales_' + today) || '{}');
    const todaySales = dailySales.totalAmount || 0;
    document.getElementById('todaySales').textContent = `₹${todaySales.toFixed(2)}`;
    
    // Load total products
    const products = JSON.parse(localStorage.getItem('products') || '[]');
    document.getElementById('totalProducts').textContent = products.length;
    
    // Load top category
    const topCategory = getTopCategory();
    document.getElementById('topCategory').textContent = topCategory;
    
    // Load monthly revenue
    const monthlyRevenue = calculateMonthlyRevenue();
    document.getElementById('monthlyRevenue').textContent = `₹${monthlyRevenue.toFixed(2)}`;
    
    // Load recent sales
    loadRecentSales();
}

function getTopCategory() {
    const products = JSON.parse(localStorage.getItem('products') || '[]');
    if(products.length === 0) return "-";
    
    const categoryCount = {};
    products.forEach(product => {
        const category = product.category || 'Uncategorized';
        categoryCount[category] = (categoryCount[category] || 0) + 1;
    });
    
    const topCategory = Object.entries(categoryCount).sort((a, b) => b[1] - a[1])[0];
    return topCategory ? topCategory[0] : "-";
}

function calculateMonthlyRevenue() {
    const sales = JSON.parse(localStorage.getItem('sales') || '[]');
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    const monthlySales = sales.filter(sale => {
        const saleDate = new Date(sale.timestamp);
        return saleDate.getMonth() === currentMonth && 
               saleDate.getFullYear() === currentYear;
    });
    
    return monthlySales.reduce((sum, sale) => sum + sale.total, 0);
}

function loadRecentSales() {
    const sales = JSON.parse(localStorage.getItem('sales') || '[]');
    const recentSales = sales.slice(-10).reverse(); // Get last 10 sales
    
    const tableBody = document.getElementById('recentSalesTable');
    if(!tableBody) return;
    
    if(recentSales.length === 0) {
        tableBody.innerHTML = '<p class="no-data">No sales yet</p>';
        return;
    }
    
    let html = `
        <table class="recent-sales-table">
            <thead>
                <tr>
                    <th>Bill No</th>
                    <th>Time</th>
                    <th>Amount</th>
                    <th>Payment</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    recentSales.forEach((sale, index) => {
        const time = new Date(sale.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        
        html += `
            <tr>
                <td>${sale.billNo || sale.id}</td>
                <td>${time}</td>
                <td>₹${sale.total.toFixed(2)}</td>
                <td><span class="payment-badge ${sale.paymentMethod}-badge">${sale.paymentMethod}</span></td>
            </tr>
        `;
    });
    
    html += '</tbody></table>';
    tableBody.innerHTML = html;
}

// Tab Management
function showTab(tabName) {
    hideAllTabs();
    
    switch(tabName) {
        case 'products':
            document.getElementById('productsTab').style.display = 'block';
            loadProductsTable();
            break;
        case 'categories':
            document.getElementById('categoriesTab').style.display = 'block';
            loadCategories();
            loadCategorySales();
            break;
        case 'sales':
            document.getElementById('salesTab').style.display = 'block';
            loadSalesReport();
            break;
        case 'import':
            document.getElementById('importTab').style.display = 'block';
            break;
        default:
            showDashboard();
            return;
    }
    
    updateActiveMenu(tabName);
}

function hideAllTabs() {
    const tabs = ['dashboardContent', 'productsTab', 'categoriesTab', 'salesTab', 'importTab'];
    tabs.forEach(tab => {
        const element = document.getElementById(tab);
        if(element) element.style.display = 'none';
    });
}

function updateActiveMenu(activeItem) {
    // Remove active class from all menu items
    const menuItems = document.querySelectorAll('.sidebar-menu a');
    menuItems.forEach(item => item.classList.remove('active'));
    
    // Add active class to clicked item
    const activeElement = document.querySelector(`.sidebar-menu a[onclick*="${activeItem}"]`);
    if(activeElement) {
        activeElement.classList.add('active');
    }
}

// Products Management
function loadProductsTable() {
    const products = JSON.parse(localStorage.getItem('products') || '[]');
    const tableBody = document.getElementById('productsTableBody');
    
    if(!tableBody) return;
    
    if(products.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="no-data">
                    <p>No products found. <a href="#" onclick="openAddProductModal()">Add your first product</a></p>
                </td>
            </tr>
        `;
        return;
    }
    
    let html = '';
    products.forEach((product, index) => {
        html += `
            <tr>
                <td>${index + 1}</td>
                <td><strong>${product.name}</strong></td>
                <td><span class="category-tag">${product.category || 'Uncategorized'}</span></td>
                <td>₹${product.price.toFixed(2)}</td>
                <td class="actions">
                    <button class="edit-btn" onclick="editProduct(${product.id})">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="delete-btn" onclick="deleteProduct(${product.id})">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </td>
            </tr>
        `;
    });
    
    tableBody.innerHTML = html;
}

function filterProductsTable(searchTerm) {
    const products = JSON.parse(localStorage.getItem('products') || '[]');
    const filteredProducts = products.filter(product => 
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (product.category && product.category.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    
    const tableBody = document.getElementById('productsTableBody');
    
    if(filteredProducts.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="no-data">No products found matching "${searchTerm}"</td>
            </tr>
        `;
        return;
    }
    
    let html = '';
    filteredProducts.forEach((product, index) => {
        html += `
            <tr>
                <td>${index + 1}</td>
                <td>${product.name}</td>
                <td><span class="category-tag">${product.category || 'Uncategorized'}</span></td>
                <td>₹${product.price.toFixed(2)}</td>
                <td class="actions">
                    <button class="edit-btn" onclick="editProduct(${product.id})">Edit</button>
                    <button class="delete-btn" onclick="deleteProduct(${product.id})">Delete</button>
                </td>
            </tr>
        `;
    });
    
    tableBody.innerHTML = html;
}

// Load categories to select dropdown
function loadCategoriesToSelect() {
    const categories = JSON.parse(localStorage.getItem('categories') || '[]');
    const select = document.getElementById('productCategory');
    
    if(!select) return;
    
    select.innerHTML = '<option value="">Select Category</option>';
    categories.forEach(category => {
        select.innerHTML += `<option value="${category.name}">${category.name}</option>`;
    });
    
    // Add "Uncategorized" option
    select.innerHTML += '<option value="Uncategorized">Uncategorized</option>';
}

// Add this function to admin.js in the Products Management section
function openAddProductModal() {
    currentEditingProductId = null;
    document.getElementById('modalTitle').textContent = 'Add New Product';
    document.getElementById('productForm').reset();
    loadCategoriesToSelect();
    
    // Show/hide weight unit field based on category
    const categorySelect = document.getElementById('productCategory');
    categorySelect.onchange = toggleWeightUnitField;
    
    document.getElementById('productModal').style.display = 'flex';
}

// Add this function to toggle weight unit field
// Add this function to toggle weight unit field
function toggleWeightUnitField() {
    const category = document.getElementById('productCategory').value;
    const weightUnitContainer = document.getElementById('weightUnitContainer');
    
    // Show weight unit for fruits and vegetables
    if(category === 'Fruits' || category === 'Vegetables') {
        weightUnitContainer.style.display = 'block';
        document.getElementById('weightUnit').required = true;
    } else {
        weightUnitContainer.style.display = 'none';
        document.getElementById('weightUnit').required = false;
        document.getElementById('weightUnit').value = 'piece';
    }
}

// Update saveProduct function to properly save weight unit
function saveProduct(event) {
    event.preventDefault();
    
    const category = document.getElementById('productCategory').value;
    let weightUnit = 'piece'; // Default value
    
    // Get weight unit for fruits and vegetables
    if(category === 'Fruits' || category === 'Vegetables') {
        weightUnit = document.getElementById('weightUnit').value;
    }
    
    const product = {
        id: currentEditingProductId || Date.now(),
        name: document.getElementById('productName').value,
        category: category,
        price: parseFloat(document.getElementById('productPrice').value),
        barcode: document.getElementById('productBarcode').value || '',
        weightUnit: weightUnit // Make sure this is saved
    };
    
    let products = JSON.parse(localStorage.getItem('products') || '[]');
    
    if(currentEditingProductId) {
        const index = products.findIndex(p => p.id == currentEditingProductId);
        if(index !== -1) {
            products[index] = product;
        }
    } else {
        products.push(product);
    }
    
    localStorage.setItem('products', JSON.stringify(products));
    
    // Update UI
    loadProductsTable();
    loadDashboard();
    closeModal();
    
    showNotification('Product saved successfully!', 'success');
}

// Update editProduct function to show weight unit
function editProduct(productId) {
    const products = JSON.parse(localStorage.getItem('products') || '[]');
    const product = products.find(p => p.id == productId);
    
    if(!product) {
        alert('Product not found!');
        return;
    }
    
    currentEditingProductId = productId;
    document.getElementById('modalTitle').textContent = 'Edit Product';
    loadCategoriesToSelect();
    
    // Fill form with product data
    document.getElementById('productName').value = product.name;
    document.getElementById('productCategory').value = product.category || 'Uncategorized';
    document.getElementById('productPrice').value = product.price;
    document.getElementById('productBarcode').value = product.barcode || '';
    
    // Trigger weight unit field toggle
    toggleWeightUnitField();
    
    // Set weight unit if exists (default to 'piece' if not)
    if(document.getElementById('weightUnit')) {
        document.getElementById('weightUnit').value = product.weightUnit || 'piece';
    }
    
    document.getElementById('productModal').style.display = 'flex';
}

// Update loadProductsTable to show weight unit
function loadProductsTable() {
    const products = JSON.parse(localStorage.getItem('products') || '[]');
    const tableBody = document.getElementById('productsTableBody');
    
    if(!tableBody) return;
    
    if(products.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="no-data">
                    <p>No products found. <a href="#" onclick="openAddProductModal()">Add your first product</a></p>
                </td>
            </tr>
        `;
        return;
    }
    
    let html = '';
    products.forEach((product, index) => {
        const weightInfo = product.weightUnit && product.weightUnit !== 'piece' 
            ? `<span class="weight-info">(${product.weightUnit})</span>` 
            : '';
        
        html += `
            <tr>
                <td>${index + 1}</td>
                <td>
                    <strong>${product.name}</strong>
                    ${weightInfo}
                </td>
                <td><span class="category-tag">${product.category || 'Uncategorized'}</span></td>
                <td>₹${product.price.toFixed(2)}</td>
                <td class="actions">
                    <button class="edit-btn" onclick="editProduct(${product.id})">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="delete-btn" onclick="deleteProduct(${product.id})">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </td>
            </tr>
        `;
    });
    
    tableBody.innerHTML = html;
}

// Update saveProduct function
function saveProduct(event) {
    event.preventDefault();
    
    const product = {
        id: currentEditingProductId || Date.now(),
        name: document.getElementById('productName').value,
        category: document.getElementById('productCategory').value || 'Uncategorized',
        price: parseFloat(document.getElementById('productPrice').value),
        barcode: document.getElementById('productBarcode').value || ''
    };
    
    // Add weight unit for fruits and vegetables
    const category = product.category;
    if(category === 'Fruits' || category === 'Vegetables') {
        product.weightUnit = document.getElementById('weightUnit')?.value || 'piece';
    }
    
    let products = JSON.parse(localStorage.getItem('products') || '[]');
    
    if(currentEditingProductId) {
        const index = products.findIndex(p => p.id == currentEditingProductId);
        if(index !== -1) {
            products[index] = product;
        }
    } else {
        products.push(product);
    }
    
    localStorage.setItem('products', JSON.stringify(products));
    
    // Update UI
    loadProductsTable();
    loadDashboard();
    closeModal();
    
    showNotification('Product saved successfully!', 'success');
}

// Update editProduct function
function editProduct(productId) {
    const products = JSON.parse(localStorage.getItem('products') || '[]');
    const product = products.find(p => p.id == productId);
    
    if(!product) {
        alert('Product not found!');
        return;
    }
    
    currentEditingProductId = productId;
    document.getElementById('modalTitle').textContent = 'Edit Product';
    loadCategoriesToSelect();
    
    // Fill form with product data
    document.getElementById('productName').value = product.name;
    document.getElementById('productCategory').value = product.category || 'Uncategorized';
    document.getElementById('productPrice').value = product.price;
    document.getElementById('productBarcode').value = product.barcode || '';
    
    // Trigger weight unit field toggle
    toggleWeightUnitField();
    
    // Set weight unit if exists
    if(product.weightUnit) {
        const weightUnitSelect = document.getElementById('weightUnit');
        if(weightUnitSelect) {
            weightUnitSelect.value = product.weightUnit;
        }
    }
    
    document.getElementById('productModal').style.display = 'flex';
}

function editProduct(productId) {
    const products = JSON.parse(localStorage.getItem('products') || '[]');
    const product = products.find(p => p.id == productId);
    
    if(!product) {
        alert('Product not found!');
        return;
    }
    
    currentEditingProductId = productId;
    document.getElementById('modalTitle').textContent = 'Edit Product';
    loadCategoriesToSelect();
    
    // Fill form with product data
    document.getElementById('productName').value = product.name;
    document.getElementById('productCategory').value = product.category || 'Uncategorized';
    document.getElementById('productPrice').value = product.price;
    document.getElementById('productBarcode').value = product.barcode || '';
    
    document.getElementById('productModal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('productModal').style.display = 'none';
    currentEditingProductId = null;
    document.getElementById('productForm').reset();
}

function saveProduct(event) {
    event.preventDefault();
    
    const product = {
        id: currentEditingProductId || Date.now(),
        name: document.getElementById('productName').value,
        category: document.getElementById('productCategory').value || 'Uncategorized',
        price: parseFloat(document.getElementById('productPrice').value),
        barcode: document.getElementById('productBarcode').value || ''
    };
    
    let products = JSON.parse(localStorage.getItem('products') || '[]');
    
    if(currentEditingProductId) {
        // Update existing product
        const index = products.findIndex(p => p.id == currentEditingProductId);
        if(index !== -1) {
            products[index] = product;
        }
    } else {
        // Add new product
        products.push(product);
    }
    
    localStorage.setItem('products', JSON.stringify(products));
    
    // Update UI
    loadProductsTable();
    loadDashboard(); // Update stats
    closeModal();
    
    // Show success notification
    showNotification('Product saved successfully!', 'success');
}

function deleteProduct(productId) {
    if(!confirm('Are you sure you want to delete this product?')) {
        return;
    }
    
    let products = JSON.parse(localStorage.getItem('products') || '[]');
    products = products.filter(p => p.id != productId);
    
    localStorage.setItem('products', JSON.stringify(products));
    
    // Update UI
    loadProductsTable();
    loadDashboard();
    
    showNotification('Product deleted successfully!', 'success');
}

// Categories Management
function loadCategories() {
    let categories = JSON.parse(localStorage.getItem('categories') || '[]');
    
    // If no categories exist, create default ones
    if(categories.length === 0) {
        categories = [
            { id: 1, name: "Fruits" },
            { id: 2, name: "Vegetables" },
            { id: 3, name: "Dairy" },
            { id: 4, name: "Bakery" },
            { id: 5, name: "Beverages" }
        ];
        localStorage.setItem('categories', JSON.stringify(categories));
    }
    
    const categoriesList = document.getElementById('categoriesList');
    if(!categoriesList) return;
    
    let html = '<div class="categories-grid">';
    categories.forEach(category => {
        const productCount = countProductsByCategory(category.name);
        
        html += `
            <div class="category-card">
                <h4>${category.name}</h4>
                <p>${productCount} products</p>
                <div class="category-actions">
                    <button class="edit-category-btn" onclick="editCategory(${category.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="delete-category-btn" onclick="deleteCategory(${category.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    });
    html += '</div>';
    
    categoriesList.innerHTML = html;
}

function countProductsByCategory(categoryName) {
    const products = JSON.parse(localStorage.getItem('products') || '[]');
    return products.filter(p => p.category === categoryName).length;
}

function openAddCategoryModal() {
    currentEditingCategoryId = null;
    document.getElementById('categoryModalTitle').textContent = 'Add New Category';
    document.getElementById('categoryForm').reset();
    
    document.getElementById('categoryModal').style.display = 'flex';
}

function closeCategoryModal() {
    document.getElementById('categoryModal').style.display = 'none';
    currentEditingCategoryId = null;
    document.getElementById('categoryForm').reset();
}

function editCategory(categoryId) {
    const categories = JSON.parse(localStorage.getItem('categories') || '[]');
    const category = categories.find(c => c.id == categoryId);
    
    if(!category) {
        alert('Category not found!');
        return;
    }
    
    currentEditingCategoryId = categoryId;
    document.getElementById('categoryModalTitle').textContent = 'Edit Category';
    document.getElementById('categoryName').value = category.name;
    
    document.getElementById('categoryModal').style.display = 'flex';
}

function saveCategory(event) {
    event.preventDefault();
    
    const categoryName = document.getElementById('categoryName').value.trim();
    
    if(!categoryName) {
        alert('Please enter a category name');
        return;
    }
    
    let categories = JSON.parse(localStorage.getItem('categories') || '[]');
    
    // Check for duplicate
    if(categories.some(c => c.name.toLowerCase() === categoryName.toLowerCase() && c.id != currentEditingCategoryId)) {
        alert('Category already exists!');
        return;
    }
    
    if(currentEditingCategoryId) {
        // Update existing category
        const index = categories.findIndex(c => c.id == currentEditingCategoryId);
        if(index !== -1) {
            categories[index].name = categoryName;
            
            // Also update all products with this category
            updateProductsCategory(categories[index].name, categoryName);
        }
    } else {
        // Add new category
        const newId = categories.length > 0 ? Math.max(...categories.map(c => c.id)) + 1 : 1;
        categories.push({ id: newId, name: categoryName });
    }
    
    localStorage.setItem('categories', JSON.stringify(categories));
    
    // Update UI
    loadCategories();
    loadCategoriesToSelect();
    loadDashboard();
    closeCategoryModal();
    
    showNotification('Category saved successfully!', 'success');
}

function updateProductsCategory(oldName, newName) {
    const products = JSON.parse(localStorage.getItem('products') || '[]');
    products.forEach(product => {
        if(product.category === oldName) {
            product.category = newName;
        }
    });
    localStorage.setItem('products', JSON.stringify(products));
}

function deleteCategory(categoryId) {
    if(!confirm('Are you sure? Products in this category will be moved to "Uncategorized".')) {
        return;
    }
    
    const categories = JSON.parse(localStorage.getItem('categories') || '[]');
    const categoryToDelete = categories.find(c => c.id == categoryId);
    
    if(!categoryToDelete) return;
    
    // Move products to "Uncategorized"
    const products = JSON.parse(localStorage.getItem('products') || '[]');
    products.forEach(product => {
        if(product.category === categoryToDelete.name) {
            product.category = 'Uncategorized';
        }
    });
    localStorage.setItem('products', JSON.stringify(products));
    
    // Remove category
    const updatedCategories = categories.filter(c => c.id != categoryId);
    localStorage.setItem('categories', JSON.stringify(updatedCategories));
    
    // Update UI
    loadCategories();
    loadCategoriesToSelect();
    loadDashboard();
    
    showNotification('Category deleted successfully!', 'success');
}

function loadCategorySales() {
    const sales = JSON.parse(localStorage.getItem('sales') || '[]');
    const categorySales = {};
    
    // Calculate sales by category
    sales.forEach(sale => {
        sale.items.forEach(item => {
            const category = item.category || 'Uncategorized';
            categorySales[category] = (categorySales[category] || 0) + (item.price * item.quantity);
        });
    });
    
    const chartDiv = document.getElementById('categorySalesChart');
    
    if(Object.keys(categorySales).length === 0) {
        chartDiv.innerHTML = '<p class="no-data">No sales data available</p>';
        return;
    }
    
    // Create simple bar chart
    let html = '<div class="chart-bars">';
    Object.entries(categorySales).forEach(([category, amount]) => {
        const percentage = (amount / Math.max(...Object.values(categorySales))) * 100;
        
        html += `
            <div class="chart-bar">
                <div class="bar-label">${category}</div>
                <div class="bar-container">
                    <div class="bar-fill" style="width: ${percentage}%"></div>
                    <span class="bar-value">₹${amount.toFixed(2)}</span>
                </div>
            </div>
        `;
    });
    html += '</div>';
    
    chartDiv.innerHTML = html;
}

// Sales Report Functions
function loadSalesReport() {
    const sales = JSON.parse(localStorage.getItem('sales') || '[]');
    const tableBody = document.getElementById('salesTableBody');
    
    if(!tableBody) return;
    
    if(sales.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="no-data">No sales recorded yet</td>
            </tr>
        `;
        return;
    }
    
    let html = '';
    sales.slice().reverse().forEach((sale, index) => {
        const date = new Date(sale.timestamp).toLocaleDateString();
        const time = new Date(sale.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        const itemsCount = sale.items.reduce((sum, item) => sum + item.quantity, 0);
        const itemsList = sale.items.map(item => `${item.name} (x${item.quantity})`).join(', ');
        
        html += `
            <tr>
                <td>${index + 1}</td>
                <td>
                    <div>${date}</div>
                    <small>${time}</small>
                </td>
                <td>${sale.billNo || sale.id}</td>
                <td title="${itemsList}">${itemsCount} items</td>
                <td>₹${sale.total.toFixed(2)}</td>
                <td>
                    <span class="payment-badge ${sale.paymentMethod}-badge">
                        ${sale.paymentMethod.toUpperCase()}
                    </span>
                </td>
                <td class="actions">
                    <button class="print-btn" onclick="printReceipt(${sale.id})">
                        <i class="fas fa-print"></i> Print
                    </button>
                </td>
            </tr>
        `;
    });
    
    tableBody.innerHTML = html;
}

function filterSales() {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    
    if(!startDate || !endDate) {
        alert('Please select both start and end dates');
        return;
    }
    
    const sales = JSON.parse(localStorage.getItem('sales') || '[]');
    const filteredSales = sales.filter(sale => {
        const saleDate = sale.date || new Date(sale.timestamp).toISOString().split('T')[0];
        return saleDate >= startDate && saleDate <= endDate;
    });
    
    const tableBody = document.getElementById('salesTableBody');
    
    if(filteredSales.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="no-data">
                    No sales found between ${startDate} and ${endDate}
                </td>
            </tr>
        `;
        return;
    }
    
    let html = '';
    filteredSales.slice().reverse().forEach((sale, index) => {
        const date = new Date(sale.timestamp).toLocaleDateString();
        const time = new Date(sale.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        const itemsCount = sale.items.reduce((sum, item) => sum + item.quantity, 0);
        
        html += `
            <tr>
                <td>${index + 1}</td>
                <td>${date} ${time}</td>
                <td>${sale.billNo || sale.id}</td>
                <td>${itemsCount} items</td>
                <td>₹${sale.total.toFixed(2)}</td>
                <td>
                    <span class="payment-badge ${sale.paymentMethod}-badge">
                        ${sale.paymentMethod}
                    </span>
                </td>
                <td class="actions">
                    <button class="print-btn" onclick="printReceipt(${sale.id})">Print</button>
                </td>
            </tr>
        `;
    });
    
    tableBody.innerHTML = html;
}

function printReceipt(saleId) {
    const sales = JSON.parse(localStorage.getItem('sales') || '[]');
    const sale = sales.find(s => s.id == saleId);
    
    if(!sale) {
        alert('Sale not found!');
        return;
    }
    
    // Open receipt in new window for printing
    const receiptWindow = window.open('', '_blank');
    
    let receipt = `
        <html>
        <head>
            <title>Receipt #${sale.billNo || sale.id}</title>
            <style>
                body { font-family: monospace; margin: 20px; }
                .receipt { width: 300px; margin: 0 auto; }
                .header { text-align: center; margin-bottom: 20px; }
                .shop-name { font-size: 24px; font-weight: bold; }
                .bill-no { margin: 10px 0; }
                .items-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                .items-table th, .items-table td { padding: 5px; text-align: left; border-bottom: 1px dashed #ccc; }
                .items-table th { border-bottom: 2px solid #000; }
                .total { text-align: right; font-size: 18px; font-weight: bold; margin-top: 20px; }
                .footer { text-align: center; margin-top: 30px; font-size: 12px; }
                @media print {
                    body { margin: 0; padding: 10px; }
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
                    <div class="bill-no">Bill No: ${sale.billNo || sale.id}</div>
                </div>
                
                <table class="items-table">
                    <thead>
                        <tr>
                            <th>S.No</th>
                            <th>Item</th>
                            <th>Qty</th>
                            <th>Price</th>
                            <th>Total</th>
                        </tr>
                    </thead>
                    <tbody>
    `;
    
    sale.items.forEach((item, index) => {
        const itemTotal = item.price * item.quantity;
        receipt += `
            <tr>
                <td>${index + 1}</td>
                <td>${item.name}</td>
                <td>${item.quantity}</td>
                <td>₹${item.price}</td>
                <td>₹${itemTotal}</td>
            </tr>
        `;
    });
    
    receipt += `
                    </tbody>
                </table>
                
                <div class="total">
                    <div>Net Total: ₹${sale.total}</div>
                    <div>Payment: ${sale.paymentMethod.toUpperCase()}</div>
                </div>
                
                <div class="footer">
                    <div>Thank you for shopping with us!</div>
                    <div>Visit again</div>
                </div>
                
                <button class="no-print" onclick="window.print()" style="margin-top: 20px; padding: 10px 20px;">Print Receipt</button>
            </div>
        </body>
        </html>
    `;
    
    receiptWindow.document.write(receipt);
    receiptWindow.document.close();
}

// Import/Export Functions (same as before, but updated template)
function importFromExcel(event) {
    const file = event.target.files[0];
    if(!file) return;
    
    const reader = new FileReader();
    
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, {type: 'array'});
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(firstSheet);
            
            if(jsonData.length === 0) {
                showNotification('No data found in the file!', 'error');
                return;
            }
            
            const existingProducts = JSON.parse(localStorage.getItem('products') || '[]');
            const newProducts = [];
            const updatedProducts = [];
            let errors = [];
            
            jsonData.forEach((row, index) => {
                if(!row.name || !row.price) {
                    errors.push(`Row ${index + 1}: Missing required fields (name, price)`);
                    return;
                }
                
                const product = {
                    id: row.id || Date.now() + index,
                    name: String(row.name).trim(),
                    category: row.category || 'Uncategorized',
                    price: parseFloat(row.price) || 0,
                    barcode: row.barcode || ''
                };
                
                if(product.price <= 0) {
                    errors.push(`Row ${index + 1}: Invalid price`);
                    return;
                }
                
                const existingIndex = existingProducts.findIndex(p => 
                    p.id === product.id || p.name.toLowerCase() === product.name.toLowerCase()
                );
                
                if(existingIndex >= 0) {
                    existingProducts[existingIndex] = {
                        ...existingProducts[existingIndex],
                        ...product
                    };
                    updatedProducts.push(product.name);
                } else {
                    existingProducts.push(product);
                    newProducts.push(product.name);
                }
            });
            
            localStorage.setItem('products', JSON.stringify(existingProducts));
            
            let message = `Import completed!\n`;
            if(newProducts.length > 0) message += `New products: ${newProducts.length}\n`;
            if(updatedProducts.length > 0) message += `Updated products: ${updatedProducts.length}\n`;
            if(errors.length > 0) message += `Errors: ${errors.length}`;
            
            showNotification(message, 'success');
            
            loadProductsTable();
            loadDashboard();
            
        } catch (error) {
            console.error('Import error:', error);
            showNotification('Error importing file! Please check the format.', 'error');
        }
    };
    
    reader.onerror = function() {
        showNotification('Error reading file!', 'error');
    };
    
    reader.readAsArrayBuffer(file);
}

function downloadTemplate() {
    const template = [
        { name: 'Apple', category: 'Fruits', price: 50, barcode: '' },
        { name: 'Milk', category: 'Dairy', price: 30, barcode: '' },
        { name: 'Bread', category: 'Bakery', price: 25, barcode: '' }
    ];
    
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Products Template");
    XLSX.writeFile(wb, "products_template.xlsx");
}

function exportProductsToExcel() {
    const products = JSON.parse(localStorage.getItem('products') || '[]');
    
    if(products.length === 0) {
        alert('No products to export!');
        return;
    }
    
    const ws = XLSX.utils.json_to_sheet(products);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Products");
    
    const today = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `products_export_${today}.xlsx`);
    
    showNotification(`Exported ${products.length} products to Excel`, 'success');
}

function exportSalesToExcel() {
    const sales = JSON.parse(localStorage.getItem('sales') || '[]');
    
    if(sales.length === 0) {
        alert('No sales to export!');
        return;
    }
    
    const exportData = sales.map(sale => ({
        'Bill No': sale.billNo || sale.id,
        'Date': new Date(sale.timestamp).toLocaleDateString(),
        'Time': new Date(sale.timestamp).toLocaleTimeString(),
        'Items Count': sale.items.reduce((sum, item) => sum + item.quantity, 0),
        'Total Amount': sale.total,
        'Payment Method': sale.paymentMethod
    }));
    
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sales Report");
    
    const today = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `sales_report_${today}.xlsx`);
    
    showNotification(`Exported ${sales.length} sales to Excel`, 'success');
}

function exportDailyReport() {
    const today = new Date().toISOString().split('T')[0];
    const dailySales = JSON.parse(localStorage.getItem('dailySales_' + today) || '{"sales": []}');
    
    if(!dailySales.sales || dailySales.sales.length === 0) {
        alert('No sales today to export!');
        return;
    }
    
    const summaryData = [{
        'Date': today,
        'Total Sales': dailySales.totalAmount || 0,
        'Cash Sales': dailySales.cashSales || 0,
        'UPI Sales': dailySales.upiSales || 0,
        'Credit Sales': dailySales.creditSales || 0,
        'Total Transactions': dailySales.sales.length
    }];
    
    const summaryWs = XLSX.utils.json_to_sheet(summaryData);
    const detailsWs = XLSX.utils.json_to_sheet(dailySales.sales);
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, summaryWs, "Summary");
    XLSX.utils.book_append_sheet(wb, detailsWs, "Sales Details");
    
    XLSX.writeFile(wb, `daily_report_${today}.xlsx`);
    
    showNotification('Daily report exported to Excel', 'success');
}

// WhatsApp Integration
function sendDailyReport() {
    const today = new Date().toISOString().split('T')[0];
    const dailySales = JSON.parse(localStorage.getItem('dailySales_' + today) || '{}');
    
    exportDailyReport();
    
    const message = `*Daily Sales Report - ${today}*
    
📊 *SUMMARY*
Total Sales: ₹${dailySales.totalAmount || 0}
Cash: ₹${dailySales.cashSales || 0}
UPI: ₹${dailySales.upiSales || 0}
Credit: ₹${dailySales.creditSales || 0}
Total Transactions: ${dailySales.sales?.length || 0}

🏪 *TOP CATEGORIES*
${getTopCategories(dailySales.sales || [])}

📈 *PERFORMANCE*
Average Sale Value: ₹${getAverageSale(dailySales.sales || [])}
Peak Hour: ${getPeakHour(dailySales.sales || [])}

_Report generated at ${new Date().toLocaleTimeString()}_`;
    
    console.log('WhatsApp Message:', message);
    
    if(confirm(`Daily report will be sent to WhatsApp:\n\n${message.substring(0, 200)}...\n\n(Note: Requires WhatsApp Business API setup)`)) {
        showNotification('Report prepared! Setup WhatsApp API to send automatically.', 'success');
    }
}

function getTopCategories(sales) {
    if(sales.length === 0) return "No sales today";
    
    const categorySales = {};
    sales.forEach(sale => {
        sale.items.forEach(item => {
            const category = item.category || 'Uncategorized';
            categorySales[category] = (categorySales[category] || 0) + (item.price * item.quantity);
        });
    });
    
    const topCategories = Object.entries(categorySales)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);
    
    return topCategories.map(([category, amount], index) => 
        `${index + 1}. ${category}: ₹${amount.toFixed(2)}`
    ).join('\n') || "No category data";
}

function getAverageSale(sales) {
    if(sales.length === 0) return "0.00";
    const total = sales.reduce((sum, sale) => sum + sale.total, 0);
    return (total / sales.length).toFixed(2);
}

function getPeakHour(sales) {
    const hourCounts = {};
    sales.forEach(sale => {
        const hour = new Date(sale.timestamp).getHours();
        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });
    
    const peakHour = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0];
    return peakHour ? `${peakHour[0]}:00 - ${peakHour[0]}:59` : "N/A";
}

// Utility Functions
function showNotification(message, type = 'success') {
    const existing = document.querySelector('.notification');
    if(existing) existing.remove();
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}