//import * as request from 'request'
import * as reqp from 'request-promise-native'
import * as jsdom from 'jsdom'
import NODE_TYPE from 'jsdom'
const { JSDOM } = jsdom
import * as xml2js from 'xml2js'
import * as fs from 'fs'
import { JobQueue } from './jobqueue'
import { CourseSummary, CAMPUS_CODE, YEAR_CODE, OU_CODE } from './types'

console.log('getcourses...')

enum NODE_TYPE {
  ELEMENT_NODE = 1,
  TEXT_NODE = 3,
}

// establish cookies with portal
const PORTAL_URL = 'http://modulecatalogue.nottingham.ac.uk/Nottingham/'
const CATALOGUE_URL = 'https://campus.nottingham.ac.uk/psc/csprd/EMPLOYEE/HRMS/c/UN_PROG_AND_MOD_EXTRACT.UN_PAM_CRSE_EXTRCT.GBL'
const BASE_URL = 'https://nottingham.ac.uk'
const HEADERS = { 'User-Agent': 'campustools', 'Accept': '*/*' }
const COOKIE_BASE_URL = 'https://campus.nottingham.ac.uk/'
//const USER_AGENT = ''

let COURSE_FORM_FIELDS = {
  ICAJAX: '1',
  ptus_defaultlocalnode: 'CSPRD',
  ptus_dbname: 'CSPRD',
  ptus_portal: 'EMPLOYEE',
  ptus_node: 'HRMS',
  ptus_workcenterid: '',
  ptus_componenturl: 'https://campus.nottingham.ac.uk/psp/csprd/EMPLOYEE/HRMS/c/UN_PROG_AND_MOD_EXTRACT.UN_PAM_CRSE_EXTRCT.GBL',
}

let jar = reqp.jar()
let hiddenFields = {}

let campus:CAMPUS_CODE = CAMPUS_CODE.UK
let year:YEAR_CODE = YEAR_CODE.YEAR_2018
let ou:OU_CODE = OU_CODE.CS_UK
let courses:CourseSummary[] = []

console.log(`usage: ${process.argv[0]} ${process.argv[1]} CAMPUS YEAR [cookies CSPRD-PORTAL-PSJSESSIONID ... PS_TOKEN]`)
console.log(`campuses: ${CAMPUS_CODE.UK} ${CAMPUS_CODE.MALAYSIA} ${CAMPUS_CODE.CHINA}`)
console.log(`years: 2017 2018 2022`)
if (process.argv.length>=3) {
  campus = process.argv[2] as CAMPUS_CODE
  switch(campus) {
  case CAMPUS_CODE.MALAYSIA:
    ou = OU_CODE.CS_MALAYSIA
    break
  case CAMPUS_CODE.CHINA:
    ou = OU_CODE.CS_CHINA
    break
  default:
    ou = OU_CODE.CS_UK
    break
  }
}
if (process.argv.length>=4) {
  let y = process.argv[3]
  if ('2017'==y)
    year = YEAR_CODE.YEAR_2017
  else if ('2018'==y)
    year = YEAR_CODE.YEAR_2018
  else if ('2022'==y)
    year = YEAR_CODE.YEAR_2022
  else {
    console.log(`unknown year: ${y}`)
    process.exit(-1)
  }
}
if (process.argv.length>=5) {
  let extraCookies = process.argv[4]
  extraCookies.split(';').map(function (val) { 
    jar.setCookie( reqp.cookie(val.trim() ), COOKIE_BASE_URL )
    console.log(`added cookie ${val}`)			
  });
}

console.log(`get courses (modules) for ${campus} ${year} ${ou}`)

function getHiddenFields(body:string) {
  let dom = new JSDOM(body)
  // all hidden inputs...
  let inputs = dom.window.document.querySelectorAll('input[type="hidden"]')
  for (let input of inputs) {
    let name = input.getAttribute('name')
    let value = input.getAttribute('value')
    //console.log(`hidden input ${name} = ${value}`)
    hiddenFields[name] = value
  }
  return hiddenFields
}
function getHiddenFieldsFromXml(xml:any, req?:string) {
  if (!xml.PAGE) 
    throw new Error('xml from ${req} did not have PAGE: '+JSON.stringify(xml));
  if (!xml.PAGE.FIELD) 
    throw new Error('xml from ${req} did not find PAGE.FIELD: '+JSON.stringify(xml));
  // field with id win0divPSHIDDENFIELDS
  let field = xml['PAGE']['FIELD'].find((f) => f['$'] && 'win0divPSHIDDENFIELDS'==f['$']['id'])
  if (!field)
    throw new Error('xml from ${req} did not find PAGE.FIELD[win0divPSHIDDENFIELDS]: '+JSON.stringify(xml));
  
  let html = field['_']
  //console.log('hidden fields...', html)
  getHiddenFields(html)
  console.log(`After ${req}, ICElementNum = ${hiddenFields['ICElementNum']}, ICStateNum = ${hiddenFields['ICStateNum']}`)
}

