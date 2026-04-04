class IndexedDBStorage {
    constructor(dbName, version = 2) {
        this.dbName = dbName;
        this.version = version;
        this.db = null;
        this.initPromise = null;
        console.log('📦 IndexedDBStorage constructor', dbName, version);
    }

    async init() {
        if (this.db) return this.db;
        
        if (this.initPromise) return this.initPromise;
        
        this.initPromise = new Promise((resolve, reject) => {
            console.log('📦 opening database...');
            const request = indexedDB.open(this.dbName, this.version);

            request.onerror = (event) => {
                console.error('📦 Database error:', event.target.error);
                reject(event.target.error);
            };
            
            request.onsuccess = (event) => {
                console.log('📦 Database opened successfully');
                this.db = event.target.result;
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                console.log('📦 Database upgrade needed');
                const db = event.target.result;
                
                if (!db.objectStoreNames.contains('symbolCaches')) {
                    console.log('📦 Creating symbolCaches store');
                    const symbolStore = db.createObjectStore('symbolCaches', { keyPath: 'exchange' });
                    symbolStore.createIndex('timestamp', 'timestamp');
                }
                
                if (!db.objectStoreNames.contains('drawings')) {
                    console.log('📦 Creating drawings store');
                    const drawingsStore = db.createObjectStore('drawings', { keyPath: 'id' });
                    drawingsStore.createIndex('type', 'type');
                    drawingsStore.createIndex('timestamp', 'timestamp');
                }
                
                if (!db.objectStoreNames.contains('candles')) {
                    console.log('📦 Creating candles store');
                    const candlesStore = db.createObjectStore('candles', { keyPath: 'key' });
                    candlesStore.createIndex('symbol', 'symbol');
                    candlesStore.createIndex('interval', 'interval');
                    candlesStore.createIndex('exchange', 'exchange');
                    candlesStore.createIndex('marketType', 'marketType');
                    candlesStore.createIndex('lastUpdate', 'lastUpdate');
                }
                
                if (!db.objectStoreNames.contains('settings')) {
                    console.log('📦 Creating settings store');
                    db.createObjectStore('settings', { keyPath: 'key' });
                }
            };
        });
        
        return this.initPromise;
    }
async delete(storeName, key) {
    await this.init();
    return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.delete(key);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}
    async put(storeName, data) {
        await this.init();
        
        // Проверяем существование хранилища
        if (!this.db.objectStoreNames.contains(storeName)) {
            throw new Error(`Store ${storeName} not found`);
        }
        
        return new Promise((resolve, reject) => {
            try {
                const transaction = this.db.transaction([storeName], 'readwrite');
                const store = transaction.objectStore(storeName);
                const request = store.put(data);

                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            } catch (error) {
                console.error(`📦 Error in put (${storeName}):`, error);
                reject(error);
            }
        });
    }

    async get(storeName, key) {
        await this.init();
        
        if (!this.db.objectStoreNames.contains(storeName)) {
            throw new Error(`Store ${storeName} not found`);
        }
        
        return new Promise((resolve, reject) => {
            try {
                const transaction = this.db.transaction([storeName], 'readonly');
                const store = transaction.objectStore(storeName);
                const request = store.get(key);

                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            } catch (error) {
                console.error(`📦 Error in get (${storeName}):`, error);
                reject(error);
            }
        });
    }

    async getAll(storeName) {
        await this.init();
        
        if (!this.db.objectStoreNames.contains(storeName)) {
            throw new Error(`Store ${storeName} not found`);
        }
        
        return new Promise((resolve, reject) => {
            try {
                const transaction = this.db.transaction([storeName], 'readonly');
                const store = transaction.objectStore(storeName);
                const request = store.getAll();

                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            } catch (error) {
                console.error(`📦 Error in getAll (${storeName}):`, error);
                reject(error);
            }
        });
    }

    async getByIndex(storeName, indexName, value) {
        await this.init();
        
        if (!this.db.objectStoreNames.contains(storeName)) {
            throw new Error(`Store ${storeName} not found`);
        }
        
        return new Promise((resolve, reject) => {
            try {
                const transaction = this.db.transaction([storeName], 'readonly');
                const store = transaction.objectStore(storeName);
                
                if (!store.indexNames.contains(indexName)) {
                    console.warn(`📦 Index ${indexName} not found in ${storeName}`);
                    resolve([]);
                    return;
                }
                
                const index = store.index(indexName);
                const request = index.getAll(value);

                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            } catch (error) {
                console.error(`📦 Error in getByIndex (${storeName}):`, error);
                reject(error);
            }
        });
    }
}


window.db = new IndexedDBStorage('TradingViewPro', 2);
window.dbReady = false; // 👈 Флаг готовности

// Инициализация с проверкой
window.db.init().then(() => {
    window.dbReady = true;
    console.log('✅ IndexedDB ready to use');
}).catch(err => {
    window.dbReady = false;
    console.error('❌ IndexedDB init failed:', err);
    // Создаем запасной вариант
    window.db = {
        get: () => Promise.resolve(null),
        put: () => Promise.resolve(),
        delete: () => Promise.resolve(),
        getAll: () => Promise.resolve([])
    };
    window.dbReady = true; // Пусть думает, что готов (заглушка)
});
if (typeof window !== 'undefined') {
    window.IndexedDBStorage = IndexedDBStorage;
}