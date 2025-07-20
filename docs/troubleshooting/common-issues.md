# Troubleshooting Guide

This guide covers common issues you might encounter while working with the Logan Security Dashboard and their solutions.

## 🚨 Build and Compilation Issues

### Issue: TypeScript Compilation Errors

**Symptoms:**
- Build fails with TypeScript errors
- Missing type definitions
- Type mismatch errors

**Common Errors:**
```
Type error: Cannot find name 'selectedAppIndex'
Property 'timeRange' does not exist on type
```

**Solutions:**

1. **Check State Variable Declarations**
   ```typescript
   // Make sure all state variables are declared
   const [selectedAppIndex, setSelectedAppIndex] = useState<number | null>(null);
   ```

2. **Verify Interface Definitions**
   ```typescript
   interface ComponentProps {
     timeRange?: string;
     onSelect?: (item: any) => void;
   }
   ```

3. **Check Import Statements**
   ```typescript
   // Ensure all imports are correct
   import { XCircle } from 'lucide-react';
   ```

### Issue: Missing Dependencies

**Symptoms:**
- Module not found errors
- Import resolution failures

**Solutions:**

1. **Install Missing Dependencies**
   ```bash
   npm install
   # or if specific package is missing
   npm install @package-name
   ```

2. **Check Package.json**
   ```json
   {
     "dependencies": {
       "react": "^18.0.0",
       "next": "^15.0.0"
     }
   }
   ```

## 🔌 OCI Integration Issues

### Issue: OCI Authentication Failures

**Symptoms:**
- "Authentication failed" errors
- "Invalid credentials" messages
- Connection timeouts

**Solutions:**

1. **Check OCI CLI Configuration**
   ```bash
   oci setup config
   oci iam user get --user-id <user-ocid>
   ```

2. **Verify Instance Principal Setup**
   ```bash
   # Check if running on OCI instance
   curl -H "Authorization: Bearer Oracle" http://169.254.169.254/opc/v2/instance/
   ```

3. **Environment Variables**
   ```bash
   export LOGAN_REGION=eu-frankfurt-1
   export LOGAN_COMPARTMENT_ID=ocid1.compartment...
   ```

### Issue: OCI API Errors

**Symptoms:**
- "Missing input" errors
- "Invalid query" responses
- API rate limiting

**Solutions:**

1. **Check Query Syntax**
   ```sql
   -- Correct OCI query syntax
   * | where 'Event Name' = 'UserAuthenticated' 
     and Time > dateRelative(24h)
   ```

2. **Verify Field Names**
   ```sql
   -- Use correct field names with quotes for spaces
   'Event Name', 'Principal Name', 'IP Address'
   ```

3. **Handle Rate Limits**
   ```python
   import time
   from oci.exceptions import ServiceError
   
   try:
       response = client.search_logs(request)
   except ServiceError as e:
       if e.status == 429:  # Rate limited
           time.sleep(60)  # Wait and retry
   ```

## 🌐 Network and Connectivity Issues

### Issue: API Route Failures

**Symptoms:**
- 500 Internal Server Error
- API endpoints not responding
- Timeout errors

**Solutions:**

1. **Check Python Script Paths**
   ```typescript
   // Verify script paths in API routes
   const scriptPath = path.join(process.cwd(), 'scripts', 'logan_client.py')
   ```

2. **Debug Python Script Execution**
   ```bash
   cd scripts
   python3 logan_client.py test
   ```

3. **Check Error Logs**
   ```bash
   # Development
   npm run dev
   
   # Production
   pm2 logs logan-security-dashboard
   ```

### Issue: CORS Errors

**Symptoms:**
- "Blocked by CORS policy" errors
- Cross-origin request failures

**Solutions:**

1. **Configure CORS in Next.js**
   ```typescript
   // next.config.ts
   const nextConfig = {
     async headers() {
       return [
         {
           source: '/api/:path*',
           headers: [
             { key: 'Access-Control-Allow-Origin', value: '*' },
             { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE' },
           ],
         },
       ]
     },
   }
   ```

## 🎨 UI and Component Issues

### Issue: Components Not Rendering

**Symptoms:**
- Blank pages
- Components not displaying
- Layout issues

**Solutions:**

1. **Check React Fragment Usage**
   ```tsx
   // Correct usage
   return (
     <React.Fragment key={index}>
       <div>Content</div>
       {condition && <div>Conditional content</div>}
     </React.Fragment>
   );
   ```

2. **Verify Component Exports**
   ```typescript
   // Named export
   export function MyComponent() { ... }
   
   // Default export
   export default function MyComponent() { ... }
   ```

3. **Check Import Paths**
   ```typescript
   // Correct import paths
   import { Button } from '@/components/ui/button';
   import { MyComponent } from './MyComponent';
   ```

### Issue: Time Range Integration Problems

**Symptoms:**
- Time filters not syncing
- Multiple time selectors
- Inconsistent data

**Solutions:**

1. **Use Props for Time Range**
   ```typescript
   interface ComponentProps {
     timeRange: string;
   }
   
   function MyComponent({ timeRange }: ComponentProps) {
     // Use passed timeRange instead of local state
   }
   ```

