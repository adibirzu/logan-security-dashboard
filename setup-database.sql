-- Oracle Autonomous Database Setup Script
-- Run this when the database connection is working
-- Creates tables for Logan Security Dashboard

-- Create sequence for security events
CREATE SEQUENCE security_events_seq
  START WITH 1
  INCREMENT BY 1
  NOCACHE;

-- Create security events table
CREATE TABLE security_events (
  id VARCHAR2(50) DEFAULT 'EVT-' || LPAD(security_events_seq.NEXTVAL, 10, '0') PRIMARY KEY,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  source VARCHAR2(100) NOT NULL,
  event_type VARCHAR2(100) NOT NULL,
  severity VARCHAR2(20) CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  description VARCHAR2(4000),
  source_ip VARCHAR2(45),
  destination_ip VARCHAR2(45),
  principal VARCHAR2(255),
  action VARCHAR2(255) NOT NULL,
  result VARCHAR2(20) CHECK (result IN ('success', 'failure', 'denied')),
  detection_rule_id VARCHAR2(50),
  mitre_attack_id VARCHAR2(50),
  raw_log_data CLOB,
  processed NUMBER(1) DEFAULT 0,
  alert_generated NUMBER(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_security_events_timestamp ON security_events(timestamp);
CREATE INDEX idx_security_events_severity ON security_events(severity);
CREATE INDEX idx_security_events_source ON security_events(source);
CREATE INDEX idx_security_events_event_type ON security_events(event_type);

-- Create sequence for saved queries
CREATE SEQUENCE saved_queries_seq
  START WITH 1
  INCREMENT BY 1
  NOCACHE;

-- Create saved queries table
CREATE TABLE saved_queries (
  id VARCHAR2(50) DEFAULT 'QRY-' || LPAD(saved_queries_seq.NEXTVAL, 10, '0') PRIMARY KEY,
  name VARCHAR2(255) NOT NULL,
  description VARCHAR2(4000),
  query CLOB NOT NULL,
  category VARCHAR2(100),
  parameters CLOB, -- JSON string
  created_by VARCHAR2(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_public NUMBER(1) DEFAULT 0,
  tags CLOB, -- JSON array as string
  execution_count NUMBER DEFAULT 0,
  avg_execution_time NUMBER DEFAULT 0
);

-- Create indexes for saved queries
CREATE INDEX idx_saved_queries_category ON saved_queries(category);
CREATE INDEX idx_saved_queries_created_by ON saved_queries(created_by);
CREATE INDEX idx_saved_queries_public ON saved_queries(is_public);

-- Create sequence for detection rules
CREATE SEQUENCE detection_rules_seq
  START WITH 1
  INCREMENT BY 1
  NOCACHE;

-- Create detection rules table
CREATE TABLE detection_rules (
  id VARCHAR2(50) DEFAULT 'RULE-' || LPAD(detection_rules_seq.NEXTVAL, 10, '0') PRIMARY KEY,
  name VARCHAR2(255) NOT NULL,
  description VARCHAR2(4000),
  query CLOB NOT NULL,
  severity VARCHAR2(20) CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  category VARCHAR2(100),
  mitre_attack_ids CLOB, -- JSON array as string
  enabled NUMBER(1) DEFAULT 1,
  alert_threshold NUMBER DEFAULT 1,
  time_window NUMBER DEFAULT 3600, -- seconds
  created_by VARCHAR2(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_triggered TIMESTAMP,
  trigger_count NUMBER DEFAULT 0
);

-- Create indexes for detection rules
CREATE INDEX idx_detection_rules_enabled ON detection_rules(enabled);
CREATE INDEX idx_detection_rules_severity ON detection_rules(severity);
CREATE INDEX idx_detection_rules_category ON detection_rules(category);

-- Create incidents table for incident response
CREATE SEQUENCE incidents_seq
  START WITH 1
  INCREMENT BY 1
  NOCACHE;

CREATE TABLE incidents (
  id VARCHAR2(50) DEFAULT 'INC-' || LPAD(incidents_seq.NEXTVAL, 10, '0') PRIMARY KEY,
  title VARCHAR2(500) NOT NULL,
  description CLOB,
  status VARCHAR2(50) CHECK (status IN ('open', 'investigating', 'contained', 'resolved', 'closed')),
  severity VARCHAR2(20) CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  assigned_to VARCHAR2(255),
  created_by VARCHAR2(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP,
  related_events CLOB, -- JSON array of event IDs
  artifacts CLOB, -- JSON array of evidence/artifacts
  timeline CLOB, -- JSON array of timeline events
  mitre_attack_ids CLOB -- JSON array of MITRE ATT&CK techniques
);

-- Create indexes for incidents
CREATE INDEX idx_incidents_status ON incidents(status);
CREATE INDEX idx_incidents_severity ON incidents(severity);
CREATE INDEX idx_incidents_assigned_to ON incidents(assigned_to);
CREATE INDEX idx_incidents_created_at ON incidents(created_at);

-- Create triggers to update updated_at timestamps
CREATE OR REPLACE TRIGGER trg_security_events_updated
  BEFORE UPDATE ON security_events
  FOR EACH ROW
BEGIN
  :NEW.updated_at := CURRENT_TIMESTAMP;
END;
/

CREATE OR REPLACE TRIGGER trg_saved_queries_updated
  BEFORE UPDATE ON saved_queries
  FOR EACH ROW
BEGIN
  :NEW.updated_at := CURRENT_TIMESTAMP;
END;
/

CREATE OR REPLACE TRIGGER trg_detection_rules_updated
  BEFORE UPDATE ON detection_rules
  FOR EACH ROW
BEGIN
  :NEW.updated_at := CURRENT_TIMESTAMP;
END;
/

CREATE OR REPLACE TRIGGER trg_incidents_updated
  BEFORE UPDATE ON incidents
  FOR EACH ROW
BEGIN
  :NEW.updated_at := CURRENT_TIMESTAMP;
END;
/

-- Insert sample data for testing
INSERT INTO saved_queries (name, description, query, category, created_by, is_public) VALUES 
('Basic System Query', 'Simple query to test database connectivity', 'SELECT USER, SYSDATE FROM DUAL', 'System', 'admin', 1);

INSERT INTO detection_rules (name, description, query, severity, category, created_by) VALUES
('High Privilege Access', 'Detects high privilege account access', 'SELECT * FROM security_events WHERE principal LIKE ''%admin%''', 'medium', 'Access Control', 'admin');

-- Create view for security event summary
CREATE OR REPLACE VIEW security_events_summary AS
SELECT 
  DATE_TRUNC('hour', timestamp) as hour,
  severity,
  source,
  COUNT(*) as event_count
FROM security_events
WHERE timestamp >= CURRENT_TIMESTAMP - INTERVAL '24' HOUR
GROUP BY DATE_TRUNC('hour', timestamp), severity, source
ORDER BY hour DESC;

-- Grant necessary permissions (if using different schemas)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON security_events TO logan_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON saved_queries TO logan_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON detection_rules TO logan_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON incidents TO logan_user;

COMMIT;

-- Display setup completion message
SELECT 'Logan Security Dashboard database setup completed successfully!' as status FROM DUAL;