"""
Configuration management for Logan MCP Server
"""

import os
from typing import Optional
from dataclasses import dataclass
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

@dataclass
class MCPServerConfig:
    """Configuration class for MCP Server"""
    
    # OCI Configuration
    region: str = os.getenv('LOGAN_REGION', 'eu-frankfurt-1')
    compartment_id: Optional[str] = os.getenv('LOGAN_COMPARTMENT_ID')
    namespace: Optional[str] = os.getenv('LOGAN_NAMESPACE')
    
    # Server Configuration
    server_name: str = "logan-security-dashboard"
    server_version: str = "1.0.0"
    max_connections: int = int(os.getenv('MAX_CONNECTIONS', '10'))
    request_timeout: int = int(os.getenv('REQUEST_TIMEOUT', '30'))
    
    # Query Configuration
    default_time_period_minutes: int = int(os.getenv('DEFAULT_TIME_PERIOD_MINUTES', '1440'))
    max_query_results: int = int(os.getenv('MAX_QUERY_RESULTS', '1000'))
    query_timeout_seconds: int = int(os.getenv('QUERY_TIMEOUT_SECONDS', '300'))
    
    # Logging Configuration
    log_level: str = os.getenv('LOG_LEVEL', 'INFO')
    log_file: str = os.getenv('LOG_FILE', 'mcp_server.log')
    debug_mode: bool = os.getenv('LOGAN_DEBUG', 'false').lower() == 'true'
    
    # Security Configuration
    enable_query_validation: bool = os.getenv('ENABLE_QUERY_VALIDATION', 'true').lower() == 'true'
    max_query_length: int = int(os.getenv('MAX_QUERY_LENGTH', '10000'))
    allowed_query_patterns: list = [
        r'^[\w\s\|\(\)\[\]\{\}\'\"=<>!&\-\+\*/%,.:;]+$'  # Basic query pattern
    ]
    
    # Cache Configuration
    enable_caching: bool = os.getenv('ENABLE_CACHING', 'true').lower() == 'true'
    cache_ttl_seconds: int = int(os.getenv('CACHE_TTL_SECONDS', '300'))
    max_cache_size: int = int(os.getenv('MAX_CACHE_SIZE', '100'))
    
    # Feature Flags
    enable_field_discovery: bool = os.getenv('ENABLE_FIELD_DISCOVERY', 'true').lower() == 'true'
    enable_storage_monitoring: bool = os.getenv('ENABLE_STORAGE_MONITORING', 'true').lower() == 'true'
    enable_security_analysis: bool = os.getenv('ENABLE_SECURITY_ANALYSIS', 'true').lower() == 'true'
    
    def validate(self) -> bool:
        """Validate configuration"""
        if not self.compartment_id:
            raise ValueError("LOGAN_COMPARTMENT_ID is required")
        
        if not self.region:
            raise ValueError("LOGAN_REGION is required")
        
        if self.max_connections <= 0:
            raise ValueError("MAX_CONNECTIONS must be positive")
        
        if self.request_timeout <= 0:
            raise ValueError("REQUEST_TIMEOUT must be positive")
        
        return True
    
    @classmethod
    def from_env(cls) -> 'MCPServerConfig':
        """Create configuration from environment variables"""
        config = cls()
        config.validate()
        return config

# Global configuration instance
config = MCPServerConfig.from_env()