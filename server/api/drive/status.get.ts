import { requireStaff } from '../../utils/security'
import { driveConfigurado } from '../../utils/drive'

export default defineEventHandler(async (event) => {
  await requireStaff(event, 'drive/status')
  return { configurado: driveConfigurado() }
})
