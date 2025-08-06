// Currency data and API configuration
const API_BASE_URL = 'https://api.exchangerate-api.com/v4/latest/';
const BACKUP_API_URL = 'https://api.exchangerate.host/latest';

// Currency data with full names
const CURRENCIES = {
    'USD': 'US Dollar',
    'EUR': 'Euro',
    'GBP': 'British Pound Sterling',
    'JPY': 'Japanese Yen',
    'AUD': 'Australian Dollar',
    'CAD': 'Canadian Dollar',
    'CHF': 'Swiss Franc',
    'CNY': 'Chinese Yuan',
    'SEK': 'Swedish Krona',
    'NZD': 'New Zealand Dollar',
    'MXN': 'Mexican Peso',
    'SGD': 'Singapore Dollar',
    'HKD': 'Hong Kong Dollar',
    'NOK': 'Norwegian Krone',
    'INR': 'Indian Rupee',
    'BRL': 'Brazilian Real',
    'RUB': 'Russian Ruble',
    'KRW': 'South Korean Won',
    'TRY': 'Turkish Lira',
    'ZAR': 'South African Rand',
    'PLN': 'Polish Zloty',
    'THB': 'Thai Baht',
    'MYR': 'Malaysian Ringgit',
    'CZK': 'Czech Koruna',
    'DKK': 'Danish Krone',
    'HUF': 'Hungarian Forint',
    'ILS': 'Israeli Shekel',
    'CLP': 'Chilean Peso',
    'PHP': 'Philippine Peso',
    'AED': 'UAE Dirham',
    'COP': 'Colombian Peso',
    'SAR': 'Saudi Riyal',
    'RON': 'Romanian Leu',
    'BGN': 'Bulgarian Lev',
    'HRK': 'Croatian Kuna',
    'ISK': 'Icelandic Krona',
    'EGP': 'Egyptian Pound'
};

// Popular currency pairs
const POPULAR_PAIRS = [
    { from: 'USD', to: 'EUR' },
    { from: 'USD', to: 'GBP' },
    { from: 'USD', to: 'JPY' },
    { from: 'USD', to: 'INR' },
    { from: 'EUR', to: 'USD' },
    { from: 'GBP', to: 'USD' }
];

// Global variables
let exchangeRates = {};
let userLocation = null;
let conversionHistory = JSON.parse(localStorage.getItem('conversionHistory')) || [];
let favoriteConversions = JSON.parse(localStorage.getItem('favoriteConversions')) || [];
let isDarkTheme = localStorage.getItem('darkTheme') === 'true';
let chart = null;

// DOM elements
const elements = {
    amount: document.getElementById('amount'),
    fromCurrency: document.getElementById('fromCurrency'),
    toCurrency: document.getElementById('toCurrency'),
    convertBtn: document.getElementById('convertBtn'),
    swapBtn: document.getElementById('swapBtn'),
    resultSection: document.getElementById('resultSection'),
    resultAmount: document.getElementById('resultAmount'),
    resultDetails: document.getElementById('resultDetails'),
    exchangeRate: document.getElementById('exchangeRate'),
    loading: document.getElementById('loading'),
    popularGrid: document.getElementById('popularGrid'),
    fromCurrencyInfo: document.getElementById('fromCurrencyInfo'),
    toCurrencyInfo: document.getElementById('toCurrencyInfo'),
    amountError: document.getElementById('amountError'),
    chatBtn: document.getElementById('chatBtn'),
    chatModal: document.getElementById('chatModal'),
    closeChatBtn: document.getElementById('closeChatBtn'),
    overlay: document.getElementById('overlay'),
    chatMessages: document.getElementById('chatMessages'),
    chatInput: document.getElementById('chatInput'),
    sendChatBtn: document.getElementById('sendChatBtn'),
    themeToggle: document.getElementById('themeToggle'),
    favoritesBtn: document.getElementById('favoritesBtn'),
    saveFavorite: document.getElementById('saveFavorite'),
    historyBtn: document.getElementById('historyBtn'),
    favoritesModal: document.getElementById('favoritesModal'),
    historyModal: document.getElementById('historyModal'),
    closeFavoritesBtn: document.getElementById('closeFavoritesBtn'),
    closeHistoryBtn: document.getElementById('closeHistoryBtn'),
    favoritesContent: document.getElementById('favoritesContent'),
    historyContent: document.getElementById('historyContent'),
    clearHistory: document.getElementById('clearHistory'),
    copyResult: document.getElementById('copyResult'),
    shareResult: document.getElementById('shareResult'),
    refreshRates: document.getElementById('refreshRates'),
    rateChange: document.getElementById('rateChange'),
    toast: document.getElementById('toast'),
    chartCanvas: document.getElementById('chartCanvas')
};

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