function parseAsync(body:string) : Promise<any> {
  return new Promise((resolve,reject) => {
    xml2js.parseString(body, (err, data) => {
      if (err)
        reject(err)
      else
        resolve(data)
    })
  })
}

const ELEMENTS_AS_TEXT = [ 'p', 'b', 'em' ]
const ELEMENTS_AS_TEXT_UNCLOSED = [ 'br' ]

function getTextContent(node) : string {
  function recTextContent(node) : string {
    if (node.nodeType==NODE_TYPE.TEXT_NODE)
      return node.textContent
    // not scripts
    if (node.nodeType==NODE_TYPE.ELEMENT_NODE && node.tagName.toLowerCase()=='script')
      return ''
    if (node.nodeType==NODE_TYPE.ELEMENT_NODE && ELEMENTS_AS_TEXT_UNCLOSED.indexOf(node.tagName.toLowerCase())>=0)
      return '<'+node.tagName+'>'
    let closeTag = null
    let res = ''
    if (node.nodeType==NODE_TYPE.ELEMENT_NODE && ELEMENTS_AS_TEXT.indexOf(node.tagName.toLowerCase())>=0) {
      closeTag = node.tagName
      res = res + '<'+node.tagName+'>'
    }
    for (let ci=0; ci<node.childNodes.length; ci++) {
      let child = node.childNodes[ci]
      res = res + recTextContent(child)
    }
    if (closeTag)
      res = res + '</' + closeTag + '>'
    return res
  }
  return recTextContent(node).trim()
}

interface PageValue {
  text?:string
  table?:any[]
}

