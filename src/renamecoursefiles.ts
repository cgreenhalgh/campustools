// rename course files
import { CourseSummary, CAMPUS_CODE } from './types'
import * as fs from 'fs'
import * as path from 'path'

if (process.argv.length < 4) {
  console.log(`usage: ${process.argv[0]} ${process.argv[1]} OUTDIR COURSESFILE.json ...`)
  process.exit(-1)
}

let outdir = process.argv[2]

interface CourseSummaries {
    [propName: string]:CourseSummary
}
interface IndexEntry {
  title:string,
  level:string,
  courses:CourseSummaries
}
let index:IndexEntry [] = []

// QAA levels for BCS
let LEVEL_NAME = { 'Level 1': 'Level 4', 'Level 2': 'Level 5', 'Level 3': 'Level 6', 'Level 4': 'Level 7', 'Level 5': 'Level 8' }
let CAMPUS_NAME = { 'U': 'UK', 'C': 'China', 'M': 'Malaysia' }

function getCourseFilename(course:CourseSummary) : string {
    return LEVEL_NAME[course.level]+' - '+course.title+' ('+CAMPUS_NAME[course.campus]+') '+course.code+'.html'
}

for (var arg=3; arg<process.argv.length; arg++) {
    let coursesfilename = process.argv[arg]

    console.log(`read courses files ${coursesfilename}`)
    var courses
    try {
      let json = fs.readFileSync(coursesfilename, 'utf-8')
      courses = JSON.parse(json) as CourseSummary[]
    } catch (err) {
      console.log(`error reading courses file ${coursesfilename}: ${err.message}`)
      process.exit(-2)
    }
    console.log(`read ${courses.length} courses`)
    
    let indir = path.dirname(coursesfilename)
    for (let course of courses) {
      let entry:IndexEntry = index.find((i) => i.title == course.title && i.level == course.level)
      if (!entry) {
          entry = { title:course.title, level:course.level, courses:{} }
          index.push(entry)
      }
      entry.courses[course.campus] = course
        
      let coursefile = path.join(indir, course.code+'.html')
      let outfilename = path.join(outdir, getCourseFilename(course))
      console.log(`${coursefile} -> ${outfilename}`)
      try {
        fs.copyFileSync(coursefile, outfilename)
      } catch (err) {
        console.log(`Error copying ${coursefile} -> ${outfilename}: ${err.message}`)
      }
    }
}

let indexfile = path.join(outdir, 'index.html')
let html = '<html><head><title>Index</title></head><body><table><tbody><tr><th>Level</th><th>Title</th>'
for (let campus in CAMPUS_NAME) {
    console.log('campus: '+campus)
    html = html + '<th>'+CAMPUS_NAME[campus]+'</th>'
}
html = html + '</tr>\n'
index.sort((a,b) => (a.level+' - '+a.title).localeCompare(b.level+' - '+b.title))

let level = null
for (let entry of index) {
    if (entry.level != level) {
        html = html+ '<tr><th>'+LEVEL_NAME[entry.level]+'</th></tr>\n'
        level = entry.level
    }
    html = html + '<tr><td>'+LEVEL_NAME[entry.level]+'</td><td>'+entry.title+'</td>'
    for (let campus in CAMPUS_NAME) {
        if (entry.courses[campus]!==undefined) {
            html = html + '<th><a href="'+getCourseFilename(entry.courses[campus])+'">'+entry.courses[campus].code+'</a></th>'
        } else {
            html = html + '<th>-</th>'
        }
    }
    html = html +'</tr>\n'
}
html = html + '</tbody></table></body></html>'

console.log(`write index to ${indexfile}`)
try {
  fs.writeFileSync(indexfile, html, 'utf-8')
} catch (err) {
    console.log(`Error writing indexfile ${indexfile}: ${err.message}`)
}
