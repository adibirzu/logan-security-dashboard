#!/usr/bin/env python3
"""
Startup script for Logan MCP Server
"""

import os
import sys
import asyncio
import logging
from pathlib import Path

# Add the mcp-server directory to Python path
sys.path.insert(0, str(Path(__file__).parent))

from mcp_server import main
from config import config

def setup_logging():
    """Setup logging configuration"""
    logging.basicConfig(
        level=getattr(logging, config.log_level.upper()),
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.FileHandler(config.log_file),
            logging.StreamHandler()
        ]
    )

def check_environment():
    """Check if required environment variables are set"""
    logger = logging.getLogger(__name__)
    
    required_vars = ['LOGAN_COMPARTMENT_ID', 'LOGAN_REGION']
    missing_vars = []
    
    for var in required_vars:
        if not os.getenv(var):
            missing_vars.append(var)
    
    if missing_vars:
        logger.error(f"Missing required environment variables: {', '.join(missing_vars)}")
        logger.error("Please set these variables in your .env file or environment")
        return False
    
    logger.info(f"Environment check passed")
    logger.info(f"Region: {config.region}")
    logger.info(f"Compartment ID: {config.compartment_id[:20]}..." if config.compartment_id else "Not set")
    
    return True

def main_startup():
    """Main startup function"""
    setup_logging()
    logger = logging.getLogger(__name__)
    
    logger.info("=" * 60)
    logger.info("Starting Logan Security Dashboard MCP Server")
    logger.info("=" * 60)
    
    # Check environment
    if not check_environment():
        sys.exit(1)
    
    # Validate configuration
    try:
        config.validate()
        logger.info("Configuration validation passed")
    except ValueError as e:
        logger.error(f"Configuration error: {e}")
        sys.exit(1)
    
    # Check OCI configuration
    oci_config_path = os.path.expanduser("~/.oci/config")
    if not os.path.exists(oci_config_path):
        logger.warning(f"OCI config file not found at {oci_config_path}")
        logger.warning("Make sure OCI CLI is configured properly")
    else:
        logger.info(f"OCI config found at {oci_config_path}")
    
    # Start the server
    try:
        logger.info("Starting MCP server...")
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Server stopped by user")
    except Exception as e:
        logger.error(f"Server error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main_startup()