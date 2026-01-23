// Initialize data files if they don't exist
function initStorage() {
    if(!localStorage.getItem('products')) {
        const defaultProducts = [
            { id: 1, name: "Apple", price: 50, category: "Fruits", stock: 100 },
            { id: 2, name: "Milk", price: 30, category: "Dairy", stock: 50 },
            { id: 3, name: "Bread", price: 25, category: "Bakery", stock: 75 }
        ];
        localStorage.setItem('products', JSON.stringify(defaultProducts));
    }
    
    if(!localStorage.getItem('sales')) {
        localStorage.setItem('sales', JSON.stringify([]));
    }
    
    if(!localStorage.getItem('users')) {
        const users = [
            { username: "admin", password: "admin123", role: "admin" },
            { username: "retailer", password: "retailer123", role: "retailer" }
        ];
        localStorage.setItem('users', JSON.stringify(users));
    }
}

// Create daily Excel file
function createDailyExcel() {
    const today = new Date().toISOString().split('T')[0];
    const lastDate = localStorage.getItem('lastActiveDate');
    
    if(lastDate !== today) {
        localStorage.setItem('lastActiveDate', today);
        
        // Initialize daily sales
        const dailySales = {
            date: today,
            sales: [],
            totalAmount: 0,
            cashSales: 0,
            upiSales: 0,
            creditSales: 0
        };
        localStorage.setItem('dailySales_' + today, JSON.stringify(dailySales));
        
        console.log("New day started. Excel file will be created when sales occur.");
    }
}

// Login function
function login() {
    const loginType = document.getElementById('loginType').value;
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const user = users.find(u => u.username === username && u.password === password);
    
    if(user && user.role === loginType) {
        localStorage.setItem('currentUser', JSON.stringify(user));
        if(loginType === 'admin') {
            window.location.href = 'admin.html';
        } else {
            window.location.href = 'retailer.html';
        }
    } else {
        document.getElementById('errorMsg').textContent = 'Invalid credentials!';
    }
}

// Initialize on load
window.onload = function() {
    initStorage();
    createDailyExcel();
};