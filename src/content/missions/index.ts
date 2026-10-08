import type { Mission } from '../../missions/types';
import { CHAPTER_0 } from './c00';
import { CHAPTER_1 } from './c01';

/** All playable missions in play order. Add a chapter by importing its file here. */
export const MISSIONS: Mission[] = [...CHAPTER_0, ...CHAPTER_1];

export const missionById = (id: string) => MISSIONS.find((m) => m.id === id);

export const missionsOfChapter = (chapter: number) => MISSIONS.filter((m) => m.chapter === chapter);
