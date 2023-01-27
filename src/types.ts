export interface CourseSummary {
  code:string,
  title:string,
  semester:string,
  level:string,
  campus:CAMPUS_CODE,
  year:YEAR_CODE,
  ou:OU_CODE,
}

export enum CAMPUS_CODE {
  UK = 'U',
  MALAYSIA = 'M',
  CHINA = 'C',
}

export enum YEAR_CODE {
  YEAR_2017 = '3170',
  YEAR_2018 = '3180',
  YEAR_2022 = '3220',
}

export enum OU_CODE {
  CS_UK = 'USC-CS',
  CS_MALAYSIA = 'MSC-CS',
  CS_CHINA = 'CSC-CS',
}
