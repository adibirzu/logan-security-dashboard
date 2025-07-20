#!/bin/bash

# Setup Instance Principal Authentication for Logan Security Dashboard
# This script creates the necessary dynamic groups and policies in OCI

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== OCI Instance Principal Setup for Logan Security Dashboard ===${NC}"
echo ""

# Check if running on OCI instance
echo "Checking if running on OCI instance..."
python3 scripts/check_oci_instance.py > /tmp/oci_check.json
IS_OCI=$(jq -r '.is_oci_instance' /tmp/oci_check.json)

if [ "$IS_OCI" != "true" ]; then
    echo -e "${RED}Error: This script must be run on an OCI compute instance${NC}"
    exit 1
fi

# Extract instance information
INSTANCE_ID=$(jq -r '.instance_metadata.instance_id' /tmp/oci_check.json)
COMPARTMENT_ID=$(jq -r '.instance_metadata.compartment_id' /tmp/oci_check.json)
REGION=$(jq -r '.instance_metadata.region' /tmp/oci_check.json)

echo -e "${GREEN}✓ Running on OCI instance${NC}"
echo "  Instance ID: $INSTANCE_ID"
echo "  Compartment ID: $COMPARTMENT_ID"
echo "  Region: $REGION"
echo ""

# Check if OCI CLI is installed
if ! command -v oci &> /dev/null; then
    echo -e "${YELLOW}OCI CLI not found. Installing...${NC}"
    bash -c "$(curl -L https://raw.githubusercontent.com/oracle/oci-cli/master/scripts/install/install.sh)"
fi

# Get tenancy OCID
echo "Getting tenancy information..."
TENANCY_OCID=$(oci iam compartment get --compartment-id $COMPARTMENT_ID --query 'data."compartment-id"' --raw-output 2>/dev/null || echo "")

if [ -z "$TENANCY_OCID" ]; then
    echo -e "${YELLOW}Warning: Could not automatically determine tenancy OCID${NC}"
    echo "Please enter your tenancy OCID:"
    read -r TENANCY_OCID
fi

# Generate unique names
TIMESTAMP=$(date +%Y%m%d%H%M%S)
DYNAMIC_GROUP_NAME="logan-dashboard-instances-${TIMESTAMP}"
POLICY_NAME="logan-dashboard-instance-policy-${TIMESTAMP}"

echo ""
echo "Creating OCI resources:"
echo "  Dynamic Group: $DYNAMIC_GROUP_NAME"
echo "  Policy: $POLICY_NAME"
echo ""

# Create dynamic group matching rule
MATCHING_RULE="instance.id = '${INSTANCE_ID}'"

# For production, you might want to use a more general rule:
# MATCHING_RULE="ALL {instance.compartment.id = '${COMPARTMENT_ID}', tag.logan-dashboard.authorized = 'true'}"

echo "Creating dynamic group..."
cat > /tmp/dynamic_group.json <<EOF
{
  "compartmentId": "${TENANCY_OCID}",
  "name": "${DYNAMIC_GROUP_NAME}",
  "description": "Dynamic group for Logan Security Dashboard instances",
  "matchingRule": "${MATCHING_RULE}"
}
EOF

DYNAMIC_GROUP_ID=$(oci iam dynamic-group create \
    --from-json file:///tmp/dynamic_group.json \
    --query 'data.id' \
    --raw-output 2>/dev/null || echo "")

if [ -z "$DYNAMIC_GROUP_ID" ]; then
    echo -e "${RED}Error: Failed to create dynamic group${NC}"
    echo "This might be due to insufficient permissions. You may need to:"
    echo "1. Run this script with a user that has IAM management permissions"
    echo "2. Or manually create the resources using the OCI Console"
    echo ""
    echo "Manual setup instructions will be generated..."
else
    echo -e "${GREEN}✓ Dynamic group created: $DYNAMIC_GROUP_ID${NC}"
fi

# Create policy statements
echo ""
echo "Creating policy..."

# Policy statements for Logan Analytics access
STATEMENTS=(
    "Allow dynamic-group ${DYNAMIC_GROUP_NAME} to read log-analytics-namespaces in tenancy"
    "Allow dynamic-group ${DYNAMIC_GROUP_NAME} to read log-analytics-entity-types in tenancy"
    "Allow dynamic-group ${DYNAMIC_GROUP_NAME} to read log-analytics-entities in tenancy"
    "Allow dynamic-group ${DYNAMIC_GROUP_NAME} to read log-analytics-log-groups in tenancy"
    "Allow dynamic-group ${DYNAMIC_GROUP_NAME} to read log-analytics-query in tenancy"
    "Allow dynamic-group ${DYNAMIC_GROUP_NAME} to use log-analytics-query in tenancy"
    "Allow dynamic-group ${DYNAMIC_GROUP_NAME} to read log-analytics-fields in tenancy"
    "Allow dynamic-group ${DYNAMIC_GROUP_NAME} to read log-analytics-parsers in tenancy"
    "Allow dynamic-group ${DYNAMIC_GROUP_NAME} to read log-analytics-sources in tenancy"
    "Allow dynamic-group ${DYNAMIC_GROUP_NAME} to read log-analytics-upload in tenancy"
    "Allow dynamic-group ${DYNAMIC_GROUP_NAME} to read log-analytics-associationss in tenancy"
    "Allow dynamic-group ${DYNAMIC_GROUP_NAME} to read log-content in tenancy"
)

