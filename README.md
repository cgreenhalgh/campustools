# CampusTools

some simple tools to work with campus solutions at the university of nottingham.

status: starting...

Chris Greenhalgh, chris.greenhalgh@nottingham.ac.uk

## Build

```
docker build -t campustools .
```

```
docker run -it --rm --name campustools \
  -v `pwd`/data:/root/work/data -p 8080:8080 \
  campustools
```

```
docker exec -it campustools /bin/bash
```
```
docker cp ...
```