async function initializeApp() {
    try {
        showLoading(true);
        
        // Initialize theme
        initializeTheme();
        
        // Create floating particles
        createFloatingParticles();
        
        // Initialize currency dropdowns
        populateCurrencyDropdowns();
        
        // Detect user location and set default currency
        await detectUserLocation();
        
        // Load initial exchange rates
        await loadExchangeRates('USD');
        
        // Load popular conversions
        await loadPopularConversions();
        
        // Update market stats
        updateMarketStats();
        
        // Set up event listeners
        setupEventListeners();
        
        // Load favorites and history
        loadFavorites();
        loadHistory();
        
        showLoading(false);
    } catch (error) {
        console.error('Initialization error:', error);
        showToast('Failed to initialize the application. Please refresh the page.', 'error');
        showLoading(false);
    }
}

function populateCurrencyDropdowns() {
    const fromSelect = elements.fromCurrency;
    const toSelect = elements.toCurrency;
    
    // Clear existing options except the first one
    fromSelect.innerHTML = '<option value="">Select currency...</option>';
    toSelect.innerHTML = '<option value="">Select currency...</option>';
    
    // Add currency options
    Object.entries(CURRENCIES).forEach(([code, name]) => {
        const option1 = new Option(`${code} - ${name}`, code);
        const option2 = new Option(`${code} - ${name}`, code);
        fromSelect.appendChild(option1);
        toSelect.appendChild(option2);
    });
}

async function detectUserLocation() {
    try {
        // Try to get user's location using IP geolocation
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();
        
        if (data.currency && CURRENCIES[data.currency]) {
            userLocation = data.currency;
            elements.fromCurrency.value = data.currency;
            updateCurrencyInfo('from', data.currency);
        } else {
            // Default to USD if location detection fails
            elements.fromCurrency.value = 'USD';
            updateCurrencyInfo('from', 'USD');
        }
        
        // Set default "to" currency
        elements.toCurrency.value = 'EUR';
        updateCurrencyInfo('to', 'EUR');
        
    } catch (error) {
        console.error('Location detection failed:', error);
        // Set default currencies
        elements.fromCurrency.value = 'USD';
        elements.toCurrency.value = 'EUR';
        updateCurrencyInfo('from', 'USD');
        updateCurrencyInfo('to', 'EUR');
    }
}

async function loadExchangeRates(baseCurrency) {
    try {
        let response = await fetch(`${API_BASE_URL}${baseCurrency}`);
        
        if (!response.ok) {
            // Try backup API
            response = await fetch(`${BACKUP_API_URL}?base=${baseCurrency}`);
        }
        
        const data = await response.json();
        exchangeRates = data.rates || data;
        
        return exchangeRates;
    } catch (error) {
        console.error('Failed to load exchange rates:', error);
        throw new Error('Unable to fetch current exchange rates');
    }
}

async function loadPopularConversions() {
    const grid = elements.popularGrid;
    grid.innerHTML = '';
    
    try {
        for (const pair of POPULAR_PAIRS) {
            await loadExchangeRates(pair.from);
            const rate = exchangeRates[pair.to];
            
            if (rate) {
                const card = createPopularCard(pair.from, pair.to, rate);
                grid.appendChild(card);
            }
        }
    } catch (error) {
        console.error('Failed to load popular conversions:', error);
    }
}

