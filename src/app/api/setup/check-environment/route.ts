import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export async function GET(request: NextRequest) {
  try {
    // Run the OCI instance check script
    const { stdout, stderr } = await execAsync('cd scripts && python3 check_oci_instance.py')
    
    const result = JSON.parse(stdout)
    
    // Add additional context for the frontend
    if (result.is_oci_instance && !result.auth_methods.instance_principal) {
      result.action_required = {
        type: 'setup_instance_principal',
        message: 'Running on OCI instance but instance principal not configured',
        setup_script: './scripts/setup_instance_principal.sh'
      }
    }
    
    return NextResponse.json({
      success: true,
      data: result
    })
    
  } catch (error) {
    console.error('Environment check error:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to check environment',
      data: {
        is_oci_instance: false,
        auth_methods: {
          instance_principal: false,
          resource_principal: false,
          config_file: {
            available: false
          }
        },
        recommendations: [{
          priority: 4,
          method: 'config_file',
          reason: 'Default to config file authentication',
          setup_required: true
        }]
      }
    })
  }
}