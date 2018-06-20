//import * as request from 'request'
import * as reqp from 'request-promise-native'
import * as jsdom from 'jsdom'
const { JSDOM } = jsdom

console.log('getcourses...')

// establish cookies with portal
const PORTAL_URL = 'http://modulecatalogue.nottingham.ac.uk/Nottingham/'
const CATALOGUE_URL = 'https://campus.nottingham.ac.uk/psc/csprd/EMPLOYEE/HRMS/c/UN_PROG_AND_MOD_EXTRACT.UN_PAM_CRSE_EXTRCT.GBL'
const BASE_URL = 'https://nottingham.ac.uk'
const HEADERS = { 'User-Agent': 'campustools', 'Accept': '*/*' }

let jar = reqp.jar()
let hiddenFields = {}

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
  return reqp.get({
    url:CATALOGUE_URL,
    jar:jar,
    headers:HEADERS
  })
})
.then((body) => {
  //console.log('catalogue body', body)
  let dom = new JSDOM(body)
  // all hidden inputs...
  let inputs = dom.window.document.querySelectorAll('input[type="hidden"]')
  for (let input of inputs) {
    let name = input.getAttribute('name')
    let value = input.getAttribute('value')
    //console.log(`hidden input ${name} = ${value}`)
    hiddenFields[name] = value
  }
  console.log('catalogue initial request OK - got form values')
})
.then(() => {
  // TODO: try module ("course") search for UK/2018/CS
  // ?? ICBcDomData: C~UN_PROG_MOD_EXTRCT_GBL~EMPLOYEE~HRMS~UN_PROG_AND_MOD_EXTRACT.UN_PAM_CRSE_EXTRCT.GBL~UnknownValue~Course Extract~UnknownValue~UnknownValue~https://mynottingham.nottingham.ac.uk/psp/psprd/EMPLOYEE/HRMS/c/UN_PROG_AND_MOD_EXTRACT.UN_PAM_CRSE_EXTRCT.GBL~UnknownValue
  // ?? ICStateNum: 4
  // ICAction: UN_PAM_EXTR_WRK_UN_SEARCH_PB$0
  // UN_PAM_EXTR_WRK_CAMPUS: U
  // UN_PAM_EXTR_WRK_STRM: 3180
  // UN_PAM_EXTR_WRK_UN_PAM_CRSE1_SRCH$0: USC-CS
  // UN_PAM_EXTR_WRK_UN_PAM_CRSE1_SRCH$1: 
  // UN_PAM_EXTR_WRK_UN_PAM_CRSE2_SRCH$2: 
  // UN_PAM_EXTR_WRK_UN_PAM_CRSE2_SRCH$3: 
  // UN_PAM_EXTR_WRK_UN_PAM_CRSE2_SRCH$4: 
  // ptus_defaultlocalnode: CSPRD
  // ptus_dbname: CSPRD
  // ptus_portal: EMPLOYEE
  // ptus_node: HRMS
  // ptus_workcenterid: 
  // ptus_componenturl: https://campus.nottingham.ac.uk/psp/csprd/EMPLOYEE/HRMS/c/UN_PROG_AND_MOD_EXTRACT.UN_PAM_CRSE_EXTRCT.GBL
  
})
.catch((err) => {
  console.log('error', err)
})