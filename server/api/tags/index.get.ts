import { requireUserAuth } from '../../utils/access'
import { listTagsForUser } from '../../utils/tags'

export default defineEventHandler(async (event) => {
  const user = await requireUserAuth(event)
  return { items: listTagsForUser(user.id) }
})