function createPopularCard(fromCurrency, toCurrency, rate) {
    const card = document.createElement('div');
    card.className = 'popular-card';
    card.innerHTML = `
        <div class="popular-header">
            <div class="currency-pair">${fromCurrency} → ${toCurrency}</div>
            <div class="popular-rate">${formatNumber(rate)}</div>
        </div>
        <div class="popular-names">
            ${CURRENCIES[fromCurrency]} to ${CURRENCIES[toCurrency]}
        </div>
    `;
    
    card.addEventListener('click', () => {
        elements.fromCurrency.value = fromCurrency;
        elements.toCurrency.value = toCurrency;
        elements.amount.value = '1';
        updateCurrencyInfo('from', fromCurrency);
        updateCurrencyInfo('to', toCurrency);
        convertCurrency();
    });
    
    return card;
}

function setupEventListeners() {
    // Convert button
    elements.convertBtn.addEventListener('click', convertCurrency);
    
    // Swap button
    elements.swapBtn.addEventListener('click', swapCurrencies);
    
    // Currency selection changes
    elements.fromCurrency.addEventListener('change', (e) => {
        updateCurrencyInfo('from', e.target.value);
    });
    
    elements.toCurrency.addEventListener('change', (e) => {
        updateCurrencyInfo('to', e.target.value);
    });
    
    // Amount input validation
    elements.amount.addEventListener('input', validateAmount);
    elements.amount.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            convertCurrency();
        }
    });
    
    // Quick amount buttons
    document.querySelectorAll('.quick-amount').forEach(btn => {
        btn.addEventListener('click', (e) => {
            elements.amount.value = e.target.dataset.amount;
            validateAmount();
        });
    });
    
    // Theme toggle
    elements.themeToggle.addEventListener('click', toggleTheme);
    
    // Favorites functionality
    elements.favoritesBtn.addEventListener('click', openFavoritesModal);
    elements.saveFavorite.addEventListener('click', toggleFavorite);
    elements.closeFavoritesBtn.addEventListener('click', closeFavoritesModal);
    
    // History functionality
    elements.historyBtn.addEventListener('click', openHistoryModal);
    elements.closeHistoryBtn.addEventListener('click', closeHistoryModal);
    elements.clearHistory.addEventListener('click', clearConversionHistory);
    
    // Result actions
    elements.copyResult.addEventListener('click', copyResult);
    elements.shareResult.addEventListener('click', shareResult);
    
    // Refresh rates
    elements.refreshRates.addEventListener('click', refreshExchangeRates);
    
    // Chat functionality
    elements.chatBtn.addEventListener('click', openChatModal);
    elements.closeChatBtn.addEventListener('click', closeChatModal);
    elements.overlay.addEventListener('click', closeAllModals);
    elements.sendChatBtn.addEventListener('click', sendChatMessage);
    elements.chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendChatMessage();
        }
    });
}

function updateCurrencyInfo(type, currencyCode) {
    const infoElement = type === 'from' ? elements.fromCurrencyInfo : elements.toCurrencyInfo;
    
    if (currencyCode && CURRENCIES[currencyCode]) {
        infoElement.textContent = CURRENCIES[currencyCode];
    } else {
        infoElement.textContent = '';
    }
}

function validateAmount() {
    const amount = parseFloat(elements.amount.value);
    const errorElement = elements.amountError;
    
    if (elements.amount.value === '') {
        errorElement.textContent = '';
        return true;
    }
    
    if (isNaN(amount) || amount < 0) {
        errorElement.textContent = 'Please enter a valid positive number';
        return false;
    }
    
    if (amount > 1000000000) {
        errorElement.textContent = 'Amount is too large';
        return false;
    }
    
    errorElement.textContent = '';
    return true;
}

