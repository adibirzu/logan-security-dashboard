'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Upload, 
  Plus, 
  Trash2, 
  Send, 
  CheckCircle, 
  AlertTriangle,
  FileText,
  Database,
  Shield
} from 'lucide-react'

interface ThreatIndicator {
  type: string
  value: string
  confidence: number
  threat_types: string[]
}

interface ThreatData {
  indicators: ThreatIndicator[]
  metadata: {
    attribution: string
    source: string
    description?: string
  }
}

interface SubmissionResult {
  success: boolean
  total_indicators: number
  successful_submissions: number
  failed_submissions: number
  results: Array<{
    indicator: ThreatIndicator
    success: boolean
    submission_id?: string
    status?: string
    message?: string
    error?: string
  }>
  compartment_id: string
  error?: string
}

interface ThreatDataSubmissionProps {
  onSubmissionComplete?: (result: SubmissionResult) => void
}

export function ThreatDataSubmission({ onSubmissionComplete }: ThreatDataSubmissionProps) {
  const [indicators, setIndicators] = useState<ThreatIndicator[]>([
    { type: 'ip', value: '', confidence: 80, threat_types: [] }
  ])
  const [metadata, setMetadata] = useState({
    attribution: 'Logan Security Dashboard',
    source: 'Custom Analysis',
    description: ''
  })
  const [submissionResult, setSubmissionResult] = useState<SubmissionResult | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [fileContent, setFileContent] = useState('')

  const indicatorTypes = [
    'ip', 'domain', 'url', 'md5', 'sha1', 'sha256', 'email', 'registry_key', 
    'file_path', 'mutex', 'user_agent', 'certificate', 'other'
  ]

  const threatTypes = [
    'malware', 'phishing', 'spam', 'botnet', 'exploit', 'ransomware',
    'trojan', 'backdoor', 'c2', 'dga', 'scanner', 'brute_force'
  ]

  const addIndicator = () => {
    setIndicators([...indicators, { type: 'ip', value: '', confidence: 80, threat_types: [] }])
  }

  const removeIndicator = (index: number) => {
    setIndicators(indicators.filter((_, i) => i !== index))
  }

  const updateIndicator = (index: number, field: keyof ThreatIndicator, value: any) => {
    const updated = [...indicators]
    updated[index] = { ...updated[index], [field]: value }
    setIndicators(updated)
  }

  const updateThreatTypes = (index: number, threatType: string, checked: boolean) => {
    const updated = [...indicators]
    if (checked) {
      updated[index].threat_types = [...updated[index].threat_types, threatType]
    } else {
      updated[index].threat_types = updated[index].threat_types.filter(t => t !== threatType)
    }
    setIndicators(updated)
  }

  const validateIndicators = () => {
    const errors: string[] = []
    
    indicators.forEach((indicator, index) => {
      if (!indicator.value.trim()) {
        errors.push(`Indicator ${index + 1}: Value is required`)
      }
      if (indicator.confidence < 0 || indicator.confidence > 100) {
        errors.push(`Indicator ${index + 1}: Confidence must be between 0 and 100`)
      }
    })

    return errors
  }

  const submitThreatData = async () => {
    const validationErrors = validateIndicators()
    if (validationErrors.length > 0) {
      setSubmissionResult({
        success: false,
        error: validationErrors.join('; '),
        total_indicators: 0,
        successful_submissions: 0,
        failed_submissions: 0,
        results: [],
        compartment_id: ''
      })
      return
    }

    setIsSubmitting(true)
    setSubmissionResult(null)

    try {
      const threatData: ThreatData = {
        indicators: indicators.filter(i => i.value.trim()),
        metadata
      }

      const response = await fetch('/api/threat-intelligence', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'submit',
          threat_data: threatData
        })
      })

      const result = await response.json()
      setSubmissionResult(result)
      
      if (onSubmissionComplete) {
        onSubmissionComplete(result)
      }

    } catch (error) {
      setSubmissionResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        total_indicators: 0,
        successful_submissions: 0,
        failed_submissions: 0,
        results: [],
        compartment_id: ''
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string
          setFileContent(content)
          
          const data = JSON.parse(content) as ThreatData
          if (data.indicators && Array.isArray(data.indicators)) {
            setIndicators(data.indicators)
          }
          if (data.metadata) {
            setMetadata({ ...metadata, ...data.metadata })
          }
        } catch (error) {
          setSubmissionResult({
            success: false,
            error: 'Invalid JSON file format',
            total_indicators: 0,
            successful_submissions: 0,
            failed_submissions: 0,
            results: [],
            compartment_id: ''
          })
        }
      }
      reader.readAsText(file)
    }
  }

  const submitFromFile = async () => {
    if (!fileContent) {
      setSubmissionResult({
        success: false,
        error: 'No file content to submit',
        total_indicators: 0,
        successful_submissions: 0,
        failed_submissions: 0,
        results: [],
        compartment_id: ''
      })
      return
    }

    setIsSubmitting(true)
    setSubmissionResult(null)

    try {
      const threatData = JSON.parse(fileContent)

      const response = await fetch('/api/threat-intelligence', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'submit',
          threat_data: threatData
        })
      })

      const result = await response.json()
      setSubmissionResult(result)
      
      if (onSubmissionComplete) {
        onSubmissionComplete(result)
      }

    } catch (error) {
      setSubmissionResult({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to submit file data',
        total_indicators: 0,
        successful_submissions: 0,
        failed_submissions: 0,
        results: [],
        compartment_id: ''
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Threat Intelligence Data Submission
          </CardTitle>
          <CardDescription>
            Submit custom threat indicators and intelligence data to OCI Threat Intelligence service
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="manual" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="manual">Manual Entry</TabsTrigger>
              <TabsTrigger value="file">File Upload</TabsTrigger>
            </TabsList>

            <TabsContent value="manual" className="space-y-6">
              {/* Metadata Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Metadata</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="attribution">Attribution</Label>
                    <Input
                      id="attribution"
                      value={metadata.attribution}
                      onChange={(e) => setMetadata({ ...metadata, attribution: e.target.value })}
                      placeholder="Source attribution"
                    />
                  </div>
                  <div>
                    <Label htmlFor="source">Source</Label>
                    <Input
                      id="source"
                      value={metadata.source}
                      onChange={(e) => setMetadata({ ...metadata, source: e.target.value })}
                      placeholder="Intelligence source"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea
                    id="description"
                    value={metadata.description}
                    onChange={(e) => setMetadata({ ...metadata, description: e.target.value })}
                    placeholder="Additional context about this threat intelligence"
                    rows={2}
                  />
                </div>
              </div>

              {/* Indicators Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Threat Indicators</h3>
                  <Button onClick={addIndicator} size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Indicator
                  </Button>
                </div>

                {indicators.map((indicator, index) => (
                  <Card key={index} className="p-4">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Indicator {index + 1}</span>
                        {indicators.length > 1 && (
                          <Button
                            onClick={() => removeIndicator(index)}
                            variant="outline"
                            size="sm"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <Label>Type</Label>
                          <select
                            value={indicator.type}
                            onChange={(e) => updateIndicator(index, 'type', e.target.value)}
                            className="w-full p-2 border rounded-md"
                          >
                            {indicatorTypes.map(type => (
                              <option key={type} value={type}>{type}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <Label>Value</Label>
                          <Input
                            value={indicator.value}
                            onChange={(e) => updateIndicator(index, 'value', e.target.value)}
                            placeholder="Indicator value"
                          />
                        </div>
                        <div>
                          <Label>Confidence (0-100)</Label>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            value={indicator.confidence}
                            onChange={(e) => updateIndicator(index, 'confidence', parseInt(e.target.value) || 0)}
                          />
                        </div>
                      </div>

                      <div>
                        <Label>Threat Types</Label>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {threatTypes.map(threatType => (
                            <Badge
                              key={threatType}
                              variant={indicator.threat_types.includes(threatType) ? "default" : "outline"}
                              className="cursor-pointer"
                              onClick={() => updateThreatTypes(index, threatType, !indicator.threat_types.includes(threatType))}
                            >
                              {threatType}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              <Button 
                onClick={submitThreatData} 
                disabled={isSubmitting}
                className="w-full"
              >
                <Send className="w-4 h-4 mr-2" />
                {isSubmitting ? 'Submitting...' : 'Submit Threat Data'}
              </Button>
            </TabsContent>

            <TabsContent value="file" className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="file-upload">Upload Threat Data File (JSON)</Label>
                  <div className="mt-2">
                    <input
                      id="file-upload"
                      type="file"
                      accept=".json"
                      onChange={handleFileUpload}
                      className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                  </div>
                </div>

                {fileContent && (
                  <div>
                    <Label>File Preview</Label>
                    <Textarea
                      value={fileContent}
                      readOnly
                      rows={10}
                      className="font-mono text-sm"
                    />
                  </div>
                )}

                <Button 
                  onClick={submitFromFile} 
                  disabled={isSubmitting || !fileContent}
                  className="w-full"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {isSubmitting ? 'Submitting...' : 'Submit from File'}
                </Button>
              </div>
            </TabsContent>
          </Tabs>

          {/* Submission Results */}
          {submissionResult && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-4">Submission Results</h3>
              
              {submissionResult.error ? (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{submissionResult.error}</AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="p-4">
                      <div className="text-center">
                        <Database className="w-8 h-8 mx-auto mb-2 text-blue-500" />
                        <div className="text-2xl font-bold">{submissionResult.total_indicators}</div>
                        <div className="text-sm text-muted-foreground">Total Indicators</div>
                      </div>
                    </Card>
                    <Card className="p-4">
                      <div className="text-center">
                        <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500" />
                        <div className="text-2xl font-bold">{submissionResult.successful_submissions}</div>
                        <div className="text-sm text-muted-foreground">Successful</div>
                      </div>
                    </Card>
                    <Card className="p-4">
                      <div className="text-center">
                        <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-red-500" />
                        <div className="text-2xl font-bold">{submissionResult.failed_submissions}</div>
                        <div className="text-sm text-muted-foreground">Failed</div>
                      </div>
                    </Card>
                  </div>

                  {submissionResult.results && submissionResult.results.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-semibold">Individual Results</h4>
                      {submissionResult.results.map((result, index) => (
                        <Card key={index} className="p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {result.success ? (
                                <CheckCircle className="w-5 h-5 text-green-500" />
                              ) : (
                                <AlertTriangle className="w-5 h-5 text-red-500" />
                              )}
                              <div>
                                <div className="font-medium">
                                  {result.indicator.type}: {result.indicator.value}
                                </div>
                                {result.success ? (
                                  <div className="text-sm text-green-600">
                                    {result.message} (ID: {result.submission_id})
                                  </div>
                                ) : (
                                  <div className="text-sm text-red-600">{result.error}</div>
                                )}
                              </div>
                            </div>
                            {result.success && (
                              <Badge variant="outline">{result.status}</Badge>
                            )}
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default ThreatDataSubmission