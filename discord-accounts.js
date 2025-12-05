/**
 * Discord Accounts System with Google Sheets Integration
 * Fetches account information from Google Sheets in real-time
 * Added: Limit of 1 game per day per user (localStorage)
 * Added: Extra accounts via redeem code
 */

// Google Sheets CSV URL
const GOOGLE_SHEETS_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTOsVvZ3fuYqzgi_Npx1wDFvoIXGWtJw0UQ4B8sqCBFPKm3a0cMUDFTq-OK2mOPy25wTcrYqbOOHu3K/pub?output=csv';

// Cache for sheet data
let sheetsDataCache = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// ============ DAILY GAME LIMIT ============

// Restituisce la data di oggi in formato YYYY-MM-DD
function getToday() {
    const now = new Date();
    return now.getFullYear() + "-" + (now.getMonth()+1).toString().padStart(2,'0') + "-" + now.getDate().toString().padStart(2,'0');
}

// Controlla se l'utente ha già preso un gioco oggi
function hasTakenGameToday() {
    const today = getToday();
    const takenGames = JSON.parse(localStorage.getItem('takenGames') || '{}');
    return takenGames.date === today;
}

// Restituisce il gioco preso oggi
function getTakenGame() {
    const takenGames = JSON.parse(localStorage.getItem('takenGames') || '{}');
    return takenGames.game || null;
}

// Salva il gioco preso oggi
function saveGameToday(gameName) {
    const today = getToday();
    const takenGames = JSON.parse(localStorage.getItem('takenGames') || '{}');

    localStorage.setItem('takenGames', JSON.stringify({ date: today, game: gameName }));
}

// Controlla se l'utente può prendere un account oggi
function canTakeGame() {
    const today = getToday();
    const takenGames = JSON.parse(localStorage.getItem('takenGames') || '{}');
    const extraAccounts = parseInt(localStorage.getItem('extraAccounts') || '0', 10);
    return takenGames.date !== today || extraAccounts > 0;
}

// Usa un account extra
function useExtraAccount() {
    const extraAccounts = parseInt(localStorage.getItem('extraAccounts') || '0', 10);
    if(extraAccounts > 0) {
        localStorage.setItem('extraAccounts', extraAccounts - 1);
        return true;
    }
    return false;
}

// Calcola tempo mancante per il prossimo account
function getNextAccountTime() {
    const now = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0,0,0,0);
    const diff = tomorrow - now;
    const hours = Math.floor(diff / (1000*60*60));
    const minutes = Math.floor((diff % (1000*60*60)) / (1000*60));
    const seconds = Math.floor((diff % (1000*60)) / 1000);
    return `${hours}h ${minutes}m ${seconds}s`;
}

// Timer display
function initTimer() {
    const timerEl = document.createElement('div');
    timerEl.id = 'nextAccountTimer';
    timerEl.style.position = 'fixed';
    timerEl.style.bottom = '20px';
    timerEl.style.left = '20px';
    timerEl.style.background = 'rgba(27,111,255,0.2)';
    timerEl.style.color = '#00eaff';
    timerEl.style.padding = '10px 15px';
    timerEl.style.borderRadius = '10px';
    timerEl.style.fontFamily = 'Arial';
    timerEl.style.fontWeight = 'bold';
    timerEl.style.zIndex = '500';
    document.body.appendChild(timerEl);

    setInterval(() => {
        if(hasTakenGameToday() && parseInt(localStorage.getItem('extraAccounts')||'0',10)===0) {
            timerEl.textContent = `Next account in: ${getNextAccountTime()}`;
        } else {
            timerEl.textContent = 'You can claim an account now!';
        }
    }, 1000);
}

/**
 * Fetch and parse CSV data from Google Sheets
 */
async function fetchSheetsData() {
    const now = Date.now();
    if (sheetsDataCache && (now - cacheTimestamp) < CACHE_DURATION) {
        return sheetsDataCache;
    }

    try {
        const response = await fetch(GOOGLE_SHEETS_URL);
        if (!response.ok) throw new Error('Failed to fetch Google Sheets data');

        const csvText = await response.text();
        const data = parseCSV(csvText);

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

        const accounts = values.slice(1).filter(acc => acc && acc.trim());
        if (accounts.length > 0) data[gameName] = accounts;
    }

    return data;
}

function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') inQuotes = !inQuotes;
        else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else current += char;
    }
    result.push(current.trim());
    return result;
}

function formatAccountText(text) {
    return text.replace(/\\n/g, '\n');
}

// Modal system
function initAccountModal() {
    const modal = document.getElementById('accountModal');
    const closeBtn = document.querySelector('.account-modal-close');

    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeAccountModal();
        });
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal && modal.classList.contains('active')) {
            closeAccountModal();
        }
    });

    attachGetAccountListeners();
    initTimer();
}

function attachGetAccountListeners() {
    const getAccountBtns = document.querySelectorAll('.get-btn');

    getAccountBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const cardTitle = btn.closest('.card')?.querySelector('.card-title');
            if (cardTitle && window.location.pathname.includes('dashboard')) {
                e.preventDefault();
                const gameName = cardTitle.textContent.trim();
                showAccountModal(gameName);
            }
        });
    });

    // Disable buttons if no accounts available
    getAccountBtns.forEach(btn => {
        const textEl = btn.querySelector('.btn-text');
        if(!canTakeGame()) {
            btn.style.pointerEvents = 'none';
            btn.style.opacity = '0.5';
            if(textEl) textEl.textContent = 'Taken Today';
        } else if(textEl) {
            textEl.textContent = 'Get Account';
            btn.style.pointerEvents = 'auto';
            btn.style.opacity = '1';
        }
    });
}

function showAccountModal(gameName) {
    const modal = document.getElementById('accountModal');
    const titleEl = document.getElementById('accountGameName');
    const containerEl = document.getElementById('accountMessageContainer');

    if (!modal) return;

    if(!canTakeGame()) {
        containerEl.innerHTML = `<div class="account-message error">
            You already claimed a game today: "${getTakenGame()}".<br>
            Come back tomorrow for a new game.
        </div>`;
        titleEl.textContent = "Limit reached!";
        modal.classList.add('active');
        return;
    }

    if(hasTakenGameToday()) useExtraAccount();
    saveGameToday(gameName);

    titleEl.textContent = gameName;
    containerEl.innerHTML = '<div class="account-message loading">Loading account information...</div>';

    modal.classList.add('active');

    setTimeout(() => {
        fetchAccountData(gameName, containerEl);
    }, 500);
}

async function fetchAccountData(gameName, containerEl) {
    try {
        const sheetsData = await fetchSheetsData();

        if (!sheetsData) {
            containerEl.innerHTML = '<div class="account-message error">Error loading data from Google Sheets</div>';
            return;
        }

        const accounts = sheetsData[gameName];

        if (!accounts || accounts.length === 0) {
            containerEl.innerHTML = `<div class="account-message error">No available accounts for ${gameName}</div>`;
            return;
        }

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
    if (modal) modal.classList.remove('active');
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAccountModal);
} else {
    initAccountModal();
}
