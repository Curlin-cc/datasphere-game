import type { Mission } from '../../missions/types';
import { CHAPTER_0 } from './c00';

/** All playable missions in play order. Add a chapter by importing its file here. */
export const MISSIONS: Mission[] = [...CHAPTER_0];

export const missionById = (id: string) => MISSIONS.find((m) => m.id === id);

export const missionsOfChapter = (chapter: number) => MISSIONS.filter((m) => m.chapter === chapter);
