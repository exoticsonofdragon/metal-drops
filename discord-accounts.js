/**
 * Discord Accounts System with Google Sheets Integration
 * Fetches account information from Google Sheets in real-time
 */

// Google Sheets CSV URL
const GOOGLE_SHEETS_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTOsVvZ3fuYqzgi_Npx1wDFvoIXGWtJw0UQ4B8sqCBFPKm3a0cMUDFTq-OK2mOPy25wTcrYqbOOHu3K/pub?output=csv';

// Cache for sheet data
let sheetsDataCache = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch and parse CSV data from Google Sheets
 */
async function fetchSheetsData() {
    // Check cache first
    const now = Date.now();
    if (sheetsDataCache && (now - cacheTimestamp) < CACHE_DURATION) {
        return sheetsDataCache;
    }

    try {
        const response = await fetch(GOOGLE_SHEETS_URL);
        if (!response.ok) throw new Error('Failed to fetch Google Sheets data');
        
        const csvText = await response.text();
        const data = parseCSV(csvText);
        
        // Cache the data
        sheetsDataCache = data;
        cacheTimestamp = now;
        
        return data;
    } catch (error) {
        console.error('Error fetching Google Sheets:', error);
        return null;
    }
}

/**
 * Parse CSV text into structured data
 */
function parseCSV(csvText) {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) return null;
    
    const headers = parseCSVLine(lines[0]);
    const data = {};
    
    for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        if (values.length === 0) continue;
        
        const gameName = values[0];
        if (!gameName) continue;
        
        // Get all accounts for this game (skip first column which is game name)
        const accounts = values.slice(1).filter(acc => acc && acc.trim());
        
        if (accounts.length > 0) {
            data[gameName] = accounts;
        }
    }
    
    return data;
}

/**
 * Parse a single CSV line (handles quoted values with commas)
 */
function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    
    result.push(current.trim());
    return result;
}

/**
 * Convert escaped newlines in CSV to actual newlines
 */
function formatAccountText(text) {
    return text.replace(/\\n/g, '\n');
}

// Initialize modal system
function initAccountModal() {
    const modal = document.getElementById('accountModal');
    const closeBtn = document.querySelector('.account-modal-close');
    
    // Close modal when clicking outside
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeAccountModal();
            }
        });
    }
    
    // Close with Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal && modal.classList.contains('active')) {
            closeAccountModal();
        }
    });
    
    // Attach click handlers to all "Get Account" buttons
    attachGetAccountListeners();
}

function attachGetAccountListeners() {
    const getAccountBtns = document.querySelectorAll('.get-btn');
    
    getAccountBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Only handle if on dashboard (not redirect links)
            const cardTitle = btn.closest('.card')?.querySelector('.card-title');
            if (cardTitle && window.location.pathname.includes('dashboard')) {
                e.preventDefault();
                const gameName = cardTitle.textContent.trim();
                showAccountModal(gameName);
            }
        });
    });
}

function showAccountModal(gameName) {
    const modal = document.getElementById('accountModal');
    const titleEl = document.getElementById('accountGameName');
    const containerEl = document.getElementById('accountMessageContainer');
    
    if (!modal) return;
    
    titleEl.textContent = gameName;
    containerEl.innerHTML = '<div class="account-message loading">Loading account information...</div>';
    
    // Show modal
    modal.classList.add('active');
    
    // Fetch account data
    setTimeout(() => {
        fetchAccountData(gameName, containerEl);
    }, 500);
}

async function fetchAccountData(gameName, containerEl) {
    try {
        // Fetch data from Google Sheets
        const sheetsData = await fetchSheetsData();
        
        if (!sheetsData) {
            containerEl.innerHTML = '<div class="account-message error">Error loading data from Google Sheets</div>';
            return;
        }
        
        // Find accounts for this game
        const accounts = sheetsData[gameName];
        
        if (!accounts || accounts.length === 0) {
            containerEl.innerHTML = `<div class="account-message error">No available accounts for ${gameName}</div>`;
            return;
        }
        
        // Display available accounts
        let html = '';
        accounts.forEach((account, index) => {
            const formattedAccount = formatAccountText(account);
            html += `<div class="account-message success"><strong>Available Account ${index + 1}:</strong>\n${formattedAccount}</div>`;
        });
        
        html += `<div class="account-message" style="border-left-color: #1b6fff; margin-top: 20px;">
            <strong>To claim an account:</strong>\n
            1. Visit the Discord server: https://discord.gg/4RgAwBa7gA\n
            2. React or comment on the account post\n
            3. Admin will send you the credentials\n\n
            <strong>Account will be yours immediately!</strong>
        </div>`;
        
        containerEl.innerHTML = html;
    } catch (error) {
        console.error('Error fetching account data:', error);
        containerEl.innerHTML = '<div class="account-message error">Error loading accounts. Please try again.</div>';
    }
}

function closeAccountModal() {
    const modal = document.getElementById('accountModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAccountModal);
} else {
    initAccountModal();
}