async function convertCurrency() {
    const amount = parseFloat(elements.amount.value);
    const fromCurrency = elements.fromCurrency.value;
    const toCurrency = elements.toCurrency.value;
    
    // Validation
    if (!validateAmount()) return;
    
    if (!amount || amount <= 0) {
        showError('Please enter a valid amount');
        return;
    }
    
    if (!fromCurrency) {
        showError('Please select a currency to convert from');
        return;
    }
    
    if (!toCurrency) {
        showError('Please select a currency to convert to');
        return;
    }
    
    if (fromCurrency === toCurrency) {
        showError('Please select different currencies');
        return;
    }
    
    try {
        showLoading(true);
        elements.resultSection.classList.remove('show');
        
        // Load exchange rates for the base currency
        await loadExchangeRates(fromCurrency);
        
        const rate = exchangeRates[toCurrency];
        
        if (!rate) {
            throw new Error('Exchange rate not available');
        }
        
        const convertedAmount = amount * rate;
        
        // Display result
        displayResult(amount, fromCurrency, convertedAmount, toCurrency, rate);
        
        showLoading(false);
        
    } catch (error) {
        console.error('Conversion error:', error);
        showError('Failed to convert currency. Please try again.');
        showLoading(false);
    }
}

function displayResult(originalAmount, fromCurrency, convertedAmount, toCurrency, rate) {
    elements.resultAmount.textContent = `${formatNumber(convertedAmount)} ${toCurrency}`;
    elements.resultDetails.textContent = `${formatNumber(originalAmount)} ${CURRENCIES[fromCurrency]} equals`;
    elements.exchangeRate.textContent = `1 ${fromCurrency} = ${formatNumber(rate)} ${toCurrency}`;
    
    elements.resultSection.classList.add('show');
}

function swapCurrencies() {
    const fromValue = elements.fromCurrency.value;
    const toValue = elements.toCurrency.value;
    
    if (fromValue && toValue) {
        elements.fromCurrency.value = toValue;
        elements.toCurrency.value = fromValue;
        
        updateCurrencyInfo('from', toValue);
        updateCurrencyInfo('to', fromValue);
        
        // Convert if amount is entered
        if (elements.amount.value) {
            convertCurrency();
        }
    }
}

function formatNumber(num) {
    if (num >= 1) {
        return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(num);
    } else {
        return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 6
        }).format(num);
    }
}

function showLoading(show) {
    if (show) {
        elements.loading.classList.add('show');
        elements.convertBtn.disabled = true;
    } else {
        elements.loading.classList.remove('show');
        elements.convertBtn.disabled = false;
    }
}

function showError(message) {
    elements.amountError.textContent = message;
    setTimeout(() => {
        elements.amountError.textContent = '';
    }, 5000);
}

// Chat functionality
function openChatModal() {
    elements.chatModal.classList.add('show');
    elements.overlay.classList.add('show');
    elements.chatInput.focus();
}

function closeChatModal() {
    elements.chatModal.classList.remove('show');
    elements.overlay.classList.remove('show');
}

function sendChatMessage() {
    const message = elements.chatInput.value.trim();
    
    if (!message) return;
    
    // Add user message to chat
    addChatMessage(message, 'user');
    
    // Clear input
    elements.chatInput.value = '';
    
    // Process the message
    processChatMessage(message);
}

