/**
 * Safe clipboard utilities with fallback for unsupported environments
 */

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    // Check if clipboard API is available
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
    
    // Fallback method using document.execCommand (deprecated but widely supported)
    if (document.execCommand) {
      const textArea = document.createElement('textarea')
      textArea.value = text
      textArea.style.position = 'fixed'
      textArea.style.left = '-999999px'
      textArea.style.top = '-999999px'
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()
      
      const result = document.execCommand('copy')
      document.body.removeChild(textArea)
      return result
    }
    
    return false
  } catch (error) {
    console.warn('Failed to copy to clipboard:', error)
    return false
  }
}

export async function readFromClipboard(): Promise<string | null> {
  try {
    // Check if clipboard API is available
    if (navigator?.clipboard?.readText) {
      return await navigator.clipboard.readText()
    }
    
    // No fallback for reading from clipboard
    return null
  } catch (error) {
    console.warn('Failed to read from clipboard:', error)
    return null
  }
}

export function isClipboardSupported(): boolean {
  return !!(navigator?.clipboard?.writeText || document.execCommand)
}