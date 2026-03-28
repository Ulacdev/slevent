import os
import re

def analyze_directory(path):
    issues = {
        "await_in_loop": [],
        "large_file": [],
        "missing_pagination": []
    }
    
    for root, dirs, files in os.walk(path):
        if 'node_modules' in root or '.git' in root or 'dist' in root or 'build' in root:
            continue
            
        for file in files:
            if not file.endswith('.js') and not file.endswith('.ts') and not file.endswith('.tsx'):
                continue
                
            file_path = os.path.join(root, file)
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                    
                # Check for large files
                lines = content.split('\n')
                if len(lines) > 500:
                    issues["large_file"].append((file_path, len(lines)))
                    
                # Check for await in for/while loops
                # Look for for/while followed by {(.*?)} containing await
                # Simple regex check line by line might be bad, block check is better
                loop_pattern = re.compile(r'(for\s*\(.*?\)|while\s*\(.*?\))\s*\{([^}]*await[^}]*)\}', re.DOTALL)
                matches = loop_pattern.findall(content)
                if matches:
                    issues["await_in_loop"].append((file_path, len(matches)))
                    
                # Check for "SELECT * FROM" without LIMIT or pagination in DB queries
                select_pattern = re.compile(r'SELECT\s+\*\s+FROM\s+\w+(?!\s+WHERE|\s+LIMIT)', re.IGNORECASE)
                if select_pattern.findall(content):
                    issues["missing_pagination"].append(file_path)
                    
            except Exception as e:
                pass
                
    return issues

if __name__ == "__main__":
    backend_issues = analyze_directory("backend")
    frontend_issues = analyze_directory("frontend")
    
    print("=== Backend Issues ===")
    for k, v in backend_issues.items():
        if v:
            print(f"- {k}: {len(v)} occurrences")
            for item in v[:5]:
                print(f"  {item}")
                
    print("\n=== Frontend Issues ===")
    for k, v in frontend_issues.items():
        if v:
            print(f"- {k}: {len(v)} occurrences")
            for item in v[:5]:
                print(f"  {item}")
