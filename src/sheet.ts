// generic sheet-reading utility

// excel cell name from column,row (start from 0)
function cellid(c:number,r:number): string {
  let p = String(r+1)
  let rec = (c) => {
    p = String.fromCharCode( ('A'.charCodeAt(0))+(c % 26) ) + p
    c = Math.floor (c/26)
    if (c!=0)
      rec( c-1 )
  }
  rec( c )
  return p 
}

export interface Row {
  [propName:string]: string
}
// generic spreadsheet sheet type
export interface Sheet {
  headings: string[]
  rows: Row[]
}

// read generic representation of sheet
export function readSheet(sheet:any): Sheet {
  let headings:string[] = []
  let prefix = ''
  for (let c=0; true; c++) {
    let cell = sheet[cellid(c,0)]
    if (!cell)
      break
    let heading = String(cell.v).trim()
    // heading with ':' makes that a prefix added to subsequent column names
    let ix = heading.indexOf(':')
    if (ix>=0) {
      prefix = heading.substring(0, ix)
      let suffix = heading.substring(ix+1)
      if (prefix.length>0 && suffix.length>0) {
        headings.push(prefix+'_'+suffix)
      } else {
        headings.push(prefix+suffix)
      }
    } else if (prefix.length>0) {
      headings.push(prefix+'_'+heading)
    } else {
      headings.push(heading)
    }
    //console.log(`Found heading ${cell.v} at column ${c}, ${cellid(c,0)}`)
  }
  let rows:Row[] = []
  for (let r=1; true; r++) {
    let row:Row = {}
    let empty = true
    for (let c=0; c<headings.length; c++) {
      let cell = sheet[cellid(c,r)]
      if (cell) {
        let value = String(cell.v).trim()
        if (value.length>0) {
          row[headings[c]] = value
          empty = false
        }
      }
    }
    if (empty)
      break
    rows.push(row)
  }
  return { headings: headings, rows: rows}
}

export function escapeCsv(text:string): string {
  if (text.indexOf(',')<0 && text.indexOf('"')<0 && text.indexOf('\n')<0)
    return text
  var res:string = '"'
  for (let ix=0; ix<text.length; ix++) {
    let c = text.charAt(ix)
    if ('"'==c)
      res += '""'
    else if ('\n'==c)
      res += '\\n'
    else 
      res += c
  }
  return res+'"'
}