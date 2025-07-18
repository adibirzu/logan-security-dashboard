#!/usr/bin/env python3

import re

query = "'Log Source' = 'Windows Sysmon Events' and Technique_id != T1574.002"
pattern = r'(\w+)\s*!=\s*([^\s|]+)'
matches = re.findall(pattern, query)

print('Query:', query)
print('Matches:', matches)

for field, value in matches:
    if value != 'null':
        old_expr = f'{field} != {value}'
        new_expr = f'{field} is not null'
        query = query.replace(old_expr, new_expr)
        print(f'Converted: {old_expr} -> {new_expr}')

print('Final query:', query)