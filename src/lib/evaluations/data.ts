import { serializeFirestoreData } from '@/lib/serialize-firestore'
import type { Coach, EvaluationCategories, EvaluationRole, EvaluationType, PlayerEvaluation } from './types'
import { EVAL_MAX_TOTAL } from './types'

export function parseCoach(id: string, data: Record<string, unknown>): Coach {
  const serialized = serializeFirestoreData(data)
  return {
    id,
    name: String(serialized.name ?? ''),
    active: serialized.active !== false,
    createdAt: serialized.createdAt as Coach['createdAt'],
    updatedAt: serialized.updatedAt as Coach['updatedAt'],
  }
}

export function parseEvaluation(id: string, data: Record<string, unknown>): PlayerEvaluation {
  const serialized = serializeFirestoreData(data)
  const role = (serialized.role === 'goalkeeper' ? 'goalkeeper' : 'outfield') as EvaluationRole
  return {
    id,
    playerId: String(serialized.playerId ?? ''),
    coachId: String(serialized.coachId ?? ''),
    team: String(serialized.team ?? ''),
    role,
    type: (serialized.type === 'match' ? 'match' : 'training') as EvaluationType,
    date: String(serialized.date ?? ''),
    season: String(serialized.season ?? ''),
    categories: (serialized.categories ?? {}) as EvaluationCategories,
    total: Number(serialized.total ?? 0),
    maxTotal: Number(serialized.maxTotal ?? EVAL_MAX_TOTAL[role]),
    comment: String(serialized.comment ?? ''),
    enteredBy: String(serialized.enteredBy ?? ''),
    createdAt: serialized.createdAt as PlayerEvaluation['createdAt'],
    updatedAt: serialized.updatedAt as PlayerEvaluation['updatedAt'],
  }
}