2. **Remove Duplicate Time Controls**
   ```tsx
   // Remove local TimeRangeSelector when parent has UnifiedTimeFilter
   // <TimeRangeSelector ... /> // Remove this
   ```

3. **Synchronize API Calls**
   ```typescript
   useEffect(() => {
     loadData();
   }, [timeRange]); // Depend on prop timeRange
   ```

## 🗄️ Data and API Issues

### Issue: Empty Data Responses

**Symptoms:**
- No data displayed
- "No results found" messages
- Loading states that never complete

**Solutions:**

1. **Check API Response Structure**
   ```typescript
   // Verify API response format
   const response = await fetch('/api/endpoint');
   const data = await response.json();
   console.log('API Response:', data);
   ```

2. **Handle Error Responses**
   ```typescript
   if (!response.ok) {
     throw new Error(`API error: ${response.status}`);
   }
   ```

3. **Verify Data Processing**
   ```python
   # In Python scripts, ensure proper data return
   return {
       "success": True,
       "data": processed_data,
       "total": len(processed_data)
   }
   ```

### Issue: Performance Problems

**Symptoms:**
- Slow page loads
- High memory usage
- Unresponsive UI

**Solutions:**

1. **Implement Pagination**
   ```typescript
   const [currentPage, setCurrentPage] = useState(1);
   const itemsPerPage = 20;
   const paginatedData = data.slice(
     (currentPage - 1) * itemsPerPage,
     currentPage * itemsPerPage
   );
   ```

2. **Use React.memo for Components**
   ```typescript
   const ExpensiveComponent = React.memo(({ data }) => {
     return <div>{/* Render data */}</div>;
   });
   ```

3. **Optimize API Calls**
   ```typescript
   const debouncedSearch = useCallback(
     debounce((searchTerm) => {
       searchData(searchTerm);
     }, 300),
     []
   );
   ```

## 🚀 Deployment Issues

### Issue: Production Build Failures

**Symptoms:**
- Build fails in production
- Missing environment variables
- Static generation errors

**Solutions:**

1. **Set Production Environment Variables**
   ```bash
   NODE_ENV=production
   LOGAN_REGION=eu-frankfurt-1
   LOGAN_COMPARTMENT_ID=ocid1.compartment...
   ```

2. **Check Static Generation**
   ```typescript
   // For dynamic routes, ensure proper data fetching
   export async function generateStaticParams() {
     return []; // Return empty array for dynamic generation
   }
   ```

3. **Verify Build Configuration**
   ```javascript
   // next.config.ts
   const nextConfig = {
     output: 'standalone', // For Docker deployment
     experimental: {
       serverComponentsExternalPackages: ['python-shell']
     }
   };
   ```

### Issue: PM2 Process Management

**Symptoms:**
- Application not starting
- Process crashes
- Memory leaks

**Solutions:**

1. **Check PM2 Configuration**
   ```javascript
   // ecosystem.config.js
   module.exports = {
     apps: [{
       name: 'logan-security-dashboard',
       script: 'server.js',
       instances: 1,
       exec_mode: 'cluster',
       env: {
         NODE_ENV: 'production'
       }
     }]
   };
   ```

2. **Monitor PM2 Logs**
   ```bash
   pm2 logs logan-security-dashboard --lines 50
   pm2 monit
   ```

3. **Restart Application**
   ```bash
   pm2 restart logan-security-dashboard
   pm2 reload logan-security-dashboard
   ```

## 🔍 Debugging Tips

### General Debugging Steps

1. **Check Browser Console**
   - Open Developer Tools (F12)
   - Look for JavaScript errors in Console tab
   - Check Network tab for failed requests

2. **Review Server Logs**
   ```bash
   # Development
   npm run dev
   
   # Production
   pm2 logs logan-security-dashboard
   
   # System logs
   tail -f /var/log/application.log
   ```

3. **Test Individual Components**
   ```bash
   # Test OCI connection
   cd scripts && python3 logan_client.py test
   
   # Test specific API endpoint
   curl http://localhost:3000/api/health
   ```

4. **Use Debug Mode**
   ```bash
   DEBUG=* npm run dev
   ```

### Logging Best Practices

1. **Add Debug Logging**
   ```typescript
   console.log('Debug: API call started', { endpoint, params });
   console.error('Error: API call failed', error);
   ```

2. **Use Structured Logging**
   ```python
   import logging
   
   logging.basicConfig(level=logging.DEBUG)
   logger = logging.getLogger(__name__)
   logger.info(f"Processing request: {request_id}")
   ```

3. **Monitor Application Health**
   ```typescript
   // Add health check endpoint
   export async function GET() {
     return Response.json({ 
       status: 'ok', 
       timestamp: new Date().toISOString(),
       version: process.env.npm_package_version 
     });
   }
   ```

## 📞 Getting Help

If you're still experiencing issues:

1. **Check the FAQ**: Review common questions and answers
2. **Search Issues**: Look for similar problems in the issue tracker
3. **Create a Bug Report**: Include detailed error messages and reproduction steps
4. **Contact Support**: Reach out to the development team with specific error details

Remember to include:
- Error messages (full stack traces)
- Environment details (Node.js version, OS)
- Steps to reproduce the issue
- Expected vs actual behavior