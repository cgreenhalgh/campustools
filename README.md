# CampusTools

some simple tools to work with campus solutions at the university of nottingham.

status: starting...

Chris Greenhalgh, chris.greenhalgh@nottingham.ac.uk

## Build

```
docker build -t campustools .
```

## Usage

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


## File format

### Course (module)

Summary:
- `code`:string
- `title`:string
- `semester`:string
- `level`:string

## Development

```
docker run -it --rm --name campustools \
  -v `pwd`/data:/root/work/data -p 8080:8080 \
  campustools /bin/bash
```
```
tsc
node dist/getcourses.js [CAMPUS [YEAR]]
```
