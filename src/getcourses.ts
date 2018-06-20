//import * as request from 'request'
import * as reqp from 'request-promise-native'
import * as jsdom from 'jsdom'
const { JSDOM } = jsdom
import * as xml2js from 'xml2js'

console.log('getcourses...')

// establish cookies with portal
const PORTAL_URL = 'http://modulecatalogue.nottingham.ac.uk/Nottingham/'
const CATALOGUE_URL = 'https://campus.nottingham.ac.uk/psc/csprd/EMPLOYEE/HRMS/c/UN_PROG_AND_MOD_EXTRACT.UN_PAM_CRSE_EXTRCT.GBL'
const BASE_URL = 'https://nottingham.ac.uk'
const HEADERS = { 'User-Agent': 'campustools', 'Accept': '*/*' }
enum CAMPUS_CODE {
  UK = 'U',
  MALAYSIA = 'M',
  CHINA = 'C',
}

enum YEAR_CODE {
  YEAR_2017 = '3170',
  YEAR_2018 = '3180',
}

enum OU_CODE {
  CS_UK = 'USC-CS',
  CS_MALAYSIA = 'MSC-CS',
  CS_CHINA = 'CSC-CS',
}

interface CourseSummary {
  code:string,
  title:string,
  semester:string,
  level:string,
  campus:CAMPUS_CODE,
  year:YEAR_CODE,
  ou:OU_CODE,
}

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
    return
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
  
  // TODO: try module ("course") search for UK/2018/CS
  let COURSE_SEARCH_EXTRA_FIELDS = {
    // /*??*/ ICBcDomData: '',
    //C~UN_PROG_MOD_EXTRCT_GBL~EMPLOYEE~HRMS~UN_PROG_AND_MOD_EXTRACT.UN_PAM_CRSE_EXTRCT.GBL~UnknownValue~Course Extract~UnknownValue~UnknownValue~https://mynottingham.nottingham.ac.uk/psp/psprd/EMPLOYEE/HRMS/c/UN_PROG_AND_MOD_EXTRACT.UN_PAM_CRSE_EXTRCT.GBL~UnknownValue',
    ICAction: 'UN_PAM_EXTR_WRK_UN_SEARCH_PB$0',
    UN_PAM_EXTR_WRK_UN_PAM_CRSE1_SRCH$1: '',
    UN_PAM_EXTR_WRK_UN_PAM_CRSE2_SRCH$2: '',
    UN_PAM_EXTR_WRK_UN_PAM_CRSE2_SRCH$3: '',
    UN_PAM_EXTR_WRK_UN_PAM_CRSE2_SRCH$4: '',
    // force no ajax?!
    //ICAJAX: 0,
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
})
.then((body) => {
  // with the AJAX flag this is now XML...
  return parseAsync(body)
})
.then((xml) => {
  getHiddenFieldsFromXml(xml)
  
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
      level: cells[0].textContent.trim(),
      code: cells[1].textContent.trim(),
      title: cells[2].textContent.trim(),
      semester: cells[3].textContent.trim(),
      campus:campus,
      year:year,
      ou:ou,
    }
    let formid = cells[1].querySelector('a').getAttribute('id')

    courses.push(course);
    console.log(`- module ${course.code}: ${course.title} - ${course.level}, ${course.semester} as ${formid}`)
  }
  
  //console.log('course list body', body)
  // Hmm, no modules...

})
.catch((err) => {
  console.log('error', err)
})