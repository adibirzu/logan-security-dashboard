import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'
import path from 'path'
import fs from 'fs'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const category = searchParams.get('category')
    const source = searchParams.get('source') // 'elastic' or 'splunk'
    const severity = searchParams.get('severity')
    const search = searchParams.get('search')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    
    // Try to load existing rules from file first
    const rulesFilePath = path.join(process.cwd(), 'config', 'security_rules.json')
    let rulesData: any = null
    
    if (fs.existsSync(rulesFilePath)) {
      const fileContent = fs.readFileSync(rulesFilePath, 'utf-8')
      rulesData = JSON.parse(fileContent)
    } else {
      // Generate rules if file doesn't exist
      const result = await generateSecurityRules(200)
      if (result.success) {
        rulesData = {
          metadata: {
            total_rules: result.rules.length,
            export_date: new Date().toISOString(),
            format_version: "1.0"
          },
          rules: result.rules
        }
      } else {
        return NextResponse.json({ 
          success: false, 
          error: 'Failed to generate rules' 
        }, { status: 500 })
      }
    }
    
    let filteredRules = rulesData.rules || []
    
    // Apply filters
    if (category) {
      filteredRules = filteredRules.filter((rule: any) => 
        rule.category.toLowerCase() === category.toLowerCase()
      )
    }
    
    if (source) {
      filteredRules = filteredRules.filter((rule: any) => 
        rule.original_source.toLowerCase() === source.toLowerCase()
      )
    }
    
    if (severity) {
      filteredRules = filteredRules.filter((rule: any) => 
        rule.severity.toLowerCase() === severity.toLowerCase()
      )
    }
    
    if (search) {
      const searchLower = search.toLowerCase()
      filteredRules = filteredRules.filter((rule: any) => 
        rule.name.toLowerCase().includes(searchLower) ||
        rule.description.toLowerCase().includes(searchLower) ||
        rule.tags.some((tag: string) => tag.toLowerCase().includes(searchLower))
      )
    }
    
    // Apply pagination
    const totalRules = filteredRules.length
    const paginatedRules = filteredRules.slice(offset, offset + limit)
    
    // Get statistics
    const stats = {
      total: totalRules,
      categories: getStatistics(filteredRules, 'category'),
      sources: getStatistics(filteredRules, 'original_source'),
      severities: getStatistics(filteredRules, 'severity')
    }
    
    return NextResponse.json({
      success: true,
      rules: paginatedRules,
      pagination: {
        total: totalRules,
        offset: offset,
        limit: limit,
        has_more: offset + limit < totalRules
      },
      statistics: stats
    })
    
  } catch (error) {
    console.error('Error in security rules API:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, count = 200 } = body
    
    if (action === 'generate') {
      const result = await generateSecurityRules(count)
      return NextResponse.json(result)
    } else if (action === 'regenerate') {
      // Regenerate rules and save to file
      const result = await generateSecurityRules(count)
      if (result.success) {
        const rulesFilePath = path.join(process.cwd(), 'config', 'security_rules.json')
        const rulesData = {
          metadata: {
            total_rules: result.rules.length,
            export_date: new Date().toISOString(),
            format_version: "1.0"
          },
          rules: result.rules
        }
        
        fs.writeFileSync(rulesFilePath, JSON.stringify(rulesData, null, 2))
        return NextResponse.json({ success: true, message: `Generated ${count} rules` })
      }
    }
    
    return NextResponse.json({ 
      success: false, 
      error: 'Invalid action' 
    }, { status: 400 })
    
  } catch (error) {
    console.error('Error in security rules POST API:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}

async function generateSecurityRules(count: number): Promise<any> {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(process.cwd(), 'scripts', 'security_rules_converter.py')
    const args = ['generate', '--count', count.toString()]
    
    const pythonProcess = spawn('python3', [scriptPath, ...args], {
      env: {
        ...process.env,
        PYTHONPATH: path.join(process.cwd(), 'scripts')
      },
      timeout: 30000 // 30 second timeout
    })
    
    let stdout = ''
    let stderr = ''
    
    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString()
    })
    
    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString()
    })
    
    pythonProcess.on('close', (code) => {
      if (stderr) {
        console.error('Python script stderr:', stderr)
      }
      
      if (code !== 0) {
        console.error(`Python script exited with code ${code}`)
        resolve({ success: false, error: `Script exited with code ${code}`, stderr })
        return
      }
      
      try {
        // Parse the last line which should be the JSON result
        const lines = stdout.trim().split('\n')
        const lastLine = lines[lines.length - 1]
        const result = JSON.parse(lastLine)
        resolve(result)
      } catch (parseError) {
        console.error('Failed to parse Python output:', parseError)
        resolve({ success: false, error: 'Failed to parse response', stdout, stderr })
      }
    })
    
    pythonProcess.on('error', (error) => {
      console.error('Python process error:', error)
      resolve({ success: false, error: error.message })
    })
  })
}

function getStatistics(rules: any[], field: string): Record<string, number> {
  const stats: Record<string, number> = {}
  
  rules.forEach(rule => {
    const value = rule[field]
    if (value) {
      stats[value] = (stats[value] || 0) + 1
    }
  })
  
  return stats
}