function extractModulePageContent(html:string) : any {
  let dom = new JSDOM(html)
  
  let rows = dom.window.document.querySelectorAll('table[id="ACE_width"] > tbody > tr')
  if (rows.length==0)
    throw new Error('could not find main table rows (table id ACE_width) in course detail page: '+html)
  
  let values:PageValue[] = []
  
  for (let ri=0; ri<rows.length; ri++) {
    let row = rows[ri]
    for (let ci=0; ci<row.childNodes.length; ci++) {
      let child = row.childNodes[ci];
      if (NODE_TYPE.ELEMENT_NODE!=child.nodeType || child.tagName.toLowerCase()!='td')
        continue;
      // is there a table in the cell?
      let table = child.querySelector('table')
      if (!table) {
        // TODO handle regular HTML in values, e.g. <p> <br> <b>
        let value = getTextContent(child)
        if (value.length==0)
          continue
        //console.log(`row ${ri} cell ${ci}: ${value}`)
        values.push({text: value})
      } else {
        let valueRows = table.querySelectorAll('tr')
        if (valueRows.length==0)
          console.log(`warning: value table with no rows in row ${ri} cell ${ci}: ${getTextContent(child)}`)
        else {
          let headings = valueRows[0].querySelectorAll('th')
          if (headings.length==0) {
            // learning outcomes are also a table, but not like the others! - treat as more values?
            let cells = table.querySelectorAll('td')
            for (vi=0; vi<cells.length; vi++) {
              let cell = cells[vi]
              let cellValue = getTextContent(cell)
              if (cellValue.length==0)
                continue
              //console.log(`row ${ri} cell ${ci} sub-table cell ${vi}: ${cellValue}`)
              values.push({text: cellValue})
            }
          } else {
            let value:any[] = []
            for (var valueRi=1; valueRi<valueRows.length; valueRi++) {
              let valueRow = valueRows[valueRi]
              let values = valueRow.querySelectorAll('td')
                //.map((n) => n.textContent.trim())
              let newValue = {}
              for (var vi=0; vi<headings.length && vi<values.length; vi++)
                newValue[getTextContent(headings[vi])] = getTextContent(values[vi])
              value.push(newValue)
            }
            //console.log(`row ${ri} cell ${ci}: table ${JSON.stringify(value)}`)
            values.push({table: value})
          }
        }
      }
    }
  }
  // Note that some titles/values appear out of order, e.g. Educational aims after its value
  // note that some have two values, i.e. table and text, e.g. Method and Frequency of Class:

  //console.log('entries', values)
  
  let courseInfo = {}
  let name:string = null
  let nextValue:PageValue = null
  let nextValueName:string = null
  
  if (values.length<4)
    throw new Error('module details did not find enough values - '+html)
  
  // first 3 assumed special - should be page title, module code, title, term
  courseInfo['source'] = values[0]
  courseInfo['code'] = values[1]
  courseInfo['title'] = values[2]
  courseInfo['term'] = values[3]
  
  let debug = false
  let lastWasName:boolean = false
  for (let vi=4; vi<values.length; vi++) {
    let value = values[vi]
    let isName = (value.text && value.text.lastIndexOf(':')==value.text.length-1)
    if (debug) console.log(`value ${JSON.stringify(value)} ${isName ? 'isname' : ''} ${lastWasName ? 'lastWasName' : ''} nextValue ${JSON.stringify(nextValue)}`)
    if (nextValue!==null && (isName && lastWasName)) {
      if (courseInfo[name]===undefined) {
        if (debug) console.log(`set ${name} = ${JSON.stringify(nextValue)}`)
        courseInfo[name] = { table:nextValue.table,  text: nextValue.text }
      } else if (name!==null && courseInfo[name]!==undefined && courseInfo[name].table!==undefined && nextValue.table===undefined && courseInfo[name].text===undefined && nextValue.text!==undefined) {
        courseInfo[name].text = nextValue.text
        console.log(`note: merge after 2nd name, value ${nextValue.text} into ${name}`)
      } else  {
        console.log(`ignore unnamed value after 2nd name ${JSON.stringify(nextValue)}`)
      }
      nextValue = null
        
    } else if (nextValue!==null && !isName) {
      if (courseInfo[nextValueName]===undefined) {
        if (debug) console.log(`set ${nextValueName} = ${JSON.stringify(nextValue)}`)
        courseInfo[nextValueName] = { table:nextValue.table,  text: nextValue.text }
      } else if (nextValueName!==null && courseInfo[nextValueName]!==undefined && courseInfo[nextValueName].table!==undefined && nextValue.table===undefined && courseInfo[nextValueName].text===undefined && nextValue.text!==undefined) {
        courseInfo[nextValueName].text = nextValue.text
        console.log(`note: merge after 2nd value, value ${nextValue.text} into ${nextValueName}`)
      } else  {
        console.log(`ignore unnamed value after 2nd value ${JSON.stringify(nextValue)}`)
      }
      nextValue = null
    }
    lastWasName = isName
    if (isName) {
      name = value.text
      if (nextValue && nextValue.table) {
        if (debug) console.log(`set ${name} = ${JSON.stringify(nextValue)}`)
        courseInfo[name] = {table:nextValue.table,  text: nextValue.text } 
        nextValue = null
      }
    } else {
      if (name && courseInfo[name]===undefined) {
        courseInfo[name] = { table: value.table, text: value.text }
        if (debug) console.log(`set ${name} = ${JSON.stringify(value)}`)
      } else if (name!==null && 'Course Web Links:'!=name && courseInfo[name]!==undefined && courseInfo[name].table!==undefined && value.table===undefined && courseInfo[name].text===undefined && value.text!==undefined) {
        // note special case for 'Course Web Links:' with table => no text (followed by education aims out of order)
        courseInfo[name].text = value.text
        console.log(`note: merge value ${value.text} into ${name}`)
      } 
      else {
        nextValue = value
        nextValueName = name
      }
    }
  }
  if(nextValue)
    console.log(`note: ignore last value ${JSON.stringify(nextValue)}`)
  
  return courseInfo
}