function addChatMessage(message, sender) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}-message`;
    
    const icon = sender === 'bot' ? '<i class="fas fa-robot"></i>' : '<i class="fas fa-user"></i>';
    
    messageDiv.innerHTML = `
        <div class="message-content">
            ${icon}
            <span>${message}</span>
        </div>
    `;
    
    elements.chatMessages.appendChild(messageDiv);
    elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
}

async function processChatMessage(message) {
    try {
        // Parse the message for conversion intent
        const conversionData = parseConversionMessage(message);
        
        if (conversionData) {
            const { amount, fromCurrency, toCurrency } = conversionData;
            
            // Perform the conversion
            await loadExchangeRates(fromCurrency);
            const rate = exchangeRates[toCurrency];
            
            if (rate) {
                const convertedAmount = amount * rate;
                const response = `${formatNumber(amount)} ${CURRENCIES[fromCurrency]} equals ${formatNumber(convertedAmount)} ${CURRENCIES[toCurrency]}. The current exchange rate is 1 ${fromCurrency} = ${formatNumber(rate)} ${toCurrency}.`;
                
                addChatMessage(response, 'bot');
                
                // Update the main converter with these values
                elements.amount.value = amount;
                elements.fromCurrency.value = fromCurrency;
                elements.toCurrency.value = toCurrency;
                updateCurrencyInfo('from', fromCurrency);
                updateCurrencyInfo('to', toCurrency);
                displayResult(amount, fromCurrency, convertedAmount, toCurrency, rate);
                
            } else {
                addChatMessage("Sorry, I couldn't find the exchange rate for those currencies. Please try again.", 'bot');
            }
        } else {
            addChatMessage("I didn't understand that conversion request. Try something like 'Convert 100 dollars to euros' or 'What's 50 pounds in yen?'", 'bot');
        }
    } catch (error) {
        console.error('Chat processing error:', error);
        addChatMessage("Sorry, I encountered an error processing your request. Please try again.", 'bot');
    }
}

function parseConversionMessage(message) {
    const msg = message.toLowerCase();
    
    // Common patterns for conversion requests
    const patterns = [
        /convert\s+(\d+(?:\.\d+)?)\s+(\w+)\s+to\s+(\w+)/,
        /(\d+(?:\.\d+)?)\s+(\w+)\s+to\s+(\w+)/,
        /(\d+(?:\.\d+)?)\s+(\w+)\s+in\s+(\w+)/,
        /what'?s\s+(\d+(?:\.\d+)?)\s+(\w+)\s+in\s+(\w+)/,
        /how\s+much\s+is\s+(\d+(?:\.\d+)?)\s+(\w+)\s+in\s+(\w+)/
    ];
    
    // Currency name mappings
    const currencyNames = {
        'dollar': 'USD', 'dollars': 'USD', 'usd': 'USD',
        'euro': 'EUR', 'euros': 'EUR', 'eur': 'EUR',
        'pound': 'GBP', 'pounds': 'GBP', 'gbp': 'GBP',
        'yen': 'JPY', 'jpy': 'JPY',
        'rupee': 'INR', 'rupees': 'INR', 'inr': 'INR',
        'yuan': 'CNY', 'cny': 'CNY',
        'franc': 'CHF', 'francs': 'CHF', 'chf': 'CHF',
        'won': 'KRW', 'krw': 'KRW',
        'real': 'BRL', 'reals': 'BRL', 'brl': 'BRL'
    };
    
    for (const pattern of patterns) {
        const match = msg.match(pattern);
        if (match) {
            const amount = parseFloat(match[1]);
            const fromCurrencyName = match[2].toLowerCase();
            const toCurrencyName = match[3].toLowerCase();
            
            // Convert currency names to codes
            const fromCurrency = currencyNames[fromCurrencyName] || 
                                Object.keys(CURRENCIES).find(code => code.toLowerCase() === fromCurrencyName);
            const toCurrency = currencyNames[toCurrencyName] || 
                              Object.keys(CURRENCIES).find(code => code.toLowerCase() === toCurrencyName);
            
            if (amount && fromCurrency && toCurrency && CURRENCIES[fromCurrency] && CURRENCIES[toCurrency]) {
                return { amount, fromCurrency, toCurrency };
            }
        }
    }
    
    return null;
}// Theme 
functionality
function initializeTheme() {
    if (isDarkTheme) {
        document.body.classList.add('dark-theme');
        elements.themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    }
}

function toggleTheme() {
    isDarkTheme = !isDarkTheme;
    document.body.classList.toggle('dark-theme');
    elements.themeToggle.innerHTML = isDarkTheme ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
    localStorage.setItem('darkTheme', isDarkTheme);
    showToast(`Switched to ${isDarkTheme ? 'dark' : 'light'} theme`, 'info');
}

// Floating particles
function createFloatingParticles() {
    const container = document.getElementById('particlesContainer');
    const particleCount = 50;
    
    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        
        const size = Math.random() * 4 + 2;
        const left = Math.random() * 100;
        const animationDuration = Math.random() * 10 + 15;
        const delay = Math.random() * 20;
        
        particle.style.cssText = `
            width: ${size}px;
            height: ${size}px;
            left: ${left}%;
            animation-duration: ${animationDuration}s;
            animation-delay: ${delay}s;
        `;
        
        container.appendChild(particle);
    }
}

// Market stats
function updateMarketStats() {
    const now = new Date();
    elements.lastUpdate = document.getElementById('lastUpdate');
    if (elements.lastUpdate) {
        elements.lastUpdate.textContent = now.toLocaleTimeString();
    }
    
    // Update every minute
    setInterval(() => {
        const now = new Date();
        if (elements.lastUpdate) {
            elements.lastUpdate.textContent = now.toLocaleTimeString();
        }
    }, 60000);
}

// Enhanced conversion with history and chart
async function convertCurrency() {
    const amount = parseFloat(elements.amount.value);
    const fromCurrency = elements.fromCurrency.value;
    const toCurrency = elements.toCurrency.value;
    
    // Validation
    if (!validateAmount()) return;
    
    if (!amount || amount <= 0) {
        showToast('Please enter a valid amount', 'error');
        return;
    }
    
    if (!fromCurrency) {
        showToast('Please select a currency to convert from', 'error');
        return;
    }
    
    if (!toCurrency) {
        showToast('Please select a currency to convert to', 'error');
        return;
    }
    
    if (fromCurrency === toCurrency) {
        showToast('Please select different currencies', 'error');
        return;
    }
    
    try {
        showLoading(true);
        elements.resultSection.classList.remove('show');
        
        // Load exchange rates for the base currency
        await loadExchangeRates(fromCurrency);
        
        const rate = exchangeRates[toCurrency];
        
        if (!rate) {
            throw new Error('Exchange rate not available');
        }
        
        const convertedAmount = amount * rate;
        
        // Add to history
        addToHistory(amount, fromCurrency, convertedAmount, toCurrency, rate);
        
        // Display result with chart
        await displayResult(amount, fromCurrency, convertedAmount, toCurrency, rate);
        
        // Update favorite button state
        updateFavoriteButtonState(fromCurrency, toCurrency);
        
        showLoading(false);
        
    } catch (error) {
        console.error('Conversion error:', error);
        showToast('Failed to convert currency. Please try again.', 'error');
        showLoading(false);
    }
}

// Enhanced result display with chart
async function displayResult(originalAmount, fromCurrency, convertedAmount, toCurrency, rate) {
    elements.resultAmount.textContent = `${formatNumber(convertedAmount)} ${toCurrency}`;
    elements.resultDetails.textContent = `${formatNumber(originalAmount)} ${CURRENCIES[fromCurrency]} equals`;
    elements.exchangeRate.textContent = `1 ${fromCurrency} = ${formatNumber(rate)} ${toCurrency}`;
    
    // Show rate change (simulated for demo)
    const change = (Math.random() - 0.5) * 0.1;
    const changePercent = (change * 100).toFixed(2);
    elements.rateChange.textContent = `${change >= 0 ? '+' : ''}${changePercent}% (24h)`;
    elements.rateChange.className = `rate-change ${change >= 0 ? 'positive' : 'negative'}`;
    
    // Create mini chart
    await createConversionChart(fromCurrency, toCurrency);
    
    elements.resultSection.classList.add('show');
}

// Create conversion chart
async function createConversionChart(fromCurrency, toCurrency) {
    const ctx = elements.chartCanvas.getContext('2d');
    
    // Generate sample historical data (in real app, fetch from API)
    const labels = [];
    const data = [];
    const baseRate = exchangeRates[toCurrency];
    
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
        
        // Simulate rate fluctuation
        const fluctuation = (Math.random() - 0.5) * 0.1;
        data.push(baseRate * (1 + fluctuation));
    }
    
    if (chart) {
        chart.destroy();
    }
    
    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: `${fromCurrency} to ${toCurrency}`,
                data: data,
                borderColor: 'rgba(255, 255, 255, 0.8)',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointRadius: 3,
                pointBackgroundColor: 'white'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                x: {
                    display: true,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: 'rgba(255, 255, 255, 0.8)',
                        font: {
                            size: 10
                        }
                    }
                },
                y: {
                    display: true,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: 'rgba(255, 255, 255, 0.8)',
                        font: {
                            size: 10
                        }
                    }
                }
            }
        }
    });
}

// History management
function addToHistory(amount, fromCurrency, convertedAmount, toCurrency, rate) {
    const historyItem = {
        id: Date.now(),
        amount,
        fromCurrency,
        convertedAmount,
        toCurrency,
        rate,
        timestamp: new Date().toISOString()
    };
    
    conversionHistory.unshift(historyItem);
    
    // Keep only last 50 conversions
    if (conversionHistory.length > 50) {
        conversionHistory = conversionHistory.slice(0, 50);
    }
    
    localStorage.setItem('conversionHistory', JSON.stringify(conversionHistory));
    loadHistory();
}

function loadHistory() {
    const content = elements.historyContent;
    
    if (conversionHistory.length === 0) {
        content.innerHTML = `
            <div class="empty-history">
                <i class="fas fa-clock"></i>
                <p>No conversion history yet</p>
                <small>Your recent conversions will appear here</small>
            </div>
        `;
        return;
    }
    
    content.innerHTML = conversionHistory.map(item => `
        <div class="history-item" onclick="useHistoryConversion('${item.fromCurrency}', '${item.toCurrency}', ${item.amount})">
            <div class="history-info">
                <div class="history-pair">${item.amount} ${item.fromCurrency} → ${formatNumber(item.convertedAmount)} ${item.toCurrency}</div>
                <div class="history-rate">Rate: ${formatNumber(item.rate)} • ${new Date(item.timestamp).toLocaleDateString()}</div>
            </div>
            <div class="history-actions">
                <button class="use-conversion" title="Use this conversion">
                    <i class="fas fa-redo"></i>
                </button>
            </div>
        </div>
    `).join('');
}

function useHistoryConversion(fromCurrency, toCurrency, amount) {
    elements.fromCurrency.value = fromCurrency;
    elements.toCurrency.value = toCurrency;
    elements.amount.value = amount;
    updateCurrencyInfo('from', fromCurrency);
    updateCurrencyInfo('to', toCurrency);
    closeHistoryModal();
    convertCurrency();
}

function clearConversionHistory() {
    if (confirm('Are you sure you want to clear all conversion history?')) {
        conversionHistory = [];
        localStorage.removeItem('conversionHistory');
        loadHistory();
        showToast('Conversion history cleared', 'info');
    }
}

// Favorites management
function toggleFavorite() {
    const fromCurrency = elements.fromCurrency.value;
    const toCurrency = elements.toCurrency.value;
    
    if (!fromCurrency || !toCurrency) {
        showToast('Please select currencies first', 'error');
        return;
    }
    
    const favoriteKey = `${fromCurrency}-${toCurrency}`;
    const existingIndex = favoriteConversions.findIndex(fav => fav.key === favoriteKey);
    
    if (existingIndex >= 0) {
        // Remove from favorites
        favoriteConversions.splice(existingIndex, 1);
        elements.saveFavorite.innerHTML = '<i class="far fa-heart"></i>';
        elements.saveFavorite.classList.remove('active');
        showToast('Removed from favorites', 'info');
    } else {
        // Add to favorites
        favoriteConversions.push({
            key: favoriteKey,
            fromCurrency,
            toCurrency,
            fromName: CURRENCIES[fromCurrency],
            toName: CURRENCIES[toCurrency],
            timestamp: new Date().toISOString()
        });
        elements.saveFavorite.innerHTML = '<i class="fas fa-heart"></i>';
        elements.saveFavorite.classList.add('active');
        showToast('Added to favorites', 'success');
    }
    
    localStorage.setItem('favoriteConversions', JSON.stringify(favoriteConversions));
    loadFavorites();
}

function updateFavoriteButtonState(fromCurrency, toCurrency) {
    const favoriteKey = `${fromCurrency}-${toCurrency}`;
    const isFavorite = favoriteConversions.some(fav => fav.key === favoriteKey);
    
    if (isFavorite) {
        elements.saveFavorite.innerHTML = '<i class="fas fa-heart"></i>';
        elements.saveFavorite.classList.add('active');
    } else {
        elements.saveFavorite.innerHTML = '<i class="far fa-heart"></i>';
        elements.saveFavorite.classList.remove('active');
    }
}

function loadFavorites() {
    const content = elements.favoritesContent;
    
    if (favoriteConversions.length === 0) {
        content.innerHTML = `
            <div class="empty-favorites">
                <i class="fas fa-heart"></i>
                <p>No favorite conversions yet</p>
                <small>Save your frequently used conversions for quick access</small>
            </div>
        `;
        return;
    }
    
    content.innerHTML = favoriteConversions.map(fav => `
        <div class="favorite-item" onclick="useFavoriteConversion('${fav.fromCurrency}', '${fav.toCurrency}')">
            <div class="favorite-info">
                <div class="favorite-pair">${fav.fromCurrency} → ${fav.toCurrency}</div>
                <div class="favorite-rate">${fav.fromName} to ${fav.toName}</div>
            </div>
            <div class="favorite-actions">
                <button class="remove-favorite" onclick="event.stopPropagation(); removeFavorite('${fav.key}')" title="Remove from favorites">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

