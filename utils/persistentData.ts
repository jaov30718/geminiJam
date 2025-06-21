
import { PermanentUpgradesState, PermanentUpgradeType, AudioSettings } from '../types';

const TOTAL_POINTS_KEY = 'pixelSurvivor_totalPoints';
const PERMANENT_UPGRADES_KEY = 'pixelSurvivor_permanentUpgrades';
const AUDIO_SETTINGS_KEY = 'pixelSurvivor_audioSettings';

export const getInitialPermanentUpgrades = (): PermanentUpgradesState => {
  return {
    [PermanentUpgradeType.Vitality]: 0,
    [PermanentUpgradeType.Damage]: 0,
    [PermanentUpgradeType.CritChance]: 0,
    [PermanentUpgradeType.MoveSpeed]: 0,
    [PermanentUpgradeType.AttackSpeed]: 0,
    [PermanentUpgradeType.Luck]: 0,
  };
};

// --- Total Points ---
export const loadTotalPoints = (): number => {
  try {
    const pointsStr = localStorage.getItem(TOTAL_POINTS_KEY);
    return pointsStr ? parseInt(pointsStr, 10) : 0;
  } catch (error) {
    console.error("Error loading total points from localStorage:", error);
    return 0;
  }
};

export const saveTotalPoints = (points: number): void => {
  try {
    localStorage.setItem(TOTAL_POINTS_KEY, points.toString());
  } catch (error) {
    console.error("Error saving total points to localStorage:", error);
  }
};

// --- Permanent Upgrades ---
export const loadPermanentUpgrades = (): PermanentUpgradesState => {
  try {
    const upgradesStr = localStorage.getItem(PERMANENT_UPGRADES_KEY);
    if (upgradesStr) {
      const loadedUpgrades = JSON.parse(upgradesStr) as Partial<PermanentUpgradesState>;
      return { ...getInitialPermanentUpgrades(), ...loadedUpgrades };
    }
    return getInitialPermanentUpgrades();
  } catch (error) {
    console.error("Error loading permanent upgrades from localStorage:", error);
    return getInitialPermanentUpgrades();
  }
};

export const savePermanentUpgrades = (upgrades: PermanentUpgradesState): void => {
  try {
    localStorage.setItem(PERMANENT_UPGRADES_KEY, JSON.stringify(upgrades));
  } catch (error) {
    console.error("Error saving permanent upgrades to localStorage:", error);
  }
};

// --- Audio Settings ---
export const getInitialAudioSettings = (): AudioSettings => {
  return {
    masterVolume: 0.7,
    musicVolume: 0.5,
    sfxVolume: 0.8,
    muted: false,
  };
};

export const loadAudioSettings = (): AudioSettings => {
  try {
    const settingsStr = localStorage.getItem(AUDIO_SETTINGS_KEY);
    if (settingsStr) {
      const loadedSettings = JSON.parse(settingsStr) as Partial<AudioSettings>;
      // Ensure all keys from getInitialAudioSettings are present
      return { ...getInitialAudioSettings(), ...loadedSettings };
    }
    return getInitialAudioSettings();
  } catch (error) {
    console.error("Error loading audio settings from localStorage:", error);
    return getInitialAudioSettings();
  }
};

export const saveAudioSettings = (settings: AudioSettings): void => {
  try {
    localStorage.setItem(AUDIO_SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error("Error saving audio settings to localStorage:", error);
  }
};