function getCourseList(): Promise<any> {
  // module ("course") search 
  let COURSE_SEARCH_EXTRA_FIELDS = {
    // /*??*/ ICBcDomData: '',
    //C~UN_PROG_MOD_EXTRCT_GBL~EMPLOYEE~HRMS~UN_PROG_AND_MOD_EXTRACT.UN_PAM_CRSE_EXTRCT.GBL~UnknownValue~Course Extract~UnknownValue~UnknownValue~https://mynottingham.nottingham.ac.uk/psp/psprd/EMPLOYEE/HRMS/c/UN_PROG_AND_MOD_EXTRACT.UN_PAM_CRSE_EXTRCT.GBL~UnknownValue',
    ICAction: 'UN_PAM_EXTR_WRK_UN_SEARCH_PB$0',
    UN_PAM_EXTR_WRK_UN_PAM_CRSE1_SRCH$1: '',
    UN_PAM_EXTR_WRK_UN_PAM_CRSE2_SRCH$2: '',
    UN_PAM_EXTR_WRK_UN_PAM_CRSE2_SRCH$3: '',
    UN_PAM_EXTR_WRK_UN_PAM_CRSE2_SRCH$4: '',
  }
  // ICElementNum, ICStateNum - varies!
  
  let fields = Object.assign({}, hiddenFields, COURSE_FORM_FIELDS, COURSE_SEARCH_EXTRA_FIELDS, {
    UN_PAM_EXTR_WRK_CAMPUS: campus,
    UN_PAM_EXTR_WRK_STRM: year,
    UN_PAM_EXTR_WRK_UN_PAM_CRSE1_SRCH$0: ou,
  })
  //console.log('form fields to post', fields)
  return reqp.post({
    url:CATALOGUE_URL, 
    jar:jar,
    headers: HEADERS,
    form:fields,
  })
  .then((body) => {
    // with the AJAX flag this is now XML...
    return parseAsync(body)
  })
  .then((xml) => {
    getHiddenFieldsFromXml(xml)
    return xml
  })
}

function getCourseDetails(formid:string) : Promise<void> {
  // module ("course") search 
  let COURSE_DETAIL_EXTRA_FIELDS = {
    UN_PAM_EXTR_WRK_DESCR5_1: '',
  }
  // ICElementNum, ICStateNum - varies!
  
  let fields = Object.assign({}, hiddenFields, COURSE_FORM_FIELDS, COURSE_DETAIL_EXTRA_FIELDS, {
    ICAction: formid,
  })
  //console.log('form fields to post', fields)
  return reqp.post({
      url:CATALOGUE_URL, 
      jar:jar,
      headers: HEADERS,
      form:fields,
  })
  .then((body) => {
    // with the AJAX flag this is now XML...
    return parseAsync(body)
  })
  .then((xml) => {
    getHiddenFieldsFromXml(xml, 'course detail')
    
    let field = xml['PAGE']['FIELD'].find((f) => f['$'] && 'win0divPAGECONTAINER'==f['$']['id'])
    if (!field)
      throw new Error('course detail xml did not find PAGE.FIELD[win0divPAGECONTAINER]: '+JSON.stringify(xml));
  
    let html = field['_']
    let dom = new JSDOM(html)
  
    let codeNode = dom.window.document.querySelector('span[id="UN_PAM_CRSE_DTL_SUBJECT_DESCR$0"]')
    if (!codeNode)
      throw new Error('could not find course code in detail page: '+html)
    let code = getTextContent(codeNode)
    let titleNode = dom.window.document.querySelector('span[id="UN_PAM_CRSE_DTL_COURSE_TITLE_LONG$0"]')
    if (!titleNode)
      throw new Error('could not find course title in detail page: '+html)
    let title = getTextContent(titleNode)
    //console.log(`got detail page for course ${code}: ${title}`)
  
    let coursehtmlfile = 'data/'+code+'.html'
    console.log(`write ${coursehtmlfile}`)
    fs.writeFileSync(coursehtmlfile, html, 'utf-8')
      
    let course = extractModulePageContent(html)  
    //console.log('read course detail: ',JSON.stringify(course, null, '    '))
    
    let coursejsonfile = 'data/'+code+'.json'
    let json = JSON.stringify(course, null, '  ')
    console.log(`write ${coursejsonfile}`)
    fs.writeFileSync(coursejsonfile, json, 'utf-8')
  })
}

function backFromCourseDetails() : Promise<void> {
  let fields = Object.assign({}, hiddenFields, COURSE_FORM_FIELDS, {
    ICAction: 'UN_PAM_EXTR_WRK_UN_MODULE_PB',
  })
  //console.log('form fields to post', fields)
  return reqp.post({
      url:CATALOGUE_URL, 
      jar:jar,
      headers: HEADERS,
      form:fields,
  })
  .then((body) => {
    // with the AJAX flag this is now XML...
    return parseAsync(body)
  })
  .then((xml) => {
    getHiddenFieldsFromXml(xml, 'course detail back')
  })
}

let jobs = new JobQueue()