function useFavoriteConversion(fromCurrency, toCurrency) {
    elements.fromCurrency.value = fromCurrency;
    elements.toCurrency.value = toCurrency;
    updateCurrencyInfo('from', fromCurrency);
    updateCurrencyInfo('to', toCurrency);
    closeFavoritesModal();
    if (elements.amount.value) {
        convertCurrency();
    }
}

function removeFavorite(key) {
    favoriteConversions = favoriteConversions.filter(fav => fav.key !== key);
    localStorage.setItem('favoriteConversions', JSON.stringify(favoriteConversions));
    loadFavorites();
    showToast('Removed from favorites', 'info');
}

// Result actions
function copyResult() {
    const resultText = elements.resultAmount.textContent;
    navigator.clipboard.writeText(resultText).then(() => {
        showToast('Result copied to clipboard', 'success');
    }).catch(() => {
        showToast('Failed to copy result', 'error');
    });
}

function shareResult() {
    const amount = elements.amount.value;
    const fromCurrency = elements.fromCurrency.value;
    const toCurrency = elements.toCurrency.value;
    const result = elements.resultAmount.textContent;
    
    const shareText = `${amount} ${fromCurrency} = ${result} - Converted using AI Currency Converter`;
    
    if (navigator.share) {
        navigator.share({
            title: 'Currency Conversion Result',
            text: shareText,
            url: window.location.href
        });
    } else {
        navigator.clipboard.writeText(shareText).then(() => {
            showToast('Conversion result copied for sharing', 'success');
        });
    }
}

