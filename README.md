# CampusTools

some simple tools to work with campus solutions at the university of nottingham.

status: starting...

Chris Greenhalgh, chris.greenhalgh@nottingham.ac.uk

## Build

```
docker build -t campustools .
```

## Usage

### Download course (module) files

```
docker run -it --rm --name campustools \
  -v `pwd`/data:/root/work/data -p 8080:8080 \
  campustools node dist/getcourses.js [CAMPUS [YEAR]]
```
Outputs to data/:
- CAMPUS-YEAR-OU.json - all courses (modules)
- COURSECODE.json - parsed data on course (module)
- COURSECODE.html - HTML page for course (module)

Campus codes:
- UK = 'U',
- MALAYSIA = 'M',
- CHINA = 'C',

Year codes:
- YEAR_2017 = '3170',
- YEAR_2018 = '3180',

Organisation codes:
- CS_UK = 'USC-CS',
- CS_MALAYSIA = 'MSC-CS',
- CS_CHINA = 'CSC-CS',

### Make course (module) file index

```
docker run -it --rm --name campustools \
  -v `pwd`/data:/root/work/data -p 8080:8080 \
  campustools node dist/renamecoursefiles.js \
  data data/uk/U-3180-USC-CS.json data/china/C-3180-CSC-CS.json data/malaysia/M-3180-MSC-CS.json 
```

Copies module files to `LEVEL - TITLE (CAMPUS) CODE.html` and generates `index.html`.

## File format

### Course (module)

Summary:
- `code`:string
- `title`:string
- `semester`:string
- `level`:string

## Other utilities

Make simple HTML index of directory (recursive, to a nested index file):
`node dist/makeindex.html DIRECTORY` 

## BCS outcome management

Generate CSV file mapping table and HTML file mapping/comment document from module-learning-outcomes.xls formatted spreadsheet:
```
node dist/bcsoutput.js data/bcs/module-learning-outcomes.xls
```

Spreadsheet has three sheets:
- `mapping and outcomes` - the main sheet: actual mapping entries
- `modules` - list of all relevant modules and codes
- `criteria` - list of all BCS criteria

The mapping and outcomes sheets has columns:
- `UK New code`, `China New code`, `Malaysia New code`, `UK Old code`, `China Old code`, `Malaysia Old code`
- `Module Name`, `Credits`, `Level` (1-4)
- `Criterion code`, e.g. "2.1.1"
- `Outcome type`, one of "1. Intellectual skills ", "2. Professional / practical skills" or "3. Transferable / key skills" (as per quality manual guiadance)
- `Criterion text`
- `Contribution level`, currently one of "some", "some (taught)" or "major"
- `Specific text`
- `Formatted output` - formula for output text collation

## Development

```
docker run -it --rm --name campustools \
  -v `pwd`/data:/root/work/data -p 8080:8080 \
  campustools
```
```
tsc
node dist/getcourses.js [CAMPUS [YEAR]]
```
