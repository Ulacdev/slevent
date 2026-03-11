import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.join(__dirname, './.env') })

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkAuditLogs() {
  const { data, error, count } = await supabase
    .from('auditLogs')
    .select('auditLogId, actionType, details, createdAt', { count: 'exact' })
    .order('createdAt', { ascending: false })
    .limit(10)

  if (error) {
    console.error('Error fetching audit logs:', error)
    return
  }

  console.log(`Total Audit Logs: ${count}`)
  console.log('Recent Audit Logs:')
  data.forEach(log => {
    console.log(`[${log.createdAt}] ${log.actionType}:`, JSON.stringify(log.details))
  })
}

checkAuditLogs()
