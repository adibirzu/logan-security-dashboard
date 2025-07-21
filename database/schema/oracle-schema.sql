-- Logan Security Dashboard - Oracle 23ai Database Schema
-- This schema defines tables for storing security queries, events, and detection rules

-- Enable Oracle 23ai JSON features
ALTER SESSION SET CONTAINER = CDB$ROOT;

-- Create tablespace for Logan Security Dashboard (optional)
-- CREATE TABLESPACE LOGAN_SECURITY_TBS DATAFILE 'logan_security.dbf' SIZE 1G AUTOEXTEND ON NEXT 100M;

-- Create the main user/schema
-- CREATE USER LOGAN_USER IDENTIFIED BY "SecurePassword123!"
-- DEFAULT TABLESPACE LOGAN_SECURITY_TBS
-- TEMPORARY TABLESPACE TEMP
-- QUOTA UNLIMITED ON LOGAN_SECURITY_TBS;

-- Grant necessary privileges
-- GRANT CONNECT, RESOURCE, CREATE VIEW, CREATE PROCEDURE TO LOGAN_USER;
-- GRANT SELECT ANY DICTIONARY TO LOGAN_USER;

-- Switch to the LOGAN_USER schema
-- ALTER SESSION SET CURRENT_SCHEMA = LOGAN_USER;

