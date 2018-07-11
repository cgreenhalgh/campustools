// simple html index generator?!
import * as fs from 'fs'
import * as path from 'path'

if (3 != process.argv.length) {
  console.log('usage: node dist/makeindex.js DIRECTORY')
  process.exit(-1)
}

let dir = process.argv[2]

interface File {
  name:string
  mtime:Date
  isFile:boolean
  isDirectory:boolean
  size:number
  files?:File[]
}

function readFile(dir:string,name?:string) : File {
  let fullpath = dir
  if (name)
    fullpath = path.join(dir, name)
  else
    name = dir
  let s:fs.Stats = fs.statSync(fullpath)
  let f:File = {
    name: name,
    isDirectory:s.isDirectory(),
    isFile:s.isFile(),
    size:s.size,
    mtime:s.mtime
  }
  if (f.isDirectory) {
    // recurse
    let fileNames:string[] = fs.readdirSync(fullpath)
    f.files = fileNames.map((fn) => readFile(fullpath, fn))
  }
  return f
}

console.log(`read (recursive) ${dir}`)
let f = readFile(dir, '.')

//console.log(JSON.stringify(f, null, 4))

let index = `<html><head><meta charset="UTF-8"><title>${dir}</title>`+
  `<style>\nh2,h3,h4,h5 {\n  margin-bottom:0px;\n  margin-top:1em;}\n</style>`+
  `</head><body><h1>${path.basename(dir)}</h1><table><tbody><tr><th>Name</th><!--<th>Last modified</th>--><th>Size</th></tr>\n`

function writeIndex(dir:string, f:File, level:number): string {
  if (f.isFile) {
    return `<tr><td><a href="${dir}/${f.name}">${f.name}</a></td><!--<td>${f.mtime}</td>--><td>${f.size}</td></tr>`
  }
  if (!f.files)
    return
  // does it have an index already
  let index = f.files.find((f) => f.name.indexOf('index.')==0)
  let res = `<tr><td cols="2"><h${level}>${f.name}</h${level}></td></tr>\n`
  if (index) {
    if (1==level)
      console.log(`replacing level 1 index ${dir}/${f.name}/${index.name}`)
    else
      return res + `<tr><td cols="2"><a href="${dir}/${f.name}/${index.name}">Index</a></td></tr>\n`
  }
  f.files.sort((a,b) => a.isDirectory && !b.isDirectory ? -1 : (!a.isDirectory && b.isDirectory ? 1 : a.name.localeCompare(b.name)))
  for (let cf of f.files) {
    res = res + writeIndex(path.join(dir, f.name), cf, level+1)
  }
  return res
}

f.files.sort((a,b) => a.isDirectory && !b.isDirectory ? -1 : (!a.isDirectory && b.isDirectory ? 1 : a.name.localeCompare(b.name)))
index = index + f.files.map((f) => writeIndex('.', f, 2)).join('')
index = index + `</tbody></table></body></html>`

let indexfile = path.join(dir,'index.html')
console.log(`write index ${indexfile}`)

fs.writeFileSync(indexfile, index, 'utf-8')