# Convert statements to JSON array
STATEMENTS_JSON=$(printf '%s\n' "${STATEMENTS[@]}" | jq -R . | jq -s .)

cat > /tmp/policy.json <<EOF
{
  "compartmentId": "${TENANCY_OCID}",
  "name": "${POLICY_NAME}",
  "description": "Policy for Logan Security Dashboard instance principal access",
  "statements": ${STATEMENTS_JSON}
}
EOF

if [ -n "$DYNAMIC_GROUP_ID" ]; then
    POLICY_ID=$(oci iam policy create \
        --from-json file:///tmp/policy.json \
        --query 'data.id' \
        --raw-output 2>/dev/null || echo "")
    
    if [ -n "$POLICY_ID" ]; then
        echo -e "${GREEN}✓ Policy created: $POLICY_ID${NC}"
    else
        echo -e "${RED}Error: Failed to create policy${NC}"
    fi
fi

# Generate manual setup instructions
echo ""
echo "Generating setup instructions..."

cat > setup_instructions.md <<EOF
# OCI Instance Principal Setup Instructions

## Automatic Setup Results

- Instance ID: ${INSTANCE_ID}
- Compartment ID: ${COMPARTMENT_ID}
- Region: ${REGION}
- Dynamic Group: ${DYNAMIC_GROUP_NAME}
- Policy: ${POLICY_NAME}

## Manual Setup Instructions

If automatic setup failed, follow these steps in the OCI Console:

### 1. Create Dynamic Group

1. Navigate to Identity & Security → Identity → Dynamic Groups
2. Click "Create Dynamic Group"
3. Enter:
   - Name: ${DYNAMIC_GROUP_NAME}
   - Description: Dynamic group for Logan Security Dashboard instances
   - Rule 1: \`instance.id = '${INSTANCE_ID}'\`

### 2. Create Policy

1. Navigate to Identity & Security → Identity → Policies
2. Click "Create Policy"
3. Enter:
   - Name: ${POLICY_NAME}
   - Description: Policy for Logan Security Dashboard instance principal access
   - Compartment: Root compartment
4. Add these statements:

\`\`\`
${STATEMENTS[@]}
\`\`\`

### 3. Configure Logan Dashboard

Add this environment configuration in Settings → Environments:

\`\`\`json
{
  "name": "Instance Principal - ${REGION}",
  "authType": "instance_principal",
  "compartmentId": "${COMPARTMENT_ID}",
  "region": "${REGION}",
  "namespace": "<your-namespace>"
}
\`\`\`

## Verification

To verify instance principal is working:

\`\`\`bash
python3 scripts/check_oci_instance.py
\`\`\`

Look for: "instance_principal": true in the output.

## Troubleshooting

If instance principal authentication fails:
1. Ensure the dynamic group rule matches your instance
2. Verify the policy is in the root compartment
3. Wait 1-2 minutes for policies to propagate
4. Check instance principal is enabled on the instance

EOF

echo -e "${GREEN}✓ Setup instructions saved to: setup_instructions.md${NC}"

# Test instance principal authentication
echo ""
echo "Testing instance principal authentication..."
sleep 5  # Wait for policies to propagate

python3 -c "
import json
try:
    import oci
    signer = oci.auth.signers.InstancePrincipalsSecurityTokenSigner()
    print(json.dumps({'success': True, 'tenancy': signer.tenancy_id}))
except Exception as e:
    print(json.dumps({'success': False, 'error': str(e)}))
" > /tmp/auth_test.json

AUTH_SUCCESS=$(jq -r '.success' /tmp/auth_test.json)

if [ "$AUTH_SUCCESS" == "true" ]; then
    echo -e "${GREEN}✓ Instance principal authentication is working!${NC}"
    echo ""
    echo "You can now add an environment in Logan Dashboard with:"
    echo "  - Authentication Type: Instance Principal"
    echo "  - Compartment ID: ${COMPARTMENT_ID}"
    echo "  - Region: ${REGION}"
else
    echo -e "${YELLOW}⚠ Instance principal authentication not yet working${NC}"
    echo "This is normal - policies may take 1-2 minutes to propagate."
    echo "Please wait and try again, or check the setup instructions."
fi

# Cleanup
rm -f /tmp/oci_check.json /tmp/dynamic_group.json /tmp/policy.json /tmp/auth_test.json

echo ""
echo -e "${GREEN}Setup complete!${NC}"
echo "See setup_instructions.md for details and next steps."