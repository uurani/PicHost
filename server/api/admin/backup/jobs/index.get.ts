import { requireAdminAuth } from '../../../../utils/access'
import { serializeBackupJob } from '../../../../utils/backup/api'
import {
  getActiveBackupJob,
  getRunningBackupJob,
  listBackupJobsPage,
  recoverInterruptedBackupJobs
} from '../../../../utils/backup/jobs'
import { isBackupRunnerBusy } from '../../../../utils/backup/runner'

export default defineEventHandler(async (event) => {
  await requireAdminAuth(event)
  if (getRunningBackupJob() && !isBackupRunnerBusy()) {
    recoverInterruptedBackupJobs()
  }
  const query = getQuery(event)
  const pageSize = Math.min(50, Math.max(1, Number(query.pageSize) || 10))
  const pageNum = Math.max(1, Number(query.pageNum) || Number(query.page) || 1)
  const { jobs, total } = listBackupJobsPage(pageNum, pageSize)
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const page = total > 0 ? Math.min(pageNum, totalPages) : 1
  const slice = page === pageNum
    ? jobs
    : listBackupJobsPage(page, pageSize).jobs

  const activeJob = getActiveBackupJob()

  return {
    jobs: slice.map(serializeBackupJob),
    total,
    page,
    pageSize,
    totalPages,
    activeJob: activeJob ? serializeBackupJob(activeJob) : null
  }
})
