// simple html index generator?!
import * as fs from 'fs'
import * as path from 'path'

if (3 != process.argv.length) {
  console.log('usage: node dist/makeindex.js DIRECTORY')
  process.exit(-1)
}

let dir = process.argv[2]

interface FileInstance {
  name:string
  extension:string
  mtime:Date
  size:number  
}

interface File {
  basename:string
  fullname:string
  instances?:FileInstance[]
  isFile:boolean
  isDirectory:boolean
  files?:File[]
}

function fileCompare(a:File,b:File): number {
  return a.isDirectory && !b.isDirectory ? -1 : (!a.isDirectory && b.isDirectory ? 1 : a.fullname.localeCompare(b.fullname))
}

const PREFERRED_FILE_EXTENSIONS = [ '.pdf' ]

function readFile(dir:string,name?:string) : File {
  let fullpath = dir
  if (name)
    fullpath = path.join(dir, name)
  else
    name = dir
  let s:fs.Stats = fs.statSync(fullpath)
  let f:File = {
    basename: name,
    fullname: name,
    isDirectory:s.isDirectory(),
    isFile:s.isFile(),
    //size:s.size,
    //mtime:s.mtime
  }
  if (f.isDirectory) {
    // recurse
    let fileNames:string[] = fs.readdirSync(fullpath)
    f.files = fileNames.map((fn) => readFile(fullpath, fn))
    // merge instances
    f.files.sort(fileCompare)
    var bf:File = null
    for (let i=0; i<f.files.length; i++) {
      let fi = f.files[i]
      if (bf && bf.basename == fi.basename) {
        bf.instances.push(fi.instances[0])
        f.files.splice(i,1)
        i--
      } else {
        bf = fi
      }
    }
    for (let fi of f.files) {
      if (fi.instances)
        fi.instances.sort((a,b)=> PREFERRED_FILE_EXTENSIONS.indexOf(a.extension.toLowerCase())>=0 && PREFERRED_FILE_EXTENSIONS.indexOf(b.extension.toLowerCase())<0 ? -1 :
          (PREFERRED_FILE_EXTENSIONS.indexOf(a.extension.toLowerCase())<0 && PREFERRED_FILE_EXTENSIONS.indexOf(b.extension.toLowerCase())>=0 ? 1 : 
            a.extension.localeCompare(b.extension)))
    }
  } else {
    f.instances = [ { 
      name: name,
      size:s.size,
      mtime:s.mtime,
      extension:path.extname(name),
    } ]
    let ix = f.basename.lastIndexOf('.')
    if (ix>=0)
      f.basename = f.basename.substring(0,ix)
  }
  return f
}

console.log(`read (recursive) ${dir}`)
let f = readFile(dir, '.')


//console.log(JSON.stringify(f, null, 4))

let index = `<html><head><meta charset="UTF-8"><title>${dir}</title>`+
  `<style>\nh2,h3,h4,h5 {\n  margin-bottom:0px;\n  margin-top:1em;}\n</style>`+
  `</head><body><h1>${path.basename(dir)}</h1><table><tbody><tr><th>Name</th><!--<th>Last modified</th>--><th>Extension (Size)</th></tr>\n`

function writeIndex(dir:string, f:File, level:number): string {
  if (f.isFile) {
    let res = `<tr><td><a href="${dir}/${f.instances[0].name}">${f.basename}</a></td><td>`
    for (let i of f.instances) {
      res = res + `<a href="${dir}/${i.name}">${i.extension}</a> (${i.size}) `
    }
    res = res + '</td><td>'
    return res
  }
  if (!f.files)
    return
  // does it have an index already
  let index = f.files.find((f) => f.basename == 'index')
  let res = `<tr><td cols="2"><h${level}>${f.basename}</h${level}></td></tr>\n`
  if (index) {
    if (1==level)
      console.log(`replacing level 1 index ${dir}/${f.fullname}/${index.fullname}`)
    else
      return res + `<tr><td cols="2"><a href="${dir}/${f.fullname}/${index.fullname}">Index</a></td></tr>\n`
  }
  f.files.sort((a,b) => a.isDirectory && !b.isDirectory ? -1 : (!a.isDirectory && b.isDirectory ? 1 : a.fullname.localeCompare(b.fullname)))
  for (let cf of f.files) {
    res = res + writeIndex(path.join(dir, f.fullname), cf, level+1)
  }
  return res
}

f.files.sort((a,b) => a.isDirectory && !b.isDirectory ? -1 : (!a.isDirectory && b.isDirectory ? 1 : a.fullname.localeCompare(b.fullname)))
index = index + f.files.map((f) => writeIndex('.', f, 2)).join('')
index = index + `</tbody></table></body></html>`

let indexfile = path.join(dir,'index.html')
console.log(`write index ${indexfile}`)

fs.writeFileSync(indexfile, index, 'utf-8')