-- Table: saved_queries
-- Stores user-created and system queries for reuse
CREATE TABLE saved_queries (
    id VARCHAR2(36) PRIMARY KEY,
    name VARCHAR2(255) NOT NULL,
    description CLOB,
    query CLOB NOT NULL,
    category VARCHAR2(100) DEFAULT 'general',
    parameters JSON,  -- Oracle 23ai native JSON support
    created_by VARCHAR2(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_public NUMBER(1) DEFAULT 0,
    tags JSON,  -- JSON array of tags
    execution_count NUMBER DEFAULT 0,
    avg_execution_time NUMBER DEFAULT 0,
    
    -- Constraints
    CONSTRAINT chk_is_public CHECK (is_public IN (0, 1)),
    CONSTRAINT chk_execution_count CHECK (execution_count >= 0),
    CONSTRAINT chk_avg_execution_time CHECK (avg_execution_time >= 0)
);

-- Indexes for saved_queries
CREATE INDEX idx_saved_queries_category ON saved_queries(category);
CREATE INDEX idx_saved_queries_created_by ON saved_queries(created_by);
CREATE INDEX idx_saved_queries_updated_at ON saved_queries(updated_at DESC);
CREATE INDEX idx_saved_queries_public ON saved_queries(is_public);

-- Table: security_events
-- Stores important security events identified by detection rules
CREATE TABLE security_events (
    id VARCHAR2(36) PRIMARY KEY,
    timestamp TIMESTAMP NOT NULL,
    source VARCHAR2(255) NOT NULL,
    event_type VARCHAR2(100) NOT NULL,
    severity VARCHAR2(20) NOT NULL,
    description CLOB NOT NULL,
    source_ip VARCHAR2(45),  -- IPv4 or IPv6
    destination_ip VARCHAR2(45),  -- IPv4 or IPv6
    principal VARCHAR2(255),
    action VARCHAR2(100) NOT NULL,
    result VARCHAR2(20) NOT NULL,
    detection_rule_id VARCHAR2(36),
    mitre_attack_id VARCHAR2(20),
    raw_log_data CLOB NOT NULL,
    processed NUMBER(1) DEFAULT 0,
    alert_generated NUMBER(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT chk_severity CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    CONSTRAINT chk_result CHECK (result IN ('success', 'failure', 'denied')),
    CONSTRAINT chk_processed CHECK (processed IN (0, 1)),
    CONSTRAINT chk_alert_generated CHECK (alert_generated IN (0, 1))
);

-- Indexes for security_events
CREATE INDEX idx_security_events_timestamp ON security_events(timestamp DESC);
CREATE INDEX idx_security_events_severity ON security_events(severity);
CREATE INDEX idx_security_events_source ON security_events(source);
CREATE INDEX idx_security_events_event_type ON security_events(event_type);
CREATE INDEX idx_security_events_source_ip ON security_events(source_ip);
CREATE INDEX idx_security_events_dest_ip ON security_events(destination_ip);
CREATE INDEX idx_security_events_principal ON security_events(principal);
CREATE INDEX idx_security_events_mitre ON security_events(mitre_attack_id);
CREATE INDEX idx_security_events_processed ON security_events(processed);

-- Table: detection_rules
-- Stores custom detection rules for identifying security events
CREATE TABLE detection_rules (
    id VARCHAR2(36) PRIMARY KEY,
    name VARCHAR2(255) NOT NULL UNIQUE,
    description CLOB,
    query CLOB NOT NULL,
    severity VARCHAR2(20) NOT NULL,
    category VARCHAR2(100) NOT NULL,
    mitre_attack_ids JSON,  -- JSON array of MITRE ATT&CK technique IDs
    enabled NUMBER(1) DEFAULT 1,
    alert_threshold NUMBER DEFAULT 1,
    time_window NUMBER DEFAULT 300,  -- Time window in seconds
    created_by VARCHAR2(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_triggered TIMESTAMP,
    trigger_count NUMBER DEFAULT 0,
    
    -- Constraints
    CONSTRAINT chk_rule_severity CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    CONSTRAINT chk_rule_enabled CHECK (enabled IN (0, 1)),
    CONSTRAINT chk_alert_threshold CHECK (alert_threshold > 0),
    CONSTRAINT chk_time_window CHECK (time_window > 0),
    CONSTRAINT chk_trigger_count CHECK (trigger_count >= 0)
);

-- Indexes for detection_rules
CREATE INDEX idx_detection_rules_enabled ON detection_rules(enabled);
CREATE INDEX idx_detection_rules_severity ON detection_rules(severity);
CREATE INDEX idx_detection_rules_category ON detection_rules(category);
CREATE INDEX idx_detection_rules_created_by ON detection_rules(created_by);

-- Table: query_execution_history
-- Tracks query execution for performance monitoring and auditing
CREATE TABLE query_execution_history (
    id VARCHAR2(36) PRIMARY KEY,
    query_id VARCHAR2(36),  -- References saved_queries.id (optional)
    query_text CLOB NOT NULL,
    executed_by VARCHAR2(100) NOT NULL,
    execution_time NUMBER NOT NULL,  -- Milliseconds
    row_count NUMBER,
    success NUMBER(1) NOT NULL,
    error_message CLOB,
    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key (optional, query might not be saved)
    CONSTRAINT fk_query_history_query FOREIGN KEY (query_id) REFERENCES saved_queries(id),
    CONSTRAINT chk_execution_success CHECK (success IN (0, 1)),
    CONSTRAINT chk_execution_time CHECK (execution_time >= 0)
);

-- Indexes for query_execution_history
CREATE INDEX idx_query_history_executed_at ON query_execution_history(executed_at DESC);
CREATE INDEX idx_query_history_executed_by ON query_execution_history(executed_by);
CREATE INDEX idx_query_history_success ON query_execution_history(success);
CREATE INDEX idx_query_history_query_id ON query_execution_history(query_id);

-- Table: threat_intelligence_indicators
-- Stores threat intelligence data (IOCs, IPs, domains, hashes)
CREATE TABLE threat_intelligence_indicators (
    id VARCHAR2(36) PRIMARY KEY,
    indicator_type VARCHAR2(20) NOT NULL,  -- ip, domain, hash, url, email
    indicator_value VARCHAR2(500) NOT NULL,
    threat_type VARCHAR2(100),
    confidence_score NUMBER(3,2) CHECK (confidence_score BETWEEN 0 AND 1),
    severity VARCHAR2(20) NOT NULL,
    source VARCHAR2(255),
    description CLOB,
    first_seen TIMESTAMP,
    last_seen TIMESTAMP,
    is_active NUMBER(1) DEFAULT 1,
    metadata JSON,  -- Additional metadata in JSON format
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT chk_indicator_type CHECK (indicator_type IN ('ip', 'domain', 'hash', 'url', 'email', 'cve')),
    CONSTRAINT chk_ti_severity CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    CONSTRAINT chk_ti_active CHECK (is_active IN (0, 1))
);

-- Indexes for threat_intelligence_indicators
CREATE UNIQUE INDEX idx_ti_indicator_value ON threat_intelligence_indicators(indicator_type, indicator_value);
CREATE INDEX idx_ti_threat_type ON threat_intelligence_indicators(threat_type);
CREATE INDEX idx_ti_severity ON threat_intelligence_indicators(severity);
CREATE INDEX idx_ti_active ON threat_intelligence_indicators(is_active);
CREATE INDEX idx_ti_last_seen ON threat_intelligence_indicators(last_seen DESC);

-- Table: log_source_mapping
-- Maps OCI Logging Analytics sources to database tracking
CREATE TABLE log_source_mapping (
    id VARCHAR2(36) PRIMARY KEY,
    source_name VARCHAR2(255) NOT NULL UNIQUE,
    source_type VARCHAR2(100) NOT NULL,
    compartment_id VARCHAR2(255),
    log_group_id VARCHAR2(255),
    is_active NUMBER(1) DEFAULT 1,
    last_ingestion TIMESTAMP,
    record_count NUMBER DEFAULT 0,
    configuration JSON,  -- Source-specific configuration
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT chk_log_source_active CHECK (is_active IN (0, 1)),
    CONSTRAINT chk_record_count CHECK (record_count >= 0)
);

-- Indexes for log_source_mapping
CREATE INDEX idx_log_source_type ON log_source_mapping(source_type);
CREATE INDEX idx_log_source_active ON log_source_mapping(is_active);
CREATE INDEX idx_log_source_last_ingestion ON log_source_mapping(last_ingestion DESC);

-- Create triggers for automatic timestamp updates
CREATE OR REPLACE TRIGGER trg_saved_queries_updated_at
    BEFORE UPDATE ON saved_queries
    FOR EACH ROW
BEGIN
    :NEW.updated_at := CURRENT_TIMESTAMP;
END;
/

CREATE OR REPLACE TRIGGER trg_detection_rules_updated_at
    BEFORE UPDATE ON detection_rules
    FOR EACH ROW
BEGIN
    :NEW.updated_at := CURRENT_TIMESTAMP;
END;
/

CREATE OR REPLACE TRIGGER trg_ti_indicators_updated_at
    BEFORE UPDATE ON threat_intelligence_indicators
    FOR EACH ROW
BEGIN
    :NEW.updated_at := CURRENT_TIMESTAMP;
END;
/

CREATE OR REPLACE TRIGGER trg_log_source_mapping_updated_at
    BEFORE UPDATE ON log_source_mapping
    FOR EACH ROW
BEGIN
    :NEW.updated_at := CURRENT_TIMESTAMP;
END;
/

-- Table: incidents
-- Stores security incidents for incident response tracking
CREATE TABLE incidents (
    id VARCHAR2(36) PRIMARY KEY,
    title VARCHAR2(255) NOT NULL,
    description CLOB NOT NULL,
    severity VARCHAR2(20) NOT NULL,
    status VARCHAR2(20) NOT NULL,
    category VARCHAR2(100) DEFAULT 'Security',
    source VARCHAR2(255) DEFAULT 'Manual',
    assignee VARCHAR2(100),
    reporter VARCHAR2(100) DEFAULT 'System',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP,
    ttd NUMBER DEFAULT 0,  -- Time to Detection (minutes)
    ttr NUMBER DEFAULT 0,  -- Time to Response (minutes)
    tags JSON,  -- JSON array of tags
    iocs JSON,  -- JSON array of Indicators of Compromise
    affected_systems JSON,  -- JSON array of affected systems
    timeline JSON,  -- JSON array of timeline events
    artifacts JSON,  -- JSON array of artifacts
    workflow_executions JSON,  -- JSON array of workflow execution IDs
    
    -- Constraints
    CONSTRAINT chk_incident_severity CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    CONSTRAINT chk_incident_status CHECK (status IN ('open', 'investigating', 'contained', 'resolved', 'closed')),
    CONSTRAINT chk_incident_ttd CHECK (ttd >= 0),
    CONSTRAINT chk_incident_ttr CHECK (ttr >= 0)
);

-- Indexes for incidents
CREATE INDEX idx_incidents_severity ON incidents(severity);
CREATE INDEX idx_incidents_status ON incidents(status);
CREATE INDEX idx_incidents_category ON incidents(category);
CREATE INDEX idx_incidents_assignee ON incidents(assignee);
CREATE INDEX idx_incidents_created_at ON incidents(created_at DESC);
CREATE INDEX idx_incidents_updated_at ON incidents(updated_at DESC);

-- Trigger for incidents updated_at
CREATE OR REPLACE TRIGGER trg_incidents_updated_at
    BEFORE UPDATE ON incidents
    FOR EACH ROW
BEGIN
    :NEW.updated_at := CURRENT_TIMESTAMP;
END;
/

-- Create sequences for generating IDs (if not using UUIDs)
CREATE SEQUENCE seq_saved_queries START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE seq_security_events START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE seq_detection_rules START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE seq_query_history START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE seq_ti_indicators START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE seq_log_source_mapping START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE seq_incidents START WITH 1 INCREMENT BY 1;

-- Insert some default categories and detection rules
INSERT INTO saved_queries (
    id, name, description, query, category, created_by, is_public
) VALUES (
    'default-security-overview',
    'Security Events Overview',
    'Overview of all security events in the last 24 hours',
    '* | where "Log Source" in ("OCI Audit Logs", "Windows Security Events") | stats count by "Event Name" | sort -count',
    'security',
    'system',
    1
);

INSERT INTO detection_rules (
    id, name, description, query, severity, category, created_by, enabled
) VALUES (
    'failed-login-detection',
    'Failed Login Attempts',
    'Detects multiple failed login attempts from same source',
    '* | where "Event Name" like "%failed%" and "Event Name" like "%login%" | stats count by "Source IP" | where count > 5',
    'medium',
    'authentication',
    'system',
    1
);

INSERT INTO detection_rules (
    id, name, description, query, severity, category, created_by, enabled
) VALUES (
    'privilege-escalation-detection',
    'Privilege Escalation Attempts',
    'Detects potential privilege escalation activities',
    '* | where "Event Name" in ("UserAccountControl", "AddMember", "ChangePassword") and "Result" = "Success"',
    'high',
    'privilege-escalation',
    'system',
    1
);

-- Create views for common queries
CREATE OR REPLACE VIEW v_recent_security_events AS
SELECT 
    se.*,
    dr.name as rule_name,
    dr.category as rule_category
FROM security_events se
LEFT JOIN detection_rules dr ON se.detection_rule_id = dr.id
WHERE se.timestamp >= SYSTIMESTAMP - INTERVAL '7' DAY
ORDER BY se.timestamp DESC;

CREATE OR REPLACE VIEW v_active_threat_indicators AS
SELECT *
FROM threat_intelligence_indicators
WHERE is_active = 1
AND (last_seen IS NULL OR last_seen >= SYSTIMESTAMP - INTERVAL '30' DAY)
ORDER BY severity DESC, last_seen DESC;

-- Create materialized view for performance (Oracle 23ai)
CREATE MATERIALIZED VIEW mv_security_events_daily AS
SELECT 
    TRUNC(timestamp) as event_date,
    source,
    event_type,
    severity,
    COUNT(*) as event_count,
    COUNT(DISTINCT source_ip) as unique_source_ips,
    COUNT(DISTINCT principal) as unique_principals
FROM security_events
WHERE timestamp >= SYSTIMESTAMP - INTERVAL '90' DAY
GROUP BY TRUNC(timestamp), source, event_type, severity;

-- Set up automatic refresh for materialized view
-- BEGIN
--   DBMS_SCHEDULER.CREATE_JOB (
--     job_name        => 'REFRESH_SECURITY_EVENTS_MV',
--     job_type        => 'PLSQL_BLOCK',
--     job_action      => 'BEGIN DBMS_MVIEW.REFRESH(''MV_SECURITY_EVENTS_DAILY''); END;',
--     start_date      => SYSTIMESTAMP,
--     repeat_interval => 'FREQ=HOURLY;INTERVAL=1'
--   );
--   DBMS_SCHEDULER.ENABLE('REFRESH_SECURITY_EVENTS_MV');
-- END;
-- /

-- Create JSON search index for better performance (Oracle 23ai feature)
-- CREATE SEARCH INDEX idx_saved_queries_params_json ON saved_queries (parameters) FOR JSON;
-- CREATE SEARCH INDEX idx_ti_metadata_json ON threat_intelligence_indicators (metadata) FOR JSON;

-- Grant permissions to application user
-- GRANT SELECT, INSERT, UPDATE, DELETE ON saved_queries TO LOGAN_APP_USER;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON security_events TO LOGAN_APP_USER;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON detection_rules TO LOGAN_APP_USER;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON query_execution_history TO LOGAN_APP_USER;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON threat_intelligence_indicators TO LOGAN_APP_USER;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON log_source_mapping TO LOGAN_APP_USER;

COMMIT;

-- Schema creation completed
SELECT 'Logan Security Dashboard Oracle 23ai schema created successfully!' as status FROM dual;