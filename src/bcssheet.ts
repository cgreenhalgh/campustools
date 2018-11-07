// reading utilities and types for BCS criteria spreadsheet
import { Sheet, Row, readSheet } from './sheet'

export interface Course {
  ukNewCode:string
  chinaNewCode:string
  malaysiaNewCode:string
  ukOldCode:string
  chinaOldCode:string
  malaysiaOldCode:string
  title:string
  credits:number
  level:number
}

export interface Criterion {
  criterionCode:string
  criterionText:string
  outcomeType:string
}

export enum ContributionLevel {
  SOME = "some",
  MAJOR = "major",
  SOME_TAUGHT = "some (taught)"
}

export interface LearningOutcome {
  course:Course
  criterion:Criterion
  contributionLevel:ContributionLevel
  specificText:string
}

export function readLearningOutcomes(workbook:any) : LearningOutcome[] {
  let s = workbook.Sheets['mapping and outcomes']
  if ( !s) 
    throw new Error(`no "mapping and outcomes" sheet in workbook`)
  let sheet = readSheet(s)
  let outcomes: LearningOutcome[] = []
  for (let row of sheet.rows) {
    let course:Course = {
      ukOldCode: row['UK Old code'],
      chinaOldCode: row['China Old code'],
      malaysiaOldCode: row['Malaysia Old code'],
      ukNewCode: row['UK New code'],
      chinaNewCode: row['China New code'],
      malaysiaNewCode: row['Malaysia New code'],
      title: row['Module Name'],
      credits: Number(row['Credits']),
      level: Number(row['Level']),
    }
    let criterion:Criterion = {
      criterionCode:row['Criterion code'],
      criterionText:row['Criterion text'],
      outcomeType:row['Outcome type'],
    }
    let outcome:LearningOutcome = {
      course:course,
      criterion:criterion,
      contributionLevel: row['Contribution level'] as ContributionLevel,
      specificText: row['Specific text'],
    }
    outcomes.push(outcome)
  }
  return outcomes
}
