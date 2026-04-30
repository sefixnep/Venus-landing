export type Lang = 'ru' | 'en';

export const translations = {
  // Settings Screen
  'settings.title': {
    en: 'VENUS LANDING SIMULATOR',
    ru: 'СИМУЛЯТОР ПОСАДКИ НА ВЕНЕРУ',
  },
  'settings.subtitle': {
    en: 'Configure your spacecraft and attempt a safe descent through the dense Venusian atmosphere',
    ru: 'Настройте космический аппарат и совершите безопасный спуск сквозь плотную атмосферу Венеры',
  },
  'settings.panelTitle': {
    en: 'Mission Parameters',
    ru: 'Параметры миссии',
  },
  'settings.mass': { en: 'Spacecraft Mass', ru: 'Масса аппарата' },
  'settings.fuel': { en: 'Fuel', ru: 'Топливо' },
  'settings.entrySpeed': { en: 'Entry Speed', ru: 'Скорость входа' },
  'settings.entryAltitude': { en: 'Entry Altitude', ru: 'Высота входа' },
  'settings.advanced': { en: 'Advanced Settings', ru: 'Расширенные настройки' },
  'settings.heatShieldMass': { en: 'Heat Shield Mass', ru: 'Масса теплозащиты' },
  'settings.crossSection': { en: 'Cross Section', ru: 'Площадь сечения' },
  'settings.engineThrust': { en: 'Engine Thrust', ru: 'Тяга двигателя' },
  'settings.engineIsp': { en: 'Engine Isp', ru: 'Удельный импульс' },
  'settings.launch': { en: 'LAUNCH MISSION', ru: 'НАЧАТЬ МИССИЮ' },
  'settings.venusTitle': { en: 'Venus Quick Facts', ru: 'Факты о Венере' },
  'settings.venusFact1': { en: 'Surface gravity: 8.87 m/s²', ru: 'Гравитация: 8,87 м/с²' },
  'settings.venusFact2': { en: 'Surface pressure: 92 atm', ru: 'Давление у поверхности: 92 атм' },
  'settings.venusFact3': { en: 'Surface temperature: 464 °C', ru: 'Температура у поверхности: 464 °C' },
  'settings.venusFact4': { en: 'Atmosphere: 96.5% CO₂, 3.5% N₂', ru: 'Атмосфера: 96,5% CO₂, 3,5% N₂' },
  'settings.venusFact5': { en: 'Cloud layer: 45-70 km (H₂SO₄)', ru: 'Облачный слой: 45–70 км (H₂SO₄)' },
  'settings.source': { en: 'Source:', ru: 'Источник:' },

  // Telemetry
  'telemetry.title': { en: 'TELEMETRY', ru: 'ТЕЛЕМЕТРИЯ' },
  'telemetry.altitude': { en: 'Altitude', ru: 'Высота' },
  'telemetry.speed': { en: 'Speed', ru: 'Скорость' },
  'telemetry.gforce': { en: 'G-Force', ru: 'Перегрузка' },
  'telemetry.fuel': { en: 'Fuel', ru: 'Топливо' },
  'telemetry.tempOutside': { en: 'Temp Outside', ru: 'Темп. снаружи' },
  'telemetry.tempInside': { en: 'Temp Inside', ru: 'Темп. внутри' },
  'telemetry.pressure': { en: 'Pressure', ru: 'Давление' },
  'telemetry.mach': { en: 'Mach', ru: 'Мах' },
  'telemetry.systems': { en: 'SYSTEMS', ru: 'СИСТЕМЫ' },
  'telemetry.heatShield': { en: 'Heat Shield', ru: 'Теплозащита' },
  'telemetry.drogueChute': { en: 'Drogue Chute', ru: 'Тормозной парашют' },
  'telemetry.mainChute': { en: 'Main Chute', ru: 'Основной парашют' },
  'telemetry.engine': { en: 'Engine', ru: 'Двигатель' },
  'telemetry.active': { en: 'ACTIVE', ru: 'АКТИВНА' },
  'telemetry.jettisoned': { en: 'JETTISONED', ru: 'СБРОШЕНА' },
  'telemetry.deployed': { en: 'DEPLOYED', ru: 'РАСКРЫТ' },
  'telemetry.stowed': { en: 'STOWED', ru: 'УЛОЖЕН' },
  'telemetry.firing': { en: 'FIRING', ru: 'РАБОТАЕТ' },
  'telemetry.off': { en: 'OFF', ru: 'ВЫКЛ' },
  'telemetry.modeNumbers': { en: 'Numbers', ru: 'Числа' },
  'telemetry.modeChart': { en: 'Chart', ru: 'График' },

  // Controls
  'controls.title': { en: 'CONTROLS', ru: 'УПРАВЛЕНИЕ' },
  'controls.jettisonHeatShield': { en: 'Jettison Heat Shield', ru: 'Сбросить теплозащиту' },
  'controls.drogueChute': { en: 'Drogue Chute', ru: 'Тормозной парашют' },
  'controls.mainChute': { en: 'Main Chute', ru: 'Основной парашют' },
  'controls.engineOn': { en: 'Engine ON', ru: 'Двигатель ВКЛ' },
  'controls.engineOff': { en: 'Engine OFF', ru: 'Двигатель ВЫКЛ' },
  'controls.ready': { en: 'READY', ru: 'ГОТОВ' },
  'controls.fuel': { en: 'fuel', ru: 'топл.' },
  'controls.alreadyJettisoned': { en: 'Already jettisoned', ru: 'Уже сброшена' },
  'controls.recommendedBelowMach': { en: 'Recommended below Mach 3', ru: 'Рекомендуется при Мах < 3' },
  'controls.jettisonShield': { en: 'Jettison heat shield', ru: 'Сбросить теплозащиту' },
  'controls.jettisonFirst': { en: 'Jettison heat shield first', ru: 'Сначала сбросьте теплозащиту' },
  'controls.alreadyDeployed': { en: 'Already deployed', ru: 'Уже раскрыт' },
  'controls.speedTooHigh': { en: 'Speed too high', ru: 'Скорость слишком высокая' },
  'controls.deployDrogue': { en: 'Deploy drogue chute', ru: 'Раскрыть тормозной парашют' },
  'controls.deployDrogueFirst': { en: 'Deploy drogue chute first', ru: 'Сначала раскройте тормозной' },
  'controls.deployMainChute': { en: 'Deploy main chute', ru: 'Раскрыть основной парашют' },
  'controls.noFuel': { en: 'No fuel remaining', ru: 'Топливо закончилось' },
  'controls.shutDown': { en: 'Shut down engine', ru: 'Выключить двигатель' },
  'controls.ignite': { en: 'Ignite engine', ru: 'Включить двигатель' },

  // Guide
  'guide.title': { en: 'MISSION GUIDE', ru: 'ПЛАН МИССИИ' },
  'guide.entry.label': { en: 'Atmospheric Entry', ru: 'Вход в атмосферу' },
  'guide.entry.detail': {
    en: 'Heat shield decelerates the craft. No action needed. (100–70 km)',
    ru: 'Теплозащита замедляет аппарат. Действий не требуется. (100–70 км)',
  },
  'guide.jettison.label': { en: 'Jettison Heat Shield', ru: 'Сброс теплозащиты' },
  'guide.jettison.detail': {
    en: 'Jettison when speed < 500 m/s and alt 60–75 km.',
    ru: 'Сбросить при скорости < 500 м/с, высота 60–75 км.',
  },
  'guide.drogue.label': { en: 'Deploy Drogue Chute', ru: 'Тормозной парашют' },
  'guide.drogue.detail': {
    en: 'Deploy when speed 100–300 m/s.',
    ru: 'Раскрыть при скорости 100–300 м/с.',
  },
  'guide.main.label': { en: 'Deploy Main Chute', ru: 'Основной парашют' },
  'guide.main.detail': {
    en: 'Deploy when speed < 100 m/s.',
    ru: 'Раскрыть при скорости < 100 м/с.',
  },
  'guide.engine.label': { en: 'Fire Engine', ru: 'Включить двигатель' },
  'guide.engine.detail': {
    en: 'Use for final braking below 5 km. Target ≤5 m/s at touchdown.',
    ru: 'Финальное торможение ниже 5 км. Цель: ≤5 м/с при касании.',
  },
  'guide.now': { en: 'Now:', ru: 'Сейчас:' },

  // Result Screen
  'result.success': { en: 'MISSION SUCCESS', ru: 'МИССИЯ ВЫПОЛНЕНА' },
  'result.failure': { en: 'MISSION FAILED', ru: 'МИССИЯ ПРОВАЛЕНА' },
  'result.touchdownSpeed': { en: 'Touchdown Speed', ru: 'Скорость касания' },
  'result.duration': { en: 'Duration', ru: 'Длительность' },
  'result.fuelRemaining': { en: 'Fuel Remaining', ru: 'Остаток топлива' },
  'result.events': { en: 'Mission Events', ru: 'События миссии' },
  'result.tryAgain': { en: 'TRY AGAIN', ru: 'ПОПРОБОВАТЬ СНОВА' },

  // Failure reasons (shown in result screen)
  'failure.crash': { en: 'Crash: touchdown at {v} m/s — limit is 5 m/s', ru: 'Крушение: скорость касания {v} м/с — допустимо до 5 м/с' },
  'failure.structural_failure': { en: 'Structural failure: {v}g overload exceeded 15g limit', ru: 'Разрушение конструкции: перегрузка {v}g превысила лимит 15g' },
  'failure.overheat': { en: 'Overheating: heat shield jettisoned too early ({v}°C outside)', ru: 'Перегрев: теплозащита сброшена слишком рано ({v}°C снаружи)' },
  'failure.electronics_failure': { en: 'Electronics failure: internal temperature {v}°C', ru: 'Отказ электроники: температура внутри {v}°C' },
  'failure.drogue_torn': { en: 'Drogue chute torn: deployed at {v} m/s (max 300 m/s)', ru: 'Тормозной парашют разорван: раскрыт при {v} м/с (макс. 300 м/с)' },
  'failure.main_chute_torn': { en: 'Main chute torn: deployed at {v} m/s (max 100 m/s)', ru: 'Основной парашют разорван: раскрыт при {v} м/с (макс. 100 м/с)' },

  // Event detail translations (mission log in result screen)
  'event.heatshield_jettison': { en: 'Heat shield jettisoned', ru: 'Теплозащита сброшена' },
  'event.drogue_deploy': { en: 'Drogue chute deployed', ru: 'Тормозной парашют раскрыт' },
  'event.main_chute_deploy': { en: 'Main chute deployed', ru: 'Основной парашют раскрыт' },
  'event.engine_on': { en: 'Engine ignited', ru: 'Двигатель включён' },
  'event.engine_off': { en: 'Engine shut off', ru: 'Двигатель выключен' },
  'event.engine_off_no_fuel': { en: 'Engine off — no fuel', ru: 'Двигатель выключен — топливо кончилось' },
  'event.landing_success': { en: 'Touchdown at {v} m/s', ru: 'Посадка: {v} м/с' },
  'event.crash': { en: 'Crash at {v} m/s', ru: 'Крушение: {v} м/с' },
  'event.structural_failure': { en: 'Structural failure ({v}g)', ru: 'Разрушение конструкции ({v}g)' },
  'event.overheat': { en: 'Overheating ({v}°C)', ru: 'Перегрев ({v}°C)' },
  'event.electronics_failure': { en: 'Electronics failure ({v}°C)', ru: 'Отказ электроники ({v}°C)' },
  'event.drogue_torn': { en: 'Drogue chute torn at {v} m/s', ru: 'Тормозной парашют разорван при {v} м/с' },
  'event.main_chute_torn': { en: 'Main chute torn at {v} m/s', ru: 'Основной парашют разорван при {v} м/с' },

  // Simulation
  'sim.abort': { en: 'ABORT MISSION', ru: 'ПРЕРВАТЬ МИССИЮ' },

  // Time controls
  'time.speed': { en: 'Speed:', ru: 'Скорость:' },
  'time.auto': { en: 'AUTO', ru: 'АВТО' },

  // Session Metrics
  'metrics.title': { en: 'STATISTICS', ru: 'СТАТИСТИКА' },
  'metrics.attempt': { en: 'Attempt', ru: 'Попытка' },
  'metrics.successRate': { en: 'Success Rate', ru: 'Успешность' },
  'metrics.bestTouchdown': { en: 'Best Landing', ru: 'Лучшая посадка' },
  'metrics.avgTouchdown': { en: 'Avg Speed', ru: 'Средняя скорость' },
  'metrics.touchdownTrend': { en: 'Speed Trend', ru: 'Тренд скорости' },
  'metrics.fuelTrend': { en: 'Fuel Trend', ru: 'Тренд топлива' },
  'metrics.avgFuel': { en: 'Avg Fuel Left', ru: 'Средний остаток' },
  'metrics.streak': { en: 'Streak', ru: 'Серия' },
  'metrics.successes': { en: 'successes', ru: 'успехов' },
  'metrics.failures': { en: 'failures', ru: 'аварий' },
  'metrics.improving': { en: 'IMPROVING', ru: 'УЛУЧШЕНИЕ' },
  'metrics.stable': { en: 'STABLE', ru: 'СТАБИЛЬНО' },
  'metrics.declining': { en: 'DECLINING', ru: 'УХУДШЕНИЕ' },
  'metrics.notEnoughData': {
    en: 'Complete more attempts to see learning curve',
    ru: 'Завершите больше попыток для кривой обучения',
  },
  'metrics.clearStats': { en: 'Clear Statistics', ru: 'Очистить статистику' },

  // Render mode
  'render.title': { en: 'Graphics', ru: 'Графика' },
  'render.cinematic': { en: 'Cinematic 3D', ru: 'Кинематографичное 3D' },
  'render.classic': { en: 'Classic 2D', ru: 'Классическое 2D' },
  'render.toggle3d': { en: '3D', ru: '3D' },
  'render.toggle2d': { en: '2D', ru: '2D' },
} as const;

export type TranslationKey = keyof typeof translations;

export function t(key: TranslationKey, lang: Lang): string {
  const entry = translations[key];
  if (!entry) return key;
  return entry[lang] || entry['en'];
}
