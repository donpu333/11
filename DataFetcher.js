  class DataFetcher {
    static async loadMoreKlines(symbol, interval, endTime) {
        // Блокируем загрузку для мем-токенов и тестовых символов
        const badSymbols = [
            'BABYDOGE', 'PEPE', 'FLOKI', 'SHIB', 'DOGE',  // мем-токены
            'TEST', 'TST', '1000', '10000', '1000000'      // тестовые и с большими числами
        ];
        
        // Проверяем, есть ли в символе что-то из списка
        for (const pattern of badSymbols) {
            if (symbol.includes(pattern)) {
                console.log('Пропускаем загрузку истории для мем-токена:', symbol);
                return []; // Возвращаем пустой массив, без ошибки
            }
        }
        
        const utcEndTime = endTime - (CONFIG.timezoneOffset * 3600000);
        const url = `https://fapi.binance.com/fapi/v1/klines?symbol=${symbol}&interval=${interval}&limit=1000&endTime=${utcEndTime}`;
        
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // Таймаут 5 секунд
            
            const response = await fetch(url, { signal: controller.signal });
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                if (response.status === 400) {
                    console.warn('Символ не поддерживается для истории:', symbol);
                    return []; // Возвращаем пустой массив, без ошибки
                }
                throw new Error('Ошибка загрузки истории');
            }
            
            const rawData = await response.json();
            
            // Binance иногда возвращает пустой массив
            if (!Array.isArray(rawData) || rawData.length === 0) {
                return [];
            }
            
            return rawData.map(item => ({
                time: Math.floor(item[0] / 1000),  
                open: parseFloat(item[1]),
                high: parseFloat(item[2]),
                low: parseFloat(item[3]),
                close: parseFloat(item[4]),
                volume: parseFloat(item[5])
            }));
            
        } catch (e) {
            if (e.name === 'AbortError') {
                console.log('Таймаут загрузки истории для', symbol);
            } else {
                console.error('Ошибка загрузки истории:', e);
            }
            return []; // Возвращаем пустой массив, без ошибки
        }
    }
}

        function positionsLine(positionMedia, pixelRatio, desiredWidthMedia = 1, widthIsBitmap = false) {
            const scaledPosition = Math.round(pixelRatio * positionMedia);
            const lineBitmapWidth = widthIsBitmap 
                ? desiredWidthMedia 
                : Math.round(desiredWidthMedia * pixelRatio);
            const centreOffset = Math.floor(lineBitmapWidth * 0.5);
            const position = scaledPosition - centreOffset;
            return { position, length: lineBitmapWidth };
        }

        function positionsBox(position1Media, position2Media, pixelRatio) {
            const scaledPosition1 = Math.round(pixelRatio * position1Media);
            const scaledPosition2 = Math.round(pixelRatio * position2Media);
            return {
                position: Math.min(scaledPosition1, scaledPosition2),
                length: Math.abs(scaledPosition2 - scaledPosition1) + 1,
            };
        }
if (typeof window !== 'undefined') {
    window.DataFetcher = DataFetcher;
}