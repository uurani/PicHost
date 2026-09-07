import { recoverInterruptedBackupJobs } from '../utils/backup/jobs'

export default defineNitroPlugin(() => {
  const recovered = recoverInterruptedBackupJobs()
  if (recovered > 0) {
    console.log(`[PicHost] Recovered ${recovered} interrupted backup job(s)`)
  }
})
