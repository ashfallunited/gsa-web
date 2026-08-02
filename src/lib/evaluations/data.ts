import type { Firestore } from 'firebase-admin/firestore'
import { serializeFirestoreData } from '@/lib/serialize-firestore'
import type { Coach, EvaluationCategories, EvaluationRole, EvaluationType, PlayerEvaluation, ScheduleBreak, TrainingSchedule } from './types'
import { EVAL_MAX_TOTAL } from './types'
import { isDateInBreaks, weekdaysInRange } from './date-utils'

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

export function parseTrainingSchedule(team: string, data: Record<string, unknown> | undefined): TrainingSchedule {
  if (!data) return { team, trainingWeekdays: [] }
  const serialized = serializeFirestoreData(data)
  const weekdays = Array.isArray(serialized.trainingWeekdays)
    ? (serialized.trainingWeekdays as unknown[]).map(Number).filter((n) => Number.isInteger(n) && n >= 0 && n <= 6)
    : []
  return {
    team,
    trainingWeekdays: weekdays,
    updatedAt: serialized.updatedAt as TrainingSchedule['updatedAt'],
  }
}

export function parseScheduleBreak(id: string, data: Record<string, unknown>): ScheduleBreak {
  const serialized = serializeFirestoreData(data)
  return {
    id,
    team: String(serialized.team ?? ''),
    startDate: String(serialized.startDate ?? ''),
    endDate: String(serialized.endDate ?? ''),
    reason: String(serialized.reason ?? ''),
    createdAt: serialized.createdAt as ScheduleBreak['createdAt'],
    updatedAt: serialized.updatedAt as ScheduleBreak['updatedAt'],
  }
}

/**
 * The team's standard training weekdays within `range`, minus any dates covered by a break.
 * Breaks are fetched with a single equality filter and matched against the range in application
 * code — deliberately avoiding a second Firestore range query on top of `team`, since that
 * combination has already required a manual composite index once in this project.
 */
export async function fetchScheduledDates(db: Firestore, team: string, range: { start: string; end: string }): Promise<string[]> {
  const scheduleDoc = await db.collection('evaluation_schedules').doc(team).get()
  const schedule = parseTrainingSchedule(team, scheduleDoc.exists ? (scheduleDoc.data() as Record<string, unknown>) : undefined)
  if (schedule.trainingWeekdays.length === 0) return []

  const breaksSnap = await db.collection('evaluation_breaks').where('team', '==', team).get()
  const breaks = breaksSnap.docs.map((d) => parseScheduleBreak(d.id, d.data() as Record<string, unknown>))

  return weekdaysInRange(range.start, range.end, schedule.trainingWeekdays).filter((d) => !isDateInBreaks(d, breaks))
}