// Refresh rates
async function refreshExchangeRates() {
    try {
        elements.refreshRates.style.animation = 'spin 1s linear infinite';
        const baseCurrency = elements.fromCurrency.value || 'USD';
        await loadExchangeRates(baseCurrency);
        await loadPopularConversions();
        showToast('Exchange rates updated', 'success');
    } catch (error) {
        showToast('Failed to refresh rates', 'error');
    } finally {
        elements.refreshRates.style.animation = '';
    }
}

// Modal management
function openFavoritesModal() {
    elements.favoritesModal.classList.add('show');
    elements.overlay.classList.add('show');
}

function closeFavoritesModal() {
    elements.favoritesModal.classList.remove('show');
    elements.overlay.classList.remove('show');
}

function openHistoryModal() {
    elements.historyModal.classList.add('show');
    elements.overlay.classList.add('show');
}

function closeHistoryModal() {
    elements.historyModal.classList.remove('show');
    elements.overlay.classList.remove('show');
}

function closeAllModals() {
    elements.chatModal.classList.remove('show');
    elements.favoritesModal.classList.remove('show');
    elements.historyModal.classList.remove('show');
    elements.overlay.classList.remove('show');
}

// Toast notifications
function showToast(message, type = 'info') {
    const toast = elements.toast;
    const icon = toast.querySelector('.toast-icon');
    const messageEl = toast.querySelector('.toast-message');
    
    // Set icon based on type
    const icons = {
        success: 'fas fa-check-circle',
        error: 'fas fa-exclamation-circle',
        info: 'fas fa-info-circle'
    };
    
    icon.className = `toast-icon ${icons[type]}`;
    messageEl.textContent = message;
    toast.className = `toast ${type} show`;
    
    // Auto hide after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Add CSS animation for refresh button
const style = document.createElement('style');
style.textContent = `
    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }
`;
document.head.appendChild(style);