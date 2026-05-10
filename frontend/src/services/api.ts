const API_BASE_URL = 'http://localhost:8000/api';

export const api = {
  // === Компании ===
  async getCompanies() {
    const res = await fetch(`${API_BASE_URL}/companies/`);
    return res.json();
  },

  // === Подрядчики ===
  async getContractors() {
    const res = await fetch(`${API_BASE_URL}/contractors/`);
    if (res.status === 404) return [];
    return res.json();
  },

  // === Кусты ===
  async getPads() {
    const res = await fetch(`${API_BASE_URL}/pads/`);
    return res.json();
  },

  // === Скважины ===
  async getWells() {
    const res = await fetch(`${API_BASE_URL}/wells/`);
    return res.json();
  },

  async getWell(id: number) {
    const res = await fetch(`${API_BASE_URL}/wells/${id}`);
    return res.json();
  },

  // === ГТИ загрузка ===
  async uploadGTI(wellId: number, file: File) {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE_URL}/gti/upload/${wellId}`, {
      method: 'POST',
      body: formData,
    });
    return res.json();
  },

  // === Анализ циркуляции ===
  async runCirculationAnalysis(wellId: number) {
    const res = await fetch(`${API_BASE_URL}/circulation/analyze/${wellId}`, {
      method: 'POST',
    });
    return res.json();
  },

  async getCirculationAnalysis(wellId: number) {
    const res = await fetch(`${API_BASE_URL}/circulation/analyze/${wellId}`);
    return res.json();
  },

  // === Детальные данные для графика ===
  async getStartupChart(wellId: number, startupNumber: number) {
    const res = await fetch(`${API_BASE_URL}/visualization/chart/${wellId}/${startupNumber}`);
    return res.json();
  },

  // === Просмотр ГТИ данных с пагинацией ===
  async getGtiDataPaginated(wellId: number, skip: number = 0, limit: number = 50) {
    const res = await fetch(`${API_BASE_URL}/gti/data/${wellId}?skip=${skip}&limit=${limit}`);
    return res.json();
  },

  // === Обработка всех модулей ===
  async processAllModules(wellId: number) {
    const res = await fetch(`${API_BASE_URL}/process-all/${wellId}`, {
      method: 'POST',
    });
    return res.json();
  },

  // === Прогресс бурения ===
  async getWellProgress(wellId: number) {
    const res = await fetch(`${API_BASE_URL}/circulation/progress/${wellId}`);
    return res.json();
  },

  // === Целевой расход по интервалам глубины ===
  async getTargetFlowByDepth(wellId: number, depthInterval: number = 50, outlierMultiplier: number = 1.5) {
    const res = await fetch(`${API_BASE_URL}/circulation/target-flow/${wellId}?depth_interval=${depthInterval}&outlier_multiplier=${outlierMultiplier}`);
    return res.json();
  },

  // === Модуль 2: Наращивание ===
async runTrippingAnalysis(wellId: number) {
  const res = await fetch(`${API_BASE_URL}/tripping/analyze/${wellId}`, {
    method: 'POST',
  });
  return res.json();
},

async getTrippingAnalysis(wellId: number, skip: number = 0, limit: number = 50) {
  const res = await fetch(`${API_BASE_URL}/tripping/analyze/${wellId}?skip=${skip}&limit=${limit}`);
  return res.json();
},

async getTrippingMedian(wellId: number, depthInterval: number = 50, outlierMultiplier: number = 1.5) {
  const res = await fetch(`${API_BASE_URL}/tripping/median/${wellId}?depth_interval=${depthInterval}&outlier_multiplier=${outlierMultiplier}`);
  return res.json();
},

// === Модуль 2: Наращивание — детальный график ===
async getTrippingChart(wellId: number, trippingNumber: number) {
  const res = await fetch(`${API_BASE_URL}/tripping/chart/${wellId}/${trippingNumber}`);
  return res.json();
},

// === Модуль 2: Наращивание — распределение по глубине ===
async getTrippingDistribution(wellId: number, depthInterval: number = 50) {
  const res = await fetch(`${API_BASE_URL}/tripping/distribution/${wellId}?depth_interval=${depthInterval}`);
  return res.json();
},
// === ГТИ данные для графиков (чарты) ===
async getGtiChartData(wellId: number, startSeconds: number = 0, durationSeconds: number = 3600) {
  const res = await fetch(`${API_BASE_URL}/gti/chart-data/${wellId}?start_seconds=${startSeconds}&duration_seconds=${durationSeconds}`);
  return res.json();
},
};