import * as xlsx from 'xlsx'
import * as fs from 'fs'
import { Criterion, Course, ContributionLevel, LearningOutcome, readLearningOutcomes } from './bcssheet'
import { escapeCsv } from './sheet'

if (process.argv.length!=3) {
  console.log('Usage: node ... EXCELFILE')
  process.exit(-1)
}
let excelfile = process.argv[2]
console.log(`read ${ excelfile }`)

function unique<T>(values:T[], getKey:(value:T)=>string): T[] {
  let keys:string[] = values.map(getKey)
  let res:any[] = []
  let resKeys:string[] = []
  for (let ix=0; ix<values.length; ix++) {
    if (resKeys.indexOf(keys[ix]) < 0) {
      resKeys.push(keys[ix])
      res.push(values[ix])
    }
  }
  return res
}

function courseLabel(course:Course):string {
  return 'Level '+course.level+' '+course.title
}


function escapeHtml(text:string):string {
  return text.replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
}

try {
  let workbook = xlsx.readFile(excelfile)
  let outcomes = readLearningOutcomes(workbook)
  console.log(`read ${outcomes.length} learning outcomes`) //, outcomes)
  
  let courses = unique<Course>(outcomes.map(outcome => outcome.course), courseLabel).sort((a,b) => courseLabel(a).localeCompare(courseLabel(b)))
  console.log(`found ${courses.length} courses`) //, courses)
  
  let criteria = unique<Criterion>(outcomes.map(outcome => outcome.criterion), (criterion => criterion.criterionCode)).sort((a,b) => a.criterionCode.localeCompare(b.criterionCode))
  console.log(`found ${criteria.length} criteria`) //, criteria)  
  
  var table = 'Criteria mapping table\n'
  for (let course of courses) {
    table += ','+escapeCsv(courseLabel(course))
  }
  table += '\n'
  for (let criterion of criteria) {
     
    table += escapeCsv(criterion.criterionCode+' '+criterion.criterionText)
    for (let course of courses) {
      let outcome = outcomes.find(outcome => courseLabel(outcome.course)==courseLabel(course) && outcome.criterion.criterionCode==criterion.criterionCode)
      table += ','
      if (outcome) {
        switch(outcome.contributionLevel) {
        case ContributionLevel.SOME:
            table += 'x'
            break;
        case ContributionLevel.MAJOR:
            table += 'X!'
            break;
        case ContributionLevel.SOME_TAUGHT:
            table += 't'
            break;
        default:
            table += escapeCsv(`? (${outcome.contributionLevel})`)
        }
        if (outcome.specificText)
          table += '*'
      }
    }
    table += '\n'
  }
  
  let tableoutfile = excelfile.substring(0, excelfile.lastIndexOf('.'))+'-table.csv'
  console.log(`write table to ${tableoutfile}`)
  fs.writeFileSync(tableoutfile, table, {encoding: 'utf8'} )
  
  var html = '<html><head><title>Criteria mappings and comments</title></head><body>'
  html += '<h1>Criteria mappings and comments</h1>\n'
  for (let criterion of criteria) {
     
    html += '<h3>'+escapeHtml(criterion.criterionCode+' '+criterion.criterionText)+'</h3>\n'
    for (let course of courses) {
      let outcome = outcomes.find(outcome => courseLabel(outcome.course)==courseLabel(course) && outcome.criterion.criterionCode==criterion.criterionCode)
      if (outcome) {
        html += '<p>'+escapeHtml(courseLabel(outcome.course))+': '
        switch(outcome.contributionLevel) {
        case ContributionLevel.SOME:
            html += 'some contribution'
            break;
        case ContributionLevel.MAJOR:
            html += '<strong>major</strong> contribution'
            break;
        case ContributionLevel.SOME_TAUGHT:
            html += 'some (taught) contribution'
            break;
        default:
            html += escapeHtml(outcome.contributionLevel)+' (?) contribution'
        }
        if (outcome.specificText)
          html += ' - '+escapeHtml(outcome.specificText)
      }
    }
    html += '</p>\n'
  }
  html += '</html>'
  let htmloutfile = excelfile.substring(0, excelfile.lastIndexOf('.'))+'-comments.html'
  console.log(`write comments to ${htmloutfile}`)
  fs.writeFileSync(htmloutfile, html, {encoding: 'utf8'} )
  
} catch (err) {
  console.log(`Error: ${ err.message }`, err)
}