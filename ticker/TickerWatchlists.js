class TickerWatchlists {
    constructor(panel) {
        this.panel = panel;
        this.cache = new Map();
        this.watchlists = this.loadWatchlists();
        this.activeId = localStorage.getItem('activeWatchlistId') || 'default';
        
        if (this.watchlists.length === 0) {
            this.watchlists.push({
                id: 'default',
                name: 'Основной',
                symbols: []
            });
            this.saveWatchlists();
        }
        
        // НИЧЕГО НЕ ДЕЛАЕМ ПРИ СОЗДАНИИ – ВСЁ ЧЕРЕЗ initWatchlist()
    }
    
    // ВЫЗЫВАТЬ ЭТОТ МЕТОД ПОСЛЕ ЗАГРУЗКИ ГРАФИКА
    initWatchlist() {
        if (this._initialized) return;
        this._initialized = true;
        this.loadActiveWatchlistOnly();
        this.initUI();
    }
    
    loadWatchlists() {
        const saved = localStorage.getItem('ticker_watchlists');
        return saved ? JSON.parse(saved) : [];
    }
    
    saveWatchlists() {
        localStorage.setItem('ticker_watchlists', JSON.stringify(this.watchlists));
        localStorage.setItem('activeWatchlistId', this.activeId);
    }
    
    getActive() {
        return this.watchlists.find(w => w.id === this.activeId);
    }
    
    loadActiveWatchlistOnly() {
        const active = this.getActive();
        if (!active) return;
        
        console.log(`📋 Загружаем только активный вотчлист: ${active.name} (${active.symbols.length} символов)`);
        
        this.panel.tickers = [];
        this.panel.tickersMap.clear();
        this.panel.filterCache = null;
        this.panel.state.customSymbols = [];
        if (this.panel.tickerElements) this.panel.tickerElements.clear();
        this.panel.displayedTickers = [];
        this.panel.totalItems = 0;
        
        const container = document.getElementById('tickerListContainer');
        if (container) container.innerHTML = '';
        
        for (const key of active.symbols) {
            const [symbol, exchange, marketType] = key.split(':');
            if (symbol && exchange && marketType) {
                const newTicker = { 
                    symbol, 
                    price: 0, 
                    change: 0, 
                    volume: 0, 
                    trades: null, 
                    custom: true, 
                    prevPrice: 0, 
                    exchange, 
                    marketType, 
                    flag: this.panel.state.flags[key] || null 
                };
                this.panel.tickers.push(newTicker);
                this.panel.tickersMap.set(key, newTicker);
                this.panel.state.customSymbols.push(key);
            }
        }
        
        this.panel.saveState();
        this.panel.renderTickerList();
        console.log(`✅ Загружен вотчлист: ${active.name}`);
    }
    
    create(name) {
        const newId = 'wl_' + Date.now();
        this.watchlists.push({
            id: newId,
            name: name,
            symbols: []
        });
        this.saveWatchlists();
        this.switchTo(newId);
        this.renderUI();
        return newId;
    }
    
    async switchTo(id) {
        const watchlist = this.watchlists.find(w => w.id === id);
        if (!watchlist) return;
        
        console.log(`🔄 Переключение на ${watchlist.name} (${watchlist.symbols.length} символов)...`);
        
        this.activeId = id;
        this.saveWatchlists();
        
        if (this.cache.has(id)) {
            const cached = this.cache.get(id);
            this.panel.tickers = cached.tickers.map(t => ({ ...t }));
            this.panel.tickersMap.clear();
            this.panel.tickers.forEach(t => {
                const key = `${t.symbol}:${t.exchange}:${t.marketType}`;
                this.panel.tickersMap.set(key, t);
            });
            this.panel.state.customSymbols = [...cached.customSymbols];
            this.panel.filterCache = null;
            this.panel.saveState();
            this.panel.renderTickerList();
            this.renderUI();
            return;
        }
        
        const symbolsToAdd = watchlist.symbols.map(key => {
            const [symbol, exchange, marketType] = key.split(':');
            return { symbol, exchange, marketType };
        }).filter(item => item.symbol && item.exchange && item.marketType);
        
        this.panel.tickers = [];
        this.panel.tickersMap.clear();
        this.panel.filterCache = null;
        this.panel.state.customSymbols = [];
        this.panel.displayedTickers = [];
        this.panel.totalItems = 0;
        
        const container = document.getElementById('tickerListContainer');
        if (container) container.innerHTML = '';
        
        for (const { symbol, exchange, marketType } of symbolsToAdd) {
            const key = `${symbol}:${exchange}:${marketType}`;
            const newTicker = { 
                symbol, 
                price: 0, 
                change: 0, 
                volume: 0, 
                trades: null, 
                custom: true, 
                prevPrice: 0, 
                exchange, 
                marketType, 
                flag: this.panel.state.flags[key] || null 
            };
            this.panel.tickers.push(newTicker);
            this.panel.tickersMap.set(key, newTicker);
            this.panel.state.customSymbols.push(key);
        }
        
        this.panel.saveState();
        this.panel.renderTickerList();
        
        setTimeout(() => {
            this.cache.set(id, {
                tickers: this.panel.tickers.map(t => ({ ...t })),
                customSymbols: [...this.panel.state.customSymbols]
            });
            console.log(`💾 Вотчлист "${watchlist.name}" сохранен в кэш`);
        }, 500);
        
        if (symbolsToAdd.length > 0 && this.panel.fetchBatchSnapshots) {
            this.panel.fetchBatchSnapshots(symbolsToAdd);
        }
        
        this.renderUI();
        console.log(`✅ Переключено: ${watchlist.name} (${watchlist.symbols.length} символов)`);
    }
    
    addSymbol(symbol, exchange, marketType) {
        const key = `${symbol}:${exchange}:${marketType}`;
        const active = this.getActive();
        if (!active.symbols.includes(key)) {
            active.symbols.push(key);
            this.saveWatchlists();
            if (!this.panel.tickers.some(t => 
                t.symbol === symbol && t.exchange === exchange && t.marketType === marketType
            )) {
                this.panel.addSymbol(symbol, true, exchange, marketType, true, false);
                this.panel.state.customSymbols.push(key);
                this.panel.saveState();
            }
            this.cache.delete(this.activeId);
            this.renderUI();
            console.log(`➕ Добавлен ${symbol} в ${active.name}`);
            return true;
        }
        return false;
    }
    
    removeSymbol(symbol, exchange, marketType) {
        const key = `${symbol}:${exchange}:${marketType}`;
        const active = this.getActive();
        const index = active.symbols.indexOf(key);
        if (index !== -1) {
            active.symbols.splice(index, 1);
            this.saveWatchlists();
            const tickerIndex = this.panel.tickers.findIndex(t => 
                t.symbol === symbol && t.exchange === exchange && t.marketType === marketType
            );
            if (tickerIndex !== -1) {
                this.panel.tickers.splice(tickerIndex, 1);
                this.panel.tickersMap.delete(key);
            }
            const storageIndex = this.panel.state.customSymbols.indexOf(key);
            if (storageIndex !== -1) this.panel.state.customSymbols.splice(storageIndex, 1);
            this.panel.saveState();
            this.panel.renderTickerList();
            this.cache.delete(this.activeId);
            this.renderUI();
            console.log(`➖ Удален ${symbol} из ${active.name}`);
            return true;
        }
        return false;
    }
    
    async addSymbolsBatch(symbolsBatch) {
        const active = this.getActive();
        if (!active) return 0;
        const addedSymbols = [];
        for (const item of symbolsBatch) {
            const { symbol, exchange, marketType } = item;
            if (!symbol) continue;
            const key = `${symbol}:${exchange}:${marketType}`;
            if (!active.symbols.includes(key)) {
                active.symbols.push(key);
                addedSymbols.push({ symbol, exchange, marketType, key });
            }
        }
        if (addedSymbols.length === 0) return 0;
        this.saveWatchlists();
        this.panel.state.customSymbols = [...active.symbols];
        this.panel.saveState();
        for (const { symbol, exchange, marketType, key } of addedSymbols) {
            if (!this.panel.tickersMap.has(key)) {
                const newTicker = { 
                    symbol, price: 0, change: 0, volume: 0, trades: null,
                    custom: true, prevPrice: 0, exchange, marketType,
                    flag: this.panel.state.flags[key] || null 
                };
                this.panel.tickers.push(newTicker);
                this.panel.tickersMap.set(key, newTicker);
            }
        }
        this.panel.saveState();
        this.panel.filterCache = null;
        this.panel.renderTickerList();
        this.cache.delete(this.activeId);
        this.renderUI();
        const notification = document.getElementById('alertNotification');
        if (notification) {
            notification.innerHTML = `
                <div class="alert-title">✅ Добавлено ${addedSymbols.length} символов</div>
                <div class="alert-price">Вотчлист: ${active.name}</div>
                <div class="alert-repeat">Всего: ${active.symbols.length}</div>
            `;
            notification.style.display = 'block';
            notification.style.borderLeftColor = '#4CAF50';
            setTimeout(() => notification.style.display = 'none', 3000);
        }
        console.log(`✅ Добавлено ${addedSymbols.length} символов в вотчлист "${active.name}"`);
        return addedSymbols.length;
    }
    
    delete(id) {
        if (id === 'default') {
            alert('Нельзя удалить основной вотчлист');
            return;
        }
        const index = this.watchlists.findIndex(w => w.id === id);
        if (index !== -1) {
            this.watchlists.splice(index, 1);
            this.cache.delete(id);
            if (this.activeId === id) this.switchTo('default');
            this.saveWatchlists();
            this.renderUI();
            console.log(`🗑 Удален вотчлист ${id}`);
        }
    }
    
    initUI() {
        let container = document.getElementById('watchlistsPanel');
        if (!container) {
            container = document.createElement('div');
            container.id = 'watchlistsPanel';
            container.className = 'watchlists-panel';
            const tickerPanel = document.getElementById('tickerPanel');
            if (tickerPanel) {
                const tabsContainer = tickerPanel.querySelector('.tabs-container');
                if (tabsContainer) tickerPanel.insertBefore(container, tabsContainer);
            }
        }
        this.renderUI();
    }
    
    renderUI() {
        const container = document.getElementById('watchlistsPanel');
        if (!container) return;
        const active = this.getActive();
        container.innerHTML = `
            <div class="watchlists-container">
                <select id="watchlistSelect" class="watchlist-select">
                    ${this.watchlists.map(w => `
                        <option value="${w.id}" ${w.id === this.activeId ? 'selected' : ''}>
                            ${w.name} (${w.symbols.length})
                        </option>
                    `).join('')}
                </select>
                <button id="newWatchlistBtn" class="watchlist-btn" title="Новый вотчлист">+</button>
                <button id="delWatchlistBtn" class="watchlist-btn" title="Удалить вотчлист">🗑</button>
            </div>
        `;
        document.getElementById('watchlistSelect')?.addEventListener('change', (e) => this.switchTo(e.target.value));
        document.getElementById('newWatchlistBtn')?.addEventListener('click', () => {
            const name = prompt('Название вотчлиста:', 'Новый список');
            if (name?.trim()) this.create(name.trim());
        });
        document.getElementById('delWatchlistBtn')?.addEventListener('click', () => {
            if (this.activeId !== 'default') {
                if (confirm('Удалить текущий вотчлист?')) this.delete(this.activeId);
            } else alert('Основной вотчлист нельзя удалить');
        });
    }
}

if (typeof window !== 'undefined') {
    window.TickerWatchlists = TickerWatchlists;
}