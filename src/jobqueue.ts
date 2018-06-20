// job queue with promise - to execute sequentially

export type JobFunction = (j:JobQueue) => Promise<void>

interface Job {
  fn:JobFunction
}

export class JobQueue {
  jobs:Job[] = []
  constructor() {
  }
  addJob(fn:JobFunction) {
    this.jobs.push({fn:fn})
  }
  runAll(): Promise<void> {
    let self = this
    return new Promise((resolve, reject) => {
      function rec() {
        if (self.jobs.length==0) {
          resolve()
          return
        }
        let job = self.jobs.splice(0,1)[0]
        var p
        try {
          p = job.fn(this)
        } catch (err) {
          console.log('error starting job', err)
          reject(err)
          return
        }
        p
        .then(() => rec())
        .catch((err) => reject(err))
      }
      rec()
    })
  }
}