// get Portal view
reqp.get({
  url:PORTAL_URL, 
  jar:jar,
  headers: HEADERS
})
.then((body) => {
  var cookies = jar.getCookies(BASE_URL)
  //console.log('cookies: ',cookies)
  //console.log('body', body)
  let dom = new JSDOM(body)
  // find iframe ref in portal
  let iframe = dom.window.document.querySelector("iframe")
  if (!iframe) {
    throw new Error('did not get iframe back in result: '+body)
  }
  let src = iframe.getAttribute('src')
  if (!src) {
    throw new Error('iframe missing src; attributes '+iframe.attributes)
  }
  if (src.indexOf(CATALOGUE_URL)!=0) {
    throw new Error('iframe src not as expected: '+src.value)
  }
  console.log('portal request OK - got cookies')
})
.then(() => {
  console.log('then...') 
  // load iframe with initial form (course/plan)
  return reqp.get({
    url:CATALOGUE_URL,
    jar:jar,
    headers:HEADERS
  })
})
.then((body) => {
  //console.log('catalogue body', body)
  getHiddenFields(body)
  console.log('catalogue initial request OK')
  //console.log('got form values', hiddenFields)
})
.then(() => {
  let COURSE_OR_PLAN_EXTRA_FIELDS = {
    'ICAction': 'UN_PAM_EXTR_WRK_UN_MODULE_PB',
  }
  let fields = Object.assign({}, hiddenFields, COURSE_FORM_FIELDS, COURSE_OR_PLAN_EXTRA_FIELDS, {
  })
  //console.log('form fields to post', fields)
  // ask for course search
  return reqp.post({
    url:CATALOGUE_URL, 
    jar:jar,
    headers: Object.assign({}, HEADERS, {
      'Referer': 'https://campus.nottingham.ac.uk/psc/csprd/EMPLOYEE/HRMS/c/UN_PROG_AND_MOD_EXTRACT.UN_PAM_CRSE_EXTRCT.GBL?Page=UN_PROG_MOD_EXTR1&Action=U&TargetFrameName=None'
    }),
    form:fields,
  })
})
.then((body) => {
  //console.log('course search body', body)
  // with the AJAX flag this is now XML...
  return parseAsync(body)
})
.then((xml) => {
  getHiddenFieldsFromXml(xml)
  
  return getCourseList()
})
.then((xml) => {
    
  let field = xml['PAGE']['FIELD'].find((f) => f['$'] && 'win0divPAGECONTAINER'==f['$']['id'])
  if (!field)
    throw new Error('course list body xml did not find PAGE.FIELD[win0divPAGECONTAINER]: '+JSON.stringify(xml));
  
  let html = field['_']
  let dom = new JSDOM(html)
  // table of modules w id UN_PAM_CRSE_VW$scroll$0
  let table = dom.window.document.querySelector('table[id="UN_PAM_CRSE_VW$scroll$0"]')
  if (!table)
    throw new Error('could not find table in course list view: '+html)
  let rows = table.querySelectorAll('tr')
  // 2 title rows?!
  let formids = {}
  for (let ri=2; ri<rows.length; ri++) {
    let row = rows[ri]
    // td div span "Level 1"
    // td div span a [id=CRSE_CODE$0] "COMP1001"
    // td div span "Mathematics for Computer Scientists"
    // td div span "Autumn UK"
    let cells = row.querySelectorAll('td')
    if (cells.length<4) {
      console.log(`warning: ${cells.length} cells on row ${ri} of course table`)
      continue
    }
    let course:CourseSummary = {
      level: getTextContent(cells[0]),
      code: getTextContent(cells[1]),
      title: getTextContent(cells[2]),
      semester: getTextContent(cells[3]),
      campus:campus,
      year:year,
      ou:ou,
    }
    let formid = cells[1].querySelector('a').getAttribute('id')
    formids[course.code] = formid
    
    courses.push(course);
    console.log(`- module ${course.code}: ${course.title} - ${course.level}, ${course.semester} as ${formid}`)
      
    jobs.addJob((queue) =>
      getCourseDetails(formid)
      .then(() => backFromCourseDetails())
      .then(() => getCourseList())
    )
  }
  
  // first module
  if (courses.length==0)
    throw new Error('did not find any courses')

  let json = JSON.stringify(courses, null, '  ')
  let courselistfile = 'data/'+campus+'-'+year+'-'+ou+'.json'
  console.log(`write all courses for ${campus} ${year} ${ou} to ${courselistfile}`)
  fs.writeFileSync(courselistfile, json, 'utf-8')
    
  return jobs.runAll()
})
.then(() => {
  console.log('done all!')
})
.catch((err) => {
  console.log('error', err)
})