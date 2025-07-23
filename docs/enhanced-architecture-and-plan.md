# Enhanced DB Architecture and Implementation Plan

## Architecture Diagram
This ER diagram visualizes the extended Oracle ADW schema, relationships, and integrations.

```mermaid
erDiagram
    SECURITY_EVENTS {
        VARCHAR2 id PK
        TIMESTAMP timestamp
        VARCHAR2 source
        VARCHAR2 event_type
        VARCHAR2 severity
        VARCHAR2 source_ip
        VARCHAR2 destination_ip
        NUMBER anomaly_score "ML Output"
        VARCHAR2 predicted_root_cause "ML Output"
        NUMBER cpu_usage
        NUMBER ram_usage
        VARCHAR2 access_type "e.g., unwanted"
    }
    DETECTION_RULES {
        VARCHAR2 id PK
        VARCHAR2 name
        CLOB query
        VARCHAR2 severity
        JSON mitre_attack_ids
    }
    ML_PREDICTIONS {
        VARCHAR2 id PK
        VARCHAR2 event_id FK
        VARCHAR2 model_type "e.g., prediction"
        JSON prediction "e.g., cpu_forecast"
    }
    IP_NODES {
        VARCHAR2 ip PK
        TIMESTAMP first_seen
        TIMESTAMP last_seen
        VARCHAR2 threat_level
        VARCHAR2 country_code
        JSON metadata
    }
    IP_EDGES {
        VARCHAR2 id PK
        VARCHAR2 source_ip FK
        VARCHAR2 destination_ip FK
        VARCHAR2 event_type
        NUMBER count
        JSON attributes
    }
    THREAT_INTELLIGENCE_INDICATORS {
        VARCHAR2 id PK
        VARCHAR2 indicator_type
        VARCHAR2 indicator_value
        VARCHAR2 severity
        JSON metadata
    }

    SECURITY_EVENTS ||--o{ DETECTION_RULES : "detected_by"
    SECURITY_EVENTS ||--o{ ML_PREDICTIONS : "has_predictions"
    SECURITY_EVENTS ||--o{ IP_EDGES : "generates_edges"
    IP_NODES ||--|{ IP_EDGES : "connected_via"
    SECURITY_EVENTS ||--o{ THREAT_INTELLIGENCE_INDICATORS : "matches_ioc"
    ML_PREDICTIONS ||--|| OCI_DATA_SCIENCE : "generated_by (Hourly Jobs)"
    SECURITY_EVENTS ||--|| OCI_LOGGING_ANALYTICS : "synced_from (Detected Fields)"
    IP_EDGES ||--|| GRAPHQL_RESOLVERS : "queried_via (IP Relations)"

    OCI_LOGGING_ANALYTICS {
        note "Sources: Audit Logs, VCN Flow, WAF, etc.\nDetected Fields: IPs, Timestamps, Events"
    }
    OCI_DATA_SCIENCE {
        note "ML Jobs: Predictions (Prophet),\nRoot Cause (causalml),\nAnomaly Detection (Isolation Forest)"
    }
    GRAPHQL_RESOLVERS {
        note "Exposes: ipGraph, eventPredictions\nFor Frontend Visuals"
    }
```

## Implementation Plan
This plan extends the logan-security-dashboard with ADW for log storage, GraphQL for IP visualizations, OCI Data Science for ML (predictions, root causes, anomaly detection), and a new MCP server for Data Science interactions. Syncs are hourly, focusing on detected fields from OCI Logging Analytics.

### 1. Database Enhancements (Oracle ADW)
- Extend existing schema (database/schema/oracle-schema.sql).
- Add ML fields to `security_events` (anomaly_score, predicted_root_cause, cpu_usage, ram_usage, access_type).
- Create `ml_predictions` table for storing OCI Data Science outputs.
- Create `ip_nodes` and `ip_edges` for graph modeling of IP relations.
- Add views/materialized views for efficient querying (e.g., v_ip_graph).

### 2. Data Ingestion and Sync
- Modify scripts/enhanced_log_ingestion.py to fetch and sync only detected fields (from FIELD_MAPPINGS.md) hourly.
- Use node-oracledb for ADW inserts (build on test-autonomous-db.js).
- Schedule via n8n or cron.

### 3. OCI Data Science Integration
- Use existing instance in working compartment.
- Create generic GitHub template repo with notebooks/jobs (users define OCIDs/auth in env.yaml).
- Models: Prophet for CPU/RAM predictions; causalml for app error root causes; Isolation Forest for unwanted access detection.
- Hourly jobs: Export ADW data to Object Storage, process, import predictions back.

### 4. GraphQL Integration
- Add Apollo Server to Next.js (api/graphql/route.ts).
- Define schema for IP graphs, paths, and ML predictions (e.g., cpuForecast, isUnwantedAccess).
- Resolvers query ADW, integrating graph traversals and ML data.
- Update frontend (e.g., threat-map/page.tsx) with Cytoscape.js for visuals.

### 5. MCP Server for Data Science
- Create in /Users/abirzu/Documents/Cline/MCP/data-science-mcp (TypeScript project via npx).
- Tools: `run_ml_job` (trigger jobs), `get_predictions` (fetch and store in ADW).
- Generic code for GitHub: Placeholders for user config.
- Integrate with Cline by editing cline_mcp_settings.json (disabled=false).

### 6. Testing and Deployment
- Test sync, ML runs, GraphQL queries, and visuals.
- Document in README.md for other users.
