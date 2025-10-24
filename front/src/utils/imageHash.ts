// Утилита для вычисления хеша изображения (совместимая с бэкендом)
export const calculateImageHash = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        resolve(hashHex);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
};

// Альтернативный метод через canvas (для случаев когда crypto.subtle недоступен)
export const calculateImageHashCanvas = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            reject(new Error('Canvas context not available'));
            return;
          }
          
          // Устанавливаем размер для хеширования (маленький для производительности)
          canvas.width = 32;
          canvas.height = 32;
          
          // Рисуем изображение в маленьком размере
          ctx.drawImage(img, 0, 0, 32, 32);
          
          // Получаем данные пикселей
          const imageData = ctx.getImageData(0, 0, 32, 32);
          const data = imageData.data;
          
          // Простое хеширование на основе пикселей
          let hash = '';
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const a = data[i + 3];
            hash += r.toString(16).padStart(2, '0');
            hash += g.toString(16).padStart(2, '0');
            hash += b.toString(16).padStart(2, '0');
            hash += a.toString(16).padStart(2, '0');
          }
          
          // Создаем финальный хеш
          const finalHash = btoa(hash).replace(/[^a-zA-Z0-9]/g, '').substring(0, 32);
          resolve(finalHash);
        };
        
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = e.target?.result as string;
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
};

// Основная функция для получения хеша изображения
export const getImageHash = async (file: File): Promise<string> => {
  try {
    // Пробуем использовать crypto.subtle (более точный)
    if (crypto && crypto.subtle) {
      return await calculateImageHash(file);
    } else {
      // Fallback на canvas метод
      return await calculateImageHashCanvas(file);
    }
  } catch (error) {
    console.warn('Failed to calculate image hash:', error);
    // Если все методы не сработали, используем имя файла и размер как хеш
    return `${file.name}_${file.size}_${file.lastModified}`;
  }
};
